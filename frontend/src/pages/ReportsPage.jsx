import { useMemo } from 'react'
import { getHistory, getStats } from '../utils/historyStorage'

const DIMS = [
  { key: 'grammar',      label: 'Grammar',      max: 20 },
  { key: 'relevance',    label: 'Relevance',     max: 25 },
  { key: 'organization', label: 'Organization',  max: 20 },
  { key: 'clarity',      label: 'Clarity',       max: 20 },
  { key: 'vocabulary',   label: 'Vocabulary',    max: 15 },
]

const DIM_INSIGHTS = {
  grammar:      { high: 16, low: 10, highMsg: 'Strong grammar performance',           lowMsg: 'Focus on spelling and punctuation'          },
  relevance:    { high: 20, low: 12, highMsg: 'Essays stay well on topic',            lowMsg: 'Work on addressing the prompt directly'     },
  organization: { high: 16, low: 10, highMsg: 'Well-structured essays',               lowMsg: 'Add clearer intro and conclusion'           },
  clarity:      { high: 16, low: 10, highMsg: 'Clear and readable writing',           lowMsg: 'Vary sentence length for better flow'       },
  vocabulary:   { high: 12, low:  8, highMsg: 'Rich academic vocabulary',             lowMsg: 'Use more academic transition words'         },
}

const CARD = {
  backgroundColor: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: '12px',
  padding: '24px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
}

function formatDateShort(iso) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function scoreColor(avg) {
  return avg >= 70 ? '#16a34a' : avg >= 50 ? '#b45309' : '#dc2626'
}
function scoreBg(avg) {
  return avg >= 70 ? '#f0fdf4' : avg >= 50 ? '#fffbeb' : '#fef2f2'
}

function ScoreTrendChart({ data }) {
  const W = 600
  const H = 200
  const PAD_L = 36
  const PAD_R = 68
  const PAD_T = 16
  const PAD_B = 28

  const innerW = W - PAD_L - PAD_R
  const innerH = H - PAD_T - PAD_B
  const avg = data.reduce((s, d) => s + d.score, 0) / data.length
  const avgY = PAD_T + (1 - avg / 100) * innerH

  const points = data.map((d, i) => {
    const x = data.length === 1
      ? PAD_L + innerW / 2
      : PAD_L + (i / (data.length - 1)) * innerW
    const y = PAD_T + (1 - d.score / 100) * innerH
    return { x, y, score: d.score, date: d.date }
  })

  const polylinePoints = points.map(p => `${p.x},${p.y}`).join(' ')
  const yLabels = [0, 25, 50, 75, 100]

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: '100%', height: '200px', overflow: 'visible' }}
      >
        {/* Grid lines + Y labels */}
        {yLabels.map(v => {
          const y = PAD_T + (1 - v / 100) * innerH
          return (
            <g key={v}>
              <line x1={PAD_L} y1={y} x2={W - PAD_R} y2={y} stroke="#f3f4f6" strokeWidth="1" />
              <text x={PAD_L - 4} y={y + 4} textAnchor="end" fontSize="10" fill="#9ca3af">{v}</text>
            </g>
          )
        })}

        {/* Average dashed line */}
        <line
          x1={PAD_L} y1={avgY} x2={W - PAD_R} y2={avgY}
          stroke="#a5b4fc" strokeWidth="1.5" strokeDasharray="5 4"
        />
        <text x={W - PAD_R + 5} y={avgY + 4} fontSize="10" fill="#a5b4fc" fontWeight="600">
          avg {Math.round(avg)}
        </text>

        {/* Line (only when more than one point) */}
        {data.length > 1 && (
          <polyline
            points={polylinePoints}
            fill="none"
            stroke="#6C63FF"
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}

        {/* Dots */}
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={5} fill="#6C63FF" stroke="#fff" strokeWidth="2">
            <title>{formatDateShort(p.date)}: {Math.round(p.score)}</title>
          </circle>
        ))}

        {/* X axis labels */}
        {points.map((p, i) => (
          <text key={i} x={p.x} y={H - 4} textAnchor="middle" fontSize="10" fill="#9ca3af">
            {i + 1}
          </text>
        ))}
      </svg>

      {data.length === 1 && (
        <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', textAlign: 'center', margin: '6px 0 0 0' }}>
          Score more essays to see trends
        </p>
      )}
    </div>
  )
}

function DimAnalysis({ dimKey, label, avg, max }) {
  const pct = (avg / max) * 100
  const barColor = pct >= 66 ? '#22c55e' : pct >= 33 ? '#f59e0b' : '#ef4444'
  const cfg = DIM_INSIGHTS[dimKey]

  let insight = null
  if (cfg) {
    if (avg >= cfg.high)      insight = { msg: cfg.highMsg, color: '#16a34a', bg: '#f0fdf4' }
    else if (avg < cfg.low)   insight = { msg: cfg.lowMsg,  color: '#b45309', bg: '#fffbeb' }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' }}>
        <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text)' }}>{label}</span>
        <span style={{ fontSize: '13px', fontWeight: 600, color: barColor }}>
          {avg.toFixed(1)}/{max}
        </span>
      </div>
      <div style={{ height: '8px', borderRadius: '9999px', background: '#f3f4f6', overflow: 'hidden', marginBottom: '6px' }}>
        <div style={{
          width: `${pct}%`, height: '100%',
          background: barColor, borderRadius: '9999px', transition: 'width 0.4s',
        }} />
      </div>
      {insight && (
        <p style={{
          fontSize: '12px', color: insight.color, background: insight.bg,
          borderRadius: '6px', padding: '5px 10px', margin: 0, fontWeight: 500,
        }}>
          {insight.msg}
        </p>
      )}
    </div>
  )
}

export default function ReportsPage({ onNavigate }) {
  const history = useMemo(() => getHistory(), [])
  const stats   = useMemo(() => getStats(),   [])

  const historySorted = useMemo(
    () => [...history].sort((a, b) => new Date(a.date) - new Date(b.date)),
    [history],
  )

  const dimAvgs = useMemo(() => {
    if (history.length === 0) return {}
    return DIMS.reduce((acc, { key }) => {
      const vals = history.map(e => e.dimensions?.[key]?.score ?? 0)
      acc[key] = vals.reduce((s, v) => s + v, 0) / vals.length
      return acc
    }, {})
  }, [history])

  const topicTableData = useMemo(() => {
    const byTopic = {}
    history.forEach(e => {
      const t = e.topic || 'General'
      if (!byTopic[t]) byTopic[t] = { count: 0, scores: [], improvements: 0 }
      byTopic[t].count++
      byTopic[t].scores.push(e.overallScore)
      if (e.hasImprovement) byTopic[t].improvements++
    })
    return Object.entries(byTopic)
      .map(([topic, d]) => ({
        topic,
        count: d.count,
        avg: d.scores.reduce((s, v) => s + v, 0) / d.scores.length,
        best: Math.max(...d.scores),
        improvements: d.improvements,
      }))
      .sort((a, b) => b.count - a.count)
  }, [history])

  // Empty state
  if (stats.totalEssays === 0) {
    return (
      <div style={{
        ...CARD,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', padding: '80px 24px', textAlign: 'center',
      }}>
        <p style={{ fontSize: '48px', margin: '0 0 16px 0' }}>📊</p>
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-text)', margin: '0 0 8px 0' }}>
          No reports yet
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', margin: '0 0 24px 0' }}>
          Score essays to generate reports
        </p>
        <button
          onClick={() => onNavigate('new-evaluation')}
          style={{
            background: 'var(--color-primary)', color: '#fff', border: 'none',
            borderRadius: '8px', padding: '10px 24px', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-primary-dark)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'var(--color-primary)' }}
        >
          Start New Evaluation
        </button>
      </div>
    )
  }

  const trendData    = historySorted.map(e => ({ score: e.overallScore, date: e.date }))
  const oldestDate   = formatDateShort(historySorted[0].date)
  const newestDate   = formatDateShort(historySorted[historySorted.length - 1].date)
  const worstScore   = Math.min(...history.map(e => e.overallScore))
  const totalWords   = history.reduce((s, e) => s + (e.wordCount || 0), 0)
  const improvePct   = Math.round((stats.improvementCount / stats.totalEssays) * 100)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* SECTION A — Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--color-text)', margin: '0 0 4px 0' }}>
            Performance Reports
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', margin: 0 }}>
            Based on {stats.totalEssays} essay{stats.totalEssays !== 1 ? 's' : ''} scored
          </p>
        </div>
        <div style={{
          fontSize: '12px', color: 'var(--color-text-muted)',
          background: 'var(--color-surface)', border: '1px solid var(--color-border)',
          borderRadius: '8px', padding: '8px 14px', whiteSpace: 'nowrap',
        }}>
          {oldestDate === newestDate ? oldestDate : `${oldestDate} — ${newestDate}`}
        </div>
      </div>

      {/* SECTION B — Overall Performance */}
      <div style={{
        ...CARD,
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '32px',
      }}>
        {/* Left — Key Metrics */}
        <div>
          <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-text)', margin: '0 0 14px 0' }}>
            Key Metrics
          </h2>
          {[
            ['Average Score',        `${stats.averageScore}/100`],
            ['Best Score',           `${Math.round(stats.bestScore)}/100`],
            ['Worst Score',          `${Math.round(worstScore)}/100`],
            ['Total Words Written',  totalWords.toLocaleString()],
            ['Essays Improved',      `${stats.improvementCount} (${improvePct}%)`],
          ].map(([label, value]) => (
            <div key={label} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '10px 0', borderBottom: '1px solid var(--color-border)',
            }}>
              <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>{label}</span>
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text)' }}>{value}</span>
            </div>
          ))}
        </div>

        {/* Right — Average Dimension Scores */}
        <div>
          <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-text)', margin: '0 0 14px 0' }}>
            Average Dimension Scores
          </h2>
          {DIMS.map(({ key, label, max }) => {
            const avg = dimAvgs[key] ?? 0
            const pct = (avg / max) * 100
            const color = pct >= 66 ? '#22c55e' : pct >= 33 ? '#f59e0b' : '#ef4444'
            return (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <span style={{ width: '96px', fontSize: '12px', fontWeight: 500, color: 'var(--color-text)', flexShrink: 0 }}>
                  {label}
                </span>
                <div style={{ flex: 1, height: '6px', borderRadius: '9999px', background: '#f3f4f6', overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: '9999px' }} />
                </div>
                <span style={{ fontSize: '12px', fontWeight: 600, color, width: '42px', textAlign: 'right', flexShrink: 0 }}>
                  {avg.toFixed(1)}/{max}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* SECTION C — Score Trend */}
      <div style={CARD}>
        <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-text)', margin: '0 0 16px 0' }}>
          Score Over Time
        </h2>
        <ScoreTrendChart data={trendData} />
      </div>

      {/* SECTION D — Topic Performance table */}
      <div style={CARD}>
        <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-text)', margin: '0 0 16px 0' }}>
          Performance by Topic
        </h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                {['Topic', 'Essays', 'Avg Score', 'Best', 'Improved'].map(col => (
                  <th key={col} style={{
                    padding: '8px 12px',
                    textAlign: col === 'Topic' ? 'left' : 'center',
                    fontSize: '11px', fontWeight: 600,
                    color: 'var(--color-text-muted)',
                    textTransform: 'uppercase', letterSpacing: '0.06em',
                  }}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {topicTableData.map(({ topic, count, avg, best, improvements }) => (
                <tr key={topic} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--color-text)' }}>
                    {topic}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    {count}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                    <span style={{
                      background: scoreBg(avg), color: scoreColor(avg),
                      borderRadius: '6px', padding: '3px 10px', fontWeight: 700,
                    }}>
                      {avg.toFixed(1)}
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    {Math.round(best)}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    {improvements > 0 ? improvements : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION E — Dimension Analysis */}
      <div style={CARD}>
        <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-text)', margin: '0 0 20px 0' }}>
          Dimension Breakdown
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {DIMS.map(({ key, label, max }) => (
            <DimAnalysis
              key={key}
              dimKey={key}
              label={label}
              avg={dimAvgs[key] ?? 0}
              max={max}
            />
          ))}
        </div>
      </div>

    </div>
  )
}
