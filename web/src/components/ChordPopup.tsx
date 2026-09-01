import { useEffect, useMemo, useRef } from 'react'
import { parseChordSymbol, chordPitchClasses } from '../lib/musicTheory'
import { getGuitarShape } from '../lib/guitarChords'
import { playChordTones } from '../lib/audio'
import GuitarDiagram from './GuitarDiagram'
import PianoDiagram from './PianoDiagram'

export type Instrument = 'guitar' | 'piano'

interface Props {
  chord: string
  anchorRect: DOMRect
  instrument: Instrument
  onInstrumentChange: (i: Instrument) => void
  onClose: () => void
}

export default function ChordPopup({ chord, anchorRect, instrument, onInstrumentChange, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const parsed = useMemo(() => parseChordSymbol(chord), [chord])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [onClose])

  if (!parsed) return null

  const pitchClasses = chordPitchClasses(parsed)
  const guitarShape = getGuitarShape(parsed)

  const popupWidth = 232
  const viewportW = typeof window !== 'undefined' ? window.innerWidth : 1024
  let left = anchorRect.left + anchorRect.width / 2 - popupWidth / 2
  left = Math.max(8, Math.min(left, viewportW - popupWidth - 8))
  const top = anchorRect.bottom + 8

  return (
    <div
      ref={ref}
      className="fixed z-50 rounded-2xl border border-ink-600 bg-ink-800 p-4 shadow-2xl shadow-black/50"
      style={{ left, top, width: popupWidth }}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-lg font-semibold text-fuchsia-400">{chord}</span>
        <button
          className="grid h-8 w-8 place-items-center rounded-full bg-fuchsia-500/15 text-fuchsia-300 hover:bg-fuchsia-500/25"
          title="Play chord"
          onClick={() => playChordTones(pitchClasses)}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M5 5v14l14-7z" />
          </svg>
        </button>
      </div>

      <div className="flex justify-center py-1">
        {instrument === 'guitar' ? (
          <GuitarDiagram shape={guitarShape} />
        ) : (
          <PianoDiagram pitchClasses={pitchClasses} />
        )}
      </div>

      <div className="mt-2 flex justify-center gap-1 rounded-full bg-ink-900 p-1">
        {(['guitar', 'piano'] as Instrument[]).map((i) => (
          <button
            key={i}
            onClick={() => onInstrumentChange(i)}
            className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition ${
              instrument === i ? 'bg-fuchsia-500 text-white' : 'text-ink-500 hover:text-white'
            }`}
          >
            {i}
          </button>
        ))}
      </div>
    </div>
  )
}
