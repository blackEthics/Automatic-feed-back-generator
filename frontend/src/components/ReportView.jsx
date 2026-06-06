import { createPortal } from 'react-dom'

const DIMENSIONS = [
  { key: 'grammar',      label: 'Grammar',      max: 20 },
  { key: 'relevance',    label: 'Relevance',     max: 25 },
  { key: 'organization', label: 'Organization',  max: 20 },
  { key: 'clarity',      label: 'Clarity',       max: 20 },
  { key: 'vocabulary',   label: 'Vocabulary',    max: 15 },
]

function getScoreLabel(score) {
  if (score >= 90) return 'Excellent'
  if (score >= 75) return 'Good'
  if (score >= 60) return 'Satisfactory'
  if (score >= 40) return 'Developing'
  return 'Needs Work'
}

function PrintBar({ label, score, max }) {
  const pct = Math.round((score / max) * 100)
  return (
    <div style={{ marginBottom: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontFamily: 'Arial, sans-serif', fontSize: '11pt' }}>
        <span style={{ fontWeight: 600, color: '#1e293b' }}>{label}</span>
        <span style={{ color: '#555', fontWeight: 500 }}>{score.toFixed(1)} / {max}</span>
      </div>
      <div style={{ background: '#e5e7eb', borderRadius: '4px', height: '12px', width: '100%' }}>
        <div style={{ background: '#6C63FF', borderRadius: '4px', height: '12px', width: `${pct}%` }} />
      </div>
    </div>
  )
}

const sectionTitle = {
  fontFamily: 'Arial, sans-serif',
  fontSize: '9pt',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: '#6C63FF',
  borderBottom: '1px solid #d1d5db',
  paddingBottom: '5px',
  marginBottom: '14px',
  marginTop: '22px',
}

export default function ReportView({ scoreData, improvementData, essayText }) {
  if (!scoreData) return createPortal(<div className="print-report" />, document.body)

  const date = new Date().toLocaleDateString('en-GB', {
    day: '2-digit', month: 'long', year: 'numeric',
  })

  const { overall_score, asap_score, dimensions, feedback, word_count } = scoreData
  const score = Math.round(overall_score)
  const label = getScoreLabel(score)

  const scoreDiff = improvementData
    ? (improvementData.score_after.overall_score - improvementData.score_before.overall_score).toFixed(1)
    : null

  return createPortal(
    <div className="print-report">

      {/* ── PAGE 1: Score Report ── */}
      <div>
        {/* Header */}
        <div style={{ borderBottom: '2px solid #6C63FF', paddingBottom: '12px', marginBottom: '4px' }}>
          <h1 style={{ fontFamily: 'Arial, sans-serif', fontSize: '18pt', fontWeight: 700, color: '#1e293b', margin: '0 0 4px 0' }}>
            EssayAI — Academic Writing Report
          </h1>
          <p style={{ fontFamily: 'Arial, sans-serif', fontSize: '10pt', color: '#6B7280', margin: 0 }}>
            Generated: {date}
          </p>
        </div>

        {/* Overall Score */}
        <p style={sectionTitle}>Overall Score</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '4px', flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'Arial, sans-serif', fontSize: '38pt', fontWeight: 700, color: '#6C63FF', lineHeight: 1 }}>
            {score}
            <span style={{ fontSize: '16pt', color: '#9CA3AF', fontWeight: 500 }}>/100</span>
          </span>
          <span style={{ fontFamily: 'Arial, sans-serif', fontSize: '14pt', fontWeight: 600, color: '#374151' }}>
            ASAP Grade: {asap_score.toFixed(1)}/6
          </span>
          <span style={{
            fontFamily: 'Arial, sans-serif',
            fontSize: '11pt',
            fontWeight: 700,
            color: '#6C63FF',
            background: '#EEF2FF',
            padding: '4px 14px',
            borderRadius: '4px',
            border: '1px solid #c7d2fe',
          }}>
            {label}
          </span>
        </div>

        {/* Dimension Scores */}
        <p style={sectionTitle}>Dimension Scores</p>
        {DIMENSIONS.map(({ key, label: dimLabel, max }) => (
          <PrintBar
            key={key}
            label={dimLabel}
            score={dimensions[key].score}
            max={max}
          />
        ))}

        {/* AI Feedback */}
        <p style={sectionTitle}>AI Feedback</p>
        <p style={{ fontFamily: 'Georgia, serif', fontSize: '11pt', lineHeight: '1.7', color: '#1e293b', margin: '0 0 14px 0' }}>
          {feedback.overall}
        </p>

        {(feedback.priority || feedback.specific_tips?.length > 0) && (
          <div>
            <p style={{ fontFamily: 'Arial, sans-serif', fontSize: '10pt', fontWeight: 700, margin: '0 0 8px 0', color: '#374151' }}>
              Priority Improvements:
            </p>
            <ul style={{ margin: 0, paddingLeft: '20px', fontFamily: 'Georgia, serif', fontSize: '11pt', lineHeight: '1.8', color: '#374151' }}>
              {feedback.priority && <li>{feedback.priority}</li>}
              {feedback.specific_tips?.map((tip, i) => <li key={i}>{tip}</li>)}
            </ul>
          </div>
        )}

        {/* Original Essay */}
        <p style={sectionTitle}>Original Essay</p>
        <p style={{ fontFamily: 'Arial, sans-serif', fontSize: '10pt', color: '#6B7280', margin: '0 0 10px 0' }}>
          Word count: {word_count}
        </p>
        <p style={{ fontFamily: 'Georgia, serif', fontSize: '11pt', lineHeight: '1.8', color: '#1e293b', margin: 0, whiteSpace: 'pre-wrap' }}>
          {essayText}
        </p>
      </div>

      {/* ── PAGE 2: Improvement Report (conditional) ── */}
      {improvementData && (
        <div style={{ pageBreakBefore: 'always' }}>

          {/* Header */}
          <div style={{ borderBottom: '2px solid #6C63FF', paddingBottom: '12px', marginBottom: '4px' }}>
            <h1 style={{ fontFamily: 'Arial, sans-serif', fontSize: '18pt', fontWeight: 700, color: '#1e293b', margin: '0 0 4px 0' }}>
              Improvement Analysis
            </h1>
            <p style={{ fontFamily: 'Arial, sans-serif', fontSize: '10pt', color: '#6B7280', margin: 0 }}>
              NLP-powered improvements applied to original essay
            </p>
          </div>

          {/* Changes Summary */}
          <p style={sectionTitle}>Changes Summary</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0', border: '1px solid #e5e7eb', borderRadius: '6px', overflow: 'hidden', width: '320px' }}>
            {[
              ['Grammar fixes',       improvementData.summary.grammar_fixes],
              ['Vocabulary upgrades', improvementData.summary.vocabulary_upgrades],
              ['Transitions added',   improvementData.summary.transitions_added],
              ['Total changes',       improvementData.summary.total_changes],
            ].map(([rowLabel, val], i, arr) => (
              <div key={rowLabel} style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '8px 14px',
                fontFamily: 'Arial, sans-serif',
                fontSize: '11pt',
                borderBottom: i < arr.length - 1 ? '1px solid #e5e7eb' : 'none',
                background: i % 2 === 0 ? '#f9fafb' : '#ffffff',
              }}>
                <span style={{ color: '#6B7280' }}>{rowLabel}</span>
                <span style={{ fontWeight: 700, color: '#1e293b' }}>{val}</span>
              </div>
            ))}
          </div>

          {/* Score Improvement */}
          <p style={sectionTitle}>Score Improvement</p>
          <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '13pt', marginBottom: '6px', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span>
              Before: <strong>{improvementData.score_before.overall_score.toFixed(1)}/100</strong>
            </span>
            <span style={{ color: '#9CA3AF' }}>→</span>
            <span>
              After: <strong style={{ color: '#6C63FF' }}>{improvementData.score_after.overall_score.toFixed(1)}/100</strong>
            </span>
          </div>
          <p style={{ fontFamily: 'Arial, sans-serif', fontSize: '11pt', fontWeight: 700, color: '#16a34a', margin: '4px 0 0 0' }}>
            Change: +{scoreDiff} points
          </p>

          {/* What Was Changed */}
          <p style={sectionTitle}>What Was Changed</p>
          {improvementData.changes.length === 0 ? (
            <p style={{ fontFamily: 'Georgia, serif', fontSize: '11pt', color: '#6B7280', fontStyle: 'italic', margin: 0 }}>
              No changes were necessary — the essay was already well written.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {improvementData.changes.map((change, i) => (
                <div key={i} style={{ fontFamily: 'Arial, sans-serif', fontSize: '10.5pt', display: 'flex', gap: '8px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  <span style={{ color: '#9CA3AF', minWidth: '22px', flexShrink: 0, paddingTop: '1px' }}>{i + 1}.</span>
                  {change.original && (
                    <>
                      <span style={{ color: '#DC2626', fontStyle: 'italic' }}>"{change.original}"</span>
                      <span style={{ color: '#9CA3AF', fontWeight: 700 }}>→</span>
                    </>
                  )}
                  <span style={{ color: '#16a34a', fontStyle: 'italic' }}>"{change.improved}"</span>
                  {change.reason && (
                    <span style={{ color: '#9CA3AF', fontSize: '9.5pt' }}>({change.reason})</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Improved Essay */}
          <p style={sectionTitle}>Improved Essay</p>
          <p style={{ fontFamily: 'Georgia, serif', fontSize: '11pt', lineHeight: '1.8', color: '#1e293b', margin: 0, whiteSpace: 'pre-wrap' }}>
            {improvementData.improved_text}
          </p>
        </div>
      )}
    </div>,
    document.body
  )
}
