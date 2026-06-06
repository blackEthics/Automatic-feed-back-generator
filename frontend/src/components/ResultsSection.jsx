import ScoreBar from './ScoreBar'
import ScoreRing from './ScoreRing'
import RadarChart from './charts/RadarChart'

const DIMENSIONS = [
  { key: 'grammar',      label: 'Grammar',      max: 20, tooltip: 'Spelling, punctuation and sentence structure' },
  { key: 'relevance',    label: 'Relevance',     max: 25, tooltip: 'How well the essay addresses the given topic' },
  { key: 'organization', label: 'Organization',  max: 20, tooltip: 'Introduction, conclusion and paragraph structure' },
  { key: 'clarity',      label: 'Clarity',       max: 20, tooltip: 'Readability and sentence length variety' },
  { key: 'vocabulary',   label: 'Vocabulary',    max: 15, tooltip: 'Word richness, academic language and complexity' },
]

function downloadReport(results) {
  const { overall_score, asap_score, dimensions, feedback, word_count } = results
  const lines = [
    'ESSAY SCORE REPORT',
    '==================',
    '',
    `Overall Score : ${Math.round(overall_score)} / 100`,
    `ASAP Grade    : ${asap_score.toFixed(1)} / 6`,
    `Word Count    : ${word_count}`,
    '',
    'DIMENSION SCORES',
    '----------------',
    `Grammar       : ${dimensions.grammar.score.toFixed(1)} / 20`,
    `Relevance     : ${dimensions.relevance.score.toFixed(1)} / 25`,
    `Organization  : ${dimensions.organization.score.toFixed(1)} / 20`,
    `Clarity       : ${dimensions.clarity.score.toFixed(1)} / 20`,
    `Vocabulary    : ${dimensions.vocabulary.score.toFixed(1)} / 15`,
    '',
    'FEEDBACK',
    '--------',
    'Overall Assessment:',
    feedback.overall,
  ]
  if (feedback.priority) {
    lines.push('', 'Priority Improvements:', `  • ${feedback.priority}`)
  }
  if (feedback.specific_tips?.length > 0) {
    lines.push('', 'Specific Tips:')
    feedback.specific_tips.forEach(tip => lines.push(`  • ${tip}`))
  }
  const blob = new Blob([lines.join('\n')], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'essay_report.txt'
  a.click()
  URL.revokeObjectURL(url)
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

function StatCard({ label, value, sub }) {
  return (
    <div style={{ ...card, padding: '13px 16px', textAlign: 'center' }}>
      <p style={{ fontSize: '10px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 5px 0' }}>
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

export default function ResultsSection({ results, onReset }) {
  const { overall_score, asap_score, dimensions, feedback, word_count, processing_time_ms } = results

  const strengths = DIMENSIONS.filter(d => dimensions[d.key].score / d.max >= 0.66)
  const needsWork = DIMENSIONS.filter(d => dimensions[d.key].score / d.max < 0.66)

  const radarDims = Object.fromEntries(
    DIMENSIONS.map(d => [d.key, { score: dimensions[d.key].score, max: d.max }])
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* Summary stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
        <StatCard label="Overall Score" value={Math.round(overall_score)} sub="/100" />
        <StatCard label="ASAP Grade" value={asap_score.toFixed(1)} sub="/6" />
        <StatCard label="Word Count" value={word_count} />
        <StatCard label="Processing Time" value={Math.round(processing_time_ms)} sub="ms" />
      </div>

      {/* Two-column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '40% 60%', gap: '16px', alignItems: 'start' }}>

        {/* LEFT: ring + radar + strengths/needs-work */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

          <div style={{ ...card, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 20px 18px' }}>
            <ScoreRing score={overall_score} />
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', margin: '10px 0 0 0' }}>
              ASAP Grade:{' '}
              <span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{asap_score.toFixed(1)}</span>
              <span style={{ color: '#CBD5E1' }}> / 6</span>
            </p>
          </div>

          <div style={{ ...card, paddingBottom: '12px' }}>
            <p style={secTitle}>Performance Profile</p>
            <RadarChart dimensions={radarDims} />
          </div>

          {strengths.length > 0 && (
            <div style={{ ...card, background: 'rgba(34,197,94,0.06)', borderColor: 'rgba(34,197,94,0.28)' }}>
              <p style={{ ...secTitle, color: '#16a34a' }}>Strengths</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                {strengths.map(d => {
                  const pct = Math.round((dimensions[d.key].score / d.max) * 100)
                  return (
                    <div key={d.key} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                      <span role="img" aria-label="check">✅</span>
                      <span style={{ fontWeight: 500, color: '#15803d' }}>{d.label}</span>
                      <span style={{ marginLeft: 'auto', fontSize: '12px', fontWeight: 600, color: '#16a34a' }}>{pct}%</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {needsWork.length > 0 && (
            <div style={{ ...card, background: 'rgba(245,158,11,0.06)', borderColor: 'rgba(245,158,11,0.28)' }}>
              <p style={{ ...secTitle, color: '#b45309' }}>Needs Work</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                {needsWork.map(d => {
                  const pct = Math.round((dimensions[d.key].score / d.max) * 100)
                  return (
                    <div key={d.key} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                      <span role="img" aria-label="warning">⚠️</span>
                      <span style={{ fontWeight: 500, color: '#92400e' }}>{d.label}</span>
                      <span style={{ marginLeft: 'auto', fontSize: '12px', fontWeight: 600, color: '#b45309' }}>{pct}%</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: dimension bars + AI feedback */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

          <div style={card}>
            <p style={secTitle}>Dimension Scores</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {DIMENSIONS.map(({ key, label, max, tooltip }) => (
                <ScoreBar
                  key={key}
                  label={label}
                  score={dimensions[key].score}
                  max={max}
                  tooltip={tooltip}
                />
              ))}
            </div>
          </div>

          <div style={card}>
            <p style={secTitle}>AI Feedback</p>

            <p style={{ fontSize: '14px', color: '#374151', lineHeight: '1.7', margin: 0 }}>
              {feedback.overall}
            </p>

            {feedback.priority && (
              <div style={{ marginTop: '18px' }}>
                <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 8px 0' }}>
                  Priority Improvements
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  <span style={{
                    background: '#FEF3C7',
                    color: '#78350F',
                    fontSize: '12px',
                    fontWeight: 500,
                    borderRadius: '9999px',
                    padding: '4px 13px',
                    border: '1px solid #FDE68A',
                    lineHeight: '1.5',
                  }}>
                    {feedback.priority}
                  </span>
                </div>
              </div>
            )}

            {feedback.specific_tips?.length > 0 && (
              <div style={{ marginTop: '18px' }}>
                <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 10px 0' }}>
                  Specific Tips
                </p>
                <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {feedback.specific_tips.map((tip, i) => (
                    <li key={i} style={{
                      display: 'flex',
                      gap: '10px',
                      paddingLeft: '12px',
                      borderLeft: '3px solid var(--color-primary)',
                      fontSize: '13px',
                      color: '#374151',
                      lineHeight: '1.5',
                    }}>
                      <span style={{ fontWeight: 700, color: 'var(--color-primary)', minWidth: '20px', flexShrink: 0 }}>
                        {i + 1}.
                      </span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: '12px' }}>
        <button
          onClick={() => downloadReport(results)}
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
            transition: 'border-color 0.15s, color 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#94A3B8'; e.currentTarget.style.color = '#111827' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.color = '#374151' }}
        >
          Download Report
        </button>
        <button
          onClick={onReset}
          style={{
            flex: 1,
            background: 'var(--color-primary)',
            color: '#FFFFFF',
            fontSize: '14px',
            fontWeight: 600,
            borderRadius: '10px',
            padding: '12px 16px',
            cursor: 'pointer',
            border: 'none',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-primary-dark)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'var(--color-primary)' }}
        >
          Score Another Essay
        </button>
      </div>
    </div>
  )
}
