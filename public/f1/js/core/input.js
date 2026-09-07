import { clamp } from './geometry.js';

/** Keyboard, gamepad and touch input, normalised into analogue controls. */
export class Input {
  constructor(target = window) {
    this.keys = new Set();
    this.steerAxis = 0;
    this.state = {
      throttle: 0, brake: 0, steer: 0, ers: false, drs: false,
      lookBehind: false, pit: false,
    };
    this.pressed = new Set();
    this.touch = { throttle: 0, brake: 0, steer: 0, ers: false, drs: false };
    this.gamepadIndex = null;

    target.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      const k = e.key.toLowerCase();
      this.keys.add(k);
      this.pressed.add(k);
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'tab'].includes(k)) {
        e.preventDefault();
      }
    });
    target.addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
    target.addEventListener('blur', () => this.keys.clear());
    window.addEventListener('gamepadconnected', (e) => { this.gamepadIndex = e.gamepad.index; });
    window.addEventListener('gamepaddisconnected', () => { this.gamepadIndex = null; });
  }

  /** True once per physical key press. */
  consume(key) {
    if (this.pressed.has(key)) { this.pressed.delete(key); return true; }
    return false;
  }

  held(...keys) { return keys.some((k) => this.keys.has(k)); }

  endFrame() { this.pressed.clear(); }

  sample(dt) {
    const s = this.state;
    const kThrottle = this.held('arrowup', 'w') ? 1 : 0;
    const kBrake = this.held('arrowdown', 's') ? 1 : 0;
    const kLeft = this.held('arrowleft', 'a') ? 1 : 0;
    const kRight = this.held('arrowright', 'd') ? 1 : 0;

    // Smooth the digital steering axis so keyboard input is still precise.
    const wanted = clamp(kRight - kLeft + this.touch.steer, -1, 1);
    const rate = wanted === 0 ? 6.5 : 3.6;
    this.steerAxis += clamp(wanted - this.steerAxis, -rate * dt, rate * dt);

    s.throttle = Math.max(kThrottle, this.touch.throttle);
    s.brake = Math.max(kBrake, this.touch.brake);
    s.steer = this.steerAxis;
    s.ers = this.held('shift') || this.touch.ers;
    s.drs = this.held('e', 'control') || this.touch.drs;
    s.lookBehind = this.held('q');

    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const pad = pads && (this.gamepadIndex !== null ? pads[this.gamepadIndex] : pads[0]);
    if (pad) {
      const ax = pad.axes[0] || 0;
      const dead = Math.abs(ax) < 0.08 ? 0 : ax;
      if (Math.abs(dead) > 0) { s.steer = dead; this.steerAxis = dead; }
      const rt = pad.buttons[7] ? pad.buttons[7].value : 0;
      const lt = pad.buttons[6] ? pad.buttons[6].value : 0;
      if (rt > 0.02) s.throttle = rt;
      if (lt > 0.02) s.brake = lt;
      if (pad.buttons[0] && pad.buttons[0].pressed) s.ers = true;
      if (pad.buttons[2] && pad.buttons[2].pressed) s.drs = true;
    }
    return s;
  }

  bindTouch(el) {
    const setFrom = (id, on) => {
      if (id === 'left') this.touch.steer = on ? -1 : 0;
      if (id === 'right') this.touch.steer = on ? 1 : 0;
      if (id === 'throttle') this.touch.throttle = on ? 1 : 0;
      if (id === 'brake') this.touch.brake = on ? 1 : 0;
      if (id === 'ers') this.touch.ers = on;
      if (id === 'drs') this.touch.drs = on;
    };
    el.querySelectorAll('[data-touch]').forEach((btn) => {
      const id = btn.dataset.touch;
      const down = (e) => { e.preventDefault(); btn.classList.add('active'); setFrom(id, true); };
      const up = (e) => { e.preventDefault(); btn.classList.remove('active'); setFrom(id, false); };
      btn.addEventListener('pointerdown', down);
      btn.addEventListener('pointerup', up);
      btn.addEventListener('pointercancel', up);
      btn.addEventListener('pointerleave', up);
    });
  }
}
