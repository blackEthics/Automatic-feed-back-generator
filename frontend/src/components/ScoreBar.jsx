function barColor(pct) {
  if (pct >= 0.66) return 'bg-green-500'
  if (pct >= 0.33) return 'bg-amber-400'
  return 'bg-red-500'
}

function InfoIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
    </svg>
  )
}

export default function ScoreBar({ label, score, max, tooltip }) {
  const pct = score / max

  return (
    <div>
      <div className="flex justify-between items-center text-sm mb-1.5">
        <div className="flex items-center gap-1.5">
          <span className="font-medium text-gray-700">{label}</span>
          {tooltip && (
            <div className="relative group">
              <button
                type="button"
                aria-label={`About ${label}`}
                className="text-gray-400 hover:text-gray-600 focus:outline-none flex items-center"
              >
                <InfoIcon />
              </button>
              <div className="hidden group-hover:block absolute left-0 bottom-full mb-2 z-20 w-56 bg-gray-800 text-white text-xs rounded-lg px-3 py-2 shadow-xl pointer-events-none">
                {tooltip}
                {/* caret */}
                <span className="absolute left-3 top-full block w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-gray-800" />
              </div>
            </div>
          )}
        </div>
        <span className="tabular-nums text-gray-500">
          {score.toFixed(1)} <span className="text-gray-300">/</span> {max}
        </span>
      </div>
      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${barColor(pct)}`}
          style={{ width: `${Math.round(pct * 100)}%` }}
        />
      </div>
    </div>
  )
}
