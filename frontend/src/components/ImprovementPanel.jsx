import { useState, useEffect } from 'react'
import DiffViewer from './DiffViewer'

const DIMENSION_LABELS = {
  grammar:      { label: 'Grammar',      max: 20 },
  relevance:    { label: 'Relevance',    max: 25 },
  organization: { label: 'Organization', max: 20 },
  clarity:      { label: 'Clarity',      max: 20 },
  vocabulary:   { label: 'Vocabulary',   max: 15 },
}

const TYPE_STYLES = {
  grammar:    { bg: '#FEF2F2', color: '#991B1B', border: '#FECACA' },
  vocabulary: { bg: '#F5F3FF', color: '#5B21B6', border: '#DDD6FE' },
  transition: { bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' },
  structure:  { bg: '#FFF7ED', color: '#9A3412', border: '#FED7AA' },
}

const card = {
  backgroundColor: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: '12px',
  padding: '20px',
}

const secTitle = {
  fontSize: '11px',
  fontWeight: 600,
  color: 'var(--color-text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  margin: '0 0 14px 0',
}

function SummaryCard({ value, label, bgColor, textColor, borderColor }) {
  return (
    <div style={{
      backgroundColor: bgColor,
      border: `1px solid ${borderColor}`,
      borderRadius: '12px',
      padding: '16px',
      textAlign: 'center',
      flex: 1,
    }}>
      <p style={{ fontSize: '28px', fontWeight: 700, color: textColor, margin: '0 0 5px 0', lineHeight: 1 }}>
        {value}
      </p>
      <p style={{ fontSize: '11px', fontWeight: 600, color: textColor, opacity: 0.75, margin: 0, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </p>
    </div>
  )
}

function DimRow({ label, before, after, max }) {
  const diff = after - before
  const improved = diff > 0.01
  const worse = diff < -0.01
  const arrow = improved ? '↑' : worse ? '↓' : '→'
  const arrowColor = improved ? '#16a34a' : worse ? '#dc2626' : '#9ca3af'
  const diffStr = improved ? `+${diff.toFixed(2)}` : worse ? diff.toFixed(2) : '—'
  const diffColor = improved ? '#16a34a' : worse ? '#dc2626' : '#9ca3af'
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontSize: '13px',
      padding: '7px 0',
      borderBottom: '1px solid var(--color-border)',
    }}>
      <span style={{ width: '96px', color: '#6B7280', fontWeight: 500, flexShrink: 0 }}>{label}</span>
      <span style={{ width: '44px', color: '#374151', fontWeight: 500, textAlign: 'right' }}>{before.toFixed(1)}</span>
      <span style={{ color: arrowColor, fontWeight: 700, width: '18px', textAlign: 'center' }}>{arrow}</span>
      <span style={{ width: '44px', color: '#374151', fontWeight: 600, textAlign: 'right' }}>{after.toFixed(1)}</span>
      <span style={{ marginLeft: 'auto', fontSize: '12px', fontWeight: 700, color: diffColor, minWidth: '44px', textAlign: 'right' }}>
        {diffStr}
      </span>
      <span style={{ fontSize: '11px', color: '#9ca3af', minWidth: '28px' }}>/{max}</span>
    </div>
  )
}

export default function ImprovementPanel({ originalText, promptName, apiUrl, onClose }) {
  const [loading, setLoading] = useState(true)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)
  const [showDiff, setShowDiff] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function run() {
      try {
        const res = await fetch(`${apiUrl}/improve`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            essay_text: originalText,
            prompt_name: promptName || 'General',
          }),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.detail ?? `HTTP ${res.status}`)
        }
        if (!cancelled) setResult(await res.json())
      } catch (err) {
        if (!cancelled) setError(err.message || 'Improvement failed. Please try again.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => { cancelled = true }
  }, [originalText, promptName, apiUrl])

  function handleCopy() {
    if (!result) return
    navigator.clipboard.writeText(result.improved_text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const groupedChanges = result
    ? ['grammar', 'vocabulary', 'transition', 'structure'].reduce((acc, type) => {
        const items = result.changes.filter(c => c.type === type)
        if (items.length > 0) acc[type] = items
        return acc
      }, {})
    : {}

  return (
    <div style={{
      backgroundColor: 'var(--color-surface)',
      border: '1px solid rgba(108,99,255,0.3)',
      borderRadius: '12px',
      padding: '24px',
      boxShadow: '0 4px 24px rgba(108,99,255,0.1)',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--color-text)' }}>
          ✨ Essay Improvement Results
        </h2>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: '1px solid var(--color-border)',
            borderRadius: '8px',
            padding: '5px 14px',
            fontSize: '13px',
            color: '#6B7280',
            cursor: 'pointer',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#9CA3AF' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)' }}
        >
          ✕ Close
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '48px 0', color: '#6B7280' }}>
          <div style={{
            width: '36px',
            height: '36px',
            border: '3px solid rgba(108,99,255,0.2)',
            borderTopColor: 'var(--color-primary)',
            borderRadius: '50%',
            animation: 'ip-spin 0.8s linear infinite',
            margin: '0 auto 16px',
          }} />
          <p style={{ fontSize: '14px', margin: 0 }}>✨ Improving your essay using NLP analysis…</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{
          background: '#FEF2F2',
          border: '1px solid #FECACA',
          borderRadius: '10px',
          padding: '14px 18px',
          color: '#991B1B',
          fontSize: '14px',
        }}>
          {error}
        </div>
      )}

      {/* Results */}
      {result && !loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Section A — Summary cards */}
          <div>
            <p style={secTitle}>Improvement Summary</p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <SummaryCard
                value={result.summary.grammar_fixes}
                label="Grammar Fixes"
                bgColor="#FEF2F2" textColor="#991B1B" borderColor="#FECACA"
              />
              <SummaryCard
                value={result.summary.vocabulary_upgrades}
                label="Vocabulary Upgrades"
                bgColor="#F5F3FF" textColor="#5B21B6" borderColor="#DDD6FE"
              />
              <SummaryCard
                value={result.summary.transitions_added}
                label="Transitions Added"
                bgColor="#EFF6FF" textColor="#1D4ED8" borderColor="#BFDBFE"
              />
              <SummaryCard
                value={result.summary.total_changes}
                label="Total Changes"
                bgColor="#F0FDF4" textColor="#15803D" borderColor="#BBF7D0"
              />
            </div>
          </div>

          {/* Section B — Score comparison */}
          <div style={card}>
            <p style={secTitle}>Score Comparison</p>

            {/* Overall totals */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '18px' }}>
              <div style={{ textAlign: 'center', padding: '14px', background: '#F9FAFB', borderRadius: '10px' }}>
                <p style={{ margin: '0 0 2px', fontSize: '11px', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Before</p>
                <p style={{ margin: 0, fontSize: '26px', fontWeight: 700, color: '#374151', lineHeight: 1.1 }}>
                  {result.score_before.overall_score.toFixed(1)}
                  <span style={{ fontSize: '14px', fontWeight: 500, color: '#9CA3AF' }}>/100</span>
                </p>
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#6B7280' }}>
                  ASAP <strong>{result.score_before.asap_score.toFixed(2)}</strong>/6
                </p>
              </div>
              <div style={{
                textAlign: 'center',
                padding: '14px',
                background: 'rgba(108,99,255,0.06)',
                borderRadius: '10px',
                border: '1px solid rgba(108,99,255,0.2)',
              }}>
                <p style={{ margin: '0 0 2px', fontSize: '11px', fontWeight: 600, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>After</p>
                <p style={{ margin: 0, fontSize: '26px', fontWeight: 700, color: 'var(--color-primary)', lineHeight: 1.1 }}>
                  {result.score_after.overall_score.toFixed(1)}
                  <span style={{ fontSize: '14px', fontWeight: 500, color: '#9CA3AF' }}>/100</span>
                </p>
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#6B7280' }}>
                  ASAP <strong style={{ color: 'var(--color-primary)' }}>{result.score_after.asap_score.toFixed(2)}</strong>/6
                </p>
              </div>
            </div>

            {/* Dimension rows */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
              <span style={{ width: '96px' }}>Dimension</span>
              <span style={{ width: '44px', textAlign: 'right' }}>Before</span>
              <span style={{ width: '18px' }} />
              <span style={{ width: '44px', textAlign: 'right' }}>After</span>
              <span style={{ marginLeft: 'auto', minWidth: '44px', textAlign: 'right' }}>Change</span>
              <span style={{ minWidth: '28px' }} />
            </div>
            {Object.entries(DIMENSION_LABELS).map(([key, { label, max }]) => (
              <DimRow
                key={key}
                label={label}
                before={result.score_before.dimensions[key]?.score ?? 0}
                after={result.score_after.dimensions[key]?.score ?? 0}
                max={max}
              />
            ))}
          </div>

          {/* Section C — Changes list */}
          <div style={card}>
            <p style={secTitle}>What Was Improved</p>
            {result.changes.length === 0 ? (
              <p style={{ fontSize: '14px', color: '#6B7280', margin: 0, fontStyle: 'italic' }}>
                No changes needed — your essay is well written!
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                {Object.entries(groupedChanges).map(([type, items]) => {
                  const ts = TYPE_STYLES[type] || TYPE_STYLES.structure
                  return (
                    <div key={type}>
                      <div style={{
                        display: 'inline-flex',
                        backgroundColor: ts.bg,
                        color: ts.color,
                        border: `1px solid ${ts.border}`,
                        borderRadius: '9999px',
                        padding: '3px 13px',
                        fontSize: '11px',
                        fontWeight: 700,
                        letterSpacing: '0.07em',
                        textTransform: 'uppercase',
                        marginBottom: '10px',
                      }}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {items.map((change, i) => (
                          <div key={i} style={{
                            background: '#F9FAFB',
                            borderRadius: '8px',
                            padding: '10px 14px',
                            border: '1px solid var(--color-border)',
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                              {change.original && (
                                <>
                                  <code style={{
                                    fontSize: '13px',
                                    fontWeight: 600,
                                    color: '#DC2626',
                                    background: '#FEF2F2',
                                    padding: '2px 8px',
                                    borderRadius: '5px',
                                    border: '1px solid #FECACA',
                                  }}>
                                    {change.original}
                                  </code>
                                  <span style={{ color: '#9CA3AF', fontSize: '15px', fontWeight: 400 }}>→</span>
                                </>
                              )}
                              <code style={{
                                fontSize: '13px',
                                fontWeight: 600,
                                color: '#16a34a',
                                background: '#F0FDF4',
                                padding: '2px 8px',
                                borderRadius: '5px',
                                border: '1px solid #BBF7D0',
                              }}>
                                {change.improved}
                              </code>
                            </div>
                            <p style={{ fontSize: '12px', color: '#9CA3AF', margin: '5px 0 0', fontStyle: 'italic' }}>
                              {change.reason}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* View Full Diff button */}
          <button
            onClick={() => setShowDiff(v => !v)}
            style={{
              width: '100%',
              border: '1px solid #7C3AED',
              background: 'transparent',
              color: '#7C3AED',
              fontSize: '14px',
              fontWeight: 600,
              borderRadius: '10px',
              padding: '12px 16px',
              cursor: 'pointer',
              transition: 'background 0.15s, color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(124,58,237,0.06)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
          >
            {showDiff ? '▲ Hide Diff' : '⊕ View Full Diff'}
          </button>

          {/* Diff viewer */}
          {showDiff && (
            <DiffViewer
              originalText={originalText}
              improvedText={result.improved_text}
            />
          )}

          {/* Bottom actions */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={onClose}
              style={{
                flex: 1,
                border: '1px solid var(--color-border)',
                background: 'var(--color-surface)',
                color: '#374151',
                fontSize: '14px',
                fontWeight: 600,
                borderRadius: '10px',
                padding: '12px 16px',
                cursor: 'pointer',
                transition: 'border-color 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#94A3B8' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)' }}
            >
              Close
            </button>
            <button
              onClick={handleCopy}
              style={{
                flex: 2,
                background: copied
                  ? '#16a34a'
                  : 'linear-gradient(135deg, #7C3AED 0%, #4F46E5 100%)',
                color: '#FFFFFF',
                fontSize: '14px',
                fontWeight: 600,
                borderRadius: '10px',
                padding: '12px 16px',
                cursor: 'pointer',
                border: 'none',
                transition: 'background 0.2s',
              }}
            >
              {copied ? '✅ Copied to clipboard!' : '📋 Copy Improved Essay'}
            </button>
          </div>
        </div>
      )}

      <style>{`@keyframes ip-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
