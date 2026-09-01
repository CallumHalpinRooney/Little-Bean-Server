import type { GuitarShape } from '../lib/guitarChords'

const STRING_COUNT = 6
const FRET_SPAN = 4

export default function GuitarDiagram({ shape }: { shape: GuitarShape }) {
  const pressedFrets = shape.frets.filter((f): f is number => typeof f === 'number' && f > 0)
  const highestFret = pressedFrets.length ? Math.max(...pressedFrets) : 0
  const lowestFret = pressedFrets.length ? Math.min(...pressedFrets) : 0
  const baseFret = highestFret > FRET_SPAN ? lowestFret : 1

  const width = 200
  const height = 220
  const leftPad = 22
  const topPad = 34
  const bottomPad = 20
  const gridW = width - leftPad * 2
  const gridH = height - topPad - bottomPad
  const stringGap = gridW / (STRING_COUNT - 1)
  const fretGap = gridH / FRET_SPAN

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} className="select-none">
      {baseFret > 1 && (
        <text x={leftPad - 14} y={topPad + fretGap / 2} fontSize="12" fill="#9ca3af" textAnchor="middle">
          {baseFret}fr
        </text>
      )}

      {/* Nut or top bar */}
      <rect
        x={leftPad}
        y={topPad}
        width={gridW}
        height={baseFret === 1 ? 4 : 1.5}
        fill={baseFret === 1 ? '#e7e9ee' : '#454c5c'}
      />

      {/* Frets */}
      {Array.from({ length: FRET_SPAN }).map((_, i) => (
        <line
          key={i}
          x1={leftPad}
          x2={leftPad + gridW}
          y1={topPad + fretGap * (i + 1)}
          y2={topPad + fretGap * (i + 1)}
          stroke="#454c5c"
          strokeWidth={1}
        />
      ))}

      {/* Strings */}
      {Array.from({ length: STRING_COUNT }).map((_, i) => (
        <line
          key={i}
          x1={leftPad + stringGap * i}
          x2={leftPad + stringGap * i}
          y1={topPad}
          y2={topPad + gridH}
          stroke="#7d8494"
          strokeWidth={1}
        />
      ))}

      {/* Open / muted markers */}
      {shape.frets.map((f, i) => {
        const x = leftPad + stringGap * i
        if (f === null) {
          return (
            <text key={i} x={x} y={topPad - 12} fontSize="13" fill="#9ca3af" textAnchor="middle">
              ×
            </text>
          )
        }
        if (f === 0) {
          return (
            <circle key={i} cx={x} cy={topPad - 12} r={4.5} fill="none" stroke="#9ca3af" strokeWidth={1.5} />
          )
        }
        return null
      })}

      {/* Fretted dots */}
      {shape.frets.map((f, i) => {
        if (typeof f !== 'number' || f === 0) return null
        const relativeFret = f - baseFret + 1
        if (relativeFret < 1 || relativeFret > FRET_SPAN) return null
        const x = leftPad + stringGap * i
        const y = topPad + fretGap * (relativeFret - 0.5)
        const finger = shape.fingers[i]
        return (
          <g key={i}>
            <circle cx={x} cy={y} r={9} fill="#c084fc" />
            {finger ? (
              <text x={x} y={y + 4} fontSize="11" fill="#16171d" textAnchor="middle" fontWeight={600}>
                {finger}
              </text>
            ) : null}
          </g>
        )
      })}
    </svg>
  )
}
