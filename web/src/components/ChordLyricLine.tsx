import { useRef } from 'react'
import type { ChordSegment } from '../lib/chordpro'

interface Props {
  segments: ChordSegment[]
  activeChord: string | null
  onChordClick: (chord: string, el: HTMLElement) => void
}

export default function ChordLyricLine({ segments, activeChord, onChordClick }: Props) {
  return (
    <div className="flex flex-wrap whitespace-pre font-mono text-[17px] leading-[2.6] sm:text-lg">
      {segments.map((seg, i) => (
        <ChordChunk key={i} seg={seg} activeChord={activeChord} onChordClick={onChordClick} />
      ))}
    </div>
  )
}

function ChordChunk({
  seg,
  activeChord,
  onChordClick,
}: {
  seg: ChordSegment
  activeChord: string | null
  onChordClick: (chord: string, el: HTMLElement) => void
}) {
  const ref = useRef<HTMLButtonElement>(null)
  const isActive = seg.chord !== null && seg.chord === activeChord

  return (
    <span className="relative inline-block whitespace-pre">
      {seg.chord && (
        <button
          ref={ref}
          onClick={() => ref.current && onChordClick(seg.chord!, ref.current)}
          className={`absolute -top-[1.35em] left-0 rounded px-1 text-[13px] font-bold leading-none transition-colors sm:text-sm ${
            isActive ? 'bg-fuchsia-500 text-white' : 'bg-fuchsia-500/15 text-fuchsia-300 hover:bg-fuchsia-500/30'
          }`}
        >
          {seg.chord}
        </button>
      )}
      <span className="text-gray-100">{seg.text}</span>
    </span>
  )
}
