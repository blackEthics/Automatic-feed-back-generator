import ScoreBar from './ScoreBar'
import ScoreRing from './ScoreRing'

const DIMENSIONS = [
  {
    key: 'grammar',
    label: 'Grammar',
    max: 20,
    tooltip: 'Spelling, punctuation and sentence structure',
  },
  {
    key: 'relevance',
    label: 'Relevance',
    max: 25,
    tooltip: 'How well the essay addresses the given topic',
  },
  {
    key: 'organization',
    label: 'Organization',
    max: 20,
    tooltip: 'Introduction, conclusion and paragraph structure',
  },
  {
    key: 'clarity',
    label: 'Clarity',
    max: 20,
    tooltip: 'Readability and sentence length variety',
  },
  {
    key: 'vocabulary',
    label: 'Vocabulary',
    max: 15,
    tooltip: 'Word richness, academic language and complexity',
  },
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

export default function ResultsSection({ results, onReset }) {
  const { overall_score, asap_score, dimensions, feedback, word_count, processing_time_ms } = results

  return (
    <div className="space-y-5">
      {/* Overall score card with ring */}
      <div className="bg-white rounded-xl border border-gray-200 p-8 flex flex-col items-center gap-3">
        <ScoreRing score={overall_score} />
        <p className="text-base text-gray-500">
          ASAP Grade:{' '}
          <span className="font-semibold text-indigo-600">{asap_score.toFixed(1)}</span>
          <span className="text-gray-400"> / 6</span>
        </p>
        <p className="text-xs text-gray-400">
          {word_count} words &middot; scored in {Math.round(processing_time_ms)} ms
        </p>
      </div>

      {/* Dimension bars */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-5">
          Dimension Scores
        </h2>
        <div className="space-y-4">
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

      {/* Feedback */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
          Feedback
        </h2>

        <p className="text-sm text-gray-700 leading-relaxed">{feedback.overall}</p>

        {feedback.priority && (
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
              Priority Improvements
            </h3>
            <ul className="space-y-1.5">
              <li className="flex gap-2.5 text-sm text-gray-700">
                <span className="text-amber-500 shrink-0 mt-0.5">&#9654;</span>
                <span>{feedback.priority}</span>
              </li>
            </ul>
          </div>
        )}

        {feedback.specific_tips?.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
              Specific Tips
            </h3>
            <ul className="space-y-2">
              {feedback.specific_tips.map((tip, i) => (
                <li key={i} className="flex gap-2.5 text-sm text-gray-700">
                  <span className="text-indigo-400 shrink-0 mt-0.5">&#8226;</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => downloadReport(results)}
          className="flex-1 border border-gray-300 hover:border-gray-400 text-gray-700 hover:text-gray-900 text-sm font-semibold rounded-lg px-4 py-3 transition-colors"
        >
          Download Report
        </button>
        <button
          onClick={onReset}
          className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg px-4 py-3 transition-colors"
        >
          Score Another Essay
        </button>
      </div>
    </div>
  )
}
