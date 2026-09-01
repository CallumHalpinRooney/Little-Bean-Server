import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getSong } from '../data/songs'
import { parseSong, transposeBody } from '../lib/chordpro'
import { pcName, parseChordSymbol } from '../lib/musicTheory'
import ChordLyricLine from '../components/ChordLyricLine'
import ChordPopup, { type Instrument } from '../components/ChordPopup'
import ScrollPlayer from '../components/ScrollPlayer'

export default function SongView() {
  const { id } = useParams<{ id: string }>()
  const song = id ? getSong(id) : undefined

  const [semitones, setSemitones] = useState(0)
  const [instrument, setInstrument] = useState<Instrument>('guitar')
  const [popup, setPopup] = useState<{ chord: string; rect: DOMRect } | null>(null)

  const lines = useMemo(() => {
    if (!song) return []
    return parseSong(transposeBody(song.body, semitones))
  }, [song, semitones])

  const displayKey = useMemo(() => {
    if (!song) return ''
    const parsed = parseChordSymbol(song.key)
    if (!parsed || semitones === 0) return song.key
    return pcName(parsed.rootPc + semitones) + song.key.slice(parsed.root.length)
  }, [song, semitones])

  if (!song) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-10">
        <p className="text-ink-500">Song not found.</p>
        <Link to="/" className="text-fuchsia-400 hover:underline">
          Back to songs
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-5 pb-32 pt-8">
      <Link to="/" className="text-sm text-ink-500 hover:text-white">
        &larr; All songs
      </Link>

      <header className="mt-3 mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">{song.title}</h1>
          <p className="text-ink-500">{song.artist}</p>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          <div className="flex items-center gap-1 rounded-full border border-ink-600 bg-ink-800 px-1 py-1">
            <button
              onClick={() => setSemitones((s) => s - 1)}
              className="grid h-7 w-7 place-items-center rounded-full text-ink-500 hover:bg-ink-700 hover:text-white"
              title="Transpose down"
            >
              &minus;
            </button>
            <span className="w-10 text-center text-sm font-medium text-white">{displayKey}</span>
            <button
              onClick={() => setSemitones((s) => s + 1)}
              className="grid h-7 w-7 place-items-center rounded-full text-ink-500 hover:bg-ink-700 hover:text-white"
              title="Transpose up"
            >
              +
            </button>
          </div>

          <div className="flex gap-1 rounded-full bg-ink-800 p-1">
            {(['guitar', 'piano'] as Instrument[]).map((i) => (
              <button
                key={i}
                onClick={() => setInstrument(i)}
                className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition ${
                  instrument === i ? 'bg-fuchsia-500 text-white' : 'text-ink-500 hover:text-white'
                }`}
              >
                {i}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="space-y-4">
        {lines.map((line, i) => {
          if (line.type === 'blank') return <div key={i} className="h-3" />
          if (line.type === 'section') {
            return (
              <p key={i} className="pt-3 text-xs font-semibold uppercase tracking-wide text-fuchsia-400">
                {line.label}
              </p>
            )
          }
          return (
            <ChordLyricLine
              key={i}
              segments={line.segments}
              activeChord={popup?.chord ?? null}
              onChordClick={(chord, el) => setPopup({ chord, rect: el.getBoundingClientRect() })}
            />
          )
        })}
      </div>

      {popup && (
        <ChordPopup
          chord={popup.chord}
          anchorRect={popup.rect}
          instrument={instrument}
          onInstrumentChange={setInstrument}
          onClose={() => setPopup(null)}
        />
      )}

      <ScrollPlayer />
    </div>
  )
}
