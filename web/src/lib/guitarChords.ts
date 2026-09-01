import type { ParsedChord, ChordQuality } from './musicTheory'
import { CHORD_INTERVALS } from './musicTheory'

// One entry per string, low E (string 6) to high e (string 1).
// null = muted, 0 = open, N = fretted at N.
export type StringFrets = (number | null)[]

export interface GuitarShape {
  frets: StringFrets
  fingers: (number | null)[]
  source: 'open' | 'generated'
}

// Standard tuning, open string pitch classes, low E to high e.
const OPEN_STRING_PC = [4, 9, 2, 7, 11, 4]

// Hand-picked open-position / easy shapes for the chords guitarists play
// most often. Anything not listed here falls back to generateShape().
const OPEN_SHAPES: Record<string, StringFrets> = {
  'C|maj': [null, 3, 2, 0, 1, 0],
  'C|7': [null, 3, 2, 3, 1, 0],
  'C|maj7': [null, 3, 2, 0, 0, 0],
  'C|6': [null, 3, 2, 2, 1, 0],
  'C|sus4': [null, 3, 3, 0, 1, 1],

  'D|maj': [null, null, 0, 2, 3, 2],
  'D|min': [null, null, 0, 2, 3, 1],
  'D|7': [null, null, 0, 2, 1, 2],
  'D|maj7': [null, null, 0, 2, 2, 2],
  'D|min7': [null, null, 0, 2, 1, 1],
  'D|sus2': [null, null, 0, 2, 3, 0],
  'D|sus4': [null, null, 0, 2, 3, 3],

  'E|maj': [0, 2, 2, 1, 0, 0],
  'E|min': [0, 2, 2, 0, 0, 0],
  'E|7': [0, 2, 0, 1, 0, 0],
  'E|min7': [0, 2, 0, 0, 0, 0],
  'E|maj7': [0, 2, 1, 1, 0, 0],
  'E|sus4': [0, 2, 2, 2, 0, 0],

  'F|maj': [null, null, 3, 2, 1, 1],
  'F|maj7': [null, null, 3, 2, 1, 0],
  'F|min': [null, null, 3, 1, 1, 1],

  'G|maj': [3, 2, 0, 0, 0, 3],
  'G|maj7': [3, 2, 0, 0, 0, 2],
  'G|7': [3, 2, 0, 0, 0, 1],
  'G|6': [3, 2, 0, 0, 0, 0],
  'G|sus4': [3, 2, 0, 0, 1, 3],

  'A|maj': [null, 0, 2, 2, 2, 0],
  'A|min': [null, 0, 2, 2, 1, 0],
  'A|7': [null, 0, 2, 0, 2, 0],
  'A|min7': [null, 0, 2, 0, 1, 0],
  'A|maj7': [null, 0, 2, 1, 2, 0],
  'A|sus2': [null, 0, 2, 2, 0, 0],
  'A|sus4': [null, 0, 2, 2, 3, 0],
  'A|6': [null, 0, 2, 2, 2, 2],
  'A|min6': [null, 0, 2, 2, 1, 2],

  'B|7': [null, 2, 1, 2, 0, 2],
  'B|min': [null, 2, 4, 4, 3, 2],
  'B|maj': [null, 2, 4, 4, 4, 2],
}

function autoFingers(frets: StringFrets): (number | null)[] {
  const fretted = frets
    .map((f, i) => ({ f, i }))
    .filter((x): x is { f: number; i: number } => typeof x.f === 'number' && x.f > 0)
  const result: (number | null)[] = frets.map((f) => (f === null ? null : 0))
  if (fretted.length === 0) return result
  const minFret = Math.min(...fretted.map((x) => x.f))
  const barreGroup = fretted.filter((x) => x.f === minFret)
  const rest = fretted
    .filter((x) => x.f !== minFret)
    .sort((a, b) => (a.f - b.f) || (a.i - b.i))
  for (const { i } of barreGroup) result[i] = 1
  let finger = barreGroup.length > 1 ? 2 : 2
  for (const { i } of rest) {
    result[i] = Math.min(finger, 4)
    finger++
  }
  if (barreGroup.length === 1) result[barreGroup[0].i] = fretted.length > 1 ? 1 : 1
  return result
}

// Movable-shape fallback: place the root on string 6 or string 5 (whichever
// gives the lower fret), then walk outward picking the nearest fret on each
// remaining string that sounds a chord tone. Guarantees every parseable
// chord symbol renders *some* playable shape, even ones with no hand-tuned
// entry above.
function generateShape(rootPc: number, quality: ChordQuality): StringFrets {
  const pitchClasses = new Set(CHORD_INTERVALS[quality].map((iv) => (rootPc + iv) % 12))

  const fretOnString = (stringIdx: number) => (rootPc - OPEN_STRING_PC[stringIdx] + 12) % 12
  const bassOptions = [{ str: 0, fret: fretOnString(0) }, { str: 1, fret: fretOnString(1) }]
  bassOptions.sort((a, b) => a.fret - b.fret)
  const { str: rootString, fret: rootFret } = bassOptions[0]
  const baseFret = Math.max(rootFret, 0)

  const frets: StringFrets = new Array(6).fill(null)
  frets[rootString] = rootFret

  for (let s = rootString + 1; s < 6; s++) {
    let chosen: number | null = null
    for (let f = baseFret; f <= baseFret + 4; f++) {
      const pc = (OPEN_STRING_PC[s] + f) % 12
      if (pitchClasses.has(pc)) {
        chosen = f
        break
      }
    }
    frets[s] = chosen
  }

  return frets
}

export function getGuitarShape(parsed: ParsedChord): GuitarShape {
  const key = `${parsed.root}|${parsed.quality}`
  const open = OPEN_SHAPES[key]
  if (open) {
    return { frets: open, fingers: autoFingers(open), source: 'open' }
  }
  const frets = generateShape(parsed.rootPc, parsed.quality)
  return { frets, fingers: autoFingers(frets), source: 'generated' }
}
