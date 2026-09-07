/**
 * Fully synthesised audio — no samples. The engine is a stack of detuned saws
 * whose frequency tracks RPM, layered with turbo whine, induction noise and a
 * filtered-noise tyre squeal.
 */
export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.enabled = false;
    this.volume = 0.7;
    this.nodes = null;
  }

  start() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    this.ctx = new Ctx();
    const ctx = this.ctx;

    const master = ctx.createGain();
    master.gain.value = this.volume;
    master.connect(ctx.destination);

    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.ratio.value = 8;
    comp.connect(master);

    // --- Player engine ---------------------------------------------------
    const engineGain = ctx.createGain();
    engineGain.gain.value = 0;
    const engineFilter = ctx.createBiquadFilter();
    engineFilter.type = 'lowpass';
    engineFilter.frequency.value = 2600;
    engineGain.connect(engineFilter);
    engineFilter.connect(comp);

    const oscs = [];
    const partials = [
      { mult: 0.5, type: 'sawtooth', gain: 0.30, detune: -6 },
      { mult: 1.0, type: 'sawtooth', gain: 0.42, detune: 0 },
      { mult: 1.5, type: 'square', gain: 0.14, detune: 8 },
      { mult: 2.0, type: 'sawtooth', gain: 0.18, detune: -12 },
      { mult: 3.0, type: 'triangle', gain: 0.10, detune: 5 },
    ];
    for (const p of partials) {
      const o = ctx.createOscillator();
      o.type = p.type;
      o.detune.value = p.detune;
      const g = ctx.createGain();
      g.gain.value = p.gain;
      o.connect(g);
      g.connect(engineGain);
      o.start();
      oscs.push({ osc: o, mult: p.mult });
    }

    // --- Turbo whistle ----------------------------------------------------
    const turbo = ctx.createOscillator();
    turbo.type = 'sine';
    const turboGain = ctx.createGain();
    turboGain.gain.value = 0;
    turbo.connect(turboGain);
    turboGain.connect(comp);
    turbo.start();

    // --- Noise bed used for tyres, kerbs and wind -------------------------
    const noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuf;
    noise.loop = true;
    noise.start();

    const squealFilter = ctx.createBiquadFilter();
    squealFilter.type = 'bandpass';
    squealFilter.frequency.value = 2200;
    squealFilter.Q.value = 7;
    const squealGain = ctx.createGain();
    squealGain.gain.value = 0;
    noise.connect(squealFilter);
    squealFilter.connect(squealGain);
    squealGain.connect(comp);

    const windFilter = ctx.createBiquadFilter();
    windFilter.type = 'lowpass';
    windFilter.frequency.value = 700;
    const windGain = ctx.createGain();
    windGain.gain.value = 0;
    noise.connect(windFilter);
    windFilter.connect(windGain);
    windGain.connect(comp);

    // --- Ambient field engines (other cars, distance-mixed) ---------------
    const fieldOsc = ctx.createOscillator();
    fieldOsc.type = 'sawtooth';
    const fieldGain = ctx.createGain();
    fieldGain.gain.value = 0;
    const fieldFilter = ctx.createBiquadFilter();
    fieldFilter.type = 'lowpass';
    fieldFilter.frequency.value = 900;
    fieldOsc.connect(fieldFilter);
    fieldFilter.connect(fieldGain);
    fieldGain.connect(comp);
    fieldOsc.start();

    this.nodes = {
      master, comp, engineGain, engineFilter, oscs, turbo, turboGain,
      squealGain, squealFilter, windGain, fieldOsc, fieldGain,
    };
    this.enabled = true;
  }

  setVolume(v) {
    this.volume = v;
    if (this.nodes) this.nodes.master.gain.value = v;
  }

  mute(on) {
    if (this.nodes) this.nodes.master.gain.value = on ? 0 : this.volume;
  }

  /** Beep used for the start lights. */
  beep(freq = 660, duration = 0.35, gain = 0.32) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'square';
    o.frequency.value = freq;
    g.gain.setValueAtTime(0, ctx.currentTime);
    g.gain.linearRampToValueAtTime(gain * this.volume, ctx.currentTime + 0.01);
    g.gain.setValueAtTime(gain * this.volume, ctx.currentTime + duration * 0.7);
    g.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + duration + 0.02);
  }

  /** Impact noise burst for contact with cars or barriers. */
  crash(intensity = 1) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.35, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) {
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2.4);
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 900 + intensity * 1800;
    const g = ctx.createGain();
    g.gain.value = Math.min(0.8, 0.25 + intensity * 0.5) * this.volume;
    src.connect(f); f.connect(g); g.connect(ctx.destination);
    src.start();
  }

  /**
   * Per-frame mix.
   * @param {object} s { rpm, throttle, speed, squeal, wind, nearby, gearShift }
   */
  update(s) {
    if (!this.enabled || !this.nodes) return;
    const n = this.nodes;
    const t = this.ctx.currentTime;
    const smooth = (param, value, tau = 0.05) => {
      param.setTargetAtTime(value, t, tau);
    };

    const base = 26 + (s.rpm / 15000) * 210;
    for (const { osc, mult } of n.oscs) {
      smooth(osc.frequency, base * mult, 0.02);
    }
    const load = 0.30 + s.throttle * 0.70;
    smooth(n.engineGain.gain, s.running ? 0.16 * load : 0, 0.04);
    smooth(n.engineFilter.frequency, 900 + (s.rpm / 15000) * 5200 * load, 0.05);

    smooth(n.turbo.frequency, 1800 + (s.rpm / 15000) * 3400, 0.06);
    smooth(n.turboGain.gain, s.running ? 0.012 * s.throttle * (s.rpm / 15000) : 0, 0.08);

    smooth(n.squealFilter.frequency, 1500 + s.squeal * 2400, 0.05);
    smooth(n.squealGain.gain, Math.min(0.20, s.squeal * 0.16), 0.03);

    smooth(n.windGain.gain, Math.min(0.10, s.speed / 100 * 0.09), 0.1);

    smooth(n.fieldOsc.frequency, 40 + s.nearbyRpm / 15000 * 150, 0.08);
    smooth(n.fieldGain.gain, Math.min(0.06, s.nearby * 0.05), 0.1);
  }
}
