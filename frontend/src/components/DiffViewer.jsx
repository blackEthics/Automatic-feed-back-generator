import { useState, useMemo, useRef, useCallback } from 'react'

// ── LCS word-level diff ────────────────────────────────────────────────────

function computeDiff(original, improved) {
  const origWords = original.split(' ').filter(w => w.length > 0)
  const impWords  = improved.split(' ').filter(w => w.length > 0)
  const n = origWords.length
  const m = impWords.length

  if (n === 0 && m === 0) return []

  // Build LCS table
  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0))
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (origWords[i - 1] === impWords[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
      }
    }
  }

  // Backtrack to produce token list
  const tokens = []
  let i = n, j = m
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && origWords[i - 1] === impWords[j - 1]) {
      tokens.unshift({ text: origWords[i - 1], type: 'unchanged' })
      i--; j--
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      tokens.unshift({ text: impWords[j - 1], type: 'added' })
      j--
    } else {
      tokens.unshift({ text: origWords[i - 1], type: 'removed' })
      i--
    }
  }
  return tokens
}

// ── Paragraph splitting ────────────────────────────────────────────────────

// Splits a token list into paragraph arrays by detecting \n inside token text.
function splitIntoParagraphs(tokens) {
  const paragraphs = [[]]
  for (const token of tokens) {
    if (token.text.includes('\n')) {
      const parts = token.text.split('\n')
      if (parts[0]) paragraphs[paragraphs.length - 1].push({ ...token, text: parts[0] })
      for (let k = 1; k < parts.length; k++) {
        paragraphs.push([])
        if (parts[k]) paragraphs[paragraphs.length - 1].push({ ...token, text: parts[k] })
      }
    } else {
      paragraphs[paragraphs.length - 1].push(token)
    }
  }
  return paragraphs.filter(p => p.length > 0)
}

// ── Token styles ───────────────────────────────────────────────────────────

const UNIFIED_STYLES = {
  unchanged: {},
  removed: {
    backgroundColor: '#FEE2E2', color: '#DC2626',
    textDecoration: 'line-through', borderRadius: '2px', padding: '1px 2px',
  },
  added: {
    backgroundColor: '#DCFCE7', color: '#16A34A',
    borderRadius: '2px', padding: '1px 2px',
  },
}

const ORIG_STYLES = {
  unchanged: { color: '#374151' },
  removed: {
    backgroundColor: '#FEE2E2', color: '#DC2626',
    textDecoration: 'line-through', borderRadius: '2px', padding: '1px 2px',
  },
}

const IMP_STYLES = {
  unchanged: { color: '#374151' },
  added: {
    backgroundColor: '#DCFCE7', color: '#16A34A',
    borderRadius: '2px', padding: '1px 2px',
  },
}

// ── TokenizedParagraphs ────────────────────────────────────────────────────

function TokenizedParagraphs({ tokens, filterTypes, tokenStyles }) {
  const filtered = tokens.filter(t => filterTypes.includes(t.type))
  const paragraphs = splitIntoParagraphs(filtered)

  if (paragraphs.length === 0) {
    return <p style={{ color: '#9CA3AF', fontStyle: 'italic', fontSize: '14px' }}>No content.</p>
  }

  return (
    <>
      {paragraphs.map((para, pIdx) => (
        <p key={pIdx} style={{ margin: '0 0 14px 0', lineHeight: '1.8', fontSize: '14px', color: '#374151' }}>
          {para.map((token, tIdx) => (
            <span key={tIdx}>
              {tIdx > 0 && ' '}
              <span style={tokenStyles[token.type] || {}}>{token.text}</span>
            </span>
          ))}
        </p>
      ))}
    </>
  )
}

// ── DiffViewer ─────────────────────────────────────────────────────────────

export default function DiffViewer({ originalText, improvedText }) {
  const [activeTab, setActiveTab] = useState('highlighted')
  const leftRef  = useRef(null)
  const rightRef = useRef(null)
  const syncing  = useRef(false)

  const tokens = useMemo(
    () => computeDiff(originalText || '', improvedText || ''),
    [originalText, improvedText],
  )

  const stats = useMemo(() => {
    const removed   = tokens.filter(t => t.type === 'removed').length
    const added     = tokens.filter(t => t.type === 'added').length
    const unchanged = tokens.filter(t => t.type === 'unchanged').length
    const total     = removed + added + unchanged
    const similarity = total > 0 ? Math.round(unchanged / total * 100) : 100
    return { removed, added, similarity }
  }, [tokens])

  const handleLeftScroll = useCallback(() => {
    if (syncing.current || !rightRef.current || !leftRef.current) return
    syncing.current = true
    rightRef.current.scrollTop = leftRef.current.scrollTop
    syncing.current = false
  }, [])

  const handleRightScroll = useCallback(() => {
    if (syncing.current || !leftRef.current || !rightRef.current) return
    syncing.current = true
    leftRef.current.scrollTop = rightRef.current.scrollTop
    syncing.current = false
  }, [])

  function tabStyle(name) {
    const active = activeTab === name
    return {
      padding: '8px 18px',
      fontSize: '13px',
      fontWeight: 600,
      border: 'none',
      borderBottom: active ? '2px solid #7C3AED' : '2px solid transparent',
      background: 'none',
      color: active ? '#7C3AED' : '#6B7280',
      cursor: 'pointer',
      transition: 'color 0.15s',
    }
  }

  return (
    <div style={{
      border: '1px solid var(--color-border)',
      borderRadius: '12px',
      overflow: 'hidden',
      backgroundColor: 'var(--color-surface)',
    }}>

      {/* Header row */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 20px 0',
        borderBottom: '1px solid var(--color-border)',
        backgroundColor: '#F9FAFB',
      }}>
        <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text)', paddingBottom: '12px' }}>
          Document Comparison
        </span>
        <div style={{ display: 'flex' }}>
          <button style={tabStyle('highlighted')} onClick={() => setActiveTab('highlighted')}>
            Highlighted Changes
          </button>
          <button style={tabStyle('sidebyside')} onClick={() => setActiveTab('sidebyside')}>
            Side by Side
          </button>
        </div>
      </div>

      {/* Legend — highlighted tab only */}
      {activeTab === 'highlighted' && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '20px',
          padding: '8px 20px',
          borderBottom: '1px solid var(--color-border)',
          backgroundColor: '#FAFAFA',
        }}>
          <span style={{ fontSize: '12px', color: '#6B7280', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ backgroundColor: '#DCFCE7', color: '#16A34A', padding: '1px 8px', borderRadius: '3px', fontWeight: 500 }}>
              Added
            </span>
            = Added text
          </span>
          <span style={{ fontSize: '12px', color: '#6B7280', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ backgroundColor: '#FEE2E2', color: '#DC2626', padding: '1px 8px', borderRadius: '3px', fontWeight: 500, textDecoration: 'line-through' }}>
              Removed
            </span>
            = Removed text
          </span>
        </div>
      )}

      {/* Content */}
      {activeTab === 'highlighted' ? (
        <div style={{ padding: '20px', maxHeight: '420px', overflowY: 'auto' }}>
          <TokenizedParagraphs
            tokens={tokens}
            filterTypes={['unchanged', 'removed', 'added']}
            tokenStyles={UNIFIED_STYLES}
          />
        </div>
      ) : (
        <div style={{ display: 'flex', maxHeight: '420px' }}>
          <div
            ref={leftRef}
            onScroll={handleLeftScroll}
            style={{ flex: 1, padding: '20px', borderRight: '1px solid var(--color-border)', overflowY: 'auto', maxHeight: '420px' }}
          >
            <p style={{ margin: '0 0 12px', fontSize: '11px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Original
            </p>
            <TokenizedParagraphs
              tokens={tokens}
              filterTypes={['unchanged', 'removed']}
              tokenStyles={ORIG_STYLES}
            />
          </div>
          <div
            ref={rightRef}
            onScroll={handleRightScroll}
            style={{ flex: 1, padding: '20px', overflowY: 'auto', maxHeight: '420px' }}
          >
            <p style={{ margin: '0 0 12px', fontSize: '11px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Improved
            </p>
            <TokenizedParagraphs
              tokens={tokens}
              filterTypes={['unchanged', 'added']}
              tokenStyles={IMP_STYLES}
            />
          </div>
        </div>
      )}

      {/* Stats bar */}
      <div style={{
        display: 'flex',
        gap: '28px',
        padding: '10px 20px',
        borderTop: '1px solid var(--color-border)',
        backgroundColor: '#F9FAFB',
        fontSize: '13px',
        fontWeight: 500,
        color: '#6B7280',
      }}>
        <span>
          <span style={{ color: '#DC2626', fontWeight: 700 }}>{stats.removed}</span> words removed
        </span>
        <span>
          <span style={{ color: '#16A34A', fontWeight: 700 }}>{stats.added}</span> words added
        </span>
        <span>
          <span style={{ color: '#7C3AED', fontWeight: 700 }}>{stats.similarity}%</span> similarity
        </span>
      </div>
    </div>
  )
}
