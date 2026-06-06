import { useMemo } from 'react'
import { getHistory, getStats } from '../utils/historyStorage'

const CARD = {
  backgroundColor: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: '12px',
  padding: '24px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
}

function StatCard({ label, value, sub }) {
  return (
    <div style={{ ...CARD, padding: '16px', textAlign: 'center' }}>
      <p style={{
        fontSize: '10px', fontWeight: 600, color: 'var(--color-text-muted)',
        textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 5px 0',
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

function SmallScoreRing({ score }) {
  const r = 19
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - score / 100)
  const color = score >= 70 ? '#22c55e' : score >= 40 ? '#f59e0b' : '#ef4444'
  return (
    <div style={{ position: 'relative', width: 50, height: 50, flexShrink: 0 }}>
      <svg viewBox="0 0 50 50" style={{ width: 50, height: 50, transform: 'rotate(-90deg)' }}>
        <circle cx="25" cy="25" r={r} fill="none" stroke="#f3f4f6" strokeWidth="5" />
        <circle cx="25" cy="25" r={r} fill="none" stroke={color} strokeWidth="5"
          strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset} />
      </svg>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontSize: '12px', fontWeight: 700, color: '#111827', lineHeight: 1 }}>
          {Math.round(score)}
        </span>
        <span style={{ fontSize: '8px', color: '#9ca3af', lineHeight: 1, marginTop: '1px' }}>/100</span>
      </div>
    </div>
  )
}

function formatDateShort(iso) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function DashboardPage({ onNavigate }) {
  const history = useMemo(() => getHistory(), [])
  const stats = useMemo(() => getStats(), [])

  const recentEssays = history.slice(0, 3)

  const sortedTopics = useMemo(() => {
    if (!stats.averageByTopic) return []
    return Object.entries(stats.averageByTopic)
      .map(([topic, avg]) => ({
        topic,
        avg,
        count: stats.topicBreakdown?.[topic] ?? 0,
      }))
      .sort((a, b) => b.avg - a.avg)
  }, [stats])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* SECTION A — Hero */}
      <div style={{
        background: 'linear-gradient(135deg, #6C63FF 0%, #8B5CF6 100%)',
        borderRadius: '12px',
        padding: '32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 4px 16px rgba(108,99,255,0.25)',
        gap: '16px',
      }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 700, color: '#fff', margin: '0 0 6px 0', lineHeight: 1.2 }}>
            {stats.totalEssays === 0 ? 'Welcome to EssayAI' : 'Welcome back, Guest'}
          </h1>
          <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.85)', margin: '0 0 24px 0' }}>
            {stats.totalEssays === 0
              ? 'Score your first essay to get started'
              : 'Ready to improve your writing today?'}
          </p>
          <button
            onClick={() => onNavigate('new-evaluation')}
            style={{
              background: 'rgba(255,255,255,0.2)',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.4)',
              borderRadius: '8px',
              padding: '10px 22px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.3)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.2)' }}
          >
            Start New Evaluation
          </button>
        </div>
        <span style={{ fontSize: '72px', opacity: 0.9, flexShrink: 0 }}>📝</span>
      </div>

      {/* SECTION B — Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
        <StatCard label="Total Essays" value={stats.totalEssays || '—'} />
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
        <StatCard
          label="Improved Essays"
          value={stats.totalEssays ? stats.improvementCount : '—'}
        />
      </div>

      {/* SECTION C — Recent essays */}
      <div style={CARD}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>
            Recent Essays
          </h2>
          {history.length > 0 && (
            <button
              onClick={() => onNavigate('history')}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: '13px', fontWeight: 600, color: 'var(--color-primary)', padding: 0,
              }}
            >
              View All History →
            </button>
          )}
        </div>

        {recentEssays.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <p style={{ fontSize: '32px', margin: '0 0 10px 0' }}>📄</p>
            <p style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-text)', margin: '0 0 4px 0' }}>
              No essays scored yet
            </p>
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', margin: '0 0 16px 0' }}>
              Your recent activity will appear here
            </p>
            <button
              onClick={() => onNavigate('new-evaluation')}
              style={{
                background: 'var(--color-primary)', color: '#fff', border: 'none',
                borderRadius: '8px', padding: '9px 20px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-primary-dark)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--color-primary)' }}
            >
              Start New Evaluation
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {recentEssays.map(entry => (
              <div key={entry.id} style={{
                display: 'flex', alignItems: 'center', gap: '16px',
                padding: '14px 16px',
                border: '1px solid var(--color-border)',
                borderRadius: '10px',
                background: 'var(--color-bg)',
              }}>
                <SmallScoreRing score={entry.overallScore} />

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ marginBottom: '4px' }}>
                    <span style={{
                      background: '#EEF2FF', color: '#4338CA', fontSize: '11px', fontWeight: 600,
                      borderRadius: '9999px', padding: '2px 9px', border: '1px solid #C7D2FE',
                    }}>
                      {entry.topic || 'General'}
                    </span>
                  </div>
                  <p style={{
                    fontSize: '13px', color: 'var(--color-text)', margin: '0 0 3px 0',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {(entry.essayPreview || '').slice(0, 80)}
                    {(entry.essayPreview || '').length > 80 ? '…' : ''}
                  </p>
                  <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', margin: 0 }}>
                    {formatDateShort(entry.date)}
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px', flexShrink: 0 }}>
                  <span style={{
                    background: '#EEF2FF', color: '#4338CA', fontSize: '11px', fontWeight: 700,
                    borderRadius: '6px', padding: '3px 8px',
                  }}>
                    ASAP {typeof entry.asapGrade === 'number' ? entry.asapGrade.toFixed(1) : entry.asapGrade}/6
                  </span>
                  {entry.hasImprovement && (
                    <span style={{
                      background: '#F5F3FF', color: '#7C3AED', fontSize: '11px', fontWeight: 600,
                      borderRadius: '6px', padding: '3px 8px', border: '1px solid #DDD6FE',
                    }}>
                      ✨ Improved
                    </span>
                  )}
                </div>
              </div>
            ))}

            <div style={{ textAlign: 'right', marginTop: '4px' }}>
              <button
                onClick={() => onNavigate('history')}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: '13px', fontWeight: 600, color: 'var(--color-primary)', padding: 0,
                }}
              >
                View All History →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* SECTION D — Performance by Topic */}
      {stats.totalEssays > 0 && sortedTopics.length > 0 && (
        <div style={CARD}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-text)', margin: '0 0 18px 0' }}>
            Performance by Topic
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {sortedTopics.map(({ topic, avg, count }) => {
              const barColor = avg >= 70 ? '#22c55e' : avg >= 50 ? '#f59e0b' : '#ef4444'
              return (
                <div key={topic}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text)' }}>
                      {topic}
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                      avg {avg.toFixed(1)}/100 ({count} essay{count !== 1 ? 's' : ''})
                    </span>
                  </div>
                  <div style={{ height: '8px', borderRadius: '9999px', background: '#f3f4f6', overflow: 'hidden' }}>
                    <div style={{
                      width: `${avg}%`, height: '100%',
                      background: barColor, borderRadius: '9999px',
                      transition: 'width 0.4s ease',
                    }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* SECTION E — Writing Tips */}
      <div style={CARD}>
        <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-text)', margin: '0 0 16px 0' }}>
          💡 Writing Tips
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {[
            'Use transition words like "Furthermore" and "However" to connect your paragraphs.',
            'Aim for varied sentence lengths — mix short punchy sentences with longer analytical ones.',
            'Always include a clear introduction and conclusion paragraph for better organization scores.',
          ].map((tip, i) => (
            <div key={i} style={{
              display: 'flex', gap: '14px',
              padding: '12px 16px',
              borderLeft: '3px solid var(--color-primary)',
              background: 'rgba(108,99,255,0.04)',
              borderRadius: '0 8px 8px 0',
            }}>
              <span style={{
                fontSize: '13px', fontWeight: 700, color: 'var(--color-primary)',
                flexShrink: 0, lineHeight: 1.6,
              }}>
                {i + 1}.
              </span>
              <p style={{ fontSize: '13px', color: 'var(--color-text)', margin: 0, lineHeight: 1.6 }}>
                {tip}
              </p>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}
