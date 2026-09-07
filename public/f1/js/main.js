import { Circuit } from './core/circuit.js';
import { RaceDirector, DIFFICULTIES } from './core/race.js';
import { Renderer } from './render/renderer.js';
import { Hud, formatLap } from './render/hud.js';
import { Input } from './core/input.js';
import { AudioEngine } from './core/audio.js';
import { Menu } from './ui/menu.js';
import { DRIVERS, TEAMS, PLAYER_TEAM_ID } from './data/teams.js';
import { clamp } from './core/geometry.js';

const nextFrame = () => new Promise((r) => requestAnimationFrame(r));

class Game {
  constructor() {
    this.canvas = document.getElementById('stage');
    this.renderer = new Renderer(this.canvas);
    this.hud = new Hud(document);
    this.input = new Input(window);
    this.audio = new AudioEngine();
    this.menu = new Menu(this);

    this.state = 'menu';
    this.paused = false;
    this.race = null;
    this.circuitCache = new Map();
    this.lastFrame = performance.now();

    this.input.bindTouch(document.getElementById('touch-controls'));
    if (matchMedia('(pointer: coarse)').matches) {
      document.getElementById('touch-controls').classList.remove('hidden');
    }

    this.bindGlobalKeys();
    this.bindPauseMenu();
    this.applySettings();

    // Any interaction unlocks the Web Audio context.
    const unlock = () => { this.audio.start(); this.audio.setVolume(this.menu.settings.volume); };
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });

    this.boot();
  }

  async boot() {
    const fill = document.getElementById('loading-fill');
    const text = document.getElementById('loading-text');
    const steps = [
      ['Loading 2025 grid…', 25],
      ['Preparing circuits…', 60],
      ['Warming the tyres…', 100],
    ];
    for (const [msg, pct] of steps) {
      text.textContent = msg;
      fill.style.width = `${pct}%`;
      await nextFrame();
      await new Promise((r) => setTimeout(r, 160));
    }
    this.menu.show('menu');
    this.loop();
  }

  applySettings() {
    const s = this.menu.settings;
    this.renderer.rotateWithCar = s.rotateCamera;
    this.renderer.showRacingLine = s.racingLine;
    this.audio.setVolume(s.volume);
    const tower = document.getElementById('tower');
    if (tower) tower.style.display = s.showTower ? '' : 'none';
    if (this.race) this.applyAssists();
  }

  applyAssists() {
    const s = this.menu.settings;
    const base = DIFFICULTIES[this.race.cfg.difficulty]?.assists || DIFFICULTIES.pro.assists;
    if (s.assistOverride === 'all') this.race.env.assists = { tc: true, abs: true, stability: 1.2 };
    else if (s.assistOverride === 'none') this.race.env.assists = { tc: false, abs: false, stability: 0 };
    else this.race.env.assists = { ...base };
  }

  // -------------------------------------------------------------------
  // Session lifecycle
  // -------------------------------------------------------------------

  async getCircuit(track) {
    if (this.circuitCache.has(track.id)) return this.circuitCache.get(track.id);
    const c = new Circuit(track);
    this.circuitCache.set(track.id, c);
    return c;
  }

  async startSession(cfg) {
    this.pendingCfg = cfg;
    const queue = cfg.weekend
      ? (cfg.championship ? ['qualifying', 'race'] : ['practice', 'qualifying', 'race'])
      : [cfg.session];
    this.queue = queue;
    this.queueIndex = 0;
    this.gridOrder = null;
    await this.launch(queue[0], cfg);
  }

  async launch(session, cfg) {
    this.menu.hideAll();
    document.getElementById('screen-loading').classList.add('active');
    const fill = document.getElementById('loading-fill');
    const text = document.getElementById('loading-text');
    fill.style.width = '15%';
    text.textContent = `${cfg.track.gp} · ${session}`;
    await nextFrame();

    const circuit = await this.getCircuit(cfg.track);
    fill.style.width = '65%';
    text.textContent = 'Optimising the racing line…';
    await nextFrame();

    this.renderer.prepare(circuit);
    this.renderer.skids = [];
    fill.style.width = '90%';
    await nextFrame();

    const playerDriver = DRIVERS.find((d) => d.id === cfg.driverId)
      || TEAMS.find((t) => t.id === PLAYER_TEAM_ID).drivers[0];

    let entries;
    if (cfg.timeTrial) {
      entries = [{ driver: playerDriver, isPlayer: true }];
    } else {
      entries = DRIVERS.map((d) => ({ driver: d, isPlayer: d.id === playerDriver.id }));
    }

    const laps = session === 'race'
      ? Math.max(3, Math.round(cfg.track.laps * (cfg.lengthPct / 100)))
      : 99;

    this.race = new RaceDirector({
      circuit,
      entries,
      session,
      laps,
      difficulty: cfg.difficulty,
      weather: cfg.weather,
      seed: (Date.now() % 100000) + cfg.track.round * 131,
      gridOrder: session === 'race' ? this.gridOrder : null,
    });
    this.applyAssists();

    this.race.onEvent = (e) => this.hud.message(e.text, e.kind);
    this.race.onImpact = (v) => { this.renderer.addShake(v * 1.3); this.audio.crash(v); };

    this.cfg = cfg;
    this.session = session;
    this.state = 'racing';
    this.paused = false;
    this.qualiFlyingLaps = 0;
    this.sessionEnded = false;

    const cam = this.renderer.camera;
    cam.x = this.race.playerCar.x;
    cam.y = this.race.playerCar.y;
    cam.rot = -this.race.playerCar.heading - Math.PI / 2;

    document.getElementById('screen-loading').classList.remove('active');
    this.hud.show(true);
    this.hud.message(this.sessionIntro(session, cfg), 'info');
    this.lastFrame = performance.now();
  }

  sessionIntro(session, cfg) {
    if (cfg.timeTrial) return 'Time trial — clear track, chase the lap record. Enter to finish.';
    if (session === 'practice') return `Free practice at ${cfg.track.city}. Press Enter to end the session.`;
    if (session === 'qualifying') return 'Qualifying — three flying laps to set the grid.';
    return `Formation complete. ${this.race?.totalLaps ?? ''} laps to go.`;
  }

  bindGlobalKeys() {
    window.addEventListener('keydown', (e) => {
      const k = e.key.toLowerCase();
      if (this.state !== 'racing') return;
      if (k === 'escape') { e.preventDefault(); this.togglePause(); }
      if (this.paused) return;
      if (k === 'p') this.togglePit();
      if (k === 'c') {
        this.menu.settings.rotateCamera = !this.menu.settings.rotateCamera;
        this.applySettings(); this.menu.saveAll();
      }
      if (k === 'l') {
        this.menu.settings.racingLine = !this.menu.settings.racingLine;
        this.applySettings(); this.menu.saveAll();
      }
      if (k === 'r') this.recoverPlayer();
      if (k === 'enter' && (this.session === 'practice' || this.session === 'qualifying')) {
        this.endSession();
      }
    });
  }

  bindPauseMenu() {
    const card = document.querySelector('.pause-card');
    const quit = document.getElementById('btn-quit');
    const endBtn = document.createElement('button');
    endBtn.className = 'ghost-btn';
    endBtn.id = 'btn-end-session';
    endBtn.textContent = 'End session';
    card.insertBefore(endBtn, quit);
    endBtn.addEventListener('click', () => { this.togglePause(false); this.endSession(); });

    document.getElementById('btn-resume').addEventListener('click', () => this.togglePause(false));
    document.getElementById('btn-restart').addEventListener('click', () => {
      this.togglePause(false);
      this.launch(this.session, this.cfg);
    });
    quit.addEventListener('click', () => {
      this.togglePause(false);
      this.state = 'menu';
      this.race = null;
      this.hud.show(false);
      this.menu.show('menu');
    });
  }

  togglePause(force) {
    this.paused = force === undefined ? !this.paused : force;
    document.getElementById('pause').classList.toggle('hidden', !this.paused);
    if (this.paused) {
      const t = this.race ? this.race.timing.get(this.race.playerCar) : null;
      document.getElementById('pause-info').textContent = this.race
        ? `${this.cfg.track.gp} · ${this.session.toUpperCase()} · P${t.position}`
        : '';
      this.audio.mute(true);
    } else {
      this.audio.mute(false);
      this.lastFrame = performance.now();
    }
  }

  togglePit() {
    const car = this.race?.playerCar;
    if (!car || car.inPitLane) return;
    if (car.pitRequested) this.race.cancelPit(car);
    else this.race.requestPit(car);
  }

  recoverPlayer() {
    const car = this.race?.playerCar;
    if (!car || car.speed > 12) return;
    car.recover(this.race.circuit);
    this.hud.message('Car recovered to the track', 'info');
  }

  // -------------------------------------------------------------------
  // Main loop
  // -------------------------------------------------------------------

  loop() {
    const now = performance.now();
    let dt = (now - this.lastFrame) / 1000;
    this.lastFrame = now;
    dt = Math.min(dt, 0.06);

    if (this.state === 'racing' && this.race && !this.paused) {
      const controls = this.input.sample(dt);
      this.race.step(dt, controls);
      this.afterStep(dt);
    }

    if (this.race && this.state === 'racing') {
      const player = this.race.playerCar;
      this.renderer.updateCamera(player, this.paused ? 0 : dt);
      this.renderer.render(this.race, player, { rain: this.race.weather.rain });
      this.hud.update(this.race, player, this.renderer);
      this.updateAudio();
    }

    this.input.endFrame();
    requestAnimationFrame(() => this.loop());
  }

  afterStep(dt) {
    const race = this.race;
    const player = race.playerCar;

    // Skid marks and camera feel.
    if (!player.inPitLane && (player.lockup > 0.35 || player.wheelspin > 0.5
      || Math.abs(player.slipAngle) > 0.22) && player.speed > 8) {
      this.renderer.recordSkid(player);
    } else {
      this.renderer.clearSkidTrail(player);
    }
    if (player.surface === 'kerb' && player.speed > 20) this.renderer.addShake(dt * 0.9);

    // Session completion rules.
    if (this.sessionEnded) return;
    const t = race.timing.get(player);
    if (this.session === 'race' && race.raceOver) this.endSession();
    if (this.session === 'qualifying' && t.lap >= 4) this.endSession();
    if (this.session !== 'race' && race.phase === 'finished') this.endSession();
  }

  updateAudio() {
    const race = this.race;
    const player = race.playerCar;
    let nearby = 0;
    let nearbyRpm = 0;
    for (const c of race.cars) {
      if (c === player || c.retired) continue;
      const d = Math.hypot(c.x - player.x, c.y - player.y);
      if (d < 45) {
        const w = 1 - d / 45;
        nearby = Math.max(nearby, w);
        nearbyRpm = Math.max(nearbyRpm, c.rpm);
      }
    }
    this.audio.update({
      running: !this.paused,
      rpm: player.rpm,
      throttle: player.throttle,
      speed: player.speed,
      squeal: clamp(Math.abs(player.slipAngle) * 2.6 + player.lockup * 1.5 + player.wheelspin, 0, 1.4),
      nearby,
      nearbyRpm,
    });
  }

  // -------------------------------------------------------------------
  // Results and progression
  // -------------------------------------------------------------------

  endSession() {
    if (this.sessionEnded) return;
    this.sessionEnded = true;
    this.state = 'results';
    this.hud.show(false);
    this.audio.mute(true);

    const race = this.race;
    const player = race.playerCar;
    const pt = race.timing.get(player);

    if (pt.bestLap && this.menu.recordLap(this.cfg.track.id, pt.bestLap, player.driver.id)) {
      // New personal best for this circuit.
    }

    if (this.session === 'race') this.showRaceResults();
    else if (this.session === 'qualifying') this.showQualifyingResults();
    else this.showPracticeResults();
  }

  showPracticeResults() {
    const race = this.race;
    const rows = race.cars
      .map((c) => ({ car: c, t: race.timing.get(c) }))
      .filter((r) => r.t.bestLap !== null)
      .sort((a, b) => a.t.bestLap - b.t.bestLap)
      .map((r) => ({
        driver: r.car.driver, team: r.car.team,
        isPlayer: r.car === race.playerCar,
        detail: formatLap(r.t.bestLap),
        retired: false,
      }));
    if (rows.length === 0) {
      rows.push({
        driver: race.playerCar.driver, team: race.playerCar.team,
        isPlayer: true, detail: 'No time set', retired: false,
      });
    }
    const record = this.menu.records[this.cfg.track.id];
    this.menu.showResults(
      this.cfg.timeTrial ? 'Time Trial' : 'Practice Results',
      rows,
      {
        continueLabel: this.queue.length > 1 ? 'GO TO QUALIFYING' : 'BACK TO MENU',
        onContinue: () => this.advanceQueue(),
        detailNote: record ? `Circuit best ${formatLap(record.time)}` : '',
      },
    );
  }

  showQualifyingResults() {
    const race = this.race;
    const playerBest = race.timing.get(race.playerCar).bestLap;
    const results = race.simulateQualifying(playerBest);
    this.gridOrder = results.map((r) => r.car.driver.id);
    const pole = results[0].time;
    const rows = results.map((r, i) => ({
      driver: r.car.driver, team: r.car.team,
      isPlayer: r.car === race.playerCar,
      detail: isFinite(r.time)
        ? (i === 0 ? formatLap(r.time) : `+${(r.time - pole).toFixed(3)}`)
        : 'No time',
      retired: false,
    }));
    this.menu.showResults('Qualifying — Starting Grid', rows, {
      continueLabel: 'GO TO THE RACE',
      onContinue: () => this.advanceQueue(),
    });
  }

  showRaceResults() {
    const race = this.race;
    const table = race.awardPoints();
    const cls = race.classification();
    const rows = table.map((row) => {
      const entry = cls.find((c) => c.driver.id === row.driver.id);
      const leaderTime = cls[0];
      let detail;
      if (entry.retired) detail = entry.reason || 'Retired';
      else if (row.position === 1) detail = `${entry.lap} laps`;
      else if (entry.lapsDown >= 1) detail = `+${entry.lapsDown} lap${entry.lapsDown > 1 ? 's' : ''}`;
      else detail = `+${entry.gapLeader.toFixed(3)}`;
      if (race.fastestLap.car && race.fastestLap.car.driver.id === row.driver.id) {
        detail += ' · FL';
      }
      void leaderTime;
      return {
        driver: row.driver, team: row.team, points: row.points,
        isPlayer: row.driver.id === race.playerCar.driver.id,
        detail, retired: entry.retired,
      };
    });

    const isChampionship = !!this.cfg.championship;
    if (isChampionship) {
      this.menu.applyRaceToSeason(this.cfg.track, table, race.playerCar.driver.id);
    }

    const me = rows.find((r) => r.isPlayer);
    const title = me && !me.retired
      ? `${this.cfg.track.gp} — P${rows.indexOf(me) + 1}`
      : `${this.cfg.track.gp} — Race Result`;

    this.menu.showResults(title, rows, {
      championship: isChampionship,
      continueLabel: isChampionship ? 'BACK TO CHAMPIONSHIP' : 'CONTINUE',
      onContinue: () => {
        this.state = 'menu';
        this.race = null;
        this.menu.show(isChampionship ? 'championship' : 'menu');
      },
    });
  }

  advanceQueue() {
    this.queueIndex++;
    if (this.queueIndex >= this.queue.length) {
      this.state = 'menu';
      this.race = null;
      this.menu.show(this.cfg.championship ? 'championship' : 'menu');
      return;
    }
    this.launch(this.queue[this.queueIndex], this.cfg);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.game = new Game();
});
