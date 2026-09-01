import { useCallback, useEffect, useRef, useState } from 'react'

// Smoothly scrolls the window at `speed` pixels/second while playing, using
// rAF for a jitter-free scroll instead of stepping via setInterval.
export function useAutoScroll(initialSpeed = 28) {
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(initialSpeed)
  const rafRef = useRef<number | null>(null)
  const lastTsRef = useRef<number | null>(null)
  const remainderRef = useRef(0)

  const tick = useCallback(
    (ts: number) => {
      if (lastTsRef.current === null) lastTsRef.current = ts
      const dt = (ts - lastTsRef.current) / 1000
      lastTsRef.current = ts

      remainderRef.current += speed * dt
      const wholePixels = Math.trunc(remainderRef.current)
      if (wholePixels !== 0) {
        window.scrollBy(0, wholePixels)
        remainderRef.current -= wholePixels
      }

      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2
      if (atBottom) {
        setPlaying(false)
        return
      }
      rafRef.current = requestAnimationFrame(tick)
    },
    [speed],
  )

  useEffect(() => {
    if (!playing) {
      lastTsRef.current = null
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      return
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [playing, tick])

  const toggle = useCallback(() => setPlaying((p) => !p), [])
  const stop = useCallback(() => setPlaying(false), [])

  return { playing, toggle, stop, speed, setSpeed }
}
