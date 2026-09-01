export interface Song {
  id: string
  title: string
  artist: string
  key: string
  capo?: number
  body: string // ChordPro-style text, see lib/chordpro.ts
}
