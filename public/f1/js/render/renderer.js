import { clamp, lerp, mulberry32 } from '../core/geometry.js';
import { COMPOUNDS } from '../data/teams.js';

/**
 * Canvas renderer. The circuit is turned into a small set of Path2D objects
 * once, then every frame is a handful of wide strokes (asphalt, run-off,
 * barriers) plus vector detail — so it stays crisp at any zoom level.
 */
export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.camera = { x: 0, y: 0, zoom: 3.2, rot: 0, shake: 0 };
    this.rotateWithCar = true;
    // 'chase' — the usual pulled-back, slightly-behind view.
    // 'cockpit' — the driver's eye: right at the car, pinned to its heading,
    //             with a wheel and halo drawn over the world each frame.
    // 'tv' — fixed, north-up, the way a broadcast helicopter shot reads.
    this.cameraMode = 'chase';
    this.showRacingLine = false;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const c = this.canvas;
    const w = c.clientWidth || window.innerWidth;
    const h = c.clientHeight || window.innerHeight;
    c.width = Math.floor(w * this.dpr);
    c.height = Math.floor(h * this.dpr);
    this.w = w;
    this.h = h;
  }

  // -------------------------------------------------------------------
  // One-off circuit geometry preparation
  // -------------------------------------------------------------------

  prepare(circuit) {
    this.circuit = circuit;
    const n = circuit.n;

    const centre = new Path2D();
    for (let i = 0; i <= n; i++) {
      const k = i % n;
      if (i === 0) centre.moveTo(circuit.x[k], circuit.y[k]);
      else centre.lineTo(circuit.x[k], circuit.y[k]);
    }
    centre.closePath();

    const left = new Path2D();
    const right = new Path2D();
    for (let i = 0; i <= n; i++) {
      const k = i % n;
      const [lx, ly] = circuit.posAt(k, circuit.half - 0.22);
      const [rx, ry] = circuit.posAt(k, -circuit.half + 0.22);
      if (i === 0) { left.moveTo(lx, ly); right.moveTo(rx, ry); }
      else { left.lineTo(lx, ly); right.lineTo(rx, ry); }
    }
    left.closePath(); right.closePath();

    const line = new Path2D();
    circuit.line.pts.forEach((p, i) => {
      if (i === 0) line.moveTo(p[0], p[1]); else line.lineTo(p[0], p[1]);
    });
    line.closePath();

    const pit = new Path2D();
    circuit.pit.path.forEach((p, i) => {
      if (i === 0) pit.moveTo(p.x, p.y); else pit.lineTo(p.x, p.y);
    });

    this.paths = { centre, left, right, line, pit };
    this.scenery = this.buildScenery(circuit);
    this.noise = this.makeNoisePattern(circuit.data.theme);
    this.asphaltNoise = this.makeAsphaltPattern();
    this.minimap = this.buildMinimap(circuit);
  }

  makeNoisePattern(theme) {
    const c = document.createElement('canvas');
    c.width = 96; c.height = 96;
    const g = c.getContext('2d');
    g.fillStyle = theme.grass;
    g.fillRect(0, 0, 96, 96);
    const rand = mulberry32(99);
    for (let i = 0; i < 1400; i++) {
      const a = rand() * 0.16;
      g.fillStyle = rand() < 0.5 ? `rgba(255,255,255,${a * 0.5})` : `rgba(0,0,0,${a})`;
      const s = 1 + rand() * 3;
      g.fillRect(rand() * 96, rand() * 96, s, s);
    }
    return this.ctx.createPattern(c, 'repeat');
  }

  makeAsphaltPattern() {
    const c = document.createElement('canvas');
    c.width = 64; c.height = 64;
    const g = c.getContext('2d');
    g.fillStyle = '#2A2C31';
    g.fillRect(0, 0, 64, 64);
    const rand = mulberry32(1234);
    for (let i = 0; i < 900; i++) {
      const a = rand() * 0.10;
      g.fillStyle = rand() < 0.55 ? `rgba(255,255,255,${a})` : `rgba(0,0,0,${a * 1.5})`;
      g.fillRect(rand() * 64, rand() * 64, 1 + rand() * 2, 1 + rand() * 2);
    }
    return this.ctx.createPattern(c, 'repeat');
  }

  /** Grandstands, barriers, marshal posts and trees derived from the layout. */
  buildScenery(circuit) {
    const rand = mulberry32(circuit.data.id.length * 7717 + circuit.n);
    const items = [];
    const n = circuit.n;
    const street = !!circuit.data.street;

    // Marshal posts every ~300 m, alternating sides.
    const postStep = Math.max(20, Math.round(300 / circuit.ds));
    for (let i = 0; i < n; i += postStep) {
      const side = (i / postStep) % 2 === 0 ? 1 : -1;
      const off = side * (circuit.half + (street ? 4.5 : 13));
      const [x, y] = circuit.posAt(i, off);
      items.push({ type: 'post', x, y, heading: circuit.heading[i], side });
    }

    // Grandstands along the straighter, faster sections.
    const standStep = Math.max(40, Math.round(520 / circuit.ds));
    for (let i = 0; i < n; i += standStep) {
      if (Math.abs(circuit.curv[i]) > 0.004) continue;
      if (rand() < 0.42) continue;
      const side = rand() < 0.5 ? 1 : -1;
      const off = side * (circuit.half + (street ? 7 : 26) + rand() * 8);
      const [x, y] = circuit.posAt(i, off);
      items.push({
        type: 'stand', x, y, heading: circuit.heading[i],
        length: 60 + rand() * 70, depth: 16 + rand() * 12, side,
      });
    }

    // Tyre stacks / barriers on the outside of quick corners.
    for (const k of circuit.kerbs) {
      const mid = Math.round((k.start + k.end) / 2);
      for (let d = -6; d <= 6; d += 3) {
        const i = (mid + d + n) % n;
        const off = -Math.sign(k.side) * (circuit.half + (street ? 3.4 : 14));
        const [x, y] = circuit.posAt(i, off);
        items.push({ type: 'tyres', x, y, heading: circuit.heading[i] });
      }
    }

    // Trees / buildings filling the background.
    if (!street) {
      for (let i = 0; i < n; i += 6) {
        if (rand() < 0.72) continue;
        const side = rand() < 0.5 ? 1 : -1;
        const off = side * (circuit.half + 34 + rand() * 90);
        const [x, y] = circuit.posAt(i, off);
        items.push({ type: 'tree', x, y, r: 4 + rand() * 6 });
      }
    } else {
      for (let i = 0; i < n; i += 8) {
        if (rand() < 0.6) continue;
        const side = rand() < 0.5 ? 1 : -1;
        const off = side * (circuit.half + 12 + rand() * 60);
        const [x, y] = circuit.posAt(i, off);
        items.push({
          type: 'building', x, y, heading: circuit.heading[i],
          w: 24 + rand() * 60, d: 24 + rand() * 50, shade: rand(),
        });
      }
    }
    return items;
  }

  buildMinimap(circuit) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (let i = 0; i < circuit.n; i++) {
      minX = Math.min(minX, circuit.x[i]); maxX = Math.max(maxX, circuit.x[i]);
      minY = Math.min(minY, circuit.y[i]); maxY = Math.max(maxY, circuit.y[i]);
    }
    return { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY };
  }

  // -------------------------------------------------------------------
  // Camera
  // -------------------------------------------------------------------

  updateCamera(player, dt, opts = {}) {
    const cam = this.camera;
    const speed = player.speed;

    if (this.cameraMode === 'cockpit') {
      // Sit at the driver's eye point rather than pulled back behind the car,
      // and snap heading immediately — in a real cockpit the world spins
      // around you exactly as fast as the car does, with no lag to smooth out.
      const eyeForward = 0.25;
      const targetX = player.x + Math.cos(player.heading) * eyeForward;
      const targetY = player.y + Math.sin(player.heading) * eyeForward;
      const k = 1 - Math.exp(-dt * 20);
      cam.x = lerp(cam.x, targetX, k);
      cam.y = lerp(cam.y, targetY, k);

      const want = -player.heading - Math.PI / 2;
      let d = want - cam.rot;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      cam.rot += d * (1 - Math.exp(-dt * 22));

      const targetZoom = clamp(9.2 - speed * 0.010, 7.0, 9.2);
      cam.zoom = lerp(cam.zoom, targetZoom, 1 - Math.exp(-dt * 5));
      cam.shake = Math.max(0, cam.shake - dt * 2.6);
      return;
    }

    const lead = this.cameraMode === 'tv' ? 0 : clamp(speed * 0.28, 0, 24);
    const targetX = player.x + Math.cos(player.heading) * lead;
    const targetY = player.y + Math.sin(player.heading) * lead;
    const k = 1 - Math.exp(-dt * 7.5);
    cam.x = lerp(cam.x, targetX, k);
    cam.y = lerp(cam.y, targetY, k);

    const targetZoom = opts.zoom ?? clamp(3.55 - speed * 0.0125, 2.15, 3.55);
    cam.zoom = lerp(cam.zoom, targetZoom * (opts.zoomScale ?? 1), 1 - Math.exp(-dt * 3.2));

    if (this.cameraMode === 'chase' && this.rotateWithCar) {
      const want = -player.heading - Math.PI / 2;
      let d = want - cam.rot;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      cam.rot += d * (1 - Math.exp(-dt * 8));
    } else {
      cam.rot = lerp(cam.rot, 0, 1 - Math.exp(-dt * 6));
    }
    cam.shake = Math.max(0, cam.shake - dt * 2.6);
  }

  /** Cycle chase → cockpit → tv → chase, returning the mode now active. */
  cycleCameraMode() {
    const order = ['chase', 'cockpit', 'tv'];
    const i = order.indexOf(this.cameraMode);
    this.cameraMode = order[(i + 1) % order.length];
    return this.cameraMode;
  }

  addShake(v) { this.camera.shake = Math.min(1.4, this.camera.shake + v); }

  worldTransform(ctx) {
    const cam = this.camera;
    ctx.translate((this.w / 2) * this.dpr, (this.h / 2) * this.dpr);
    ctx.scale(this.dpr, this.dpr);
    if (cam.shake > 0.001) {
      const s = cam.shake * 7;
      ctx.translate((Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
    }
    ctx.rotate(cam.rot);
    ctx.scale(cam.zoom, cam.zoom);
    ctx.translate(-cam.x, -cam.y);
  }

  // -------------------------------------------------------------------
  // Frame
  // -------------------------------------------------------------------

  render(race, player, state) {
    const ctx = this.ctx;
    const ci = this.circuit;
    const theme = ci.data.theme;
    const night = !!ci.data.night;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = night ? theme.sky : theme.grass2;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.save();
    this.worldTransform(ctx);

    // Ground
    const view = this.viewBounds();
    ctx.fillStyle = this.noise;
    ctx.fillRect(view.x, view.y, view.w, view.h);
    if (night) {
      ctx.fillStyle = 'rgba(6,8,16,0.62)';
      ctx.fillRect(view.x, view.y, view.w, view.h);
    }

    this.drawScenery(ctx, view, night);
    this.drawTrack(ctx, night, race);
    this.drawPitLane(ctx);
    this.drawStartLine(ctx);
    if (this.showRacingLine) this.drawRacingLine(ctx, race);
    this.drawSkidMarks(ctx);

    // Cars — in the cockpit view the camera sits inside the player's own
    // car, so its body is skipped rather than drawn around the lens.
    const inCockpit = this.cameraMode === 'cockpit';
    const cars = race.cars;
    for (const car of cars) {
      if (inCockpit && car === player) continue;
      this.drawCarShadow(ctx, car);
    }
    for (const car of cars) {
      if (car === player) continue;
      this.drawCar(ctx, car, race, false);
    }
    if (player && !inCockpit) this.drawCar(ctx, player, race, true);

    this.drawParticles(ctx, race);
    if (night) this.drawLighting(ctx, race, player);

    ctx.restore();

    if (state?.rain > 0) this.drawRain(ctx, state.rain);
    this.drawVignette(ctx, night);
    if (inCockpit && player) this.drawCockpit(ctx, player, night);
  }

  viewBounds() {
    const cam = this.camera;
    const r = (Math.max(this.w, this.h) / cam.zoom) * 0.85;
    return { x: cam.x - r, y: cam.y - r, w: r * 2, h: r * 2 };
  }

  drawTrack(ctx, night, race) {
    const ci = this.circuit;
    const p = this.paths;
    const theme = ci.data.theme;
    const street = !!ci.data.street;

    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    // Gravel / grass verge
    ctx.strokeStyle = street ? theme.wall : theme.runoff;
    ctx.lineWidth = ci.width + (street ? 6.4 : 40);
    ctx.globalAlpha = street ? 0.55 : 0.75;
    ctx.stroke(p.centre);
    ctx.globalAlpha = 1;

    // Asphalt run-off
    ctx.strokeStyle = night ? '#3A3D44' : '#4C5058';
    ctx.lineWidth = ci.width + (street ? 4.8 : 18);
    ctx.stroke(p.centre);

    // Track surface
    ctx.strokeStyle = this.asphaltNoise || '#2A2C31';
    ctx.lineWidth = ci.width;
    ctx.stroke(p.centre);
    ctx.strokeStyle = night ? 'rgba(20,22,28,0.45)' : 'rgba(32,34,40,0.35)';
    ctx.lineWidth = ci.width;
    ctx.stroke(p.centre);

    // Wet sheen
    if (race?.env.wetness > 0) {
      ctx.strokeStyle = `rgba(120,150,190,${0.10 + race.env.wetness * 0.14})`;
      ctx.lineWidth = ci.width;
      ctx.stroke(p.centre);
      // Dry line where the cars run
      ctx.strokeStyle = `rgba(40,42,48,${0.35 * (1 - race.env.wetness)})`;
      ctx.lineWidth = 4.5;
      ctx.stroke(p.line);
    }

    // DRS zones — a subtle green band on the edges
    for (const z of ci.drsZones) {
      this.strokeRange(ctx, z.start, z.end, ci.half - 0.9, 'rgba(60,220,140,0.30)', 1.1);
      this.strokeRange(ctx, z.start, z.end, -ci.half + 0.9, 'rgba(60,220,140,0.30)', 1.1);
    }

    // White edge lines
    ctx.strokeStyle = 'rgba(240,240,245,0.88)';
    ctx.lineWidth = 0.35;
    ctx.stroke(p.left);
    ctx.stroke(p.right);

    this.drawKerbs(ctx);
    this.drawSectorMarkers(ctx);
  }

  strokeRange(ctx, from, to, offset, colour, width) {
    const ci = this.circuit;
    const n = ci.n;
    ctx.beginPath();
    let i = from;
    let first = true;
    let guard = 0;
    while (guard++ < n) {
      const [x, y] = ci.posAt(i, offset);
      if (first) { ctx.moveTo(x, y); first = false; } else ctx.lineTo(x, y);
      if (i === to) break;
      i = (i + 1) % n;
    }
    ctx.strokeStyle = colour;
    ctx.lineWidth = width;
    ctx.stroke();
  }

  drawKerbs(ctx) {
    const ci = this.circuit;
    const n = ci.n;
    const kerbWidth = 1.35;
    for (const run of ci.kerbs) {
      const inner = Math.sign(run.side) * (ci.half + kerbWidth / 2 - 0.15);
      let toggle = 0;
      const len = (run.end - run.start + n) % n;
      const step = Math.max(1, Math.round(1.9 / ci.ds));
      for (let d = 0; d < len; d += step) {
        const a = (run.start + d) % n;
        const b = (run.start + Math.min(d + step, len)) % n;
        ctx.beginPath();
        const [ax, ay] = ci.posAt(a, inner);
        const [bx, by] = ci.posAt(b, inner);
        ctx.moveTo(ax, ay);
        ctx.lineTo(bx, by);
        ctx.strokeStyle = toggle % 2 === 0 ? '#D8383F' : '#F2F2F2';
        ctx.lineWidth = kerbWidth;
        ctx.lineCap = 'butt';
        ctx.stroke();
        toggle++;
      }
      ctx.lineCap = 'round';
    }
  }

  drawSectorMarkers(ctx) {
    const ci = this.circuit;
    const colours = ['#FFD24A', '#4AC6FF'];
    ci.sectorIdx.forEach((idx, k) => {
      const [ax, ay] = ci.posAt(idx, ci.half);
      const [bx, by] = ci.posAt(idx, -ci.half);
      ctx.beginPath();
      ctx.moveTo(ax, ay); ctx.lineTo(bx, by);
      ctx.strokeStyle = colours[k] + 'AA';
      ctx.lineWidth = 0.3;
      ctx.setLineDash([1.2, 1.2]);
      ctx.stroke();
      ctx.setLineDash([]);
    });
  }

  drawStartLine(ctx) {
    const ci = this.circuit;
    const idx = 0;
    const squares = 14;
    const w = ci.width / squares;
    for (let i = 0; i < squares; i++) {
      const off = -ci.half + w * i + w / 2;
      const [x, y] = ci.posAt(idx, off);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(ci.heading[idx]);
      ctx.fillStyle = i % 2 === 0 ? '#F4F4F6' : '#1B1D22';
      ctx.fillRect(-0.9, -w / 2, 1.8, w);
      ctx.restore();
    }
    // Grid boxes
    const slots = ci.gridSlots(20);
    slots.forEach((s, i) => {
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.heading);
      ctx.strokeStyle = 'rgba(245,245,250,0.55)';
      ctx.lineWidth = 0.16;
      ctx.strokeRect(-3.4, -1.5, 6.8, 3.0);
      ctx.fillStyle = 'rgba(245,245,250,0.55)';
      ctx.font = '1.6px "Titillium Web", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(String(i + 1), 0, -2.1);
      ctx.restore();
    });
  }

  drawPitLane(ctx) {
    const ci = this.circuit;
    ctx.strokeStyle = '#3A3D44';
    ctx.lineWidth = 12;
    ctx.stroke(this.paths.pit);
    ctx.strokeStyle = 'rgba(230,230,235,0.5)';
    ctx.lineWidth = 0.28;
    ctx.stroke(this.paths.pit);

    // Garage boxes
    for (let slot = 0; slot < 20; slot++) {
      const box = ci.pitBox(slot);
      ctx.save();
      ctx.translate(box.x, box.y);
      ctx.rotate(box.heading);
      ctx.fillStyle = 'rgba(255,255,255,0.10)';
      ctx.fillRect(-3, -2.6, 6, 5.2);
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 0.14;
      ctx.strokeRect(-3, -2.6, 6, 5.2);
      ctx.restore();
    }
  }

  drawRacingLine(ctx, race) {
    const ci = this.circuit;
    const prof = race.speedProfileRef;
    const n = ci.n;
    const step = 2;
    for (let i = 0; i < n; i += step) {
      const j = (i + step) % n;
      const v = prof[i];
      const t = clamp((v - 20) / 70, 0, 1);
      const r = Math.round(lerp(235, 60, t));
      const g = Math.round(lerp(60, 220, t));
      ctx.beginPath();
      ctx.moveTo(ci.line.pts[i][0], ci.line.pts[i][1]);
      ctx.lineTo(ci.line.pts[j][0], ci.line.pts[j][1]);
      ctx.strokeStyle = `rgba(${r},${g},90,0.55)`;
      ctx.lineWidth = 0.7;
      ctx.stroke();
    }
  }

  drawSkidMarks(ctx) {
    if (!this.skids) this.skids = [];
    ctx.strokeStyle = 'rgba(18,18,20,0.30)';
    ctx.lineWidth = 0.32;
    for (const s of this.skids) {
      ctx.beginPath();
      ctx.moveTo(s.x1, s.y1);
      ctx.lineTo(s.x2, s.y2);
      ctx.globalAlpha = s.a;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  recordSkid(car) {
    if (!this.skids) this.skids = [];
    const cosH = Math.cos(car.heading);
    const sinH = Math.sin(car.heading);
    for (const side of [0.78, -0.78]) {
      const x = car.x - cosH * 1.55 - sinH * side;
      const y = car.y - sinH * 1.55 + cosH * side;
      const last = car._lastSkid?.[side > 0 ? 0 : 1];
      if (last) this.skids.push({ x1: last.x, y1: last.y, x2: x, y2: y, a: 0.35 });
      car._lastSkid = car._lastSkid || [];
      car._lastSkid[side > 0 ? 0 : 1] = { x, y };
    }
    if (this.skids.length > 900) this.skids.splice(0, this.skids.length - 900);
  }

  clearSkidTrail(car) { car._lastSkid = null; }

  drawScenery(ctx, view, night) {
    const items = this.scenery;
    for (const it of items) {
      if (it.x < view.x - 80 || it.x > view.x + view.w + 80
        || it.y < view.y - 80 || it.y > view.y + view.h + 80) continue;
      switch (it.type) {
        case 'stand': this.drawGrandstand(ctx, it, night); break;
        case 'tyres': this.drawTyreStack(ctx, it); break;
        case 'post': this.drawMarshalPost(ctx, it); break;
        case 'tree': this.drawTree(ctx, it, night); break;
        case 'building': this.drawBuilding(ctx, it, night); break;
        default: break;
      }
    }
  }

  drawGrandstand(ctx, it, night) {
    ctx.save();
    ctx.translate(it.x, it.y);
    ctx.rotate(it.heading);
    const w = it.length;
    const d = it.depth;
    ctx.fillStyle = night ? '#2A2E38' : '#5A606C';
    ctx.fillRect(-w / 2, -d / 2, w, d);
    // Rows of spectators
    const rows = 5;
    for (let r = 0; r < rows; r++) {
      const y = -d / 2 + (d / rows) * r + 1;
      ctx.fillStyle = `rgba(${190 - r * 18},${195 - r * 20},${205 - r * 18},${night ? 0.35 : 0.55})`;
      ctx.fillRect(-w / 2 + 1, y, w - 2, d / rows - 1.6);
    }
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 0.6;
    ctx.strokeRect(-w / 2, -d / 2, w, d);
    ctx.restore();
  }

  drawTyreStack(ctx, it) {
    ctx.save();
    ctx.translate(it.x, it.y);
    ctx.rotate(it.heading);
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.arc(0, i * 1.5, 0.7, 0, Math.PI * 2);
      ctx.fillStyle = '#1A1A1E';
      ctx.fill();
      ctx.strokeStyle = i === 0 ? '#E03A3A' : '#F0F0F0';
      ctx.lineWidth = 0.22;
      ctx.stroke();
    }
    ctx.restore();
  }

  drawMarshalPost(ctx, it) {
    ctx.save();
    ctx.translate(it.x, it.y);
    ctx.fillStyle = '#E8E8EC';
    ctx.fillRect(-1.4, -1.4, 2.8, 2.8);
    ctx.fillStyle = '#F0A800';
    ctx.fillRect(-1.4, -1.4, 2.8, 0.9);
    ctx.restore();
  }

  drawTree(ctx, it, night) {
    ctx.beginPath();
    ctx.arc(it.x, it.y, it.r, 0, Math.PI * 2);
    ctx.fillStyle = night ? '#14301C' : '#255C2C';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(it.x - it.r * 0.25, it.y - it.r * 0.25, it.r * 0.6, 0, Math.PI * 2);
    ctx.fillStyle = night ? '#1B3A24' : '#2F7238';
    ctx.fill();
  }

  drawBuilding(ctx, it, night) {
    ctx.save();
    ctx.translate(it.x, it.y);
    ctx.rotate(it.heading);
    const shade = Math.round(48 + it.shade * 46);
    ctx.fillStyle = night ? `rgb(${shade * 0.5},${shade * 0.55},${shade * 0.7})`
      : `rgb(${shade + 30},${shade + 34},${shade + 42})`;
    ctx.fillRect(-it.w / 2, -it.d / 2, it.w, it.d);
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(-it.w / 2, -it.d / 2, it.w, it.d);
    if (night) {
      const rand = mulberry32(Math.round(it.x + it.y));
      for (let i = 0; i < 10; i++) {
        ctx.fillStyle = `rgba(255,220,150,${0.15 + rand() * 0.35})`;
        ctx.fillRect(-it.w / 2 + rand() * it.w, -it.d / 2 + rand() * it.d, 2.2, 1.6);
      }
    }
    ctx.restore();
  }

  // -------------------------------------------------------------------
  // Cars
  // -------------------------------------------------------------------

  drawCarShadow(ctx, car) {
    if (car.retired && car.hidden) return;
    ctx.save();
    ctx.translate(car.x + 0.4, car.y + 0.6);
    ctx.rotate(car.heading);
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath();
    ctx.ellipse(0, 0, 2.9, 1.15, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawCar(ctx, car, race, isPlayer) {
    const team = car.team;
    ctx.save();
    ctx.translate(car.x, car.y);
    ctx.rotate(car.heading);

    const dmgFront = car.damage.front;

    // Tyres
    const tyreColour = '#141416';
    const drawTyre = (x, y, steer = 0) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(steer);
      ctx.fillStyle = tyreColour;
      ctx.fillRect(-0.42, -0.20, 0.84, 0.40);
      const c = COMPOUNDS[car.compound];
      ctx.strokeStyle = c ? c.colour : '#888';
      ctx.lineWidth = 0.09;
      ctx.beginPath();
      ctx.moveTo(-0.34, -0.20); ctx.lineTo(0.34, -0.20);
      ctx.moveTo(-0.34, 0.20); ctx.lineTo(0.34, 0.20);
      ctx.stroke();
      ctx.restore();
    };
    const st = car.steerActual || 0;
    drawTyre(1.42, -0.78, st); drawTyre(1.42, 0.78, st);
    drawTyre(-1.52, -0.80); drawTyre(-1.52, 0.80);

    // Floor / body
    ctx.fillStyle = team.dark;
    ctx.beginPath();
    ctx.moveTo(2.55, -0.30);
    ctx.lineTo(2.05, -0.42);
    ctx.lineTo(0.65, -0.55);
    ctx.lineTo(0.10, -0.95);
    ctx.lineTo(-1.95, -0.95);
    ctx.lineTo(-2.45, -0.62);
    ctx.lineTo(-2.45, 0.62);
    ctx.lineTo(-1.95, 0.95);
    ctx.lineTo(0.10, 0.95);
    ctx.lineTo(0.65, 0.55);
    ctx.lineTo(2.05, 0.42);
    ctx.lineTo(2.55, 0.30);
    ctx.closePath();
    ctx.fill();

    // Main livery
    const grad = ctx.createLinearGradient(0, -0.9, 0, 0.9);
    grad.addColorStop(0, team.colour);
    grad.addColorStop(0.5, this.lighten(team.colour, 0.18));
    grad.addColorStop(1, team.dark);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(2.35, -0.22);
    ctx.lineTo(1.05, -0.36);
    ctx.lineTo(0.45, -0.46);
    ctx.lineTo(-0.10, -0.80);
    ctx.lineTo(-1.85, -0.80);
    ctx.lineTo(-2.25, -0.50);
    ctx.lineTo(-2.25, 0.50);
    ctx.lineTo(-1.85, 0.80);
    ctx.lineTo(-0.10, 0.80);
    ctx.lineTo(0.45, 0.46);
    ctx.lineTo(1.05, 0.36);
    ctx.lineTo(2.35, 0.22);
    ctx.closePath();
    ctx.fill();

    // Accent stripe down the spine
    ctx.fillStyle = team.accent;
    ctx.fillRect(-2.2, -0.14, 4.4, 0.28);

    // Engine cover / airbox
    ctx.fillStyle = this.lighten(team.colour, -0.15);
    ctx.beginPath();
    ctx.moveTo(-0.15, -0.34);
    ctx.lineTo(-1.85, -0.28);
    ctx.lineTo(-1.85, 0.28);
    ctx.lineTo(-0.15, 0.34);
    ctx.closePath();
    ctx.fill();

    // Cockpit + halo
    ctx.fillStyle = '#0C0D10';
    ctx.beginPath();
    ctx.ellipse(0.35, 0, 0.55, 0.30, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1C1E24';
    ctx.lineWidth = 0.11;
    ctx.beginPath();
    ctx.arc(0.42, 0, 0.46, -Math.PI * 0.85, Math.PI * 0.85);
    ctx.stroke();
    ctx.fillStyle = team.accent;
    ctx.fillRect(0.72, -0.06, 0.30, 0.12);

    // Front wing
    ctx.fillStyle = dmgFront > 0.5 ? '#5A5A5E' : team.colour;
    const wingSkew = dmgFront * 0.25;
    ctx.beginPath();
    ctx.moveTo(2.45, -0.98 + wingSkew);
    ctx.lineTo(2.90, -0.94 + wingSkew);
    ctx.lineTo(2.90, 0.94);
    ctx.lineTo(2.45, 0.98);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(2.52, -0.94 + wingSkew, 0.10, 1.9);

    // Rear wing (DRS flap opens)
    ctx.save();
    ctx.translate(-2.62, 0);
    ctx.fillStyle = this.lighten(team.colour, -0.25);
    ctx.fillRect(-0.14, -0.86, 0.28, 1.72);
    ctx.fillStyle = car.drsOpen ? '#3BD16F' : team.accent;
    const flapH = car.drsOpen ? 0.08 : 0.18;
    ctx.fillRect(-0.30, -0.80, flapH, 1.60);
    ctx.restore();

    // Racing number
    ctx.save();
    ctx.rotate(Math.PI / 2);
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.font = 'bold 0.62px "Titillium Web", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(car.driver.num), 0, 1.35);
    ctx.restore();

    // Brake glow
    if (car.brake > 0.3 && car.speed > 6) {
      const a = clamp(car.brake, 0, 1);
      ctx.fillStyle = `rgba(255,${Math.round(40 + 60 * (1 - a))},30,${0.35 + a * 0.5})`;
      ctx.beginPath();
      ctx.ellipse(-2.85, 0, 0.5, 0.65, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(255,90,40,${0.20 * a})`;
      ctx.beginPath();
      ctx.arc(-1.52, -0.80, 0.55, 0, Math.PI * 2);
      ctx.arc(-1.52, 0.80, 0.55, 0, Math.PI * 2);
      ctx.fill();
    }

    // ERS deployment glow
    if (car.ersDeploy > 0 && car.throttle > 0.5) {
      ctx.fillStyle = 'rgba(80,180,255,0.35)';
      ctx.beginPath();
      ctx.ellipse(-2.9, 0, 0.42, 0.34, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    // Player marker and rival tags
    if (isPlayer) {
      ctx.save();
      ctx.translate(car.x, car.y);
      ctx.rotate(-this.camera.rot);
      ctx.beginPath();
      ctx.moveTo(0, -4.6);
      ctx.lineTo(-0.9, -3.3);
      ctx.lineTo(0.9, -3.3);
      ctx.closePath();
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.fill();
      ctx.restore();
    } else if (this.camera.zoom > 2.6) {
      const t = race.timing.get(car);
      ctx.save();
      ctx.translate(car.x, car.y);
      ctx.rotate(-this.camera.rot);
      ctx.font = 'bold 1.5px "Titillium Web", Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(-2.1, -5.2, 4.2, 1.9);
      ctx.fillStyle = car.team.colour;
      ctx.fillRect(-2.1, -5.2, 0.35, 1.9);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(car.driver.code, 0.2, -3.8);
      void t;
      ctx.restore();
    }
  }

  lighten(hex, amount) {
    const n = parseInt(hex.replace('#', ''), 16);
    let r = (n >> 16) & 255;
    let g = (n >> 8) & 255;
    let b = n & 255;
    if (amount >= 0) {
      r = Math.round(lerp(r, 255, amount));
      g = Math.round(lerp(g, 255, amount));
      b = Math.round(lerp(b, 255, amount));
    } else {
      r = Math.round(r * (1 + amount));
      g = Math.round(g * (1 + amount));
      b = Math.round(b * (1 + amount));
    }
    return `rgb(${r},${g},${b})`;
  }

  drawParticles(ctx, race) {
    for (const p of race.particles) {
      const t = p.life / p.maxLife;
      if (p.type === 'smoke') {
        ctx.fillStyle = `rgba(210,210,215,${p.alpha * t})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'dust') {
        ctx.fillStyle = `rgba(190,160,110,${p.alpha * t})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'spark') {
        ctx.strokeStyle = `rgba(255,${Math.round(150 + 90 * t)},60,${t})`;
        ctx.lineWidth = 0.22;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 0.03, p.y - p.vy * 0.03);
        ctx.stroke();
      } else if (p.type === 'debris') {
        ctx.fillStyle = p.colour || '#999';
        ctx.globalAlpha = t;
        ctx.fillRect(p.x, p.y, p.size, p.size);
        ctx.globalAlpha = 1;
      }
    }
  }

  drawLighting(ctx, race, player) {
    ctx.globalCompositeOperation = 'lighter';
    for (const car of race.cars) {
      if (car.retired) continue;
      const g = ctx.createRadialGradient(car.x, car.y, 0, car.x, car.y, 16);
      g.addColorStop(0, 'rgba(255,225,170,0.20)');
      g.addColorStop(1, 'rgba(255,225,170,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(car.x, car.y, 16, 0, Math.PI * 2);
      ctx.fill();
    }
    if (player) {
      const g = ctx.createRadialGradient(player.x, player.y, 0, player.x, player.y, 42);
      g.addColorStop(0, 'rgba(200,220,255,0.14)');
      g.addColorStop(1, 'rgba(200,220,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(player.x, player.y, 42, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  drawRain(ctx, intensity) {
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    const count = Math.round(intensity * 220);
    ctx.strokeStyle = `rgba(190,210,235,${0.18 + intensity * 0.22})`;
    ctx.lineWidth = 1;
    const t = performance.now() * 0.001;
    ctx.beginPath();
    for (let i = 0; i < count; i++) {
      const seed = i * 12.9898;
      const x = ((Math.sin(seed) * 43758.5453) % 1 + 1) % 1 * this.w;
      const y = ((x * 0.37 + t * (600 + (i % 7) * 90)) % this.h);
      ctx.moveTo(x, y);
      ctx.lineTo(x - 5 * intensity, y + 16 + intensity * 12);
    }
    ctx.stroke();
  }

  drawVignette(ctx, night) {
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    const g = ctx.createRadialGradient(
      this.w / 2, this.h / 2, Math.min(this.w, this.h) * 0.35,
      this.w / 2, this.h / 2, Math.max(this.w, this.h) * 0.78,
    );
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, night ? 'rgba(0,0,0,0.62)' : 'rgba(0,0,0,0.38)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, this.w, this.h);
  }

  /**
   * Cockpit dressing, drawn in flat screen space after the world is done:
   * halo pillars framing the view, a dashboard along the bottom, and a
   * steering wheel that actually turns with the car's front wheels — the
   * one piece of the HUD that has to line up with what the car is doing.
   */
  drawCockpit(ctx, player, night) {
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    const w = this.w;
    const h = this.h;
    const team = player.team;

    // --- Halo: two pillars and a top bar framing the driver's view --------
    const pillarW = w * 0.065;
    const haloTop = h * 0.10;
    ctx.fillStyle = 'rgba(8,9,11,0.94)';
    const drawPillar = (fromX, toX) => {
      ctx.beginPath();
      ctx.moveTo(fromX, h);
      ctx.lineTo(fromX + pillarW * 0.35, haloTop + h * 0.05);
      ctx.lineTo(toX - pillarW * 0.15, haloTop);
      ctx.lineTo(toX + pillarW * 0.55, haloTop + h * 0.04);
      ctx.lineTo(toX + pillarW * 0.9, h);
      ctx.closePath();
      ctx.fill();
    };
    drawPillar(-pillarW * 0.3, pillarW * 0.55);
    drawPillar(w - pillarW * 1.25, w - pillarW * 0.3);
    // Top halo bar joining the pillars over the driver's head.
    ctx.beginPath();
    ctx.moveTo(pillarW * 0.55, haloTop);
    ctx.quadraticCurveTo(w / 2, haloTop - h * 0.05, w - pillarW * 1.1, haloTop);
    ctx.lineTo(w - pillarW * 1.05, haloTop + h * 0.028);
    ctx.quadraticCurveTo(w / 2, haloTop - h * 0.024, pillarW * 0.6, haloTop + h * 0.028);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = team.accent + '55';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // --- Dashboard across the bottom --------------------------------------
    const dashTop = h * 0.86;
    ctx.fillStyle = 'rgba(10,11,14,0.96)';
    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.lineTo(0, dashTop + h * 0.05);
    ctx.quadraticCurveTo(w * 0.5, dashTop - h * 0.02, w, dashTop + h * 0.05);
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, dashTop + h * 0.05);
    ctx.quadraticCurveTo(w * 0.5, dashTop - h * 0.02, w, dashTop + h * 0.05);
    ctx.stroke();

    // --- Steering wheel, actually rotating with the front wheels ----------
    const cx = w / 2;
    const cy = h * 1.02;
    const radius = Math.min(w, h) * 0.145;
    const angle = -(player.steerActual || 0) * 2.6;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);

    // Rim.
    ctx.beginPath();
    ctx.arc(0, 0, radius, Math.PI * 1.02, Math.PI * 1.98);
    ctx.lineWidth = radius * 0.22;
    ctx.strokeStyle = '#17181c';
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.lineWidth = radius * 0.16;
    ctx.strokeStyle = '#2a2c31';
    ctx.stroke();
    // Grip texture.
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = radius * 0.04;
    for (let a = -0.92; a <= 0.92; a += 0.14) {
      const th = Math.PI * 1.5 + a;
      const x1 = Math.cos(th) * (radius - radius * 0.05);
      const y1 = Math.sin(th) * (radius - radius * 0.05);
      const x2 = Math.cos(th) * (radius + radius * 0.05);
      const y2 = Math.sin(th) * (radius + radius * 0.05);
      ctx.beginPath();
      ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    }
    // Spokes and hub.
    ctx.strokeStyle = '#2a2c31';
    ctx.lineWidth = radius * 0.16;
    ctx.beginPath();
    ctx.moveTo(-radius * 0.86, -radius * 0.12);
    ctx.lineTo(-radius * 0.22, -radius * 0.02);
    ctx.moveTo(radius * 0.86, -radius * 0.12);
    ctx.lineTo(radius * 0.22, -radius * 0.02);
    ctx.stroke();
    ctx.fillStyle = '#1c1d21';
    ctx.beginPath();
    ctx.arc(0, -radius * 0.02, radius * 0.30, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = team.colour;
    ctx.beginPath();
    ctx.arc(0, -radius * 0.02, radius * 0.14, 0, Math.PI * 2);
    ctx.fill();
    // Rev-light strip along the top of the hub, the way real F1 wheels carry one.
    const revCount = 8;
    const rpmFrac = clamp((player.rpm - 10000) / (15000 - 10000), 0, 1);
    for (let i = 0; i < revCount; i++) {
      const t = i / (revCount - 1);
      const lit = t <= rpmFrac;
      ctx.fillStyle = lit
        ? (t > 0.75 ? '#F5333F' : t > 0.4 ? '#FFD24A' : '#3BD16F')
        : 'rgba(255,255,255,0.08)';
      const bx = -radius * 0.42 + t * radius * 0.84;
      ctx.fillRect(bx - radius * 0.035, -radius * 0.30, radius * 0.07, radius * 0.09);
    }
    ctx.restore();

    // Faint dashboard glow from the digital display, tinted by team colour.
    const glow = ctx.createRadialGradient(cx, dashTop, 4, cx, dashTop, w * 0.3);
    glow.addColorStop(0, team.colour + '22');
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, dashTop - h * 0.06, w, h * 0.16);

    if (night) {
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.fillRect(0, 0, w, h);
    }
  }

  // -------------------------------------------------------------------
  // Minimap (screen space)
  // -------------------------------------------------------------------

  drawMinimap(ctx2d, race, player, box) {
    const m = this.minimap;
    const ci = this.circuit;
    const pad = 10;
    const sx = (box.w - pad * 2) / m.w;
    const sy = (box.h - pad * 2) / m.h;
    const s = Math.min(sx, sy);
    const ox = box.x + pad + (box.w - pad * 2 - m.w * s) / 2;
    const oy = box.y + pad + (box.h - pad * 2 - m.h * s) / 2;
    const px = (x) => ox + (x - m.minX) * s;
    const py = (y) => oy + (y - m.minY) * s;

    ctx2d.save();
    ctx2d.beginPath();
    for (let i = 0; i <= ci.n; i++) {
      const k = i % ci.n;
      if (i === 0) ctx2d.moveTo(px(ci.x[k]), py(ci.y[k]));
      else ctx2d.lineTo(px(ci.x[k]), py(ci.y[k]));
    }
    ctx2d.closePath();
    ctx2d.strokeStyle = 'rgba(255,255,255,0.22)';
    ctx2d.lineWidth = 5;
    ctx2d.stroke();
    ctx2d.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx2d.lineWidth = 1.6;
    ctx2d.stroke();

    // Sector dividers
    ci.sectorIdx.forEach((idx, k) => {
      ctx2d.fillStyle = k === 0 ? '#FFD24A' : '#4AC6FF';
      ctx2d.fillRect(px(ci.x[idx]) - 2, py(ci.y[idx]) - 2, 4, 4);
    });

    for (const car of race.cars) {
      if (car.retired) continue;
      ctx2d.beginPath();
      ctx2d.arc(px(car.x), py(car.y), car === player ? 4 : 2.8, 0, Math.PI * 2);
      ctx2d.fillStyle = car === player ? '#FFFFFF' : car.team.colour;
      ctx2d.fill();
      if (car === player) {
        ctx2d.strokeStyle = car.team.colour;
        ctx2d.lineWidth = 2;
        ctx2d.stroke();
      }
    }
    ctx2d.restore();
  }
}
