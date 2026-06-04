const RADIUS = 48
const CIRC = 2 * Math.PI * RADIUS

function ringColor(score) {
  if (score >= 70) return '#22c55e'
  if (score >= 40) return '#f59e0b'
  return '#ef4444'
}

function scoreLabel(score) {
  if (score >= 80) return 'Excellent'
  if (score >= 70) return 'Good'
  if (score >= 50) return 'Developing'
  return 'Needs Work'
}

export default function ScoreRing({ score }) {
  const offset = CIRC * (1 - score / 100)
  const color = ringColor(score)

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-36 h-36">
        <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90" aria-hidden="true">
          {/* Track */}
          <circle cx="60" cy="60" r={RADIUS} fill="none" stroke="#f3f4f6" strokeWidth="9" />
          {/* Progress */}
          <circle
            cx="60" cy="60" r={RADIUS}
            fill="none"
            stroke={color}
            strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray={CIRC}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-bold text-gray-900 leading-none tabular-nums">
            {Math.round(score)}
          </span>
          <span className="text-xs text-gray-400 mt-0.5">/ 100</span>
        </div>
      </div>
      <p className="text-sm font-semibold mt-1.5" style={{ color }}>
        {scoreLabel(score)}
      </p>
    </div>
  )
}
