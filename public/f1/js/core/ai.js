import { clamp, wrapAngle, mulberry32, gaussian } from './geometry.js';

/**
 * An AI race driver. It drives the same physics model as the player through
 * synthetic control inputs: a pure-pursuit steering controller aimed at a
 * lookahead point on its chosen line, and a longitudinal controller that reads
 * the pre-computed speed profile far enough ahead to brake in time.
 */
export class AIDriver {
  constructor(car, circuit, difficulty, seed) {
    this.car = car;
    this.circuit = circuit;
    this.d = car.driver;
    this.rand = mulberry32(seed);

    // Difficulty scales the whole field; driver skill spreads it out.
    const skill = this.d.skill;
    this.pace = difficulty.aiPace * (0.955 + (skill - 0.86) * 0.62);
    this.reaction = 0.16 + (1 - skill) * 0.55;

    this.offset = 0;              // lateral bias from the racing line
    this.offsetTarget = 0;
    this.mistakeTimer = 6 + this.rand() * 24;
    this.mistake = 0;
    this.mistakeKind = 'wide';
    this.paceNoise = 0;
    this.noiseTimer = 0;
    this.launched = false;
    this.launchDelay = 0;
    this.attackTarget = null;
    this.attackTimer = 0;
    this.pitTargetLap = -1;
    this.pitCompound = 'hard';
    this.lastNode = 0;
  }

  /**
   * @param {number} dt
   * @param {object} w  world context supplied by the race director
   */
  update(dt, w) {
    const car = this.car;
    if (car.retired) { car.throttle = 0; car.brake = 1; car.steer = 0; return; }

    if (w.phase === 'grid' || w.phase === 'formation') {
      this.holdOnGrid(w);
      return;
    }
    if ((w.phase === 'lights' || w.phase === 'hold') && !this.launched) {
      car.throttle = 0.32; car.brake = 1; car.steer = 0;
      return;
    }
    if (w.phase === 'racing' && !this.launched) {
      this.launchDelay += dt;
      if (this.launchDelay < this.reaction) {
        car.throttle = 0.5; car.brake = 0.8;
        return;
      }
      this.launched = true;
    }

    this.updateNoise(dt);
    if (car.inPitLane) this.drivePitLane(dt, w);
    else this.driveTrack(dt, w);
  }

  holdOnGrid(w) {
    const car = this.car;
    car.throttle = 0; car.brake = 1; car.steer = 0;
    void w;
  }

  updateNoise(dt) {
    this.noiseTimer -= dt;
    if (this.noiseTimer <= 0) {
      this.noiseTimer = 1.5 + this.rand() * 3;
      const spread = (1 - this.d.consistency) * 0.020;
      this.paceNoise = gaussian(this.rand, 0, spread);
    }
    this.mistakeTimer -= dt;
    if (this.mistakeTimer <= 0) {
      const proneness = (1 - this.d.consistency);
      this.mistakeTimer = 25 + this.rand() * 90 / Math.max(0.15, proneness);
      if (this.rand() < proneness * 0.85) {
        this.mistake = 1.1 + this.rand() * 1.4;
        this.mistakeKind = this.rand() < 0.55 ? 'wide' : 'lock';
      }
    }
    if (this.mistake > 0) this.mistake = Math.max(0, this.mistake - dt);
  }

  // -------------------------------------------------------------------
  // Main racing behaviour
  // -------------------------------------------------------------------

  driveTrack(dt, w) {
    const car = this.car;
    const ci = this.circuit;
    const n = ci.n;
    const speed = car.speed;

    if (car.offTrack && car.surface !== 'kerb') { this.recover(dt, w); return; }

    // ---- Where do we want to be, laterally? --------------------------
    this.updateTactics(dt, w);
    this.offset += clamp(this.offsetTarget - this.offset, -6.5 * dt, 6.5 * dt);
    // For the first few seconds after the start the field runs closer to its
    // grid slot than to the ideal line, exactly as it does in reality.
    this.launchBlend = Math.min(1, (this.launchBlend ?? 0) + dt * 0.35);

    // ---- Steering -------------------------------------------------------
    // Aim at a point on the chosen line a fixed time up the road and work out
    // the path curvature needed to get there; that curvature times v squared is
    // a lateral acceleration, and the steering input is exactly a request for
    // lateral acceleration. Keeping the preview short at low speed stops the
    // car cutting the apex of a slow corner.
    const preview = clamp(5 + speed * 0.52, 9, 44);
    const previewNodes = Math.max(1, Math.round(preview / ci.ds));
    const ti = (car.node + previewNodes) % n;
    const blend = this.launchBlend ?? 1;
    const wantOff = clamp(
      ci.line.offset[ti] * blend + car.lateral * (1 - blend) + this.offset,
      -ci.half + 1.2, ci.half - 1.2,
    );
    const [tx, ty] = ci.posAt(ti, wantOff);

    const slip = Math.atan2(car.vy, Math.max(1, car.vx));
    const toTarget = Math.hypot(tx - car.x, ty - car.y);
    let err = wrapAngle(Math.atan2(ty - car.y, tx - car.x) - car.heading);
    // Aim where the car is actually going, not where it is pointing.
    err -= slip * 0.9;
    if (this.mistake > 0 && this.mistakeKind === 'wide') {
      err += Math.sin(this.mistake * 5.5) * 0.05;
    }

    const kappa = (2 * Math.sin(err)) / Math.max(6, toTarget);
    const need = kappa * speed * speed;
    let cmd = need / Math.max(5, car.latCapacity || 18) - car.r * 0.06;
    car.steer = clamp(cmd, -1, 1);

    // ---- Longitudinal: read the speed profile ahead -------------------
    let target = this.targetSpeed(w);

    if (w.vsc) target = Math.min(target, w.vscSpeed);

    if (this.mistake > 0 && this.mistakeKind === 'lock') target *= 0.90;

    const delta = speed - target;
    if (delta > 0.4) {
      car.brake = clamp(delta * 0.30 + 0.06, 0, 1);
      car.throttle = 0;
    } else {
      car.brake = 0;
      car.throttle = clamp(0.30 - delta * 0.55, 0, 1);
    }

    // Trail braking: whatever the brakes are using is not available to the
    // front tyres, so ease the steering demand rather than asking for grip
    // that is not there.
    car.steer *= Math.sqrt(Math.max(0.25, 1 - car.brake * car.brake * 0.75));

    // Respect the friction circle, and do it by looking at the corner rather
    // than by reacting to load already on the tyres. Grip spent on cornering is
    // not available for traction; asking for both is how a car ends up in the
    // run-off with the throttle pinned.
    const latRef = Math.min(11.4 + 0.0042 * speed * speed, 29.5) * w.env.trackGrip;
    // Only what the car is cornering through *now* — scanning far ahead here
    // makes the AI lift for a corner it has not reached, all the way round the
    // lap. Slowing down for what is coming is the speed profile's job.
    let kNow = 0;
    const scan = Math.max(1, Math.round((5 + speed * 0.12) / ci.ds));
    for (let k = 0; k <= scan; k++) {
      const c = Math.abs(ci.line.curv[(car.node + k) % n]);
      if (c > kNow) kNow = c;
    }
    const latDemand = kNow * speed * speed;
    const ceiling = Math.sqrt(Math.max(0.03, 1 - (latDemand / latRef) ** 2))
      * (0.72 + this.d.racecraft * 0.32);
    car.throttle = Math.min(car.throttle, ceiling);

    // Secondary guard on load actually being carried right now.
    const latUse = clamp(Math.abs(car.latG) / Math.max(6, car.latCapacity || 18), 0, 1);
    if (latUse > 0.85) car.throttle *= clamp(1 - (latUse - 0.85) * 3, 0.2, 1);

    // A slide costs more time than it saves — catch it before chasing pace.
    if (Math.abs(slip) > 0.16) {
      car.throttle *= clamp(1 - (Math.abs(slip) - 0.16) * 3.2, 0.15, 1);
    }


    // ---- ERS and DRS ---------------------------------------------------
    const wantsErs = car.throttle > 0.85 && speed > 42
      && (this.attackTarget !== null || car.ers > 2.2e6 || w.lapsLeft <= 3);
    car.ersDeploy = wantsErs && car.ers > 0.1e6 ? 1 : 0;
    car.drsOpen = car.drsAvailable && car.throttle > 0.6 && speed > 40;

    // ---- Avoid running into the back of someone ------------------------
    const ahead = w.carAhead(car, 34);
    if (ahead) {
      const gap = ci.forwardGap(car.lapDistance, ahead.lapDistance);
      const closing = speed - ahead.speed;
      const lateralDiff = Math.abs((ahead.lateral) - (car.lateral));
      if (gap > 0 && gap < 14 && lateralDiff < 3.4 && closing > 1) {
        const brakeNeed = clamp((closing * 2.2 - gap * 0.6) / 10, 0, 1);
        car.brake = Math.max(car.brake, brakeNeed * 0.7);
        car.throttle *= 1 - brakeNeed;
      }
    }
  }

  /**
   * Off the racing surface: get back onto it. Aim at the middle of the track
   * rather than the racing line, keep the speed sensible and accept losing the
   * time — a car stranded in the gravel loses a great deal more.
   */
  recover(dt, w) {
    const car = this.car;
    const ci = this.circuit;
    const ahead = Math.round(clamp(car.speed * 1.1, 14, 45) / ci.ds);
    const [hx, hy] = ci.posAt((car.node + ahead) % ci.n, 0);
    const back = wrapAngle(Math.atan2(hy - car.y, hx - car.x) - car.heading);
    car.steer = clamp(back * 2.1, -1, 1);
    const target = car.surface === 'runoff' ? 32 : 20;
    car.throttle = car.speed < target ? 0.6 : 0;
    car.brake = car.speed > target * 1.5 ? 0.55 : 0;
    car.drsOpen = false;
    car.ersDeploy = 0;
    void dt; void w;
  }

  /** Minimum speed we can be doing now and still make every corner ahead. */
  targetSpeed(w) {
    const ci = this.circuit;
    const prof = w.speedProfile;
    const n = ci.n;
    const car = this.car;

    // The profile already integrates braking distance backwards from every
    // corner, so the speed for this node is the answer; the only thing to add
    // is a fraction of a second of reaction time. Looking further ahead than
    // that just means braking early for a corner the car has not reached, all
    // the way round the lap.
    const lead = Math.max(2, Math.round((4 + car.speed * 0.18) / ci.ds));
    let best = Infinity;
    for (let k = 0; k <= lead; k++) {
      const v = prof[(car.node + k) % n];
      if (v < best) best = v;
    }

    // Condition-dependent pace multiplier.
    const tyre = 1 - car.tyreWear * 0.085 - (car.tyreWear > 0.8 ? (car.tyreWear - 0.8) * 0.5 : 0);
    const cold = car.tyreTemp < 70 ? 0.955 + (car.tyreTemp - 40) * 0.0015 : 1;
    const fuel = 1 - (car.fuel / 100) * 0.020;
    const dmg = 1 - car.damage.front * 0.09 - car.damage.floor * 0.05;
    const dirty = 1 - car.dirtyAir * 0.045;
    const attack = this.attackTarget !== null ? 1.010 + this.d.aggression * 0.010 : 1;
    const wetPace = 1 - w.env.wetness * 0.10;

    let mult = this.pace * tyre * cold * fuel * dmg * dirty * attack * wetPace
      * (1 + this.paceNoise);
    if (this.mistake > 0 && this.mistakeKind === 'wide') mult *= 1.030;

    return best * mult;
  }

  /**
   * Chooses a lateral bias: attack a car ahead, defend from one behind, or
   * simply sit on the racing line.
   */
  updateTactics(dt, w) {
    const car = this.car;
    const ci = this.circuit;
    this.attackTimer -= dt;
    this.attackTarget = null;

    const ahead = w.carAhead(car, 42);
    const behind = w.carBehind(car, 22);
    const room = ci.half - 2.0;

    let want = 0;

    if (ahead && !w.vsc) {
      const gap = ci.forwardGap(car.lapDistance, ahead.lapDistance);
      const closing = car.speed - ahead.speed;
      const canAttack = gap < 34 && (closing > -0.4 || car.drsOpen);
      if (canAttack) {
        this.attackTarget = ahead;
        const aheadOff = ahead.lateral - ci.line.offset[car.node];
        // Pick whichever side of the car ahead has more asphalt.
        const leftRoom = room - ahead.lateral;
        const rightRoom = room + ahead.lateral;
        const upcomingTurn = Math.sign(ci.curv[(car.node + Math.round(70 / ci.ds)) % ci.n] || 0);
        let side;
        if (Math.abs(leftRoom - rightRoom) > 3.5) side = leftRoom > rightRoom ? 1 : -1;
        else side = upcomingTurn !== 0 ? upcomingTurn : (aheadOff > 0 ? -1 : 1);

        const commitment = 3.0 + this.d.aggression * 3.2;
        want = clamp(ahead.lateral + side * commitment - ci.line.offset[car.node],
          -room, room);
        if (gap < 9) want *= 1.15;
      }
    }

    if (behind && this.attackTarget === null) {
      const gap = ci.forwardGap(behind.lapDistance, car.lapDistance);
      if (gap > 0 && gap < 18 && this.d.aggression > 0.6) {
        // Cover the inside for the next corner.
        const turn = Math.sign(ci.curv[(car.node + Math.round(90 / ci.ds)) % ci.n] || 0);
        want = turn !== 0 ? turn * (room * 0.45) - ci.line.offset[car.node] : 0;
        want *= this.d.racecraft;
      }
    }

    // Blue flags: let a lapping car through.
    if (w.blueFlagFor && w.blueFlagFor(car)) {
      const turn = Math.sign(ci.curv[car.node] || 1);
      want = -turn * room * 0.6;
    }

    this.offsetTarget = clamp(want, -room, room);
  }

  // -------------------------------------------------------------------
  // Pit lane
  // -------------------------------------------------------------------

  drivePitLane(dt, w) {
    const car = this.car;
    const ci = this.circuit;
    const pit = ci.pit;
    const idx = car.pitPathIndex ?? 0;
    const look = Math.min(pit.path.length - 1, idx + Math.round(12 / ci.ds));
    const node = pit.path[look];

    const desired = Math.atan2(node.y - car.y, node.x - car.x);
    const err = wrapAngle(desired - car.heading) - Math.atan2(car.vy, Math.max(1, car.vx)) * 0.7;
    car.steer = clamp(err * 3.0, -1, 1);

    let limit = pit.speedLimit;
    if (car.pitStopTimer > 0) limit = 0;
    else if (car.pitState === 'entering') limit = pit.speedLimit;
    const delta = car.speed - limit;
    if (delta > 0.2) { car.brake = clamp(delta * 0.5, 0, 1); car.throttle = 0; }
    else { car.brake = 0; car.throttle = clamp(-delta * 0.6, 0, 0.6); }
    car.drsOpen = false;
    car.ersDeploy = 0;
    void dt; void w;
  }

  /** Called once per race by the director to plan a strategy. */
  planStrategy(totalLaps, rand, compounds) {
    const stops = totalLaps > 45 ? (rand() < 0.28 ? 2 : 1) : 1;
    this.stops = stops;
    const window = totalLaps / (stops + 1);
    this.pitLaps = [];
    for (let i = 1; i <= stops; i++) {
      const jitter = (rand() - 0.5) * window * 0.30;
      this.pitLaps.push(clamp(Math.round(window * i + jitter), 5, totalLaps - 3));
    }
    this.pitCompounds = this.pitLaps.map(() => compounds[Math.floor(rand() * compounds.length)]);
  }
}
