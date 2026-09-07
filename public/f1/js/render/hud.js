import { COMPOUNDS } from '../data/teams.js';
import { clamp } from '../core/geometry.js';

export function formatLap(t) {
  if (t === null || t === undefined || !isFinite(t)) return '--:--.---';
  const m = Math.floor(t / 60);
  const s = t - m * 60;
  return `${m}:${s.toFixed(3).padStart(6, '0')}`;
}

export function formatGap(t) {
  if (t === null || t === undefined || !isFinite(t)) return '--.---';
  return `+${t.toFixed(3)}`;
}

export function formatShort(t) {
  if (t === null || !isFinite(t)) return '—';
  return t >= 60 ? formatLap(t) : `${t.toFixed(3)}`;
}

/** Drives the DOM heads-up display from the simulation state each frame. */
export class Hud {
  constructor(root = document) {
    const $ = (id) => root.getElementById(id);
    this.el = {
      hud: $('hud'),
      pos: $('hud-pos'), posOf: $('hud-pos-of'),
      lap: $('hud-lap'), laps: $('hud-laps'),
      last: $('hud-last'), best: $('hud-best'), gap: $('hud-gap'),
      sectors: [$('sec-1'), $('sec-2'), $('sec-3')],
      flag: $('hud-flag'), flagText: $('hud-flag-text'),
      tower: $('tower'),
      rpmFill: $('rpm-fill'), rpmBar: $('rpm-bar'),
      gear: $('hud-gear'), speed: $('hud-speed'),
      ers: $('bar-ers'), fuel: $('bar-fuel'),
      wear: $('bar-wear'), temp: $('bar-temp'), dmg: $('bar-dmg'),
      compound: $('tyre-compound'),
      indDrs: $('ind-drs'), indErs: $('ind-ers'), indPit: $('ind-pit'),
      lights: $('lights'),
      radio: $('radio'),
      countdown: $('countdown'),
      minimap: $('minimap'),
    };
    this.lights = Array.from(this.el.lights.querySelectorAll('.light'));
    this.messages = [];
    this.towerRows = [];
    this.lastTowerBuild = 0;
    this.minimapCtx = this.el.minimap.getContext('2d');
  }

  show(on) { this.el.hud.classList.toggle('hidden', !on); }

  message(text, kind = 'info') {
    if (!text) return;
    const div = document.createElement('div');
    div.className = `radio-msg ${kind}`;
    const who = kind === 'strategy' || kind === 'info' || kind === 'good'
      ? 'RACE ENGINEER' : kind === 'penalty' || kind === 'warning' ? 'STEWARDS' : 'RACE CONTROL';
    div.innerHTML = `<span class="who">${who}</span>${text}`;
    this.el.radio.appendChild(div);
    const entry = { div, until: performance.now() + 5200 };
    this.messages.push(entry);
    while (this.messages.length > 4) {
      const old = this.messages.shift();
      old.div.remove();
    }
  }

  tickMessages() {
    const now = performance.now();
    this.messages = this.messages.filter((m) => {
      if (now > m.until) {
        m.div.style.transition = 'opacity 0.4s ease';
        m.div.style.opacity = '0';
        setTimeout(() => m.div.remove(), 420);
        return false;
      }
      return true;
    });
  }

  setCountdown(text) {
    const el = this.el.countdown;
    if (!text) { el.classList.add('hidden'); return; }
    el.classList.remove('hidden');
    el.textContent = text;
  }

  update(race, player, renderer) {
    if (!player) return;
    const t = race.timing.get(player);
    const el = this.el;

    el.pos.textContent = t.position;
    el.posOf.textContent = `/${race.cars.length}`;
    el.lap.textContent = Math.min(t.lap + 1, race.totalLaps || 99);
    el.laps.textContent = race.session === 'race' ? `/${race.totalLaps}` : '';

    el.last.textContent = formatLap(t.lastLap);
    el.best.textContent = formatLap(t.bestLap);
    el.gap.textContent = t.position === 1
      ? (race.order && race.order[1]
        ? `-${(race.timing.get(race.order[1]).gapAhead).toFixed(3)}` : '—')
      : formatGap(t.gapAhead);

    // Sector colouring
    t.sectors.forEach((s, i) => {
      const node = el.sectors[i];
      node.className = 'sector';
      if (s === null) { node.textContent = `S${i + 1}`; return; }
      node.textContent = s.toFixed(2);
      if (race.sessionBest[i] !== null && s <= race.sessionBest[i] + 1e-6) node.classList.add('purple');
      else if (t.bestSectors[i] !== null && s <= t.bestSectors[i] + 1e-6) node.classList.add('green');
      else node.classList.add('yellow');
    });

    // Flags
    let flag = null;
    if (race.vsc) flag = 'VSC';
    else if (race.phase === 'finished') flag = 'FINISH';
    else if (race.blueFlagFor(player)) flag = 'BLUE';
    if (flag) {
      el.flag.classList.remove('hidden');
      el.flagText.textContent = flag;
      el.flag.style.background = flag === 'BLUE' ? 'rgba(74,198,255,0.92)'
        : flag === 'FINISH' ? 'rgba(255,255,255,0.92)' : 'rgba(255,210,74,0.92)';
    } else {
      el.flag.classList.add('hidden');
    }

    // Drivetrain
    const rpmPct = clamp((player.rpm - 4000) / (15000 - 4000), 0, 1) * 100;
    el.rpmFill.style.width = `${rpmPct}%`;
    el.rpmBar.classList.toggle('shift', player.rpm > 13600);
    el.gear.textContent = player.speed < 0.6 ? 'N' : player.gear;
    el.speed.textContent = Math.round(player.speedKph);

    el.ers.style.width = `${(player.ers / 4.0e6) * 100}%`;
    el.fuel.style.width = `${clamp(player.fuel / 100, 0, 1) * 100}%`;
    el.wear.style.width = `${player.tyreWear * 100}%`;
    el.temp.style.width = `${clamp((player.tyreTemp - 20) / 130, 0, 1) * 100}%`;
    const dmg = clamp((player.damage.front + player.damage.rear + player.damage.floor) / 2, 0, 1);
    el.dmg.style.width = `${dmg * 100}%`;

    const comp = COMPOUNDS[player.compound];
    el.compound.textContent = comp.short;
    el.compound.style.background = comp.colour;
    el.compound.style.color = comp.id === 'hard' || comp.id === 'medium' ? '#101010' : '#fff';

    el.indDrs.className = `ind${player.drsOpen ? ' active' : player.drsAvailable ? ' armed' : ''}`;
    el.indErs.className = `ind${player.ersDeploy > 0 ? ' ers-on' : player.ers > 1e6 ? ' armed' : ''}`;
    el.indPit.className = `ind${player.inPitLane ? ' pit-on' : player.pitRequested ? ' armed' : ''}`;

    // Start lights
    if (race.session === 'race' && (race.phase === 'lights' || race.phase === 'hold' || race.phase === 'grid')) {
      el.lights.classList.remove('hidden');
      this.lights.forEach((l, i) => l.classList.toggle('on', i < race.lights));
    } else {
      el.lights.classList.add('hidden');
    }

    this.updateTower(race, player);
    this.tickMessages();

    if (renderer) {
      const ctx = this.minimapCtx;
      const c = el.minimap;
      ctx.clearRect(0, 0, c.width, c.height);
      renderer.drawMinimap(ctx, race, player, { x: 0, y: 0, w: c.width, h: c.height });
    }
  }

  updateTower(race, player) {
    const order = race.order || race.cars;
    const now = performance.now();
    if (now - this.lastTowerBuild < 180) return;
    this.lastTowerBuild = now;

    const rows = [];
    for (let i = 0; i < order.length; i++) {
      const car = order[i];
      const t = race.timing.get(car);
      const comp = COMPOUNDS[car.compound];
      let gap;
      if (car.retired) gap = 'DNF';
      else if (i === 0) gap = race.session === 'race' ? 'LEADER' : formatLap(t.bestLap);
      else if (race.session === 'race') {
        gap = t.lapsDown >= 1 ? `+${t.lapsDown}L` : `+${t.gapAhead.toFixed(3)}`;
      } else {
        gap = t.bestLap ? formatLap(t.bestLap) : '—';
      }
      rows.push(`
        <div class="tower-row ${car === player ? 'me' : ''} ${car.retired ? 'out' : ''} ${car.inPitLane ? 'pitting' : ''}">
          <span class="tpos">${i + 1}</span>
          <span class="tbar" style="background:${car.team.colour}"></span>
          <span class="tname">${car.driver.code}<span class="tyre-dot" style="background:${comp.colour}"></span>${car.inPitLane ? '<span class="dim" style="font-size:10px"> PIT</span>' : ''}</span>
          <span class="tgap">${gap}</span>
        </div>`);
    }
    this.el.tower.innerHTML = rows.join('');
  }
}
