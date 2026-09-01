const WHITE_PCS = [0, 2, 4, 5, 7, 9, 11] // C D E F G A B
const BLACK_AFTER = new Set([0, 1, 3, 4, 5]) // white-key index (within octave) that has a black key right after it
const OCTAVES = 2

const WKW = 28 // white key width
const WKH = 108
const BKW = 17
const BKH = 66

export default function PianoDiagram({ pitchClasses }: { pitchClasses: number[] }) {
  const highlighted = new Set(pitchClasses)
  const totalWhite = WHITE_PCS.length * OCTAVES
  const width = totalWhite * WKW
  const height = WKH

  const whiteKeys: { x: number; pc: number }[] = []
  const blackKeys: { x: number; pc: number }[] = []

  for (let oct = 0; oct < OCTAVES; oct++) {
    WHITE_PCS.forEach((pc, i) => {
      const idx = oct * 7 + i
      whiteKeys.push({ x: idx * WKW, pc })
      if (BLACK_AFTER.has(i)) {
        blackKeys.push({ x: (idx + 1) * WKW - BKW / 2, pc: pc + 1 })
      }
    })
  }

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} className="select-none">
      {whiteKeys.map((k, i) => (
        <g key={i}>
          <rect
            x={k.x}
            y={0}
            width={WKW}
            height={WKH}
            fill={highlighted.has(k.pc) ? '#f3e8ff' : '#e7e9ee'}
            stroke="#16171d"
            strokeWidth={1}
            rx={2}
          />
          {highlighted.has(k.pc) && (
            <circle cx={k.x + WKW / 2} cy={WKH - 18} r={6} fill="#c026d3" />
          )}
        </g>
      ))}
      {blackKeys.map((k, i) => (
        <g key={i}>
          <rect
            x={k.x}
            y={0}
            width={BKW}
            height={BKH}
            fill={highlighted.has(k.pc % 12) ? '#a855f7' : '#0b0c10'}
            stroke="#0b0c10"
            strokeWidth={1}
            rx={1.5}
          />
          {highlighted.has(k.pc % 12) && (
            <circle cx={k.x + BKW / 2} cy={BKH - 14} r={4.5} fill="#fff" />
          )}
        </g>
      ))}
    </svg>
  )
}
