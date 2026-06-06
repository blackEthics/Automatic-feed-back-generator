import { useState, useMemo } from 'react'
import { getHistory, deleteEntry, clearHistory, getStats } from '../utils/historyStorage'

const DIMS = [
  { key: 'grammar',      label: 'Grammar',      max: 20 },
  { key: 'relevance',    label: 'Relevance',     max: 25 },
  { key: 'organization', label: 'Organization',  max: 20 },
  { key: 'clarity',      label: 'Clarity',       max: 20 },
  { key: 'vocabulary',   label: 'Vocabulary',    max: 15 },
]

const card = {
  backgroundColor: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: '12px',
  padding: '16px',
}

function StatCard({ label, value, sub }) {
  return (
    <div style={{ ...card, padding: '14px 16px', textAlign: 'center' }}>
      <p style={{
        fontSize: '10px',
        fontWeight: 600,
        color: 'var(--color-text-muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        margin: '0 0 5px 0',
      }}>
        {label}
      </p>
      <p style={{ fontSize: '22px', fontWeight: 700, color: 'var(--color-text)', lineHeight: 1, margin: 0 }}>
        {value}
        {sub && (
          <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-muted)', marginLeft: '2px' }}>
            {sub}
          </span>
        )}
      </p>
    </div>
  )
}

function MiniScoreRing({ score }) {
  const r = 22
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - score / 100)
  const color = score >= 70 ? '#22c55e' : score >= 40 ? '#f59e0b' : '#ef4444'
  return (
    <div style={{ position: 'relative', width: 56, height: 56, flexShrink: 0 }}>
      <svg viewBox="0 0 56 56" style={{ width: 56, height: 56, transform: 'rotate(-90deg)' }}>
        <circle cx="28" cy="28" r={r} fill="none" stroke="#f3f4f6" strokeWidth="5" />
        <circle
          cx="28" cy="28" r={r}
          fill="none"
          stroke={color}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
        />
      </svg>
      <div style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <span style={{ fontSize: '13px', fontWeight: 700, color: '#111827', lineHeight: 1 }}>
          {Math.round(score)}
        </span>
        <span style={{ fontSize: '9px', color: '#9ca3af', lineHeight: 1, marginTop: '1px' }}>/100</span>
      </div>
    </div>
  )
}

function DimDots({ dimensions }) {
  return (
    <div style={{ display: 'flex', gap: '4px' }}>
      {DIMS.map(({ key, label, max }) => {
        const pct = (dimensions?.[key]?.score ?? 0) / max
        const color = pct > 0.66 ? '#22c55e' : pct > 0.33 ? '#f59e0b' : '#ef4444'
        return (
          <div
            key={key}
            title={`${label}: ${Math.round(pct * 100)}%`}
            style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: color, flexShrink: 0 }}
          />
        )
      })}
    </div>
  )
}

function formatDate(iso) {
  const d = new Date(iso)
  return (
    d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) +
    ' at ' +
    d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  )
}

function HistoryCard({ entry, expanded, onToggle, onDelete }) {
  return (
    <div
      onClick={onToggle}
      style={{
        ...card,
        cursor: 'pointer',
        position: 'relative',
        transition: 'box-shadow 0.15s',
        userSelect: 'none',
      }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)' }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none' }}
    >
      {/* Delete button */}
      <button
        onClick={e => { e.stopPropagation(); onDelete(entry.id) }}
        title="Delete entry"
        style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontSize: '14px',
          color: '#9ca3af',
          padding: '4px 5px',
          borderRadius: '6px',
          lineHeight: 1,
          transition: 'color 0.15s, background 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = '#fef2f2' }}
        onMouseLeave={e => { e.currentTarget.style.color = '#9ca3af'; e.currentTarget.style.background = 'none' }}
      >
        🗑
      </button>

      {/* Date */}
      <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', margin: '0 0 7px 0' }}>
        {formatDate(entry.date)}
      </p>

      {/* Topic + Improved badges */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
        <span style={{
          background: '#EEF2FF',
          color: '#4338CA',
          fontSize: '11px',
          fontWeight: 600,
          borderRadius: '9999px',
          padding: '3px 10px',
          border: '1px solid #C7D2FE',
        }}>
          {entry.topic || 'General'}
        </span>
        {entry.hasImprovement && (
          <span style={{
            background: '#F5F3FF',
            color: '#7C3AED',
            fontSize: '11px',
            fontWeight: 600,
            borderRadius: '9999px',
            padding: '3px 10px',
            border: '1px solid #DDD6FE',
          }}>
            ✨ Improved
          </span>
        )}
      </div>

      {/* Essay preview */}
      <p style={{
        fontSize: '12px',
        color: 'var(--color-text-muted)',
        lineHeight: '1.55',
        margin: '0 0 12px 0',
        paddingRight: '28px',
      }}>
        {entry.essayPreview}
      </p>

      {/* Score + meta row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <MiniScoreRing score={entry.overallScore} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <span style={{ fontSize: '12px', color: '#374151', fontWeight: 500 }}>
            ASAP{' '}
            <strong style={{ color: 'var(--color-primary)' }}>
              {typeof entry.asapGrade === 'number' ? entry.asapGrade.toFixed(1) : entry.asapGrade}
            </strong>
            /6
          </span>
          <DimDots dimensions={entry.dimensions} />
          <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
            {entry.wordCount} words
          </span>
        </div>
      </div>

      {/* Expanded: full dimension scores */}
      {expanded && (
        <div
          onClick={e => e.stopPropagation()}
          style={{
            marginTop: '14px',
            paddingTop: '14px',
            borderTop: '1px solid var(--color-border)',
          }}
        >
          <p style={{
            fontSize: '10px',
            fontWeight: 600,
            color: 'var(--color-text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            margin: '0 0 10px 0',
          }}>
            Dimension Scores
          </p>
          {DIMS.map(({ key, label, max }) => {
            const score = entry.dimensions?.[key]?.score ?? 0
            const pct = Math.round((score / max) * 100)
            const color = pct > 66 ? '#22c55e' : pct > 33 ? '#f59e0b' : '#ef4444'
            return (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ width: '88px', fontSize: '12px', color: '#374151', fontWeight: 500, flexShrink: 0 }}>
                  {label}
                </span>
                <div style={{ flex: 1, height: '6px', borderRadius: '9999px', background: '#f3f4f6', overflow: 'hidden' }}>
                  <div style={{
                    width: `${pct}%`,
                    height: '100%',
                    background: color,
                    borderRadius: '9999px',
                    transition: 'width 0.3s',
                  }} />
                </div>
                <span style={{ fontSize: '12px', fontWeight: 600, color, width: '38px', textAlign: 'right', flexShrink: 0 }}>
                  {score}/{max}
                </span>
              </div>
            )
          })}

          {entry.scoreBefore && entry.scoreAfter && (
            <div style={{
              marginTop: '10px',
              padding: '10px 12px',
              background: '#F5F3FF',
              borderRadius: '8px',
              border: '1px solid #DDD6FE',
            }}>
              <p style={{ fontSize: '11px', fontWeight: 600, color: '#7C3AED', margin: '0 0 4px 0' }}>
                Improvement Result
              </p>
              <p style={{ fontSize: '13px', color: '#374151', margin: 0 }}>
                Score:{' '}
                {entry.scoreBefore.overall_score.toFixed(1)}
                {' → '}
                <strong style={{ color: '#7C3AED' }}>
                  {entry.scoreAfter.overall_score.toFixed(1)}
                </strong>
                {' '}
                <span style={{ fontSize: '12px', color: '#7C3AED' }}>
                  (+{(entry.scoreAfter.overall_score - entry.scoreBefore.overall_score).toFixed(1)})
                </span>
              </p>
            </div>
          )}

          <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', margin: '10px 0 0 0', textAlign: 'center' }}>
            Click to collapse
          </p>
        </div>
      )}

      {!expanded && (
        <p style={{ fontSize: '10px', color: '#c4c9d4', margin: '8px 0 0 0', textAlign: 'right' }}>
          Click to expand ›
        </p>
      )}
    </div>
  )
}

export default function HistoryPage({ onNavigate }) {
  const [history, setHistory] = useState(() => getHistory())
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('newest')
  const [expandedId, setExpandedId] = useState(null)

  const stats = useMemo(() => getStats(), [history])

  const filtered = useMemo(() => {
    let items = [...history]
    if (search.trim()) {
      const q = search.toLowerCase()
      items = items.filter(e =>
        e.essayPreview.toLowerCase().includes(q) ||
        (e.topic || '').toLowerCase().includes(q)
      )
    }
    if (sort === 'newest') items.sort((a, b) => new Date(b.date) - new Date(a.date))
    else if (sort === 'oldest') items.sort((a, b) => new Date(a.date) - new Date(b.date))
    else if (sort === 'highest') items.sort((a, b) => b.overallScore - a.overallScore)
    else if (sort === 'lowest') items.sort((a, b) => a.overallScore - b.overallScore)
    return items
  }, [history, search, sort])

  function handleDelete(id) {
    if (window.confirm('Delete this history entry?')) {
      deleteEntry(id)
      setHistory(getHistory())
      if (expandedId === id) setExpandedId(null)
    }
  }

  function handleClearAll() {
    if (window.confirm('Clear all history? This cannot be undone.')) {
      clearHistory()
      setHistory([])
      setExpandedId(null)
    }
  }

  function handleToggle(id) {
    setExpandedId(prev => (prev === id ? null : id))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
        <StatCard label="Total Essays" value={stats.totalEssays} />
        <StatCard
          label="Average Score"
          value={stats.averageScore || '—'}
          sub={stats.averageScore ? '/100' : ''}
        />
        <StatCard
          label="Best Score"
          value={stats.bestScore ? Math.round(stats.bestScore) : '—'}
          sub={stats.bestScore ? '/100' : ''}
        />
        <StatCard label="Improved Essays" value={stats.improvementCount} />
      </div>

      {/* Filter bar */}
      <div style={{
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: '12px',
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        flexWrap: 'wrap',
      }}>
        <input
          type="text"
          placeholder="Search essays or topics…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            flex: 1,
            minWidth: '180px',
            border: '1px solid var(--color-border)',
            borderRadius: '8px',
            padding: '8px 12px',
            fontSize: '13px',
            color: 'var(--color-text)',
            background: 'var(--color-bg)',
            outline: 'none',
          }}
        />
        <select
          value={sort}
          onChange={e => setSort(e.target.value)}
          style={{
            border: '1px solid var(--color-border)',
            borderRadius: '8px',
            padding: '8px 12px',
            fontSize: '13px',
            color: 'var(--color-text)',
            background: 'var(--color-surface)',
            cursor: 'pointer',
            outline: 'none',
          }}
        >
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="highest">Highest Score</option>
          <option value="lowest">Lowest Score</option>
        </select>
        <button
          onClick={handleClearAll}
          disabled={history.length === 0}
          style={{
            background: history.length === 0 ? '#f3f4f6' : '#FEF2F2',
            color: history.length === 0 ? '#9ca3af' : '#DC2626',
            border: `1px solid ${history.length === 0 ? 'var(--color-border)' : '#FECACA'}`,
            borderRadius: '8px',
            padding: '8px 14px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: history.length === 0 ? 'not-allowed' : 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          Clear All History
        </button>
      </div>

      {/* History grid or empty state */}
      {filtered.length === 0 ? (
        <div style={{
          ...card,
          padding: '64px 24px',
          textAlign: 'center',
        }}>
          <p style={{ fontSize: '40px', margin: '0 0 12px 0' }}>📝</p>
          <p style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text)', margin: '0 0 6px 0' }}>
            {search ? 'No matching essays' : 'No essays yet'}
          </p>
          <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', margin: '0 0 20px 0' }}>
            {search ? 'Try a different search term' : 'Score your first essay to see it here'}
          </p>
          {!search && (
            <button
              onClick={() => onNavigate('new-evaluation')}
              style={{
                background: 'var(--color-primary)',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                padding: '10px 22px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-primary-dark)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--color-primary)' }}
            >
              Start New Evaluation
            </button>
          )}
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '12px',
        }}>
          {filtered.map(entry => (
            <HistoryCard
              key={entry.id}
              entry={entry}
              expanded={expandedId === entry.id}
              onToggle={() => handleToggle(entry.id)}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
}
