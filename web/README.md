# ChordBook

A clean, fast chords-and-lyrics app in the spirit of tab4u: browse songs, see
lyrics with chords positioned exactly where they're played, tap any chord to
see how to play it on guitar or piano, and auto-scroll while you play.

## Run it

```bash
cd web
npm install
npm run dev
```

## How it works

- **Songs** live in `src/data/songs.ts`. Each song's `body` is plain text
  using a ChordPro-style syntax: put the chord in square brackets right
  before the syllable it's played on, e.g.

  ```
  [G]When you were [B]here before
  ```

  Blank lines separate sections; `[[Verse]]` / `[[Chorus]]` lines add a
  section label. To add a song, just push another object onto the `songs`
  array with `id`, `title`, `artist`, `key`, and `body`.

- **Chord diagrams are computed, not drawn by hand.** `src/lib/musicTheory.ts`
  parses any chord symbol (root + quality, e.g. `F#m7`) into its notes.
  Piano diagrams (`PianoDiagram.tsx`) highlight those notes directly on a
  keyboard, so every chord works automatically. Guitar diagrams
  (`GuitarDiagram.tsx` + `lib/guitarChords.ts`) use a hand-picked table of
  common open-position shapes, and fall back to a generated movable shape
  for anything not in the table — so every chord always renders *something*
  playable, not a blank box.

- **Transpose** shifts every chord in the song by semitones without touching
  the lyrics, using the same chord-parsing engine.

- **Auto-scroll** (`hooks/useAutoScroll.ts`) scrolls the page smoothly via
  `requestAnimationFrame` at an adjustable speed while you play along.

## Adding more songs

Copyright note: reproducing full copyrighted lyrics/chords for many songs in
a public app is the same legal grey area sites like Ultimate Guitar and
tab4u operate in. The seed data here leans on public-domain/traditional
songs for that reason. Add your own songs at your own discretion.
