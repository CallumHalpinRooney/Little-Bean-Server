// Core music-theory primitives: note names, chord parsing, and interval
// formulas used to derive piano voicings for ANY chord symbol without
// needing a hand-authored diagram per chord.

export const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const
export const FLAT_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'] as const

const NOTE_TO_PC: Record<string, number> = {
  C: 0, 'B#': 0,
  'C#': 1, Db: 1,
  D: 2,
  'D#': 3, Eb: 3,
  E: 4, Fb: 4,
  F: 5, 'E#': 5,
  'F#': 6, Gb: 6,
  G: 7,
  'G#': 8, Ab: 8,
  A: 9,
  'A#': 10, Bb: 10,
  B: 11, Cb: 11,
}

export type ChordQuality =
  | 'maj' | 'min' | '7' | 'maj7' | 'min7' | 'dim' | 'dim7' | 'aug'
  | 'sus2' | 'sus4' | '6' | 'min6' | '9' | 'add9' | 'min7b5'

export interface ParsedChord {
  raw: string
  root: string
  rootPc: number
  quality: ChordQuality
  bass?: string
  bassPc?: number
}

// Interval formulas in semitones from the root, used to build piano voicings.
export const CHORD_INTERVALS: Record<ChordQuality, number[]> = {
  maj: [0, 4, 7],
  min: [0, 3, 7],
  '7': [0, 4, 7, 10],
  maj7: [0, 4, 7, 11],
  min7: [0, 3, 7, 10],
  dim: [0, 3, 6],
  dim7: [0, 3, 6, 9],
  aug: [0, 4, 8],
  sus2: [0, 2, 7],
  sus4: [0, 5, 7],
  '6': [0, 4, 7, 9],
  min6: [0, 3, 7, 9],
  '9': [0, 4, 7, 10, 14],
  add9: [0, 4, 7, 14],
  min7b5: [0, 3, 6, 10],
}

export const QUALITY_LABEL: Record<ChordQuality, string> = {
  maj: '', min: 'm', '7': '7', maj7: 'maj7', min7: 'm7', dim: 'dim',
  dim7: 'dim7', aug: 'aug', sus2: 'sus2', sus4: 'sus4', '6': '6',
  min6: 'm6', '9': '9', add9: 'add9', min7b5: 'm7b5',
}

const QUALITY_ALIASES: [RegExp, ChordQuality][] = [
  [/^maj7$/, 'maj7'], [/^Maj7$/, 'maj7'], [/^M7$/, 'maj7'],
  [/^m7b5$/, 'min7b5'], [/^min7b5$/, 'min7b5'], [/^m7-5$/, 'min7b5'], [/^ø7$/, 'min7b5'],
  [/^dim7$/, 'dim7'],
  [/^dim$/, 'dim'], [/^o$/, 'dim'],
  [/^aug$/, 'aug'], [/^\+$/, 'aug'],
  [/^sus2$/, 'sus2'],
  [/^sus4?$/, 'sus4'], [/^sus$/, 'sus4'],
  [/^add9$/, 'add9'],
  [/^min6$/, 'min6'], [/^m6$/, 'min6'],
  [/^6$/, '6'],
  [/^9$/, '9'],
  [/^min7$/, 'min7'], [/^m7$/, 'min7'],
  [/^min$/, 'min'], [/^m$/, 'min'], [/^mi$/, 'min'],
  [/^maj$/, 'maj'], [/^M$/, 'maj'],
  [/^7$/, '7'],
  [/^$/, 'maj'],
]

const CHORD_RE = /^([A-Ga-g])([#b]?)((?:maj7|Maj7|M7|min7b5|m7b5|m7-5|dim7|sus2|sus4|add9|min7|min6|maj|dim|aug|sus|m6|m7|mi|9|6|7|m|M)?)(?:\/([A-Ga-g])([#b]?))?$/

export function parseChordSymbol(symbol: string): ParsedChord | null {
  const trimmed = symbol.trim()
  const m = CHORD_RE.exec(trimmed)
  if (!m) return null
  const [, rootLetter, rootAcc, qualityRaw, bassLetter, bassAcc] = m
  const rootName = rootLetter.toUpperCase() + rootAcc
  const rootPc = NOTE_TO_PC[rootName]
  if (rootPc === undefined) return null

  let quality: ChordQuality = 'maj'
  for (const [re, q] of QUALITY_ALIASES) {
    if (re.test(qualityRaw)) {
      quality = q
      break
    }
  }

  let bass: string | undefined
  let bassPc: number | undefined
  if (bassLetter) {
    bass = bassLetter.toUpperCase() + bassAcc
    bassPc = NOTE_TO_PC[bass]
  }

  return { raw: trimmed, root: rootName, rootPc, quality, bass, bassPc }
}

export function isLikelyChordToken(token: string): boolean {
  if (!token) return false
  return parseChordSymbol(token) !== null
}

export function pcName(pc: number, preferFlat = false): string {
  const wrapped = ((pc % 12) + 12) % 12
  return preferFlat ? FLAT_NAMES[wrapped] : SHARP_NAMES[wrapped]
}

export function transposeChordSymbol(symbol: string, semitones: number): string {
  const parsed = parseChordSymbol(symbol)
  if (!parsed || semitones === 0) return symbol
  const preferFlat = symbol.includes('b') && !symbol.toLowerCase().includes('maj')
  const newRoot = pcName(parsed.rootPc + semitones, preferFlat)
  const qualityLabel = QUALITY_LABEL[parsed.quality]
  const bassPart = parsed.bassPc !== undefined ? '/' + pcName(parsed.bassPc + semitones, preferFlat) : ''
  return newRoot + qualityLabel + bassPart
}

// Pitch classes (0-11) that make up the chord, root-first.
export function chordPitchClasses(parsed: ParsedChord): number[] {
  const intervals = CHORD_INTERVALS[parsed.quality]
  return intervals.map((i) => (parsed.rootPc + i) % 12)
}
