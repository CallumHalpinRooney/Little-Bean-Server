// Tiny Web Audio synth so a chord can be previewed with a tap, without
// shipping any audio samples.

let ctx: AudioContext | null = null

function getCtx(): AudioContext {
  if (!ctx) ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

const A4 = 440
function pcToFrequency(pc: number, octave: number): number {
  // MIDI note number for pitch class `pc` in the given octave (C = pc 0).
  const midi = (octave + 1) * 12 + pc
  return A4 * Math.pow(2, (midi - 69) / 12)
}

export function playChordTones(pitchClasses: number[], baseOctave = 3): void {
  const audioCtx = getCtx()
  const now = audioCtx.currentTime
  const master = audioCtx.createGain()
  master.gain.setValueAtTime(0, now)
  master.connect(audioCtx.destination)

  pitchClasses.forEach((pc, i) => {
    const octave = baseOctave + (i > 0 && pc < pitchClasses[0] ? 1 : 0)
    const osc = audioCtx.createOscillator()
    osc.type = 'triangle'
    osc.frequency.value = pcToFrequency(pc, octave)

    const gain = audioCtx.createGain()
    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(0.22, now + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.4)

    osc.connect(gain)
    gain.connect(master)
    osc.start(now)
    osc.stop(now + 1.5)
  })

  master.gain.linearRampToValueAtTime(1, now + 0.02)
}
