import { useAutoScroll } from '../hooks/useAutoScroll'

export default function ScrollPlayer() {
  const { playing, toggle, speed, setSpeed } = useAutoScroll()

  return (
    <div className="fixed bottom-5 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-full border border-ink-600 bg-ink-800/95 px-4 py-2.5 shadow-2xl shadow-black/40 backdrop-blur">
      <button
        onClick={toggle}
        className="grid h-11 w-11 place-items-center rounded-full bg-fuchsia-500 text-white transition hover:bg-fuchsia-400"
        title={playing ? 'Pause auto-scroll' : 'Play auto-scroll'}
      >
        {playing ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="5" width="4" height="14" rx="1" />
            <rect x="14" y="5" width="4" height="14" rx="1" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 4l14 8-14 8V4z" />
          </svg>
        )}
      </button>

      <div className="flex items-center gap-2 pr-1">
        <span className="text-xs text-ink-500">Speed</span>
        <input
          type="range"
          min={8}
          max={90}
          value={speed}
          onChange={(e) => setSpeed(Number(e.target.value))}
          className="h-1 w-24 cursor-pointer accent-fuchsia-500"
        />
      </div>
    </div>
  )
}
