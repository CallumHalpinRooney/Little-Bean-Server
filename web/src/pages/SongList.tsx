import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { songs } from '../data/songs'

export default function SongList() {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return songs
    return songs.filter((s) => s.title.toLowerCase().includes(q) || s.artist.toLowerCase().includes(q))
  }, [query])

  return (
    <div className="mx-auto max-w-2xl px-5 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-white">
          Chord<span className="text-fuchsia-400">Book</span>
        </h1>
        <p className="mt-1 text-sm text-ink-500">Lyrics, chords, and diagrams for guitar &amp; piano.</p>
      </header>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search songs or artists..."
        className="w-full rounded-xl border border-ink-600 bg-ink-800 px-4 py-3 text-sm text-white placeholder:text-ink-500 outline-none focus:border-fuchsia-500"
      />

      <ul className="mt-6 divide-y divide-ink-700 overflow-hidden rounded-xl border border-ink-700">
        {filtered.map((song) => (
          <li key={song.id}>
            <Link
              to={`/song/${song.id}`}
              className="flex items-center justify-between gap-4 bg-ink-800/60 px-4 py-4 transition hover:bg-ink-700"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-white">{song.title}</p>
                <p className="truncate text-sm text-ink-500">{song.artist}</p>
              </div>
              <span className="shrink-0 rounded-full border border-ink-600 px-2 py-0.5 text-xs text-ink-500">
                {song.key}
              </span>
            </Link>
          </li>
        ))}
        {filtered.length === 0 && (
          <li className="px-4 py-8 text-center text-sm text-ink-500">No songs match "{query}".</li>
        )}
      </ul>
    </div>
  )
}
