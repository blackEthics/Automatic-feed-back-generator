const DIMS = ['grammar', 'relevance', 'organization', 'clarity', 'vocabulary']
const LABELS = {
  grammar: 'Grammar',
  relevance: 'Relevance',
  organization: 'Organization',
  clarity: 'Clarity',
  vocabulary: 'Vocabulary',
}
const N = 5
const CX = 150
const CY = 150
const R = 82
const LABEL_R = 108

function ang(i) {
  return (2 * Math.PI * i) / N - Math.PI / 2
}

function cartesian(r, i) {
  const a = ang(i)
  return [CX + r * Math.cos(a), CY + r * Math.sin(a)]
}

function polyPts(rArr) {
  return rArr.map((r, i) => cartesian(r, i).join(',')).join(' ')
}

export default function RadarChart({ dimensions }) {
  const dataR = DIMS.map(k => (dimensions[k].score / dimensions[k].max) * R)

  return (
    <svg
      width="300"
      height="300"
      viewBox="0 0 300 300"
      style={{ display: 'block', margin: '0 auto', overflow: 'visible' }}
      aria-label="Radar chart of essay dimension scores"
    >
      {/* Background fill */}
      <polygon
        points={polyPts(Array(N).fill(R))}
        fill="rgba(248,250,252,0.8)"
        stroke="none"
      />

      {/* Concentric grid rings at 33%, 66%, 100% */}
      {[1 / 3, 2 / 3, 1].map(lvl => (
        <polygon
          key={lvl}
          points={polyPts(Array(N).fill(R * lvl))}
          fill="none"
          stroke="#E5E7EB"
          strokeWidth={lvl === 1 ? '1.5' : '1'}
        />
      ))}

      {/* Axis spokes */}
      {DIMS.map((_, i) => {
        const [x, y] = cartesian(R, i)
        return (
          <line key={i} x1={CX} y1={CY} x2={x} y2={y} stroke="#E5E7EB" strokeWidth="1" />
        )
      })}

      {/* Score polygon */}
      <polygon
        points={polyPts(dataR)}
        fill="rgba(108,99,255,0.2)"
        stroke="#6C63FF"
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {/* Data point dots */}
      {DIMS.map((k, i) => {
        const [x, y] = cartesian(dataR[i], i)
        return <circle key={k} cx={x} cy={y} r={4} fill="#6C63FF" />
      })}

      {/* Axis labels */}
      {DIMS.map((k, i) => {
        const a = ang(i)
        const lx = CX + LABEL_R * Math.cos(a)
        const ly = CY + LABEL_R * Math.sin(a)
        const anchor = Math.cos(a) > 0.1 ? 'start' : Math.cos(a) < -0.1 ? 'end' : 'middle'
        const upper = Math.sin(a) < 0
        const pct = Math.round((dimensions[k].score / dimensions[k].max) * 100)
        return (
          <text key={k} textAnchor={anchor} fontFamily="'Inter', system-ui, sans-serif">
            <tspan x={lx} y={ly} dy={upper ? '-10' : '4'} fontSize="9.5" fill="#64748B">
              {LABELS[k]}
            </tspan>
            <tspan x={lx} dy="13" fontSize="10" fontWeight="600" fill="#6C63FF">
              {pct}%
            </tspan>
          </text>
        )
      })}
    </svg>
  )
}
