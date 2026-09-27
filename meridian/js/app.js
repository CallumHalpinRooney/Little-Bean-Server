import { loadData, serverStatus, saveProfile, setSource, importFile, clearImport, getExperiments, saveExperiments } from './data/store.js';
import { analyse, hhmm, hm } from './analysis/engine.js';
import { EXPERIMENTS } from './analysis/discover.js';
import { trimp, TYPE_LABEL, RUN_TYPES, paceStr, durStr } from './analysis/training.js';
import { mean, last } from './analysis/stats.js';
import { sparkline, ring, hypnogram, bandLine, bars, intraday } from './ui/charts.js';
import { icons, workoutIcon } from './ui/icons.js';

const $ = (sel, el = document) => el.querySelector(sel);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtInt = (n) => Math.round(n).toLocaleString('en-GB');
const dateLong = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
const dateShort = (iso) => new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
const timeOf = (iso) => new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

let A = null;        // current analysis
let STATUS = {};     // server capabilities

// ——— Boot ———
async function boot() {
  [STATUS] = await Promise.all([serverStatus()]);
  const data = await loadData();
  A = analyse(data, { experiments: getExperiments() });
  window.addEventListener('hashchange', render);
  document.addEventListener('click', onClick);
  render();
  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
}

async function reload() {
  const data = await loadData();
  A = analyse(data, { experiments: getExperiments() });
  render();
}

const ROUTES = { today: viewToday, sleep: viewSleep, heart: viewHeart, fitness: viewFitness, discover: viewDiscover };

function render() {
  const route = (location.hash.slice(1) || 'today');
  const view = ROUTES[route] ?? viewToday;
  $('#view').innerHTML = `<div class="view">${view()}</div>`;
  document.querySelectorAll('nav.tabs a').forEach((a) => a.toggleAttribute('aria-current', a.hash === `#${route}` || (!location.hash && a.hash === '#today')));
  document.querySelectorAll('nav.tabs a[aria-current]').forEach((a) => a.setAttribute('aria-current', 'page'));
  window.scrollTo({ top: 0 });
  if (route === 'discover') wireAsk();
}

// ——— Shared bits ———
const header = (eyebrow, title, withAvatar = false) => `
  <header class="large">
    <div><div class="eyebrow">${esc(eyebrow)}</div><h1>${esc(title)}</h1></div>
    ${withAvatar ? `<button class="avatar" data-sheet="settings" aria-label="Profile and data">${esc((A.data.profile.name || 'M')[0].toUpperCase())}</button>` : ''}
  </header>`;

const delta = (v, base, unit, { lowerBetter = false, digits = 0 } = {}) => {
  const d = v - base;
  if (Math.abs(d) < (digits ? 0.05 : 0.5)) return `<span class="delta flat">At your usual</span>`;
  const good = lowerBetter ? d < 0 : d > 0;
  return `<span class="delta ${good ? 'up' : 'down'}">${d > 0 ? '▲' : '▼'} ${Math.abs(d).toFixed(digits)}${unit} vs usual</span>`;
};

function sourceLine() {
  const d = A.data;
  const src = d.source === 'huawei' ? 'Live from Huawei Health' : d.source === 'import' ? 'Imported file' : 'Demo data';
  return `${esc(d.device?.model ?? 'Watch')} · synced ${d.device?.lastSync ? timeOf(d.device.lastSync) : '—'} · ${src}`;
}

// ——— Today ———
function viewToday() {
  const { readiness: r, sleep, today, focus, patterns } = A;
  const hour = new Date().getHours();
  const hello = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const days14 = last(A.data.days, 14);
  const hrvUsual = r.hrvBaseline.typical, rhrUsual = r.rhrBaseline.typical;
  const top = patterns.top[0];
  const focusIcon = { quality: icons.bolt, easy: icons.run, move: icons.walk, rest: icons.leaf }[focus.kind];

  return `
  ${header(dateLong(A.data.today), hello, true)}

  ${r.strainAlert ? `<div class="banner"><span class="tint-heart" style="width:22px">${icons.alert}</span><div><b>Early strain signal.</b> HRV is suppressed and resting heart rate is elevated together. That often shows up 1–2 days before you feel ill.</div></div>` : ''}

  <button class="card hero tap" data-sheet="readiness" style="width:100%">
    <div class="ring-wrap">${ring(r.score)}<div class="center"><div class="score num">${r.score}</div><div class="of">READINESS</div></div></div>
    <div class="state">${r.state.label}</div>
    <div class="state-line">${r.state.line}</div>
    <div class="sub chev" style="margin-top:12px;font-size:13px">What’s driving this</div>
  </button>

  <div class="card focus">
    <div class="ico">${focusIcon}</div>
    <div><div class="eyebrow" style="font-size:12px">Today’s focus</div><h3>${esc(focus.title)}</h3><p>${esc(focus.body)}</p></div>
  </div>

  <h2>Vitals</h2>
  <div class="list">
    <a class="row" href="#sleep" style="color:inherit;text-decoration:none">
      <div><div class="k"><span class="tint-sleep">●</span> Sleep</div>
        <div class="v num">${hm(sleep.last.asleepMin)}</div>
        <span class="delta flat">Score ${sleep.score} · ${hhmm(sleep.last.bedIdx + 18 * 60)}–${hhmm(sleep.last.wakeMin)}</span></div>
      <div class="right">${sparkline(last(sleep.nights, 14).map((n) => n.asleepMin), { color: 'var(--sleep)' })}</div>
    </a>
    ${Number.isFinite(today.hrv) ? `<a class="row" href="#heart" style="color:inherit;text-decoration:none">
      <div><div class="k"><span class="tint-mind">●</span> Heart rate variability</div>
        <div class="v num">${today.hrv}<small>ms</small></div>${delta(today.hrv, hrvUsual, ' ms')}</div>
      <div class="right">${sparkline(days14.map((d) => d.hrv), { color: 'var(--mind)' })}</div>
    </a>` : ''}
    <a class="row" href="#heart" style="color:inherit;text-decoration:none">
      <div><div class="k"><span class="tint-heart">●</span> Resting heart rate</div>
        <div class="v num">${today.rhr}<small>bpm</small></div>${delta(today.rhr, rhrUsual, ' bpm', { lowerBetter: true })}</div>
      <div class="right">${sparkline(days14.map((d) => d.rhr), { color: 'var(--heart)' })}</div>
    </a>
    <a class="row" href="#fitness" style="color:inherit;text-decoration:none">
      <div><div class="k"><span class="tint-fit">●</span> Steps</div>
        <div class="v num">${fmtInt(today.steps)}</div><span class="delta flat">${fmtInt(mean(days14.map((d) => d.steps)))} daily average</span></div>
      <div class="right">${sparkline(days14.map((d) => d.steps), { color: 'var(--fit)' })}</div>
    </a>
  </div>

  ${top ? `
  <h2>Discovered</h2>
  <a class="card discover-card tap" href="#discover" style="display:block;color:inherit;text-decoration:none">
    <div class="eyebrow" style="font-size:12px">A pattern in your data</div>
    <div class="rel num ${top.better ? 'up' : 'down'}" style="margin-top:6px">${top.relText}</div>
    <h3 style="margin-top:2px">${esc(top.headline)}.</h3>
    <div class="sub" style="font-size:13px;margin-top:8px">${esc(top.evidence)}</div>
  </a>` : ''}

  <p class="foot">${sourceLine()}</p>`;
}

// ——— Sleep ———
function viewSleep() {
  const s = A.sleep, n = s.last, d = s.lastDay.sleep;
  const pct = (m) => Math.round((m / (n.asleepMin + d.awakeMin)) * 100);
  const need = s.needMin;
  const nights14 = last(s.nights, 14);
  const reg = s.regularity;
  return `
  ${header(dateLong(A.data.today), 'Sleep')}

  <div class="card">
    <div class="card-title tint-sleep"><span class="dot"></span>Last night</div>
    <div class="big num">${Math.floor(n.asleepMin / 60)}<small>h</small>${Math.round(n.asleepMin % 60)}<small>min</small></div>
    <div class="sub">${timeOf(d.bed)} → ${timeOf(d.wake)} · ${Math.round(n.efficiency * 100)}% efficient</div>
    ${hypnogram(d.stages)}
    <div class="axis"><span>${timeOf(d.bed)}</span><span>${timeOf(d.wake)}</span></div>
    <div class="stats">
      <div class="stat"><div class="l"><i style="background:var(--st-deep)"></i>Deep</div><div class="n num">${d.deepMin}<small>m</small></div><div class="sub" style="font-size:12px">${pct(d.deepMin)}%</div></div>
      <div class="stat"><div class="l"><i style="background:var(--st-light)"></i>Light</div><div class="n num">${d.lightMin}<small>m</small></div><div class="sub" style="font-size:12px">${pct(d.lightMin)}%</div></div>
      <div class="stat"><div class="l"><i style="background:var(--st-rem)"></i>REM</div><div class="n num">${d.remMin}<small>m</small></div><div class="sub" style="font-size:12px">${pct(d.remMin)}%</div></div>
      <div class="stat"><div class="l"><i style="background:var(--st-awake)"></i>Awake</div><div class="n num">${d.awakeMin}<small>m</small></div><div class="sub" style="font-size:12px">${pct(d.awakeMin)}%</div></div>
    </div>
  </div>

  <div class="card">
    <div class="card-title tint-sleep"><span class="dot"></span>Tonight</div>
    <div class="big num">${hhmm(s.bedtimeTarget)}</div>
    <div class="sub" style="margin-top:4px">Suggested lights-out. Based on your usual ${hhmm(s.wakeTarget)} wake-up, a ${hm(need)} sleep need${s.debtMin > 20 ? ` and ${hm(s.debtMin)} of debt to repay` : ''}.</div>
  </div>

  <h2>Quality</h2>
  <div class="list">
    ${simpleRow('Sleep score', `${s.score}<small>/100</small>`)}
    ${simpleRow('Sleep debt (14 nights)', s.debtMin < 20 ? 'None' : hm(s.debtMin), s.debtMin > 60 ? 'warn' : '')}
    ${simpleRow('Regularity', `${reg.score}<small>/100</small>`, reg.score < 60 ? 'warn' : '')}
    ${simpleRow('Weekend shift', `${Math.round(Math.abs(reg.socialJetLag))}<small>min</small>`, Math.abs(reg.socialJetLag) > 45 ? 'warn' : '')}
    ${d.spo2Min ? simpleRow('Lowest blood oxygen', `${d.spo2Min}<small>%</small>`, d.spo2Min < 90 ? 'warn' : '') : ''}
    ${d.breathingRate ? simpleRow('Breathing rate', `${d.breathingRate}<small>/min</small>`) : ''}
  </div>

  <div class="card" style="margin-top:12px">
    <div class="card-title">Last 14 nights</div>
    <div class="sub">Average ${hm(mean(nights14.map((x) => x.asleepMin)))} · dashed line is your need</div>
    ${bars(nights14.map((x) => x.asleepMin / 60), { color: 'var(--sleep)', target: need / 60, min: 4 })}
    <div class="axis"><span>${dateShort(nights14[0].date)}</span><span>Last night</span></div>
  </div>
  <p class="foot">Sleep score = duration vs your need (40) + efficiency (20) + deep and REM share (20) + timing regularity (20). Change your sleep need under Profile.</p>`;
}

const simpleRow = (k, v, tone = '') => `<div class="row simple"><div class="k">${k}</div><div class="v num ${tone === 'warn' ? 'tint-load' : ''}">${v}</div></div>`;

// ——— Heart ———
function viewHeart() {
  const d30 = last(A.data.days, 30);
  const hb = A.readiness.hrvBaseline, rb = A.readiness.rhrBaseline;
  const hLo = Math.exp(hb.mean - hb.sd), hHi = Math.exp(hb.mean + hb.sd);
  const rLo = rb.mean - rb.sd, rHi = rb.mean + rb.sd;
  const t = A.today;
  const inRange = (v, lo, hi) => (v < lo ? ['Below your normal range', 'warn'] : v > hi ? ['Above your normal range', 'good'] : ['Within your normal range', '']);
  const [hTxt, hTone] = inRange(t.hrv, hLo, hHi);
  let [rTxt, rTone] = inRange(t.rhr, rLo, rHi);
  if (rTone) rTone = rTone === 'good' ? 'warn' : 'good';
  const checks = A.data.checks ?? [];
  const tone = (c) => (c.kind === 'arterial' && /stiff/i.test(c.result) && !/not/i.test(c.result) ? 'warn' : 'good');
  const hr = A.data.hrToday ?? [];

  return `
  ${header(dateLong(A.data.today), 'Heart')}

  ${Number.isFinite(t.hrv) ? `<div class="card">
    <div class="card-title tint-mind"><span class="dot"></span>Heart rate variability</div>
    <div class="big num">${t.hrv}<small>ms</small></div>
    <span class="pill ${hTone}">${hTxt}</span>
    ${bandLine(d30.map((d) => d.hrv), { lo: hLo, hi: hHi, color: 'var(--mind)', labels: 'HRV, last 30 days' })}
    <div class="axis"><span>30 days ago</span><span>Today</span></div>
    <p class="sub" style="margin:12px 0 0">The shaded band is <b>your</b> normal (${Math.round(hLo)}–${Math.round(hHi)} ms), learned from the last 60 days. Your number only means something against your own range, not someone else’s.</p>
  </div>` : ''}

  <div class="card">
    <div class="card-title tint-heart"><span class="dot"></span>Resting heart rate</div>
    <div class="big num">${t.rhr}<small>bpm</small></div>
    <span class="pill ${rTone}">${rTxt}</span>
    ${bandLine(d30.map((d) => d.rhr), { lo: rLo, hi: rHi, color: 'var(--heart)', labels: 'Resting heart rate, last 30 days' })}
    <div class="axis"><span>30 days ago</span><span>Today</span></div>
  </div>

  ${hr.length ? `<div class="card">
    <div class="card-title tint-heart"><span class="dot"></span>Today</div>
    <div class="sub">Range ${Math.min(...hr.map((p) => p.bpm))}–${Math.max(...hr.map((p) => p.bpm))} bpm · latest ${hr.at(-1).bpm} bpm</div>
    ${intraday(hr)}
    <div class="axis"><span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>24:00</span></div>
  </div>` : ''}

  ${checks.length ? `<h2>Checks</h2>
  <div class="list">
    ${checks.map((c, i) => `<button class="row" data-sheet="check" data-i="${i}">
      <div><div class="k">${{ ecg: 'ECG', pwa: 'Arrhythmia screening', arterial: 'Arterial stiffness' }[c.kind] ?? esc(c.kind)}</div>
      <div class="v" style="font-size:17px">${esc(c.result)}</div></div>
      <div class="right"><span class="sub" style="font-size:13px">${dateShort(c.at)}</span><span class="status-dot on" style="background:var(--${tone(c)})"></span></div>
    </button>`).join('')}
  </div>` : ''}
  <p class="foot">Meridian is not a medical device. Wrist ECG and arrhythmia screening can miss conditions. See a doctor if you have symptoms.</p>`;
}

// ——— Fitness ———
function viewFitness() {
  const T = A.training, C = A.compare;
  const vo2 = A.data.vo2max;
  const acwr = T.acwr;
  const loadState = acwr < 0.8 ? ['Detraining', 'Your last week was much lighter than your 4-week average. Fitness starts to fade after 2–3 weeks like this.']
    : acwr <= 1.3 ? ['Sweet spot', 'You’re building fitness at a pace your body can absorb.']
    : acwr <= 1.5 ? ['Stretching', 'Load is rising fast. Fine for a week, but don’t stack another big week on top.']
    : ['Overreaching', 'Injury risk rises sharply at this load. Back off for 3–4 days.'];
  const pos = Math.min(100, (acwr / 2) * 100);
  const dist = T.distribution;
  const km8 = T.weeks.map((w) => w.km);
  const recent = T.recent.slice(0, 8);

  return `
  ${header(dateLong(A.data.today), 'Fitness')}

  ${vo2.length ? `<div class="card">
    <div class="card-title tint-fit"><span class="dot"></span>Cardio fitness</div>
    <div style="display:flex;justify-content:space-between;align-items:flex-end;gap:12px">
      <div><div class="big num">${vo2.at(-1).value.toFixed(1)}</div><div class="sub">VO₂ max · ml/kg/min</div></div>
      <div style="width:120px;height:44px">${sparkline(last(vo2, 30).map((v) => v.value), { w: 120, h: 44, color: 'var(--fit)', fill: true })}</div>
    </div>
    <div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap">
      ${C.fitnessAge ? `<span class="pill good">Fitness age ${C.fitnessAge}</span>` : ''}
      <span class="pill">${C.vo2Trend >= 0 ? '▲' : '▼'} ${Math.abs(C.vo2Trend).toFixed(1)} in 60 days</span>
    </div>
  </div>` : ''}

  <div class="card">
    <div class="card-title tint-load"><span class="dot"></span>Training load</div>
    <div style="display:flex;align-items:baseline;gap:10px"><div class="big num">${acwr.toFixed(2)}</div><div style="font-weight:600">${loadState[0]}</div></div>
    <div class="gauge"><div class="zone" style="left:40%;width:25%"></div><div class="mark" style="left:${pos}%"></div></div>
    <div class="axis"><span>0</span><span>Sweet spot 0.8–1.3</span><span>2.0</span></div>
    <p class="sub" style="margin:12px 0 0">${loadState[1]} This is your last 7 days compared with your last 28, weighted by heart rate.</p>
  </div>

  ${T.runCount28 ? `<div class="card">
    <div class="card-title">Running intensity · 4 weeks</div>
    <div class="stack"><span style="width:${dist.easy * 100}%;background:var(--fit)"></span><span style="width:${dist.moderate * 100}%;background:var(--load)"></span><span style="width:${dist.hard * 100}%;background:var(--heart)"></span></div>
    <div class="stack target-stack"><span style="width:80%;background:var(--fit)"></span><span style="width:5%;background:var(--load)"></span><span style="width:15%;background:var(--heart)"></span></div>
    <div class="legend"><span><i style="background:var(--fit)"></i>Easy ${Math.round(dist.easy * 100)}%</span><span><i style="background:var(--load)"></i>Moderate ${Math.round(dist.moderate * 100)}%</span><span><i style="background:var(--heart)"></i>Hard ${Math.round(dist.hard * 100)}%</span><span style="margin-left:auto">Faint bar = 80/20 target</span></div>
    <p class="sub" style="margin:12px 0 0">${dist.easy < 0.6 ? `Too much of your running is moderate: hard enough to tire you, not hard enough to drive big gains. Run easy days under <b>${T.z2Ceiling} bpm</b>.` : 'Good polarisation. Most running is easy, with focused hard work.'}</p>
  </div>` : ''}

  <div class="card">
    <div class="card-title">Running distance · 8 weeks</div>
    <div class="sub">${km8.at(-1).toFixed(1)} km this week · ${mean(km8).toFixed(1)} km average</div>
    ${bars(km8, { color: 'var(--fit)' })}
    <div class="axis"><span>8 weeks ago</span><span>This week</span></div>
  </div>

  <h2>Recent workouts</h2>
  <div class="list">
    ${recent.map((w) => `<button class="row" data-sheet="workout" data-id="${esc(w.id)}">
      <div class="wk" style="grid-column:1/-1">
        <div class="badge">${workoutIcon(w.type)}</div>
        <div><div class="t">${TYPE_LABEL[w.type] ?? esc(w.type)}</div><div class="s">${dateShort(w.start)} · ${timeOf(w.start)}</div></div>
        <div class="n num">${w.distanceM ? `${(w.distanceM / 1000).toFixed(2)} km` : durStr(w.durationS)}<small>${w.distanceM ? `${paceStr(w)}/km` : `${w.avgHr} bpm avg`}</small></div>
      </div></button>`).join('')}
  </div>`;
}

// ——— Discover ———
function viewDiscover() {
  const C = A.compare;
  return `
  ${header('Your data, analysed', 'Insights')}

  <h2 style="margin-top:6px">This week’s review</h2>
  ${A.review.map((r) => `<div class="card insight ${r.tone}"><div class="bar"></div><div>
    <div class="area">${esc(r.area)}</div><h3>${esc(r.title)}</h3><p>${esc(r.body)}</p></div></div>`).join('')}

  <h2>You vs ${esc(C.cohort.replace(/^(Men|Women)/, (m) => m.toLowerCase()))}</h2>
  <div class="list">
    ${C.rows.map((r) => `<div class="pct">
      <div class="top"><b>${r.label}</b><span class="num">${r.value}${r.unit ? ` ${r.unit}` : ''}</span></div>
      <div class="track"><div class="med" style="left:50%"></div><div class="me" style="left:${r.pct}%"></div></div>
      <div class="meta"><span>Better than ${r.pct}% of peers</span><span>Median ${r.median}</span></div>
    </div>`).join('')}
  </div>
  <p class="foot">${C.isDefaultProfile ? `<button class="done" data-sheet="settings" style="font-size:13px">Set your age and sex</button> for an accurate comparison. ` : ''}Compared with published population data for your age and sex (FRIEND registry, large wearable cohorts). Wrist estimates are approximate.</p>

  ${A.patterns.top.length ? `<h2>What affects you</h2>
  ${A.patterns.top.map((p) => `<div class="card insight ${p.better ? 'good' : 'warn'}"><div class="bar"></div><div>
    <h3>${esc(p.headline)} <span class="${p.better ? 'up' : 'down'}">(${p.relText})</span></h3>
    ${p.action ? `<p>Try: ${esc(p.action)}.</p>` : ''}
    <div class="ev">${esc(p.evidence)} across ${A.patterns.nights} nights</div></div></div>`).join('')}` : ''}

  <h2>Experiments</h2>
  ${A.experiments.map((e, i) => `<div class="card">
    <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
      <div class="card-title" style="margin:0">${icons.flask.replace('<svg', '<svg width="18" height="18"')} Day ${e.elapsed} of ${e.length}</div>
      <span class="pill ${e.verdict === 'Working' ? 'good' : e.verdict === 'Not helping' ? 'bad' : ''}">${e.verdict}</span>
    </div>
    <h3 style="margin-top:8px">${esc(e.title)}</h3>
    <p class="sub" style="margin:4px 0 0">${e.metricLabel}: ${Number.isFinite(e.after) ? `${e.after.toFixed(0)} ${e.unit} on days you stuck to it vs ${e.before.toFixed(0)} ${e.unit} before` : 'waiting for data'}. You kept to it ${Math.round(e.adherence * 100)}% of nights, detected automatically from your watch.</p>
    <div class="progress"><span style="width:${(e.elapsed / e.length) * 100}%"></span></div>
    <button class="done" data-action="stop-exp" data-i="${i}" style="font-size:15px;margin-top:12px">End experiment</button>
  </div>`).join('')}
  <div class="chip-row" style="margin-top:12px">
    ${EXPERIMENTS.filter((t) => !A.experiments.some((e) => e.templateId === t.id)).map((t) => `<button class="chip" data-action="start-exp" data-id="${t.id}">+ ${esc(t.title)}</button>`).join('')}
  </div>
  <p class="foot">Experiments compare the nights you stuck to the change with your 4 weeks before it. There’s nothing to log.</p>

  <h2>Ask about your data</h2>
  <form class="ask" id="ask">
    <input name="q" placeholder="${STATUS.ask ? 'Why was my deep sleep low on Tuesday?' : 'Needs an API key on the server'}" ${STATUS.ask ? '' : 'disabled'} autocomplete="off" aria-label="Ask a question about your data">
    <button type="submit" ${STATUS.ask ? '' : 'disabled'} aria-label="Ask">${icons.send.replace('<svg', '<svg width="18" height="18"')}</button>
  </form>
  <div class="card answer" id="answer" style="margin-top:12px"></div>
  <p class="foot">${STATUS.ask ? 'Answers use a summary of your last 30 days. They come from Claude and can be wrong, so check anything important.' : 'Set ANTHROPIC_API_KEY on the server to turn this on.'}</p>`;
}

function askContext() {
  const d = A.data, s = A.sleep, t = A.training;
  return {
    profile: { age: d.profile.age, sex: d.profile.sex, heightCm: d.profile.heightCm, sleepNeedH: d.profile.sleepNeedH },
    readiness: { score: A.readiness.score, state: A.readiness.state.label, drivers: A.readiness.parts.map((p) => ({ factor: p.label, detail: p.detail })) },
    sleep: { score: s.score, debtMin: s.debtMin, regularity: s.regularity.score, weekendShiftMin: Math.round(s.regularity.socialJetLag), suggestedBedtime: hhmm(s.bedtimeTarget) },
    training: { loadRatio: +t.acwr.toFixed(2), intensity: t.distribution, weeklyRunKm: t.weeks.map((w) => +w.km.toFixed(1)), easyHrCeiling: t.z2Ceiling },
    compare: A.compare,
    patterns: A.patterns.top.map((p) => p.headline + ` (${p.relText}, ${p.evidence})`),
    review: A.review.map((r) => r.title),
    last30Days: last(d.days, 30).map((x) => ({
      date: x.date, asleepMin: x.sleep ? x.sleep.deepMin + x.sleep.lightMin + x.sleep.remMin : null,
      deepMin: x.sleep?.deepMin, remMin: x.sleep?.remMin, bed: x.sleep ? timeOf(x.sleep.bed) : null,
      hrv: x.hrv, rhr: x.rhr, steps: x.steps, stress: x.stress,
    })),
    workouts: t.recent.slice(0, 15).map((w) => ({ type: w.type, start: w.start, min: Math.round(w.durationS / 60), km: +(w.distanceM / 1000).toFixed(2), avgHr: w.avgHr })),
  };
}

function wireAsk() {
  const form = $('#ask');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const q = form.q.value.trim();
    if (!q) return;
    const out = $('#answer');
    out.textContent = 'Thinking…';
    form.querySelector('button').disabled = true;
    try {
      const res = await fetch('api/ask', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ question: q, context: askContext() }) });
      if (!res.ok || !res.body) throw new Error((await res.text()) || res.statusText);
      out.textContent = '';
      const reader = res.body.getReader(), dec = new TextDecoder();
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        out.textContent += dec.decode(value, { stream: true });
      }
    } catch (err) {
      out.textContent = `Couldn’t get an answer: ${err.message}`;
    } finally {
      form.querySelector('button').disabled = false;
    }
  });
}

// ——— Sheets ———
function openSheet(html) {
  closeSheet(true);
  const scrim = document.createElement('div');
  scrim.className = 'scrim';
  scrim.dataset.action = 'close';
  const sheet = document.createElement('div');
  sheet.className = 'sheet';
  sheet.setAttribute('role', 'dialog');
  sheet.setAttribute('aria-modal', 'true');
  sheet.innerHTML = `<div class="grab"></div>${html}`;
  document.body.append(scrim, sheet);
  requestAnimationFrame(() => { scrim.classList.add('open'); sheet.classList.add('open'); });
  document.body.style.overflow = 'hidden';
  return sheet;
}
function closeSheet(instant = false) {
  const els = document.querySelectorAll('.scrim, .sheet');
  els.forEach((el) => el.classList.remove('open'));
  document.body.style.overflow = '';
  setTimeout(() => els.forEach((el) => el.remove()), instant ? 0 : 380);
}
const sheetHead = (title) => `<div class="sheet-head"><h2>${esc(title)}</h2><button class="done" data-action="close">Done</button></div>`;

const SHEETS = {
  readiness() {
    const r = A.readiness;
    const max = Math.max(...r.parts.map((p) => Math.abs(p.impact)), 0.3);
    return `${sheetHead('Readiness')}
      <div class="list">${r.parts.map((p) => {
        const w = (Math.abs(p.impact) / max) * 50;
        return `<div class="driver"><div><h3 style="font-size:15px">${p.label}</h3><div class="d">${esc(p.detail)}</div></div>
          <div class="dbar"><span style="${p.impact >= 0 ? `left:50%;width:${w}%;background:var(--good)` : `right:50%;width:${w}%;background:var(--warn)`}"></span></div></div>`;
      }).join('')}</div>
      <div class="card" style="margin-top:12px"><div class="card-title">Last 30 days</div>
        ${bars(last(r.history, 30).map((x) => x ?? 0), { color: 'var(--ring-b)', min: 0 })}
        <div class="axis"><span>30 days ago</span><span>Today</span></div></div>
      <p class="foot">Readiness compares this morning with your own 60-day baseline. Bars to the right help, bars to the left hold you back. HRV and resting heart rate weigh most because they respond first to fatigue, illness and alcohol.</p>`;
  },
  workout(el) {
    const w = A.training.recent.find((x) => x.id === el.dataset.id);
    if (!w) return sheetHead('Workout');
    const T = A.training;
    const load = trimp(w, { restHr: T.restHr, maxHeart: T.maxHeart, sex: A.data.profile.sex });
    const zt = w.zones.reduce((a, b) => a + b, 0) || 1;
    const zc = ['var(--label3)', 'var(--mind)', 'var(--fit)', 'var(--load)', 'var(--heart)'];
    const easyShare = (w.zones[0] + w.zones[1]) / zt;
    let verdict = '';
    if (RUN_TYPES.has(w.type)) {
      verdict = easyShare < 0.5
        ? `${Math.round((1 - easyShare) * 100)}% of this run was above zone 2. As a hard session, fine. If it was meant to be easy, slow down until your heart rate stays under ${T.z2Ceiling} bpm. Expect to be about 40–60 s/km slower at first.`
        : 'Well controlled. Most of this run was aerobic, which builds your base without piling on fatigue.';
    }
    return `${sheetHead(TYPE_LABEL[w.type] ?? w.type)}
      <div class="card">
        <div class="sub">${dateLong(w.start.slice(0, 10))} · ${timeOf(w.start)}</div>
        <div class="big num" style="margin-top:6px">${w.distanceM ? `${(w.distanceM / 1000).toFixed(2)}<small>km</small>` : durStr(w.durationS)}</div>
        <div class="stats three">
          <div class="stat"><div class="l">Time</div><div class="n num">${durStr(w.durationS)}</div></div>
          <div class="stat"><div class="l">${w.distanceM ? 'Pace' : 'Calories'}</div><div class="n num">${w.distanceM ? paceStr(w) : `${w.kcal}<small>kcal</small>`}</div></div>
          <div class="stat"><div class="l">Avg HR</div><div class="n num">${w.avgHr}<small>bpm</small></div></div>
        </div>
        <div class="card-title" style="margin:20px 0 0">Heart rate zones</div>
        <div class="stack">${w.zones.map((z, i) => `<span style="width:${(z / zt) * 100}%;background:${zc[i]}"></span>`).join('')}</div>
        <div class="legend">${w.zones.map((z, i) => `<span><i style="background:${zc[i]}"></i>Z${i + 1} ${Math.round(z / 60)}m</span>`).join('')}</div>
      </div>
      ${verdict ? `<div class="card insight ${easyShare < 0.5 ? 'warn' : 'good'}"><div class="bar"></div><div><h3>Coach’s read</h3><p>${verdict}</p></div></div>` : ''}
      <p class="foot">Training load for this session: ${Math.round(load)} (heart-rate-weighted minutes, Banister TRIMP).</p>`;
  },
  check(el) {
    const c = A.data.checks[+el.dataset.i];
    const more = {
      ecg: 'A single-lead ECG from the watch can confirm a normal (sinus) rhythm or flag atrial fibrillation. It cannot detect heart attacks or other structural problems.',
      pwa: 'The watch periodically analyses your pulse wave for the irregular rhythm typical of atrial fibrillation. A normal result is reassuring. Repeated irregular results should be seen by a doctor.',
      arterial: '“Slightly stiff” means your pulse wave travels a little faster than ideal for your age. It responds to lifestyle: regular aerobic exercise, less salt, good sleep and not smoking all improve it. Measure under the same conditions each time (seated, rested, same time of day) and recheck in 4 weeks. One reading is not a trend.',
    }[c.kind] ?? '';
    return `${sheetHead(c.result)}<div class="card"><div class="sub">${dateLong(c.at.slice(0, 10))} · ${timeOf(c.at)}</div><p style="margin:10px 0 0">${esc(c.detail)}</p><p class="sub" style="margin:10px 0 0;line-height:1.5">${more}</p></div>`;
  },
  settings() {
    const p = A.data.profile;
    const hw = STATUS.huawei ?? {};
    return `${sheetHead('Profile & data')}
      <form id="profile" class="list">
        <label class="field"><span>Name</span><input name="name" value="${esc(p.name)}" autocomplete="given-name"></label>
        <label class="field"><span>Age</span><input name="age" type="number" min="16" max="95" value="${p.age}" inputmode="numeric"></label>
        <label class="field"><span>Sex</span><select name="sex"><option value="male" ${p.sex === 'male' ? 'selected' : ''}>Male</option><option value="female" ${p.sex === 'female' ? 'selected' : ''}>Female</option></select></label>
        <label class="field"><span>Height (cm)</span><input name="heightCm" type="number" value="${p.heightCm ?? ''}" inputmode="numeric"></label>
        <label class="field"><span>Sleep need (hours)</span><input name="sleepNeedH" type="number" step="0.25" min="6" max="10" value="${p.sleepNeedH ?? 7.75}" inputmode="decimal"></label>
      </form>
      <p class="foot">Age and sex set your peer comparisons, heart rate zones and fitness age.</p>

      <h2>Watch connection</h2>
      <div class="list">
        <div class="row simple"><div class="k">${icons.watch.replace('<svg', '<svg width="20" height="20"')} ${esc(A.data.device?.model ?? 'Watch')}</div>
          <div class="v" style="font-size:15px"><span class="status-dot ${A.data.source === 'huawei' ? 'on' : ''}"></span> ${A.data.source === 'huawei' ? 'Live' : A.data.source === 'import' ? 'Imported' : 'Demo'}</div></div>
      </div>
      <div style="margin-top:12px">
        ${hw.configured
          ? hw.connected
            ? `<button class="btn secondary" data-action="sync">Sync now</button><button class="btn secondary" data-action="disconnect">Disconnect Huawei Health</button>`
            : `<a class="btn" href="api/huawei/login" style="text-decoration:none">Connect Huawei Health</a>`
          : `<div class="card"><h3>Connect Huawei Health</h3><p class="sub" style="margin:6px 0 0;line-height:1.45">${STATUS.server === false ? 'Run the Meridian server to connect your watch.' : 'Add your Huawei Health Kit app credentials to the server (HUAWEI_CLIENT_ID and HUAWEI_CLIENT_SECRET).'} See the README for the 10-minute setup.</p></div>`}
        <label class="btn secondary" style="cursor:pointer;margin-top:10px">Import data file<input type="file" accept="application/json,.json" data-action="import" hidden></label>
        <button class="btn secondary" data-action="use-demo">Use demo data</button>
      </div>

      <h2>Appearance</h2>
      <div class="seg" role="group" aria-label="Theme">
        ${['auto', 'light', 'dark'].map((t) => `<button data-action="theme" data-v="${t}" aria-pressed="${(localStorage.getItem('meridian.theme') || 'auto') === t}">${t[0].toUpperCase() + t.slice(1)}</button>`).join('')}
      </div>`;
  },
};

// ——— Events ———
async function onClick(e) {
  const el = e.target.closest('[data-sheet], [data-action]');
  if (!el) return;
  if (el.dataset.sheet) {
    const sheet = openSheet(SHEETS[el.dataset.sheet](el));
    const form = $('#profile', sheet);
    if (form) form.addEventListener('change', () => {
      const f = Object.fromEntries(new FormData(form));
      const p = { name: f.name.trim(), age: +f.age || 35, sex: f.sex, heightCm: +f.heightCm || null, sleepNeedH: +f.sleepNeedH || 7.75 };
      saveProfile(p);
      A = analyse({ ...A.data, profile: { ...A.data.profile, ...p, isDefault: false } }, { experiments: getExperiments() });
      render();
    });
    const file = $('[data-action="import"]', sheet);
    if (file) file.addEventListener('change', async () => {
      try {
        const json = JSON.parse(await file.files[0].text());
        json.source = 'import';
        importFile(json);
        closeSheet();
        reload();
      } catch (err) {
        alert(`That file couldn’t be used: ${err.message}`);
      }
    });
    return;
  }
  const a = el.dataset.action;
  if (a === 'close') closeSheet();
  if (a === 'theme') {
    const v = el.dataset.v;
    try { localStorage.setItem('meridian.theme', v); } catch { /* ignore */ }
    applyTheme();
    el.parentElement.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', b === el));
  }
  if (a === 'use-demo') { clearImport(); setSource('demo'); closeSheet(); reload(); }
  if (a === 'sync') { await fetch('api/huawei/sync', { method: 'POST' }); setSource('auto'); closeSheet(); reload(); }
  if (a === 'disconnect') { await fetch('api/huawei/logout', { method: 'POST' }); STATUS = await serverStatus(); closeSheet(); reload(); }
  if (a === 'start-exp') {
    const list = getExperiments();
    list.push({ templateId: el.dataset.id, startDate: A.data.today, lengthDays: 14 });
    saveExperiments(list);
    A = analyse(A.data, { experiments: list });
    render();
    location.hash = '#discover';
  }
  if (a === 'stop-exp') {
    const list = getExperiments();
    list.splice(+el.dataset.i, 1);
    saveExperiments(list);
    A = analyse(A.data, { experiments: list });
    render();
  }
}
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSheet(); });

function applyTheme() {
  let t = 'auto';
  try { t = localStorage.getItem('meridian.theme') || 'auto'; } catch { /* ignore */ }
  if (t === 'auto') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.dataset.theme = t;
}

applyTheme();
boot();
