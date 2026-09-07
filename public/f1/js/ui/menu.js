import { TRACKS } from '../data/tracks.js';
import { TEAMS, DRIVERS, PLAYER_TEAM_ID, POINTS } from '../data/teams.js';
import { DIFFICULTIES, WEATHERS } from '../core/race.js';
import { sampleSpline } from '../core/geometry.js';
import { formatLap } from '../render/hud.js';

const STORE = {
  settings: 'apexgp.settings.v1',
  season: 'apexgp.season.v1',
  records: 'apexgp.records.v1',
};

const load = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : { ...fallback };
  } catch { return { ...fallback }; }
};
const save = (key, value) => {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* private mode */ }
};

export const DEFAULT_SETTINGS = {
  volume: 0.7,
  rotateCamera: true,
  cameraMode: 'chase',   // 'chase' | 'cockpit' | 'tv'
  racingLine: false,
  showTower: true,
  assistOverride: 'auto',   // 'auto' | 'all' | 'none'
  driverId: 'norris',
  difficulty: 'pro',
  weather: 'dry',
  lengthPct: 25,
  trackId: 'melbourne',
};

const LENGTHS = [
  { pct: 5, label: '5%' },
  { pct: 10, label: '10%' },
  { pct: 25, label: '25%' },
  { pct: 50, label: '50%' },
  { pct: 100, label: '100%' },
];

const SESSIONS = [
  { id: 'practice', label: 'Practice' },
  { id: 'qualifying', label: 'Qualifying' },
  { id: 'race', label: 'Race' },
  { id: 'weekend', label: 'Full weekend' },
];

/** Owns every menu screen, persistence and the championship season state. */
export class Menu {
  constructor(game) {
    this.game = game;
    this.settings = load(STORE.settings, DEFAULT_SETTINGS);
    this.records = load(STORE.records, {});
    this.season = load(STORE.season, this.freshSeason());
    this.selectedTrack = TRACKS.find((t) => t.id === this.settings.trackId) || TRACKS[0];
    this.session = 'race';
    this.bind();
  }

  freshSeason() {
    return { round: 0, results: [], drivers: {}, teams: {}, difficulty: 'pro', lengthPct: 25 };
  }

  saveAll() {
    save(STORE.settings, this.settings);
    save(STORE.season, this.season);
    save(STORE.records, this.records);
  }

  // -----------------------------------------------------------------
  // Screen plumbing
  // -----------------------------------------------------------------

  show(id) {
    document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
    const el = document.getElementById(`screen-${id}`);
    if (el) el.classList.add('active');
    this.current = id;
    if (id === 'setup') this.renderSetup();
    if (id === 'championship') this.renderChampionship();
    if (id === 'standings') this.renderStandings();
    if (id === 'garage') this.renderGarage();
    if (id === 'settings') this.renderSettings();
    if (id === 'menu') this.renderMenuHeader();
  }

  hideAll() {
    document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
    this.current = null;
  }

  bind() {
    document.body.addEventListener('click', (e) => {
      const nav = e.target.closest('[data-nav]');
      if (nav) {
        const target = nav.dataset.nav;
        if (target === 'timetrial') {
          this.session = 'practice';
          this.timeTrial = true;
          this.show('setup');
        } else {
          this.timeTrial = false;
          this.show(target);
        }
      }
    });

    document.getElementById('btn-start').addEventListener('click', () => {
      this.settings.trackId = this.selectedTrack.id;
      this.saveAll();
      this.game.startSession({
        track: this.selectedTrack,
        session: this.session === 'weekend' ? 'practice' : this.session,
        weekend: this.session === 'weekend',
        lengthPct: this.settings.lengthPct,
        difficulty: this.settings.difficulty,
        weather: this.timeTrial ? 'dry' : this.settings.weather,
        driverId: this.settings.driverId,
        timeTrial: !!this.timeTrial,
        championship: false,
      });
    });

    document.getElementById('btn-champ-next').addEventListener('click', () => {
      const track = TRACKS[Math.min(this.season.round, TRACKS.length - 1)];
      this.saveAll();
      this.game.startSession({
        track,
        session: 'qualifying',
        weekend: true,
        lengthPct: this.season.lengthPct,
        difficulty: this.season.difficulty,
        weather: this.pickSeasonWeather(track),
        driverId: this.settings.driverId,
        championship: true,
      });
    });

    document.getElementById('btn-champ-reset').addEventListener('click', () => {
      this.season = this.freshSeason();
      this.saveAll();
      this.renderChampionship();
    });

    document.getElementById('btn-results-menu').addEventListener('click', () => this.show('menu'));
    document.getElementById('btn-results-continue').addEventListener('click', () => {
      if (this.pendingContinue) { const f = this.pendingContinue; this.pendingContinue = null; f(); }
      else this.show(this.season.round > 0 && this.lastWasChampionship ? 'championship' : 'menu');
    });
  }

  pickSeasonWeather(track) {
    const wet = ['spa', 'silverstone', 'interlagos', 'suzuka', 'hungary', 'montreal', 'zandvoort'];
    const r = Math.random();
    if (wet.includes(track.id) && r < 0.22) return r < 0.09 ? 'wet' : 'damp';
    if (r < 0.10) return 'overcast';
    return 'dry';
  }

  // -----------------------------------------------------------------
  // Main menu
  // -----------------------------------------------------------------

  renderMenuHeader() {
    const d = DRIVERS.find((x) => x.id === this.settings.driverId) || DRIVERS[0];
    const el = document.getElementById('menu-driver-badge');
    el.innerHTML = `
      <div class="num">${d.num}</div>
      <div class="meta">
        <b>${d.first} ${d.last}</b>
        <span>${d.team.name.toUpperCase()} · ${d.nat}</span>
      </div>`;
  }

  // -----------------------------------------------------------------
  // Weekend setup
  // -----------------------------------------------------------------

  renderSetup() {
    document.getElementById('setup-title').textContent = this.timeTrial ? 'Time Trial' : 'Race Weekend';
    const list = document.getElementById('track-list');
    list.innerHTML = TRACKS.map((t) => `
      <div class="track-item ${t.id === this.selectedTrack.id ? 'selected' : ''}" data-track="${t.id}">
        <span class="rnd">R${String(t.round).padStart(2, '0')}</span>
        <span>${t.flag}</span>
        <span><span class="nm">${t.city}</span><br><span class="cn">${t.gp}</span></span>
        <span class="cn">${(t.length / 1000).toFixed(3)}km</span>
      </div>`).join('');
    list.querySelectorAll('[data-track]').forEach((el) => {
      el.addEventListener('click', () => {
        this.selectedTrack = TRACKS.find((t) => t.id === el.dataset.track);
        this.renderSetup();
      });
    });

    this.renderTrackDetail(this.selectedTrack);
    this.renderOptions();
  }

  renderTrackDetail(track) {
    document.getElementById('detail-name').textContent = track.name;
    document.getElementById('detail-loc').textContent =
      `${track.flag} ${track.city}, ${track.country} · Round ${track.round}`;

    const laps = this.session === 'race' || this.session === 'weekend'
      ? Math.max(3, Math.round(track.laps * this.settings.lengthPct / 100)) : '—';
    const stats = [
      ['LENGTH', `${(track.length / 1000).toFixed(3)} km`],
      ['CORNERS', track.corners],
      ['RACE LAPS', laps],
      ['GRIP', `${Math.round(track.gripBase * 100)}%`],
      ['LAP RECORD', formatLap(track.record.time)],
      ['RECORD HOLDER', `${track.record.driver} '${String(track.record.year).slice(2)}`],
    ];
    const best = this.records[track.id];
    if (best) stats.push(['YOUR BEST', formatLap(best.time)]);
    document.getElementById('detail-stats').innerHTML = stats
      .map(([k, v]) => `<div class="stat"><b>${v}</b><span>${k}</span></div>`).join('');

    this.drawPreview(track);
  }

  drawPreview(track) {
    const c = document.getElementById('track-preview');
    const ctx = c.getContext('2d');
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const cw = c.clientWidth || 520;
    const ch = Math.round(cw * 0.73);
    c.width = cw * dpr; c.height = ch * dpr;
    c.style.height = `${ch}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cw, ch);

    const pts = sampleSpline(track.pts, 12);
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of pts) {
      minX = Math.min(minX, p[0]); maxX = Math.max(maxX, p[0]);
      minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]);
    }
    const pad = 28;
    const s = Math.min((cw - pad * 2) / (maxX - minX), (ch - pad * 2) / (maxY - minY));
    const ox = pad + ((cw - pad * 2) - (maxX - minX) * s) / 2;
    const oy = pad + ((ch - pad * 2) - (maxY - minY) * s) / 2;
    const px = (x) => ox + (x - minX) * s;
    const py = (y) => oy + (y - minY) * s;

    ctx.beginPath();
    pts.forEach((p, i) => (i === 0 ? ctx.moveTo(px(p[0]), py(p[1])) : ctx.lineTo(px(p[0]), py(p[1]))));
    ctx.closePath();
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(255,255,255,0.10)';
    ctx.lineWidth = 16;
    ctx.stroke();
    ctx.strokeStyle = track.night ? '#5A6070' : '#3A3F4B';
    ctx.lineWidth = 11;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 1.2;
    ctx.setLineDash([5, 6]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Start/finish marker
    const p0 = pts[0];
    const p1 = pts[3];
    const ang = Math.atan2(p1[1] - p0[1], p1[0] - p0[0]);
    ctx.save();
    ctx.translate(px(p0[0]), py(p0[1]));
    ctx.rotate(ang + Math.PI / 2);
    ctx.fillStyle = '#FF8000';
    ctx.fillRect(-9, -2.5, 18, 5);
    ctx.restore();
  }

  renderOptions() {
    const seg = (containerId, items, currentValue, onPick) => {
      const el = document.getElementById(containerId);
      el.innerHTML = items.map((it) =>
        `<button data-v="${it.value}" class="${it.value === currentValue ? 'on' : ''}">${it.label}</button>`).join('');
      el.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
        onPick(b.dataset.v);
        this.saveAll();
        this.renderSetup();
      }));
    };

    const teamDrivers = TEAMS.find((t) => t.id === PLAYER_TEAM_ID).drivers;
    seg('opt-driver', teamDrivers.map((d) => ({ value: d.id, label: `${d.num} ${d.last}` })),
      this.settings.driverId, (v) => { this.settings.driverId = v; });

    const sessions = this.timeTrial ? [{ id: 'practice', label: 'Time trial' }] : SESSIONS;
    seg('opt-session', sessions.map((s) => ({ value: s.id, label: s.label })),
      this.session, (v) => { this.session = v; });

    seg('opt-length', LENGTHS.map((l) => ({ value: String(l.pct), label: l.label })),
      String(this.settings.lengthPct), (v) => { this.settings.lengthPct = Number(v); });

    seg('opt-difficulty', Object.values(DIFFICULTIES).map((d) => ({ value: d.key, label: d.label })),
      this.settings.difficulty, (v) => { this.settings.difficulty = v; });

    seg('opt-weather', Object.values(WEATHERS).map((w) => ({ value: w.key, label: w.label })),
      this.settings.weather, (v) => { this.settings.weather = v; });
  }

  // -----------------------------------------------------------------
  // Championship
  // -----------------------------------------------------------------

  renderChampionship() {
    const cal = document.getElementById('calendar');
    cal.innerHTML = TRACKS.map((t, i) => {
      const result = this.season.results[i];
      const state = result ? 'done' : i === this.season.round ? 'next' : '';
      const line = result
        ? `P${result.playerPos} · ${result.winner}`
        : i === this.season.round ? 'Next round' : '';
      return `<div class="cal-card ${state}">
        <span class="rnd">ROUND ${t.round} · ${t.flag} ${t.country.toUpperCase()}</span>
        <span class="nm">${t.gp}</span>
        <span class="res">${line}</span>
      </div>`;
    }).join('');

    const standings = this.driverStandings();
    const me = standings.findIndex((s) => s.driver.id === this.settings.driverId);
    document.getElementById('champ-summary').innerHTML = `
      <div class="stat-grid">
        <div class="stat"><b>${this.season.round}/${TRACKS.length}</b><span>ROUNDS RUN</span></div>
        <div class="stat"><b>${me >= 0 ? `P${me + 1}` : '—'}</b><span>YOUR POSITION</span></div>
        <div class="stat"><b>${me >= 0 ? standings[me].points : 0}</b><span>YOUR POINTS</span></div>
        <div class="stat"><b>${standings[0] ? standings[0].points : 0}</b><span>LEADER POINTS</span></div>
      </div>`;

    const seg = (containerId, items, currentValue, onPick) => {
      const el = document.getElementById(containerId);
      el.innerHTML = items.map((it) =>
        `<button data-v="${it.value}" class="${it.value === currentValue ? 'on' : ''}">${it.label}</button>`).join('');
      el.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
        onPick(b.dataset.v); this.saveAll(); this.renderChampionship();
      }));
    };
    seg('champ-length', LENGTHS.map((l) => ({ value: String(l.pct), label: l.label })),
      String(this.season.lengthPct), (v) => { this.season.lengthPct = Number(v); });
    seg('champ-difficulty', Object.values(DIFFICULTIES).map((d) => ({ value: d.key, label: d.label })),
      this.season.difficulty, (v) => { this.season.difficulty = v; });

    document.getElementById('btn-champ-next').textContent =
      this.season.round >= TRACKS.length ? 'SEASON COMPLETE' : `GO TO ROUND ${this.season.round + 1}`;
    document.getElementById('btn-champ-next').disabled = this.season.round >= TRACKS.length;
  }

  driverStandings() {
    return DRIVERS.map((d) => ({ driver: d, team: d.team, points: this.season.drivers[d.id] || 0 }))
      .sort((a, b) => b.points - a.points);
  }

  teamStandings() {
    return TEAMS.map((t) => ({ team: t, points: this.season.teams[t.id] || 0 }))
      .sort((a, b) => b.points - a.points);
  }

  renderStandings() {
    const me = this.settings.driverId;
    document.getElementById('drivers-standings').innerHTML = this.driverStandings().map((s, i) => `
      <div class="trow ${s.driver.id === me ? 'me' : ''}">
        <span class="p">${i + 1}</span>
        <span class="swatch" style="background:${s.team.colour}"></span>
        <span class="nm"><b>${s.driver.first} ${s.driver.last}</b><span>${s.driver.nat}</span></span>
        <span class="extra">${s.team.name}</span>
        <span class="pts">${s.points}</span>
      </div>`).join('');

    document.getElementById('teams-standings').innerHTML = this.teamStandings().map((s, i) => `
      <div class="trow ${s.team.id === PLAYER_TEAM_ID ? 'me' : ''}">
        <span class="p">${i + 1}</span>
        <span class="swatch" style="background:${s.team.colour}"></span>
        <span class="nm"><b>${s.team.name}</b><span>${s.team.engine}</span></span>
        <span class="extra"></span>
        <span class="pts">${s.points}</span>
      </div>`).join('');
  }

  // -----------------------------------------------------------------
  // Garage & settings
  // -----------------------------------------------------------------

  renderGarage() {
    const team = TEAMS.find((t) => t.id === PLAYER_TEAM_ID);
    const d = DRIVERS.find((x) => x.id === this.settings.driverId);
    const bar = (label, v) => `
      <div class="tyre-row" style="width:100%">
        <span style="width:96px">${label}</span>
        <div class="bar" style="flex:1"><div class="bar-fill" style="width:${v * 100}%;background:var(--papaya)"></div></div>
      </div>`;
    document.getElementById('garage-car').innerHTML = `
      <div class="brand small"><div class="brand-bars"><i></i><i></i><i></i><i></i></div>
        <h1>${team.name}<span>${team.engine.toUpperCase()} POWER</span></h1></div>
      <p class="dim">${team.fullName} · ${team.base}</p>
      <div class="stat-grid">
        <div class="stat"><b>#${d.num}</b><span>CAR NUMBER</span></div>
        <div class="stat"><b>${d.first} ${d.last}</b><span>DRIVER</span></div>
        <div class="stat"><b>${(team.pace * 100).toFixed(1)}</b><span>CAR PERFORMANCE</span></div>
        <div class="stat"><b>${d.nat}</b><span>NATIONALITY</span></div>
      </div>
      <div style="display:flex;flex-direction:column;gap:8px;margin-top:8px">
        ${bar('PACE', d.skill)}
        ${bar('CONSISTENCY', d.consistency)}
        ${bar('RACECRAFT', d.racecraft)}
        ${bar('AGGRESSION', d.aggression)}
        ${bar('TYRE MANAGEMENT', d.tyreCare)}
      </div>`;

    document.getElementById('grid-list').innerHTML = DRIVERS.map((dr) => `
      <div class="trow ${dr.id === d.id ? 'me' : ''}">
        <span class="p">${dr.num}</span>
        <span class="swatch" style="background:${dr.team.colour}"></span>
        <span class="nm"><b>${dr.first} ${dr.last}</b><span>${dr.code}</span></span>
        <span class="extra">${dr.team.name}</span>
        <span class="pts"></span>
      </div>`).join('');
  }

  renderSettings() {
    const body = document.getElementById('settings-body');
    body.innerHTML = `
      <div class="setting">
        <h4>Master volume</h4><p>Synthesised engine, tyres and effects.</p>
        <input type="range" id="set-volume" min="0" max="1" step="0.05" value="${this.settings.volume}">
      </div>
      <div class="setting">
        <h4>Camera view</h4><p>Press <kbd>C</kbd> in-race to cycle these on the fly.</p>
        <div class="seg" id="set-cameramode">
          <button data-v="chase" class="${(this.settings.cameraMode || 'chase') === 'chase' ? 'on' : ''}">Chase</button>
          <button data-v="cockpit" class="${this.settings.cameraMode === 'cockpit' ? 'on' : ''}">Cockpit</button>
          <button data-v="tv" class="${this.settings.cameraMode === 'tv' ? 'on' : ''}">TV</button>
        </div>
      </div>
      <div class="setting">
        <h4>Chase camera rotation</h4><p>Only applies to the chase view above.</p>
        <div class="seg" id="set-camera">
          <button data-v="1" class="${this.settings.rotateCamera ? 'on' : ''}">Rotate with car</button>
          <button data-v="0" class="${!this.settings.rotateCamera ? 'on' : ''}">Fixed</button>
        </div>
      </div>
      <div class="setting">
        <h4>Racing line</h4><p>Shows the ideal line, coloured by target speed.</p>
        <div class="seg" id="set-line">
          <button data-v="1" class="${this.settings.racingLine ? 'on' : ''}">On</button>
          <button data-v="0" class="${!this.settings.racingLine ? 'on' : ''}">Off</button>
        </div>
      </div>
      <div class="setting">
        <h4>Driving assists</h4><p>Auto follows the difficulty preset.</p>
        <div class="seg" id="set-assists">
          <button data-v="auto" class="${this.settings.assistOverride === 'auto' ? 'on' : ''}">Auto</button>
          <button data-v="all" class="${this.settings.assistOverride === 'all' ? 'on' : ''}">All on</button>
          <button data-v="none" class="${this.settings.assistOverride === 'none' ? 'on' : ''}">All off</button>
        </div>
      </div>
      <div class="setting">
        <h4>Timing tower</h4><p>Live classification down the left of the screen.</p>
        <div class="seg" id="set-tower">
          <button data-v="1" class="${this.settings.showTower ? 'on' : ''}">Show</button>
          <button data-v="0" class="${!this.settings.showTower ? 'on' : ''}">Hide</button>
        </div>
      </div>
      <div class="setting">
        <h4>Saved data</h4><p>Lap records and championship progress live in this browser.</p>
        <button class="ghost-btn" id="set-clear">Clear all saved data</button>
      </div>`;

    const vol = document.getElementById('set-volume');
    vol.addEventListener('input', () => {
      this.settings.volume = Number(vol.value);
      this.game.audio.setVolume(this.settings.volume);
      this.saveAll();
    });
    const pick = (id, apply) => {
      document.getElementById(id).querySelectorAll('button').forEach((b) => {
        b.addEventListener('click', () => { apply(b.dataset.v); this.saveAll(); this.renderSettings(); });
      });
    };
    pick('set-cameramode', (v) => { this.settings.cameraMode = v; this.game.applySettings(); });
    pick('set-camera', (v) => { this.settings.rotateCamera = v === '1'; this.game.applySettings(); });
    pick('set-line', (v) => { this.settings.racingLine = v === '1'; this.game.applySettings(); });
    pick('set-assists', (v) => { this.settings.assistOverride = v; this.game.applySettings(); });
    pick('set-tower', (v) => { this.settings.showTower = v === '1'; this.game.applySettings(); });
    document.getElementById('set-clear').addEventListener('click', () => {
      Object.values(STORE).forEach((k) => localStorage.removeItem(k));
      this.settings = { ...DEFAULT_SETTINGS };
      this.season = this.freshSeason();
      this.records = {};
      this.renderSettings();
    });
  }

  // -----------------------------------------------------------------
  // Results
  // -----------------------------------------------------------------

  showResults(title, rows, opts = {}) {
    document.getElementById('results-title').textContent = title;
    const podium = document.getElementById('podium');
    const top3 = rows.slice(0, 3);
    const order = [1, 0, 2];
    podium.innerHTML = order.filter((i) => top3[i]).map((i) => {
      const r = top3[i];
      return `<div class="pod p${i + 1}">
        <span class="place" style="color:${r.team.colour}">P${i + 1}</span>
        <span class="nm">${r.driver.first} ${r.driver.last}</span>
        <span class="tm">${r.team.name}</span>
        <span class="dim" style="font-size:12px">${r.detail || ''}</span>
      </div>`;
    }).join('');

    document.getElementById('results-table').innerHTML = rows.map((r, i) => `
      <div class="trow ${r.isPlayer ? 'me' : ''}">
        <span class="p">${r.retired ? 'DNF' : i + 1}</span>
        <span class="swatch" style="background:${r.team.colour}"></span>
        <span class="nm"><b>${r.driver.first} ${r.driver.last}</b><span>${r.team.name}</span></span>
        <span class="extra">${r.detail || ''}</span>
        <span class="pts">${r.points !== undefined ? `${r.points} pts` : ''}</span>
      </div>`).join('');

    document.getElementById('btn-results-continue').textContent = opts.continueLabel || 'CONTINUE';
    this.pendingContinue = opts.onContinue || null;
    this.lastWasChampionship = !!opts.championship;
    this.show('results');
  }

  recordLap(trackId, time, driverId) {
    const cur = this.records[trackId];
    if (!cur || time < cur.time) {
      this.records[trackId] = { time, driverId, at: Date.now() };
      save(STORE.records, this.records);
      return true;
    }
    return false;
  }

  applyRaceToSeason(track, table, playerDriverId) {
    const idx = TRACKS.findIndex((t) => t.id === track.id);
    for (const row of table) {
      this.season.drivers[row.driver.id] = (this.season.drivers[row.driver.id] || 0) + row.points;
      this.season.teams[row.team.id] = (this.season.teams[row.team.id] || 0) + row.points;
    }
    const player = table.find((r) => r.driver.id === playerDriverId);
    this.season.results[idx] = {
      winner: `${table[0].driver.last}`,
      playerPos: player ? player.position : '—',
    };
    this.season.round = Math.max(this.season.round, idx + 1);
    save(STORE.season, this.season);
  }
}

export { POINTS };
