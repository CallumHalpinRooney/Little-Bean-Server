import { clamp, wrapAngle } from './geometry.js';
import { COMPOUNDS } from '../data/teams.js';

/**
 * Two-axle (bicycle) vehicle model with a saturating tyre curve, longitudinal
 * load transfer, speed-dependent downforce and a friction ellipse. It is the
 * same model for the player and every AI car — only the control inputs differ.
 */

export const CAR = {
  massDry: 798,          // kg, car + driver
  wheelbase: 3.60,
  lf: 1.95,              // CoG to front axle (mass is rear-biased, ~54% rear)
  lr: 1.65,              // CoG to rear axle
  cogHeight: 0.30,
  yawInertia: 1150,
  trackWidth: 2.00,
  bodyLength: 5.63,
  aeroDownforce: 2.95,   // N per (m/s)^2 — about 2.5x car weight at 300 km/h
  aeroBalance: 0.420,    // fraction of downforce on the front axle
  dragK: 0.855,          // N per (m/s)^2
  dragDRS: 0.695,
  muBase: 1.85,
  brakeMu: 1.75,
  brakeBias: 0.620,
  power: 705000,         // W at the wheels, ICE + MGU-H deployment
  ersPower: 120000,      // W extra from the battery
  ersCapacity: 4.0e6,    // J
  fuelCapacity: 100,     // kg
  fuelBurn: 0.0295,      // kg per second at full throttle
  maxSteer: 0.315,       // rad at the front wheels
  gearRatios: [null, 3.10, 2.40, 1.95, 1.62, 1.38, 1.19, 1.05, 0.94],
  finalDrive: 2.45,
  rpmIdle: 4200,
  rpmMax: 15000,
  rpmShift: 13600,
};

const TYRE_B = 6.6;   // slip stiffness
const TYRE_C = 1.06;  // shape factor, kept near 1 so grip plateaus at the limit
// Force available at a slip angle a driver would actually hold, as a fraction
// of the curve's asymptotic peak.
const TYRE_USABLE = Math.sin(TYRE_C * Math.atan(TYRE_B * 0.17));

const SURFACE = {
  track:  { grip: 1.00, drag: 0.0,  rough: 0.00 },
  kerb:   { grip: 0.90, drag: 0.6,  rough: 0.85 },
  runoff: { grip: 0.68, drag: 3.5,  rough: 0.25 },
  grass:  { grip: 0.46, drag: 7.0,  rough: 0.45 },
  gravel: { grip: 0.38, drag: 14.0, rough: 0.60 },
  pit:    { grip: 0.97, drag: 0.0,  rough: 0.00 },
};

export class Car {
  constructor(entry, circuit) {
    this.entry = entry;                 // { driver, team, index, isPlayer }
    this.driver = entry.driver;
    this.team = entry.driver.team;
    this.isPlayer = !!entry.isPlayer;
    this.circuit = circuit;

    this.x = 0; this.y = 0; this.heading = 0;
    this.vx = 0; this.vy = 0; this.r = 0;

    this.throttle = 0; this.brake = 0; this.steer = 0;
    this.steerActual = 0;
    this.gear = 1; this.rpm = CAR.rpmIdle;

    this.fuel = 100;
    this.ers = CAR.ersCapacity;
    this.ersDeploy = 0;
    this.drsOpen = false;
    this.drsAvailable = false;

    this.compound = 'medium';
    this.tyreWear = 0;                  // 0..1
    this.tyreTemp = 82;                 // deg C, off the blankets
    this.lockup = 0;
    this.wheelspin = 0;
    this.slipAngle = 0;
    this.latAccel = 0;
    this.latG = 0;
    this.latCapacity = 18;
    this.longAccel = 0;

    this.damage = { front: 0, rear: 0, floor: 0, engine: 0 };
    this.surface = 'track';
    this.dirtyAir = 0;
    this.tow = 0;                       // slipstream from the car ahead
    this.offTrack = false;
    this.grassDust = 0;

    this.node = 0;
    this.lapDistance = 0;
    this.lateral = 0;
    this.wheelAngleRoll = 0;
    this.alive = true;
    this.retired = false;
    this.inPitLane = false;
  }

  get mass() { return CAR.massDry + this.fuel; }
  get speed() { return Math.hypot(this.vx, this.vy); }
  get speedKph() { return this.speed * 3.6; }

  placeAt(x, y, heading, speed = 0) {
    this.x = x; this.y = y; this.heading = heading;
    this.vx = speed; this.vy = 0; this.r = 0;
    const loc = this.circuit.locate(x, y, -1, heading);
    this.node = loc.index;
    this.lapDistance = loc.s;
    this.lateral = loc.lateral;
  }

  setCompound(id) {
    this.compound = id;
    this.tyreWear = 0;
    this.tyreTemp = 82;   // straight off the blankets
  }

  /** Peak friction coefficient available right now, all effects folded in. */
  gripFactor(env) {
    const c = COMPOUNDS[this.compound];
    const wear = this.tyreWear;
    // Gentle fall-off, then a cliff once the tyre is worked past ~80%.
    const wearLoss = wear * 0.16 + (wear > 0.8 ? (wear - 0.8) * 1.35 : 0);
    const tempOpt = 100;
    const tempDelta = Math.abs(this.tyreTemp - tempOpt);
    const tempLoss = clamp(tempDelta / 190, 0, 0.24);
    let wetFactor = 1;
    if (env.wetness > 0) {
      const wetCapable = c.wet || 0.05;
      wetFactor = 1 - env.wetness * (1 - wetCapable) * 0.55;
      if (!c.wet && env.wetness > 0.35) wetFactor -= (env.wetness - 0.35) * 0.55;
    } else if (c.wet) {
      wetFactor = 1 - c.wet * 0.28;    // wet tyres overheat on a dry track
    }
    const surf = SURFACE[this.surface] || SURFACE.track;
    return CAR.muBase * c.grip * (1 - wearLoss) * (1 - tempLoss)
      * wetFactor * surf.grip * env.trackGrip * (1 - this.damage.floor * 0.12);
  }

  aeroFactor() {
    const front = 1 - this.damage.front * 0.42;
    const rear = 1 - this.damage.rear * 0.36;
    const dirty = 1 - this.dirtyAir * 0.22;
    return { front, rear, dirty, overall: dirty * (1 - this.damage.floor * 0.18) };
  }

  /**
   * Advance the car by `dt` seconds.
   * `env` supplies { trackGrip, wetness, assists, paceScale }.
   */
  update(dt, env) {
    if (this.retired) return;

    const aero = this.aeroFactor();
    const v = Math.max(0.6, Math.abs(this.vx));
    const speed = this.speed;

    // ---- Vertical loads -------------------------------------------------
    const m = this.mass;
    const g = 9.81;
    const dfTotal = CAR.aeroDownforce * aero.overall * speed * speed
      * (this.drsOpen ? 0.80 : 1) * env.aeroScale;
    const dfFront = dfTotal * CAR.aeroBalance * aero.front;
    const dfRear = dfTotal * (1 - CAR.aeroBalance) * aero.rear;
    const L = CAR.wheelbase;
    const transfer = (m * this.longAccel * CAR.cogHeight) / L;
    let FzF = (m * g * CAR.lr) / L - transfer + dfFront;
    let FzR = (m * g * CAR.lf) / L + transfer + dfRear;
    FzF = Math.max(400, FzF);
    FzR = Math.max(400, FzR);

    const mu = this.gripFactor(env);
    // Rear tyres are a third wider than the fronts. Together with the rearward
    // aero balance that gives the car a stability margin, so it washes into
    // understeer at the limit rather than snapping into a spin.
    const muF = mu * 0.97 * (1 - this.damage.front * 0.10);
    const muR = mu * 1.07;


    // ---- Longitudinal forces -------------------------------------------
    const enginePower = (CAR.power * (1 - this.damage.engine * 0.45) + this.ersDeploy * CAR.ersPower)
      * env.paceScale;
    let Fdrive = 0;
    if (this.throttle > 0 && this.fuel > 0) {
      Fdrive = this.throttle * Math.min(enginePower / v, 26000);
    }
    const rearLongCap = muR * FzR;
    let wheelspin = 0;
    if (Fdrive > rearLongCap) {
      // An F1 car is traction limited well into fourth gear, so raw demand is
      // routinely several times the available grip. Report slip on a scale a
      // driver would recognise rather than the raw ratio.
      wheelspin = clamp((Fdrive - rearLongCap) / (rearLongCap * 2.6), 0, 1);
      if (env.assists.tc) {
        Fdrive = rearLongCap * 0.98;
        wheelspin *= 0.18;
      } else {
        Fdrive = rearLongCap * (1 + wheelspin * 0.06);
      }
    }
    this.wheelspin += (wheelspin - this.wheelspin) * Math.min(1, dt * 12);

    let Fbrake = 0;
    let lockup = 0;
    if (this.brake > 0) {
      const gripLimit = mu * (FzF + FzR);
      const demand = this.brake * gripLimit * 1.04 * (env.wetness > 0 ? 0.93 : 1);
      const frontDemand = demand * CAR.brakeBias;
      const rearDemand = demand * (1 - CAR.brakeBias);
      const frontCap = muF * FzF * (CAR.brakeMu / CAR.muBase);
      const rearCap = muR * FzR * (CAR.brakeMu / CAR.muBase);
      lockup = Math.max(
        clamp((frontDemand - frontCap) / frontCap, 0, 1),
        clamp((rearDemand - rearCap) / rearCap, 0, 1),
      );
      if (env.assists.abs && lockup > 0) {
        Fbrake = Math.min(demand, (frontCap + rearCap) * 0.985);
        lockup *= 0.15;
      } else {
        Fbrake = Math.min(demand, (frontCap + rearCap) * (1 + lockup * 0.05));
      }
    }
    this.lockup += (lockup - this.lockup) * Math.min(1, dt * 14);

    const surf = SURFACE[this.surface] || SURFACE.track;
    const dragCoef = (this.drsOpen ? CAR.dragDRS : CAR.dragK) * (1 - this.tow * 0.17);
    const Fdrag = dragCoef * speed * speed * (1 + this.damage.front * 0.15);
    // Surface drag has to fade out at a standstill, otherwise a car that drops
    // a wheel into the gravel can never generate enough traction to crawl back
    // out again and is stranded there for the rest of the race.
    const Froll = 210 + surf.drag * m * 0.35 * clamp(speed / 9, 0, 1) + speed * 5.5;

    // ---- Tyre slip angles ----------------------------------------------
    const vxs = Math.max(2.0, Math.abs(this.vx));
    const slipR = Math.atan2(this.vy - this.r * CAR.lr, vxs);
    this.slipAngle = slipR;

    // Friction-ellipse: longitudinal use eats into lateral capacity.
    const longUseF = clamp((Fbrake * CAR.brakeBias) / (muF * FzF), 0, 1);
    const longUseR = clamp((Fdrive + Fbrake * (1 - CAR.brakeBias)) / (muR * FzR), 0, 1);
    const latCapF = muF * FzF * Math.sqrt(Math.max(0.17, 1 - longUseF * longUseF));
    const latCapR = muR * FzR * Math.sqrt(Math.max(0.17, 1 - longUseR * longUseR));

    // ---- Steering -------------------------------------------------------
    // The input is a request for lateral acceleration, not a wheel angle: full
    // lock means "as much as the tyres will give here". The angle needed for
    // that is solved from the steady-state bicycle relation including the slip
    // each axle must run to make its share of the force, which is what gives
    // the car its understeer gradient — and means the same input feels the same
    // at 60 km/h and at 300.
    // Peak axle force is only reached at an absurd slip angle with this tyre
    // curve, so the working limit is the force available at a slip angle a
    // driver would actually run. The car's lateral limit is then set by
    // whichever axle saturates first for the steady-state force split — which
    // is exactly what makes it understeer under power, when the rear is busy
    // putting the engine down.
    const usableF = latCapF * TYRE_USABLE;
    const usableR = latCapR * TYRE_USABLE;
    this.latCapacity = Math.min(
      (usableF * CAR.wheelbase) / CAR.lr,
      (usableR * CAR.wheelbase) / CAR.lf,
    ) / m;
    const aTarget = clamp(this.steer, -1, 1) * this.latCapacity;
    const aMag = Math.abs(aTarget);
    const sgn = Math.sign(aTarget) || 1;
    const invTyre = (force, cap) => Math.tan(
      Math.asin(clamp(force / Math.max(1, cap), 0, 0.94)) / TYRE_C,
    ) / TYRE_B;
    const slipNeedF = invTyre((m * aMag * CAR.lr) / CAR.wheelbase, latCapF);
    const slipNeedR = invTyre((m * aMag * CAR.lf) / CAR.wheelbase, latCapR);
    const deltaMag = (CAR.wheelbase * aMag) / Math.max(16, speed * speed)
      + (slipNeedF - slipNeedR);
    const targetSteer = sgn * clamp(deltaMag, 0, CAR.maxSteer);
    const steerRate = (1.5 + Math.abs(targetSteer) * 16) * dt;
    this.steerActual += clamp(targetSteer - this.steerActual, -steerRate, steerRate);
    const delta = this.steerActual;

    // Simplified Pacejka. The shape factor is deliberately close to 1 so grip
    // plateaus past the peak instead of falling away — a car that is already
    // sliding stays catchable.
    const slipF = Math.atan2(this.vy + this.r * CAR.lf, vxs) - delta * Math.sign(this.vx || 1);
    const tyreCurve = (slip, cap) => -cap * Math.sin(TYRE_C * Math.atan(TYRE_B * slip));
    let FyF = tyreCurve(slipF, latCapF);
    let FyR = tyreCurve(slipR, latCapR);

    // Stability control nudges the rear back into line for novice drivers.
    if (env.assists.stability > 0) {
      const correction = -this.r * env.assists.stability * m * 0.42;
      FyR += clamp(correction, -latCapR * 0.35, latCapR * 0.35);
    }

    // Bumpy surfaces momentarily unsettle the car.
    if (surf.rough > 0 && speed > 8) {
      const shake = Math.sin(performance.now() * 0.045 + this.entry.index) * surf.rough;
      FyR *= 1 - Math.abs(shake) * 0.08;
      this.r += shake * 0.06 * dt;
    }

    // ---- Rigid-body integration ----------------------------------------
    const sinD = Math.sin(delta);
    const cosD = Math.cos(delta);
    const Fx = Fdrive - Fbrake * Math.sign(this.vx || 1) - Fdrag - Froll * Math.sign(this.vx || 1)
      - FyF * sinD;
    const Fy = FyF * cosD + FyR;
    const yawDamping = -this.r * (1600 + dfTotal * 0.14);
    const Mz = CAR.lf * FyF * cosD - CAR.lr * FyR + yawDamping;

    const ax = Fx / m + this.vy * this.r;
    const ay = Fy / m - this.vx * this.r;
    const rdot = Mz / CAR.yawInertia;

    this.vx += ax * dt;
    this.vy += ay * dt;
    this.r += rdot * dt;

    if (this.vx < 0.4 && this.throttle <= 0.02) {
      this.vx = Math.max(0, this.vx);
      this.vy *= 0.86;
      this.r *= 0.86;
    }
    this.r = clamp(this.r, -3.2, 3.2);

    this.longAccel = ax;
    this.latAccel = ay;
    this.latG = Fy / m;             // lateral acceleration the tyres are making

    this.heading = wrapAngle(this.heading + this.r * dt);
    const cosH = Math.cos(this.heading);
    const sinH = Math.sin(this.heading);
    this.x += (this.vx * cosH - this.vy * sinH) * dt;
    this.y += (this.vx * sinH + this.vy * cosH) * dt;

    // ---- Drivetrain (display + audio) -----------------------------------
    this.updateGearbox(dt);

    // ---- Consumables -----------------------------------------------------
    this.updateTyres(dt, env, mu);
    if (this.fuel > 0) {
      this.fuel = Math.max(0, this.fuel - CAR.fuelBurn * this.throttle * dt * env.fuelScale);
    }
    if (this.ersDeploy > 0) {
      this.ers = Math.max(0, this.ers - CAR.ersPower * this.ersDeploy * dt);
      if (this.ers <= 0) this.ersDeploy = 0;
    }
    if (this.brake > 0.2) {
      this.ers = Math.min(CAR.ersCapacity, this.ers + 210000 * this.brake * dt);
    } else if (this.throttle < 0.35) {
      this.ers = Math.min(CAR.ersCapacity, this.ers + 55000 * dt);
    }

    this.wheelAngleRoll += (this.vx / 0.33) * dt;
    if (this.grassDust > 0) this.grassDust = Math.max(0, this.grassDust - dt * 0.9);
  }

  updateGearbox(dt) {
    const v = Math.abs(this.vx);
    const wheelCircumference = 2 * Math.PI * 0.33;
    const rpmFor = (g) => (v / wheelCircumference) * CAR.gearRatios[g] * CAR.finalDrive * 60;
    let gear = this.gear;
    while (gear < 8 && rpmFor(gear) > CAR.rpmShift) gear++;
    while (gear > 1 && rpmFor(gear) < 8200) gear--;
    this.gear = gear;
    const target = clamp(rpmFor(gear), CAR.rpmIdle, CAR.rpmMax);
    // Revs flare a little when the driver is spinning the rears.
    const flare = this.wheelspin * 900 * this.throttle;
    this.rpm += (Math.min(CAR.rpmMax, target + flare) - this.rpm) * Math.min(1, dt * 14);
  }

  updateTyres(dt, env, mu) {
    const c = COMPOUNDS[this.compound];
    const load = Math.min(2.6, Math.abs(this.latG) / 9.81);
    const slipWork = Math.abs(this.slipAngle) * 2.2 + this.wheelspin * 0.75 + this.lockup * 2.6;
    const care = 1 - (this.driver.tyreCare - 0.75) * 0.55;
    const surfMult = this.surface === 'track' || this.surface === 'pit' ? 1
      : this.surface === 'kerb' ? 1.25 : 1.9;

    const rate = (load * 0.00040 + slipWork * 0.00050) * c.wear * care * surfMult
      * env.wearScale * (1 - env.wetness * 0.55);
    this.tyreWear = clamp(this.tyreWear + rate * dt * 60 * (1 / 60), 0, 1);

    // Temperature: work goes in through cornering, traction and braking; heat
    // leaves through airflow. Standing still, the tyre simply cools down.
    const working = clamp(this.speed / 26, 0, 1);
    const heatIn = ((load * 7.0 + slipWork * 20 + this.brake * 2.6) * working) / c.warmup;
    const ambient = 24 - env.wetness * 9;
    // Barely any airflow when stationary — tyres hold their blanket heat on the grid.
    const cooling = (this.tyreTemp - ambient) * (0.006 + this.speed * 0.0042);
    this.tyreTemp += (heatIn - cooling) * dt;
    this.tyreTemp = clamp(this.tyreTemp, 10, 165);
    void mu;
  }

  applyDamage(kind, amount) {
    this.damage[kind] = clamp(this.damage[kind] + amount, 0, 1);
  }

  /** Reset after a spin into the barriers / recovery from the gravel. */
  recover(circuit) {
    const loc = circuit.locate(this.x, this.y, this.node);
    const lat = clamp(loc.lateral, -circuit.half * 0.6, circuit.half * 0.6);
    const [px, py] = circuit.posAt(loc.index, lat);
    this.x = px; this.y = py;
    this.heading = circuit.heading[loc.index];
    this.vx = Math.min(this.speed, 18);
    this.vy = 0;
    this.r = 0;
  }
}

export { SURFACE };
