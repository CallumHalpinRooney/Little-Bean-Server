import { Car, SURFACE } from './car.js';
import { AIDriver } from './ai.js';
import { clamp, mulberry32, gaussian, wrapAngle } from './geometry.js';
import { COMPOUNDS, POINTS, FASTEST_LAP_POINT } from '../data/teams.js';

const PHYS_DT = 1 / 120;
const MAX_SUBSTEPS = 8;

export const DIFFICULTIES = {
  rookie:   { key: 'rookie',   label: 'Rookie',    aiPace: 0.905, assists: { tc: true,  abs: true,  stability: 1.5 }, damage: 0.35, wear: 0.55 },
  amateur:  { key: 'amateur',  label: 'Amateur',   aiPace: 0.945, assists: { tc: true,  abs: true,  stability: 0.9 }, damage: 0.6,  wear: 0.75 },
  pro:      { key: 'pro',      label: 'Pro',       aiPace: 0.978, assists: { tc: false, abs: true,  stability: 0.4 }, damage: 0.85, wear: 1.0 },
  ace:      { key: 'ace',      label: 'Ace',       aiPace: 1.000, assists: { tc: false, abs: false, stability: 0.15 }, damage: 1.0, wear: 1.15 },
  legend:   { key: 'legend',   label: 'Legend',    aiPace: 1.022, assists: { tc: false, abs: false, stability: 0 },   damage: 1.2,  wear: 1.3 },
};

export const WEATHERS = {
  dry:      { key: 'dry',      label: 'Dry',            wetness: 0,    grip: 1.00, rain: 0 },
  overcast: { key: 'overcast', label: 'Overcast',       wetness: 0,    grip: 0.985, rain: 0 },
  damp:     { key: 'damp',     label: 'Damp track',     wetness: 0.35, grip: 0.90, rain: 0.25 },
  wet:      { key: 'wet',      label: 'Wet',            wetness: 0.70, grip: 0.80, rain: 0.65 },
  storm:    { key: 'storm',    label: 'Heavy rain',     wetness: 1.00, grip: 0.70, rain: 1.0 },
};

/** Per-car timing, strategy and classification state. */
class Timing {
  constructor() {
    this.lap = 0;
    this.lapStart = 0;
    this.lastLap = null;
    this.bestLap = null;
    this.sector = 0;
    this.sectorStart = 0;
    this.sectors = [null, null, null];
    this.bestSectors = [null, null, null];
    this.position = 0;
    this.gapAhead = 0;
    this.gapLeader = 0;
    this.pitStops = 0;
    this.penalty = 0;
    this.penaltyServed = 0;
    this.trackLimits = 0;
    this.finished = false;
    this.finishTime = null;
    this.totalDistance = 0;
    this.compoundsUsed = new Set();
    this.lapHistory = [];
    this.lapArmed = true;
    this.drsEligible = false;
    this.startPosition = 0;
  }
}

export class RaceDirector {
  /**
   * @param {object} cfg
   *   circuit, entries[{driver,isPlayer}], session, laps, difficulty, weather,
   *   seed, gridOrder (array of driver ids)
   */
  constructor(cfg) {
    this.cfg = cfg;
    this.circuit = cfg.circuit;
    this.session = cfg.session;           // 'practice' | 'qualifying' | 'race'
    this.difficulty = DIFFICULTIES[cfg.difficulty] || DIFFICULTIES.pro;
    this.weather = WEATHERS[cfg.weather] || WEATHERS.dry;
    this.totalLaps = cfg.laps;
    this.rand = mulberry32(cfg.seed || 20250307);

    this.time = 0;
    this.phase = this.session === 'race' ? 'grid' : 'running';
    this.phaseTimer = 0;
    this.lights = 0;
    this.events = [];
    this.particles = [];
    this.vsc = false;
    this.vscTimer = 0;
    this.yellow = null;
    this.finishedOrder = [];
    this.raceOver = false;
    this.fastestLap = { time: null, car: null };
    this.sessionBest = [null, null, null];

    this.env = {
      trackGrip: this.circuit.data.gripBase * this.weather.grip,
      wetness: this.weather.wetness,
      assists: { ...this.difficulty.assists },
      aeroScale: 1,
      fuelScale: 1,
      wearScale: this.difficulty.wear,
      paceScale: 1,
    };

    // The reference profile must be built with the same grip the cars will
    // actually find, otherwise the AI aims at speeds the track cannot support.
    this.speedProfileRef = this.circuit.speedProfile(this.env.trackGrip);
    this.idealLapTime = this.lapTimeFor(this.speedProfileRef);

    this.buildField();
    this.setupSession();
  }

  // -------------------------------------------------------------------
  // Field construction
  // -------------------------------------------------------------------

  buildField() {
    const ci = this.circuit;
    this.cars = [];
    this.ai = new Map();
    this.timing = new Map();

    this.cfg.entries.forEach((entry, i) => {
      const car = new Car({ ...entry, index: i }, ci);
      car.pitPathIndex = null;
      car.pitState = null;
      car.pitStopTimer = 0;
      car.pitRequested = false;
      car.prevS = 0;
      car.offTrackTimer = 0;
      car.contactCooldown = 0;
      this.cars.push(car);
      this.timing.set(car, new Timing());
      if (!entry.isPlayer) {
        const ai = new AIDriver(car, ci, this.difficulty, (this.cfg.seed || 1) + i * 7919);
        this.ai.set(car, ai);
      } else {
        this.playerCar = car;
      }
    });

    // Per-car performance scale so the constructors' order is felt on track.
    for (const car of this.cars) {
      car.paceScale = car.team.pace ** 1.6;
      car.aeroScale = 0.94 + (car.team.pace - 0.94) * 1.6;
    }
  }

  setupSession() {
    const ci = this.circuit;
    const order = this.cfg.gridOrder
      ? this.cfg.gridOrder.map((id) => this.cars.find((c) => c.driver.id === id)).filter(Boolean)
      : this.cars.slice();
    this.gridOrder = order;

    if (this.session === 'race') {
      const slots = ci.gridSlots(order.length);
      order.forEach((car, i) => {
        const s = slots[i];
        car.placeAt(s.x, s.y, s.heading, 0);
        car.setCompound(this.pickStartCompound(i));
        car.fuel = Math.min(100, 1.6 + this.totalLaps * (ci.length / 1000) * 0.34);
        const t = this.timing.get(car);
        t.startPosition = i + 1;
        t.position = i + 1;
        t.compoundsUsed.add(car.compound);
        const ai = this.ai.get(car);
        if (ai) ai.planStrategy(this.totalLaps, this.rand, ['soft', 'medium', 'hard']);
      });
      this.phase = 'grid';
      this.phaseTimer = 3.0;
    } else {
      // Practice / qualifying: spread the field around the lap so it flows.
      order.forEach((car, i) => {
        const idx = Math.round((i / order.length) * ci.n);
        const lat = ci.line.offset[idx];
        const [x, y] = ci.posAt(idx, lat);
        // Join the circuit at a speed the corner they are on can actually take.
        car.placeAt(x, y, ci.heading[idx], Math.min(60, this.speedProfileRef[idx] * 0.85));
        car.setCompound(this.session === 'qualifying' ? 'soft' : 'medium');
        car.fuel = this.session === 'qualifying' ? 12 : 45;
        const tt = this.timing.get(car);
        tt.startPosition = i + 1;
        tt.position = i + 1;
        tt.compoundsUsed.add(car.compound);
        const ai = this.ai.get(car);
        if (ai) ai.launched = true;
        this.timing.get(car).lapStart = 0;
      });
      if (this.playerCar) {
        const idx = 4;
        const [x, y] = this.circuit.posAt(idx, 0);
        this.playerCar.placeAt(x, y, this.circuit.heading[idx], 0);
      }
      this.phase = 'running';
      this.sessionTimeLimit = this.session === 'qualifying' ? 12 * 60 : 20 * 60;
    }
  }

  pickStartCompound(gridIndex) {
    if (this.weather.wetness >= 0.6) return 'wet';
    if (this.weather.wetness > 0.2) return 'inter';
    if (gridIndex < 10) return this.rand() < 0.65 ? 'medium' : 'soft';
    return this.rand() < 0.5 ? 'hard' : 'medium';
  }

  /** Integrate a speed profile into a lap time. */
  lapTimeFor(profile) {
    let t = 0;
    for (let i = 0; i < profile.length; i++) t += this.circuit.ds / Math.max(8, profile[i]);
    return t;
  }

  /**
   * Statistical qualifying: the player drives for real, the AI times come from
   * the circuit's ideal lap scaled by car and driver performance.
   */
  simulateQualifying(playerBest) {
    const results = [];
    for (const car of this.cars) {
      if (car === this.playerCar) continue;
      const ai = this.ai.get(car);
      const perf = ai.pace * car.team.pace;
      const base = (this.idealLapTime * 1.045) / perf;
      const noise = gaussian(this.rand, 0, 0.22 * (1.25 - car.driver.consistency));
      results.push({ car, time: base + noise });
    }
    if (this.playerCar) {
      results.push({ car: this.playerCar, time: playerBest ?? Infinity });
    }
    results.sort((a, b) => a.time - b.time);
    return results;
  }

  // -------------------------------------------------------------------
  // Simulation loop
  // -------------------------------------------------------------------

  step(frameDt, playerControls) {
    const dt = Math.min(0.05, frameDt);
    this.acc = (this.acc || 0) + dt;
    let steps = 0;
    while (this.acc >= PHYS_DT && steps < MAX_SUBSTEPS) {
      this.tick(PHYS_DT, playerControls);
      this.acc -= PHYS_DT;
      steps++;
    }
    if (steps === MAX_SUBSTEPS) this.acc = 0;
    this.updateParticles(dt);
  }

  tick(dt, controls) {
    this.time += dt;
    this.updatePhase(dt);
    this.updateWorldState(dt);

    const world = this.worldContext();

    for (const car of this.cars) {
      if (car.retired) continue;
      if (car.inPitLane) { this.drivePitLane(car, dt); continue; }

      if (car === this.playerCar) this.applyPlayerControls(car, controls, dt);
      else {
        const ai = this.ai.get(car);
        ai.update(dt, world);
        this.considerAIPit(car, ai);
      }

      this.applySurface(car);
      car.update(dt, this.envFor(car));
      this.postPhysics(car, dt);
      this.checkPitEntry(car);
    }

    this.resolveCollisions(dt);
    this.updateTimingAndOrder(dt);
    this.updateDRS();
  }

  envFor(car) {
    return {
      ...this.env,
      assists: car === this.playerCar ? this.env.assists : { tc: false, abs: true, stability: 0.05 },
      paceScale: car.paceScale ?? 1,
      aeroScale: car.aeroScale ?? 1,
      fuelScale: 1,
      wearScale: this.env.wearScale * (car === this.playerCar ? 1 : 0.96),
    };
  }

  updatePhase(dt) {
    if (this.session !== 'race') {
      if (this.sessionTimeLimit && this.time > this.sessionTimeLimit) this.phase = 'finished';
      return;
    }
    this.phaseTimer -= dt;
    if (this.phase === 'grid' && this.phaseTimer <= 0) {
      this.phase = 'lights';
      this.lights = 0;
      this.phaseTimer = 1.0;
      this.emit('Lights out procedure has begun', 'race');
    } else if (this.phase === 'lights') {
      if (this.phaseTimer <= 0) {
        this.lights++;
        if (this.lights <= 5) {
          this.phaseTimer = 1.0;
          this.emit(null, 'light');
        } else {
          // Random hold, then lights out.
          this.phase = 'hold';
          this.phaseTimer = 0.35 + this.rand() * 1.15;
        }
      }
    } else if (this.phase === 'hold' && this.phaseTimer <= 0) {
      this.phase = 'racing';
      this.lights = 0;
      this.raceStartTime = this.time;
      this.emit("It's lights out and away we go!", 'race');
      for (const car of this.cars) this.timing.get(car).lapStart = this.time;
    }
  }

  updateWorldState(dt) {
    if (this.vsc) {
      this.vscTimer -= dt;
      if (this.vscTimer <= 0) {
        this.vsc = false;
        this.emit('Virtual Safety Car ending — green flag', 'flag');
      }
    }
  }

  worldContext() {
    return {
      phase: this.phase,
      speedProfile: this.speedProfileRef,
      env: this.env,
      vsc: this.vsc,
      vscSpeed: 33,
      lapsLeft: this.totalLaps - (this.playerCar ? this.timing.get(this.playerCar).lap : 0),
      carAhead: (car, range) => this.carAhead(car, range),
      carBehind: (car, range) => this.carBehind(car, range),
      blueFlagFor: (car) => this.blueFlagFor(car),
    };
  }

  // -------------------------------------------------------------------
  // Player controls
  // -------------------------------------------------------------------

  applyPlayerControls(car, c, dt) {
    if (!c) return;
    if (this.phase === 'grid' || this.phase === 'lights' || this.phase === 'hold') {
      car.throttle = c.throttle * 0.4;
      car.brake = 1;
      car.steer = 0;
      if (this.phase === 'hold' && c.throttle > 0.5) {
        this.jumpStartArmed = true;
      }
      return;
    }
    car.throttle = c.throttle;
    car.brake = c.brake;
    car.steer = c.steer;
    car.ersDeploy = c.ers && car.ers > 0 ? 1 : 0;
    car.drsOpen = car.drsAvailable && c.drs;
    if (this.jumpStartArmed && this.phase === 'racing' && !this.jumpStartApplied) {
      this.jumpStartApplied = true;
      this.timing.get(car).penalty += 5;
      this.emit('Jump start — 5 second time penalty', 'penalty');
    }
    void dt;
  }

  // -------------------------------------------------------------------
  // Surfaces, track limits and barriers
  // -------------------------------------------------------------------

  applySurface(car) {
    const ci = this.circuit;
    const loc = ci.locate(car.x, car.y, car.node, car.heading);
    car.node = loc.index;
    car.lapDistance = loc.s;
    car.lateral = loc.lateral;

    const a = Math.abs(loc.lateral);
    const half = ci.half;
    const street = !!ci.data.street;
    const kerbEdge = half + 1.4;
    const runoffEdge = half + (street ? 2.4 : 9.0);
    const gravelEdge = half + (street ? 3.0 : 20.0);

    if (a <= half) car.surface = 'track';
    else if (a <= kerbEdge) car.surface = 'kerb';
    else if (a <= runoffEdge) car.surface = 'runoff';
    else if (a <= gravelEdge) car.surface = street ? 'gravel' : 'grass';
    else car.surface = street ? 'gravel' : 'gravel';

    car.offTrack = a > half + 0.55;
    if (car.surface === 'grass' || car.surface === 'gravel') car.grassDust = 1;

    // Barrier.
    const wallDist = street ? half + 3.2 : half + 22;
    if (a > wallDist) this.hitWall(car, loc, wallDist);
  }

  hitWall(car, loc, wallDist) {
    const ci = this.circuit;
    const side = Math.sign(loc.lateral);
    const [wx, wy] = ci.posAt(loc.index, side * wallDist);
    car.x = wx; car.y = wy;

    const nx = ci.nx[loc.index] * side;
    const ny = ci.ny[loc.index] * side;
    // Convert body velocity to world, reflect the normal component.
    const cosH = Math.cos(car.heading);
    const sinH = Math.sin(car.heading);
    let wvx = car.vx * cosH - car.vy * sinH;
    let wvy = car.vx * sinH + car.vy * cosH;
    const vn = wvx * nx + wvy * ny;
    const impact = Math.abs(vn);
    if (vn > 0) {
      wvx -= nx * vn * 1.5;
      wvy -= ny * vn * 1.5;
    }
    const damp = impact > 22 ? 0.35 : 0.72;
    wvx *= damp; wvy *= damp;
    car.vx = wvx * cosH + wvy * sinH;
    car.vy = -wvx * sinH + wvy * cosH;
    car.r *= -0.25;

    if (car.contactCooldown <= 0 && impact > 4) {
      car.contactCooldown = 0.6;
      const severity = clamp(impact / 40, 0, 1) * this.difficulty.damage;
      car.applyDamage('front', severity * 0.55);
      car.applyDamage('floor', severity * 0.3);
      this.spawnDebris(car, severity);
      if (car === this.playerCar) {
        this.emit(impact > 25 ? 'Heavy contact with the barrier — check the car'
          : 'Contact with the wall', 'incident');
      }
      if (severity > 0.85) this.retire(car, 'Accident damage');
      this.onImpact?.(clamp(impact / 45, 0, 1));
    }
  }

  postPhysics(car, dt) {
    if (car.contactCooldown > 0) car.contactCooldown -= dt;
    const t = this.timing.get(car);
    this.checkStranded(car, dt);

    // Track limits: one strike per excursion.
    if (car.offTrack && car.speed > 12) {
      car.offTrackTimer += dt;
      if (car.offTrackTimer > 0.35 && !car.offTrackCounted) {
        car.offTrackCounted = true;
        if (this.session === 'race' || this.session === 'qualifying') {
          t.trackLimits++;
          if (car === this.playerCar) {
            if (t.trackLimits % 3 === 0) {
              t.penalty += 5;
              this.emit('Track limits — 5 second time penalty', 'penalty');
            } else {
              this.emit(`Track limits warning ${t.trackLimits} of 3`, 'warning');
            }
          }
        }
      }
    } else if (!car.offTrack) {
      car.offTrackTimer = 0;
      car.offTrackCounted = false;
    }

    if (car.fuel <= 0.02 && !car.retired && this.session === 'race') {
      this.retire(car, 'Out of fuel');
    }
    if (car.damage.engine > 0.95) this.retire(car, 'Power unit failure');

    // Tyre smoke, dust and sparks.
    if (car.lockup > 0.25 && car.speed > 20) this.spawnSmoke(car, car.lockup);
    if (car.wheelspin > 0.35 && car.speed < 60) this.spawnSmoke(car, car.wheelspin * 0.7);
    if (car.grassDust > 0.4 && car.speed > 14) this.spawnDust(car);
    if (car.speed > 60 && Math.abs(car.longAccel) > 8 && this.rand() < 0.25) {
      this.spawnSparks(car);
    }
  }

  /**
   * A car that has spun to a stop in the gravel, or ended up pointing back down
   * the circuit, is recovered onto the track facing the right way — the same
   * thing marshals do, and the same thing the player's recover key does. The
   * lost time is punishment enough without leaving it stranded all race.
   */
  checkStranded(car, dt) {
    if (car.inPitLane || car.retired) { car.strandedFor = 0; return; }
    const ci = this.circuit;
    const wrongWay = Math.abs(wrapAngle(car.heading - ci.heading[car.node])) > 1.9;
    const stuck = (car.offTrack && car.speed < 7) || (wrongWay && car.speed < 26);
    car.strandedFor = stuck ? (car.strandedFor || 0) + dt : 0;
    if (car.strandedFor < 2.4) return;

    car.strandedFor = 0;
    const lat = clamp(car.lateral, -ci.half * 0.55, ci.half * 0.55);
    const [px, py] = ci.posAt(car.node, lat);
    car.x = px; car.y = py;
    car.heading = ci.heading[car.node];
    car.vx = 14; car.vy = 0; car.r = 0;
    car.steerActual = 0;
    car.surface = 'track';
    car.offTrack = false;
    const ai = this.ai.get(car);
    if (ai) { ai.offset = 0; ai.offsetTarget = 0; }
    if (car === this.playerCar) this.emit('Recovered and rejoining the circuit', 'info');
  }

  retire(car, reason) {
    if (car.retired) return;
    car.retired = true;
    car.throttle = 0;
    const t = this.timing.get(car);
    t.retiredReason = reason;
    this.emit(`${car.driver.last} is out — ${reason}`, 'retire');
    if (this.session === 'race' && !this.vsc && !car.inPitLane) {
      this.vsc = true;
      this.vscTimer = 22;
      this.emit('Virtual Safety Car deployed', 'flag');
    }
  }

  // -------------------------------------------------------------------
  // Car-to-car contact
  // -------------------------------------------------------------------

  resolveCollisions(dt) {
    const cars = this.cars;
    const R = 1.28;
    const offsets = [1.55, -1.55];
    for (let i = 0; i < cars.length; i++) {
      const a = cars[i];
      if (a.retired || a.inPitLane) continue;
      for (let j = i + 1; j < cars.length; j++) {
        const b = cars[j];
        if (b.retired || b.inPitLane) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        if (dx * dx + dy * dy > 64) continue;

        for (const oa of offsets) {
          for (const ob of offsets) {
            const ax = a.x + Math.cos(a.heading) * oa;
            const ay = a.y + Math.sin(a.heading) * oa;
            const bx = b.x + Math.cos(b.heading) * ob;
            const by = b.y + Math.sin(b.heading) * ob;
            let nx = bx - ax;
            let ny = by - ay;
            const d = Math.hypot(nx, ny);
            const overlap = R * 2 - d;
            if (overlap <= 0 || d < 1e-6) continue;
            nx /= d; ny /= d;

            // Positional correction.
            const push = overlap * 0.5;
            a.x -= nx * push; a.y -= ny * push;
            b.x += nx * push; b.y += ny * push;

            // Velocity impulse in world space.
            const av = this.worldVel(a);
            const bv = this.worldVel(b);
            const rel = (bv.x - av.x) * nx + (bv.y - av.y) * ny;
            if (rel < 0) {
              const e = 0.28;
              const imp = -(1 + e) * rel * 0.5;
              av.x -= nx * imp; av.y -= ny * imp;
              bv.x += nx * imp; bv.y += ny * imp;
              this.setWorldVel(a, av);
              this.setWorldVel(b, bv);
              const spin = 0.5 * Math.sign(oa - ob || 1);
              a.r -= spin * Math.abs(rel) * 0.012;
              b.r += spin * Math.abs(rel) * 0.012;

              const severity = clamp(Math.abs(rel) / 22, 0, 1) * this.difficulty.damage;
              if (severity > 0.04 && a.contactCooldown <= 0 && b.contactCooldown <= 0) {
                a.contactCooldown = 0.5;
                b.contactCooldown = 0.5;
                // The car behind takes the front-wing damage.
                const aAhead = this.circuit.forwardGap(b.lapDistance, a.lapDistance) > 0;
                const behind = aAhead ? b : a;
                const front = aAhead ? a : b;
                behind.applyDamage('front', severity * 0.7);
                front.applyDamage('rear', severity * 0.45);
                this.spawnDebris(behind, severity);
                this.onImpact?.(severity);
                if (severity > 0.3 && (a === this.playerCar || b === this.playerCar)) {
                  this.emit('Contact! Check the front wing', 'incident');
                }
                if (severity > 0.75) {
                  if (this.rand() < 0.35) this.retire(behind, 'Collision damage');
                }
              }
            }
          }
        }
      }
    }
    void dt;
  }

  worldVel(c) {
    const cosH = Math.cos(c.heading);
    const sinH = Math.sin(c.heading);
    return { x: c.vx * cosH - c.vy * sinH, y: c.vx * sinH + c.vy * cosH };
  }

  setWorldVel(c, v) {
    const cosH = Math.cos(c.heading);
    const sinH = Math.sin(c.heading);
    c.vx = v.x * cosH + v.y * sinH;
    c.vy = -v.x * sinH + v.y * cosH;
  }

  // -------------------------------------------------------------------
  // Timing, order, DRS
  // -------------------------------------------------------------------

  updateTimingAndOrder(dt) {
    const ci = this.circuit;
    const L = ci.length;

    for (const car of this.cars) {
      const t = this.timing.get(car);
      if (t.finished) continue;
      const s = car.lapDistance;
      const prev = car.prevS;

      // Lap completion — armed only after passing the far side of the lap.
      if (prev > L * 0.82 && s < L * 0.18 && !car.inPitLane && t.lapArmed) {
        t.lapArmed = false;
        this.onLapComplete(car, t);
      }
      if (s > L * 0.40 && s < L * 0.62) t.lapArmed = true;
      // Sector boundaries.
      const secIdx = this.sectorOf(car.node);
      if (secIdx !== t.sector && !(t.sector === 2 && secIdx === 0)) {
        if (secIdx === t.sector + 1) {
          const st = this.time - t.sectorStart;
          t.sectors[t.sector] = st;
          if (this.sessionBest[t.sector] === null || st < this.sessionBest[t.sector]) {
            this.sessionBest[t.sector] = st;
            t.purple = t.sector;
          }
          if (t.bestSectors[t.sector] === null || st < t.bestSectors[t.sector]) {
            t.bestSectors[t.sector] = st;
          }
          t.sectorStart = this.time;
          t.sector = secIdx;
        }
      }

      t.totalDistance = t.lap * L + s;
      car.prevS = s;
    }

    // Order.
    const running = this.cars.slice().sort((a, b) => {
      const ta = this.timing.get(a);
      const tb = this.timing.get(b);
      if (ta.finished && tb.finished) return ta.finishTime - tb.finishTime;
      if (ta.finished) return -1;
      if (tb.finished) return 1;
      if (a.retired !== b.retired) return a.retired ? 1 : -1;
      return tb.totalDistance - ta.totalDistance;
    });
    running.forEach((car, i) => {
      const t = this.timing.get(car);
      t.position = i + 1;
      const leader = running[0];
      const lt = this.timing.get(leader);
      const dLeader = lt.totalDistance - t.totalDistance;
      t.gapLeader = dLeader / Math.max(18, car.speed);
      t.lapsDown = Math.floor(dLeader / L);
      if (i > 0) {
        const ahead = running[i - 1];
        const at = this.timing.get(ahead);
        t.gapAhead = (at.totalDistance - t.totalDistance) / Math.max(18, car.speed);
        t.carAheadRef = ahead;
      } else {
        t.gapAhead = 0;
        t.carAheadRef = null;
      }
    });
    this.order = running;

    // Dirty air and tow.
    for (const car of this.cars) {
      const t = this.timing.get(car);
      const ahead = t.carAheadRef;
      if (ahead && !car.inPitLane && !ahead.inPitLane) {
        const gapM = ci.forwardGap(car.lapDistance, ahead.lapDistance);
        const lateral = Math.abs(ahead.lateral - car.lateral);
        if (gapM > 0 && gapM < 60 && lateral < 9) {
          const closeness = 1 - gapM / 60;
          car.dirtyAir = closeness * (1 - lateral / 12) ;
          car.tow = gapM < 45 && lateral < 4.5 ? closeness * 0.9 : 0;
        } else { car.dirtyAir = 0; car.tow = 0; }
      } else { car.dirtyAir = 0; car.tow = 0; }
    }

    if (this.session === 'race' && !this.raceOver) {
      const leader = this.order[0];
      if (leader && this.timing.get(leader).lap >= this.totalLaps) this.checkFinish();
    }
    void dt;
  }

  sectorOf(node) {
    const [a, b] = this.circuit.sectorIdx;
    if (node < a) return 0;
    if (node < b) return 1;
    return 2;
  }

  onLapComplete(car, t) {
    const lapTime = this.time - t.lapStart;
    t.lapStart = this.time;
    t.sectorStart = this.time;
    t.sector = 0;
    t.lap++;

    if (t.lap > 1 || this.session !== 'race') {
      if (lapTime > 20 && lapTime < 600) {
        t.lastLap = lapTime;
        t.lapHistory.push({ lap: t.lap, time: lapTime, compound: car.compound });
        if (t.bestLap === null || lapTime < t.bestLap) t.bestLap = lapTime;
        if (!car.offTrackCounted && (this.fastestLap.time === null || lapTime < this.fastestLap.time)) {
          this.fastestLap = { time: lapTime, car };
          if (car === this.playerCar) this.emit('Fastest lap of the race!', 'good');
          else if (this.session === 'race') this.emit(`${car.driver.last} sets the fastest lap`, 'info');
        }
      }
    }

    if (this.session === 'race' && t.lap >= this.totalLaps && !t.finished) {
      t.finished = true;
      t.finishTime = this.time + t.penalty - t.penaltyServed;
      this.finishedOrder.push(car);
      if (car === this.playerCar) {
        this.emit(`Chequered flag — P${t.position}`, 'race');
      }
    }

    if (car === this.playerCar && this.session === 'race') {
      const left = this.totalLaps - t.lap;
      if (left === 5) this.emit('Five laps to go', 'info');
      if (left === 1) this.emit('Last lap — bring it home', 'info');
      if (car.tyreWear > 0.72) this.emit('Tyres are going off, box this lap?', 'strategy');
    }
  }

  checkFinish() {
    const stillRunning = this.cars.some((c) => !c.retired && !this.timing.get(c).finished);
    const leaderDone = this.timing.get(this.order[0]).finished;
    if (leaderDone && (!stillRunning || this.timeSinceLeaderFinish > 60)) {
      this.raceOver = true;
      this.phase = 'finished';
    }
    if (leaderDone) {
      this.timeSinceLeaderFinish = (this.timeSinceLeaderFinish || 0) + PHYS_DT;
      if (this.timeSinceLeaderFinish > 90) { this.raceOver = true; this.phase = 'finished'; }
    }
  }

  updateDRS() {
    const ci = this.circuit;
    if (this.session === 'race' && this.timing.get(this.order?.[0] ?? this.cars[0]).lap < 2) {
      for (const car of this.cars) { car.drsAvailable = false; car.drsOpen = false; }
      return;
    }
    for (const car of this.cars) {
      const t = this.timing.get(car);
      const zone = ci.drsZoneAt(car.node);
      if (!zone || this.vsc || car.inPitLane || this.env.wetness > 0.3) {
        car.drsAvailable = false;
        if (!zone) car.drsOpen = false;
        continue;
      }
      // Eligibility is latched at the detection point of the zone.
      const detectNode = zone.detect;
      const passedDetect = Math.abs(ci.forwardGap(detectNode * ci.ds, car.lapDistance)) < 40;
      if (passedDetect) {
        const ahead = t.carAheadRef;
        t.drsEligible = !!ahead && !ahead.inPitLane
          && ci.forwardGap(car.lapDistance, ahead.lapDistance) > 0
          && t.gapAhead < 1.0;
      }
      car.drsAvailable = t.drsEligible;
      if (!car.drsAvailable) car.drsOpen = false;
    }
  }

  blueFlagFor(car) {
    const t = this.timing.get(car);
    const behind = this.carBehind(car, 30);
    if (!behind) return false;
    const bt = this.timing.get(behind);
    return bt.lap > t.lap;
  }

  carAhead(car, range) {
    const ci = this.circuit;
    let best = null;
    let bestGap = range;
    for (const o of this.cars) {
      if (o === car || o.retired || o.inPitLane) continue;
      const gap = ci.forwardGap(car.lapDistance, o.lapDistance);
      if (gap > 0 && gap < bestGap) { bestGap = gap; best = o; }
    }
    return best;
  }

  carBehind(car, range) {
    const ci = this.circuit;
    let best = null;
    let bestGap = range;
    for (const o of this.cars) {
      if (o === car || o.retired || o.inPitLane) continue;
      const gap = ci.forwardGap(o.lapDistance, car.lapDistance);
      if (gap > 0 && gap < bestGap) { bestGap = gap; best = o; }
    }
    return best;
  }

  // -------------------------------------------------------------------
  // Pit stops
  // -------------------------------------------------------------------

  requestPit(car, compound) {
    if (car.inPitLane || car.retired) return false;
    car.pitRequested = true;
    car.pitCompoundWanted = compound || this.suggestCompound(car);
    if (car === this.playerCar) this.emit('Box, box — pit lane entry ahead', 'strategy');
    return true;
  }

  cancelPit(car) {
    car.pitRequested = false;
    if (car === this.playerCar) this.emit('Staying out — cancel the stop', 'strategy');
  }

  suggestCompound(car) {
    if (this.env.wetness >= 0.6) return 'wet';
    if (this.env.wetness > 0.2) return 'inter';
    const t = this.timing.get(car);
    const lapsLeft = this.totalLaps - t.lap;
    if (lapsLeft < 14) return 'soft';
    if (lapsLeft < 30) return 'medium';
    return 'hard';
  }

  considerAIPit(car, ai) {
    if (this.session !== 'race' || car.pitRequested || car.inPitLane) return;
    const t = this.timing.get(car);
    if (!ai.pitLaps) return;
    const due = ai.pitLaps.some((lap) => t.lap === lap - 1)
      || car.tyreWear > 0.88
      || (car.damage.front > 0.55 && this.rand() < 0.02);
    if (due) {
      const idx = Math.min(t.pitStops, (ai.pitCompounds?.length ?? 1) - 1);
      let compound = ai.pitCompounds?.[idx] || 'medium';
      if (this.env.wetness >= 0.6) compound = 'wet';
      else if (this.env.wetness > 0.2) compound = 'inter';
      // Must run two dry compounds.
      if (this.env.wetness < 0.2 && t.compoundsUsed.size === 1 && t.compoundsUsed.has(compound)) {
        compound = compound === 'hard' ? 'medium' : 'hard';
      }
      car.pitRequested = true;
      car.pitCompoundWanted = compound;
    }
  }

  /** Kinematic guidance through the pit lane — reliable for player and AI. */
  drivePitLane(car, dt) {
    const ci = this.circuit;
    const pit = ci.pit;
    const t = this.timing.get(car);

    if (car.pitStopTimer > 0) {
      car.pitStopTimer -= dt;
      car.vx = 0; car.vy = 0; car.r = 0;
      if (car.pitStopTimer <= 0) {
        car.setCompound(car.pitCompoundWanted || 'medium');
        t.compoundsUsed.add(car.compound);
        t.pitStops++;
        car.fuel = Math.min(110, car.fuel);
        if (car.damage.front > 0.25) car.damage.front = Math.max(0, car.damage.front - 0.7);
        car.pitState = 'exiting';
        if (car === this.playerCar) {
          this.emit(`New ${COMPOUNDS[car.compound].name} tyres — go go go!`, 'strategy');
        }
      }
      return;
    }

    const speedLimit = pit.speedLimit;
    const targetSpeed = car.pitState === 'exiting'
      ? speedLimit
      : Math.min(speedLimit, 25);
    car.vx += clamp(targetSpeed - car.vx, -14 * dt, 9 * dt);
    car.vy = 0; car.r = 0;

    const advance = (car.vx * dt) / ci.ds;
    car.pitPathIndex += advance;

    // Serve a penalty in the box before the tyre change.
    const boxIndex = pit.boxStart + (t.startPosition - 1) * pit.boxSpacing;
    if (car.pitState === 'entering' && car.pitPathIndex >= boxIndex) {
      car.pitPathIndex = boxIndex;
      const crew = 2.05 + this.rand() * 0.9 + (1 - car.driver.consistency) * 0.25;
      const bungle = this.rand() < 0.06 ? 1.5 + this.rand() * 3.5 : 0;
      let penaltyServe = 0;
      if (t.penalty - t.penaltyServed > 0) {
        penaltyServe = t.penalty - t.penaltyServed;
        t.penaltyServed = t.penalty;
        if (car === this.playerCar) this.emit(`Serving ${penaltyServe.toFixed(0)}s penalty`, 'penalty');
      }
      car.pitStopTimer = crew + bungle + penaltyServe;
      car.pitState = 'stopped';
      if (bungle > 0 && car === this.playerCar) this.emit('Problem with the left rear!', 'warning');
      return;
    }

    if (car.pitPathIndex >= pit.path.length - 1) {
      // Rejoin the circuit.
      car.pitPathIndex = pit.path.length - 1;
      const node = pit.path[car.pitPathIndex];
      car.inPitLane = false;
      car.pitState = null;
      car.pitRequested = false;
      car.x = node.x; car.y = node.y;
      car.heading = ci.heading[node.i];
      car.vx = Math.max(car.vx, speedLimit);
      car.vy = 0;
      const loc = ci.locate(car.x, car.y, node.i);
      car.node = loc.index;
      car.prevS = loc.s;
      return;
    }

    const node = pit.path[Math.floor(car.pitPathIndex)];
    const next = pit.path[Math.min(pit.path.length - 1, Math.floor(car.pitPathIndex) + 1)];
    const frac = car.pitPathIndex - Math.floor(car.pitPathIndex);
    car.x = node.x + (next.x - node.x) * frac;
    car.y = node.y + (next.y - node.y) * frac;
    car.heading = Math.atan2(next.y - node.y, next.x - node.x);
    const loc = ci.locate(car.x, car.y, node.i);
    car.node = loc.index;
    car.lapDistance = loc.s;
    car.lateral = loc.lateral;
    // Passing the pit exit still counts as completing the lap.
    if (car.prevS > ci.length * 0.82 && loc.s < ci.length * 0.18 && t.lapArmed) {
      t.lapArmed = false;
      this.onLapComplete(car, t);
    }
    if (loc.s > ci.length * 0.40 && loc.s < ci.length * 0.62) t.lapArmed = true;
    car.prevS = loc.s;
  }

  /** Called each tick from outside the pit lane to catch the entry point. */
  checkPitEntry(car) {
    if (!car.pitRequested || car.inPitLane || car.retired) return;
    const ci = this.circuit;
    const entry = ci.pit.entryIdx;
    const gap = ci.forwardGap(car.lapDistance, entry * ci.ds);
    if (gap > -12 && gap < 6 && car.speed > 5) {
      car.inPitLane = true;
      car.pitState = 'entering';
      car.pitPathIndex = 0;
      car.drsOpen = false;
      if (car === this.playerCar) this.emit('Pit lane — limiter on', 'strategy');
    }
  }

  // -------------------------------------------------------------------
  // Effects
  // -------------------------------------------------------------------

  spawnSmoke(car, intensity) {
    if (this.particles.length > 600) return;
    for (let k = 0; k < 2; k++) {
      const back = -1.9;
      const side = (k === 0 ? 1 : -1) * 0.95;
      const cosH = Math.cos(car.heading);
      const sinH = Math.sin(car.heading);
      this.particles.push({
        type: 'smoke',
        x: car.x + cosH * back - sinH * side,
        y: car.y + sinH * back + cosH * side,
        vx: (this.rand() - 0.5) * 3,
        vy: (this.rand() - 0.5) * 3,
        life: 0.7 + this.rand() * 0.5,
        maxLife: 1.2,
        size: 1.1 + intensity * 1.6,
        alpha: 0.30 * intensity,
      });
    }
  }

  spawnDust(car) {
    if (this.particles.length > 600) return;
    this.particles.push({
      type: 'dust',
      x: car.x - Math.cos(car.heading) * 2,
      y: car.y - Math.sin(car.heading) * 2,
      vx: (this.rand() - 0.5) * 6,
      vy: (this.rand() - 0.5) * 6,
      life: 0.9, maxLife: 0.9,
      size: 1.6 + this.rand() * 1.4,
      alpha: 0.42,
      colour: this.circuit.data.theme.runoff,
    });
  }

  spawnSparks(car) {
    if (this.particles.length > 700) return;
    this.particles.push({
      type: 'spark',
      x: car.x - Math.cos(car.heading) * 2.4,
      y: car.y - Math.sin(car.heading) * 2.4,
      vx: -Math.cos(car.heading) * (8 + this.rand() * 10) + (this.rand() - 0.5) * 6,
      vy: -Math.sin(car.heading) * (8 + this.rand() * 10) + (this.rand() - 0.5) * 6,
      life: 0.35, maxLife: 0.35,
      size: 0.35, alpha: 1,
    });
  }

  spawnDebris(car, severity) {
    const count = Math.round(3 + severity * 12);
    for (let i = 0; i < count; i++) {
      this.particles.push({
        type: 'debris',
        x: car.x, y: car.y,
        vx: (this.rand() - 0.5) * 26 * severity,
        vy: (this.rand() - 0.5) * 26 * severity,
        life: 1.4 + this.rand(), maxLife: 2.4,
        size: 0.3 + this.rand() * 0.5,
        alpha: 1,
        colour: car.team.colour,
      });
    }
  }

  updateParticles(dt) {
    const out = [];
    for (const p of this.particles) {
      p.life -= dt;
      if (p.life <= 0) continue;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      const drag = p.type === 'spark' ? 0.90 : p.type === 'debris' ? 0.94 : 0.97;
      p.vx *= drag; p.vy *= drag;
      if (p.type === 'smoke' || p.type === 'dust') p.size += dt * 2.4;
      out.push(p);
    }
    this.particles = out;
  }

  emit(text, kind) {
    this.events.push({ text, kind, time: this.time });
    if (this.events.length > 40) this.events.shift();
    this.onEvent?.({ text, kind, time: this.time });
  }

  // -------------------------------------------------------------------
  // Results
  // -------------------------------------------------------------------

  classification() {
    return this.order.map((car, i) => {
      const t = this.timing.get(car);
      return {
        pos: i + 1,
        car,
        driver: car.driver,
        team: car.team,
        lap: t.lap,
        bestLap: t.bestLap,
        lastLap: t.lastLap,
        gapLeader: t.gapLeader,
        gapAhead: t.gapAhead,
        pitStops: t.pitStops,
        penalty: t.penalty - t.penaltyServed,
        retired: car.retired,
        reason: t.retiredReason,
        compound: car.compound,
        tyreWear: car.tyreWear,
        lapsDown: t.lapsDown,
        startPosition: t.startPosition,
        finished: t.finished,
      };
    });
  }

  awardPoints() {
    const table = [];
    const classified = this.classification().filter((r) => !r.retired);
    classified.forEach((r, i) => {
      let pts = POINTS[i] || 0;
      if (this.fastestLap.car === r.car && i < 10) pts += FASTEST_LAP_POINT;
      table.push({ driver: r.driver, team: r.team, points: pts, position: i + 1 });
    });
    this.classification().filter((r) => r.retired).forEach((r, i) => {
      table.push({ driver: r.driver, team: r.team, points: 0, position: classified.length + i + 1 });
    });
    return table;
  }
}

export { SURFACE };
