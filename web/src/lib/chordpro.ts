import { transposeChordSymbol } from './musicTheory'

// Minimal ChordPro-style parser. Songs are authored as plain text where a
// chord is written inline in square brackets right before the syllable it
// falls on, e.g. "[G]When you were [B]here before". This is the same
// convention ChordPro/Ultimate-Guitar/tab4u-style sites use, and it keeps
// song data easy to type or paste without hand-aligning ASCII art.

export interface ChordSegment {
  chord: string | null
  text: string
}

export type SongLine =
  | { type: 'lyric'; segments: ChordSegment[] }
  | { type: 'blank' }
  | { type: 'section'; label: string }

const SECTION_RE = /^\s*\[\[(.+)\]\]\s*$/ // [[Chorus]], [[Verse 1]]
const CHORD_TOKEN_RE = /\[([^\]]+)\]/g

export function parseLyricLine(line: string): ChordSegment[] {
  const segments: ChordSegment[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  CHORD_TOKEN_RE.lastIndex = 0
  const pending: { index: number; chord: string }[] = []
  while ((match = CHORD_TOKEN_RE.exec(line)) !== null) {
    pending.push({ index: match.index, chord: match[1] })
  }

  if (pending.length === 0) {
    return [{ chord: null, text: line }]
  }

  // Strip chord tokens out, building text segments between them so each
  // chord ends up anchored above the exact character it preceded.
  let cursor = 0
  let plain = ''
  const stripped: { plainIndex: number; chord: string }[] = []
  for (const p of pending) {
    plain += line.slice(cursor, p.index)
    stripped.push({ plainIndex: plain.length, chord: p.chord })
    cursor = p.index + p.chord.length + 2
  }
  plain += line.slice(cursor)

  lastIndex = 0
  for (let i = 0; i < stripped.length; i++) {
    const { plainIndex, chord } = stripped[i]
    if (plainIndex > lastIndex) {
      segments.push({ chord: null, text: plain.slice(lastIndex, plainIndex) })
    }
    const nextBoundary = i + 1 < stripped.length ? stripped[i + 1].plainIndex : plain.length
    const text = plain.slice(plainIndex, nextBoundary) || ' '
    segments.push({ chord, text })
    lastIndex = nextBoundary
  }

  return segments
}

export function transposeBody(body: string, semitones: number): string {
  if (semitones === 0) return body
  return body.replace(CHORD_TOKEN_RE, (_match, chord: string) => `[${transposeChordSymbol(chord, semitones)}]`)
}

export function parseSong(body: string): SongLine[] {
  return body.replace(/\r\n/g, '\n').split('\n').map((raw): SongLine => {
    if (raw.trim() === '') return { type: 'blank' }
    const sectionMatch = SECTION_RE.exec(raw)
    if (sectionMatch) return { type: 'section', label: sectionMatch[1] }
    return { type: 'lyric', segments: parseLyricLine(raw) }
  })
}
