import { loadData, serverStatus, saveProfile, setSource, importFile, clearImport, getExperiments, saveExperiments, getRunNotes, saveRunNotes, getSymptoms, saveSymptoms, getGoal, saveGoal } from './data/store.js';
import { analyse, hhmm, hm } from './analysis/engine.js';
import { EXPERIMENTS } from './analysis/discover.js';
import { trimp, TYPE_LABEL, RUN_TYPES, paceStr, durStr } from './analysis/training.js';
import { mean, last } from './analysis/stats.js';
import { sparkline, hypnogram, bandLine, bars, intraday, runProfile } from './ui/charts.js';
import { runsOf, compareRun, thirds, recovery, context, formTrend, RUN_TAGS, FORM_GUIDE, fmtPace } from './analysis/runs.js';
import { AREAS, parseSymptoms, explainSymptom, activeSymptoms } from './analysis/body.js';
import { currentVdot, paces, assessGoal, weekPlan, predictSeconds, fmtTime, DISTANCES } from './analysis/plan.js';
import { icons, workoutIcon } from './ui/icons.js';
import { STEPS, nextStep, questionText, toAthlete } from './ui/onboarding.js';
import { renderMarkdown } from './ui/markdown.js';
import { getSampler, askLocal, errorMessage } from './coach/local.js';

const $ = (sel, el = document) => el.querySelector(sel);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtInt = (n) => Math.round(n).toLocaleString('en-GB');
const dateLong = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
const dateShort = (iso) => new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
const timeOf = (iso) => new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

let A = null;        // current analysis
let STATUS = {};     // server capabilities

// ——— Local state ———
const read = (k, f) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : f; } catch { return f; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable */ } };
const forget = (k) => { try { localStorage.removeItem(k); } catch { /* storage unavailable */ } };
const K = { chat: 'meridian.chat', setup: 'meridian.setup', athlete: 'meridian.athlete', pass: 'meridian.passcode', brief: 'meridian.briefingKey' };

let chat = read(K.chat, []);
let athlete = read(K.athlete, null);
let setup = read(K.setup, {});
let busy = false;
let pendingAsk = null; // a question asked from another tab, sent once the Coach tab is showing
let SAMPLE = null;     // Claude via your own claude.ai account, when running as an Artifact
// The coach is available through the Meridian server (API key) or your Claude account.
const coachOn = () => Boolean(STATUS.coach || SAMPLE);

const saveChat = () => { chat = chat.slice(-80); write(K.chat, chat); };
const onboarded = () => Boolean(athlete);
// Coach setup answers also set the profile the dashboards use (zones, peer norms).
const applyProfile = () => {
  if (!athlete) return;
  const p = { ...A.data.profile, name: athlete.name ?? A.data.profile.name, age: athlete.age ?? A.data.profile.age, sex: athlete.sex ?? A.data.profile.sex, heightCm: athlete.heightCm ?? A.data.profile.heightCm };
  saveProfile({ name: p.name, age: p.age, sex: p.sex, heightCm: p.heightCm, sleepNeedH: p.sleepNeedH });
  A = analyse({ ...A.data, profile: { ...p, isDefault: false } }, { experiments: getExperiments() });
};


// ——— Boot ———
async function boot() {
  // Copies installed when the app opened straight to the coach still launch at #coach;
  // a fresh launch of the installed app starts on Today instead.
  try {
    const standalone = matchMedia('(display-mode: standalone)').matches;
    if (standalone && location.hash === '#coach' && !sessionStorage.getItem('meridian.session')) location.replace('#today');
    sessionStorage.setItem('meridian.session', '1');
  } catch { /* storage unavailable */ }
  [STATUS] = await Promise.all([serverStatus()]);
  const data = await loadData();
  A = analyse(data, { experiments: getExperiments() });
  window.addEventListener('hashchange', () => {
    render();
    if (pendingAsk && document.body.dataset.route === 'coach' && onboarded()) { const q = pendingAsk; pendingAsk = null; send(q); }
  });
  document.addEventListener('click', onClick);
  // Hide the bottom bars while the on-screen keyboard is up (any text field focused).
  const typing = (on) => document.body.classList.toggle('typing', on);
  document.addEventListener('focusin', (e) => typing(e.target.matches('input:not([type=file]), textarea, select')));
  document.addEventListener('focusout', () => setTimeout(() => typing(document.activeElement?.matches?.('input, textarea, select') ?? false), 50));
  render();
  // Inside claude.ai the coach uses your Claude account; it lights up after first paint.
  if (!STATUS.coach) getSampler().then((s) => { SAMPLE = s; if (s && document.body.dataset.route === 'coach') render({ keepScroll: true }); });
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    // When a new version takes over, reload once so the whole app is the new code.
    // The very first install taking control is not an update; every change after that is.
    let controlled = Boolean(navigator.serviceWorker.controller), reloading = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!controlled) { controlled = true; return; }
      if (!reloading) { reloading = true; location.reload(); }
    });
    navigator.serviceWorker.register('sw.js').then((reg) => reg.update()).catch(() => {});
  }
}

async function reload() {
  const data = await loadData();
  A = analyse(data, { experiments: getExperiments() });
  render();
}

const ROUTES = { today: viewToday, sleep: viewSleep, heart: viewHeart, fitness: viewTrain, run: viewRun, body: viewBody, discover: viewDiscover, coach: viewCoach };
// Sub-pages highlight their parent tab.
const TAB_OF = { run: 'fitness', body: 'fitness' };

function render({ keepScroll = false } = {}) {
  const [raw, ...args] = decodeURIComponent(location.hash.slice(1) || 'today').split('/');
  const route = ROUTES[raw] ? raw : 'today';
  document.body.dataset.route = route;
  // Fixed-position UI (the coach's message box, the Coach button) lives outside the animated
  // page, because an animated transform would otherwise become its positioning container.
  const [page, dock = ''] = ROUTES[route](...args).split('<!--dock-->');
  $('#view').innerHTML = `<div class="view">${page}</div>`;
  $('#dock').innerHTML = route === 'coach' ? dock : `<a class="fab" href="#coach" aria-label="Ask your coach">${icons.chat}<span>Coach</span></a>`;
  const tab = TAB_OF[route] ?? route;
  document.querySelectorAll('nav.tabs a').forEach((a) => (a.hash === `#${tab}` ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current')));
  wireForms();
  wireCoach();
  if (route === 'coach') {
    if (!keepScroll) scrollToEnd();
    maybeBrief();
  } else if (!keepScroll) window.scrollTo({ top: 0 });
}
const scrollToEnd = () => requestAnimationFrame(() => window.scrollTo({ top: document.body.scrollHeight }));

// ——— Shared bits ———
// Centred title between two round buttons: profile on the left, watch & data on the right.
const header = (sub, title, back, right) => `
  <header class="top">
    ${back ? `<a class="icon-btn" href="${back}" aria-label="Back">${icons.back}</a>` : `<button class="icon-btn avatar" data-sheet="settings" aria-label="Profile">${A.data.profile.name ? esc(A.data.profile.name[0].toUpperCase()) : icons.person}</button>`}
    <div class="title"><div class="t">${esc(title)}</div><div class="s">${esc(sub)}</div></div>
    ${right ?? `<button class="icon-btn" data-sheet="settings" aria-label="Watch and data">${icons.watch}</button>`}
  </header>`;
const shortDate = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });

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
  const hist = last(r.history, 14).map((x) => x ?? 0);
  hist[hist.length - 1] = r.score;
  const stepAvg = mean(days14.map((d) => d.steps));

  return `
  ${header(shortDate(A.data.today), 'Today')}

  <div style="padding:0 4px 18px"><div class="eyebrow">${hello}${A.data.profile.name ? `, ${esc(A.data.profile.name)}` : ''}</div>
    <h1>You’re <span style="color:var(--mint)">${r.state.label.toLowerCase()}</span> today</h1></div>

  ${r.strainAlert ? `<div class="banner">${icons.alert}<div><b>Early strain signal.</b> HRV is suppressed and resting heart rate is elevated together. That often shows up 1–2 days before you feel ill.</div></div>` : ''}

  <button class="card hero tap" data-sheet="readiness" style="width:100%;text-align:left">
    <div class="hero-top">
      <div><div class="card-title" style="margin:0">Readiness</div>
        <div class="hero-num num">${r.score}<small>/ 100</small></div></div>
      <span class="pill ${r.state.tone}">${r.state.label}</span>
    </div>
    <div class="state-line">${r.state.line}</div>
    ${bars(hist, { h: 120, tag: String(r.score), min: 20 })}
    <div class="axis"><span>${shortDate(last(A.data.days, 14)[0].date)}</span><span class="chev">What’s driving this</span></div>
  </button>

  <div class="tiles">
    ${Number.isFinite(today.hrv) ? `<a class="tile tap" href="#heart">
      <div class="head"><span class="circle">${icons.pulse}</span>${sparkline(days14.map((d) => d.hrv), { w: 56, h: 22, color: 'var(--mint)' })}</div>
      <div class="val num">${today.hrv}<small>ms</small></div><div class="lab">Heart rate variability</div>${delta(today.hrv, hrvUsual, ' ms')}
    </a>` : ''}
    <a class="tile tap" href="#heart">
      <div class="head"><span class="circle">${icons.heart}</span>${sparkline(days14.map((d) => d.rhr), { w: 56, h: 22, color: 'var(--mint)' })}</div>
      <div class="val num">${today.rhr}<small>bpm</small></div><div class="lab">Resting heart rate</div>${delta(today.rhr, rhrUsual, ' bpm', { lowerBetter: true })}
    </a>
  </div>

  ${activeSymptoms(getSymptoms().filter((x) => !x.resolved), A.data.today).slice(0, 1).map((x) => `<a class="card tap" href="#body/${x.areas[0]}" style="margin-top:12px;display:flex;align-items:center;gap:14px">
    <span class="circle" style="color:var(--warn)">${icons.body}</span>
    <div style="flex:1"><h3>${esc(AREAS[x.areas[0]].label)}</h3><div class="sub">See how it shows in your running · plan adjusted</div></div><span class="chev sub"></span></a>`).join('')}

  <div class="card mint focus" style="margin-top:12px">
    <div class="ico">${focusIcon}</div>
    <div><div class="eyebrow">Today’s focus</div><h3>${esc(focus.title)}</h3><p>${esc(focus.body)}</p></div>
  </div>

  <h2>Vitals <a class="more chev" href="#sleep">Sleep</a></h2>
  <div class="list">
    <a class="row lead" href="#sleep">
      <span class="circle">${icons.moon}</span>
      <div><div class="t">Sleep</div><div class="s">${hhmm(sleep.last.bedIdx + 18 * 60)} – ${hhmm(sleep.last.wakeMin)} · score ${sleep.score}</div></div>
      <div class="n num">${hm(sleep.last.asleepMin)}<small>${sleep.debtMin > 20 ? `${hm(sleep.debtMin)} debt` : 'no debt'}</small></div>
    </a>
    <a class="row lead" href="#fitness">
      <span class="circle">${icons.steps}</span>
      <div><div class="t">Steps</div><div class="s">${fmtInt(stepAvg)} daily average</div></div>
      <div class="n num">${fmtInt(today.steps)}<small class="${today.steps >= stepAvg ? 'up' : 'flat'}">${today.steps >= stepAvg ? 'Above' : 'Below'} average</small></div>
    </a>
    ${A.data.vo2max.length ? `<a class="row lead" href="#fitness">
      <span class="circle">${icons.run}</span>
      <div><div class="t">VO₂ max</div><div class="s">Fitness age ${A.compare.fitnessAge ?? '—'}</div></div>
      <div class="n num">${A.data.vo2max.at(-1).value.toFixed(1)}<small>ml/kg/min</small></div>
    </a>` : ''}
  </div>

  ${top ? `
  <h2>Discovered <a class="more chev" href="#discover">All insights</a></h2>
  <a class="card discover-card tap" href="#discover">
    <div class="card-title" style="margin:0">A pattern in your data <span class="pill ${top.better ? 'good' : 'warn'}">${top.better ? 'Helps' : 'Costs you'}</span></div>
    <div class="rel num ${top.better ? 'up' : 'down'}" style="margin-top:4px">${top.relText}</div>
    <h3 style="margin-top:4px;font-weight:400;line-height:1.45">${esc(top.headline)}.</h3>
    <div class="sub" style="font-size:12px;margin-top:10px">${esc(top.evidence)}</div>
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
  ${header(shortDate(A.data.today), 'Sleep')}

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

  <div class="card mint">
    <div class="card-title">Tonight · suggested lights-out</div>
    <div class="big num">${hhmm(s.bedtimeTarget)}</div>
    <div class="sub" style="margin-top:6px;font-size:13px">Based on your usual ${hhmm(s.wakeTarget)} wake-up, a ${hm(need)} sleep need${s.debtMin > 20 ? ` and ${hm(s.debtMin)} of debt to repay` : ''}.</div>
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
  ${header(shortDate(A.data.today), 'Heart')}

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
// ——— Training ———
const SEGS = [['overview', 'Overview'], ['runs', 'Runs'], ['plan', 'Plan']];

function viewTrain(seg = 'overview') {
  const segs = `<nav class="seg" aria-label="Training sections">${SEGS.map(([k, l]) => `<a href="#fitness/${k}" class="${seg === k ? 'on' : ''}" ${seg === k ? 'aria-current="page"' : ''}>${l}</a>`).join('')}</nav>`;
  const body = seg === 'runs' ? trainRuns() : seg === 'plan' ? trainPlan() : trainOverview();
  return `${header(shortDate(A.data.today), 'Training')}${segs}${body}`;
}

function trainOverview() {
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
  const recent = T.recent.slice(0, 6);
  return `
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
    <div class="stack"><span style="width:${dist.easy * 100}%;background:var(--mint)"></span><span style="width:${dist.moderate * 100}%;background:var(--warn)"></span><span style="width:${dist.hard * 100}%;background:var(--bad)"></span></div>
    <div class="stack target-stack"><span style="width:80%;background:var(--mint)"></span><span style="width:5%;background:var(--warn)"></span><span style="width:15%;background:var(--bad)"></span></div>
    <div class="legend"><span><i style="background:var(--mint)"></i>Easy ${Math.round(dist.easy * 100)}%</span><span><i style="background:var(--warn)"></i>Moderate ${Math.round(dist.moderate * 100)}%</span><span><i style="background:var(--bad)"></i>Hard ${Math.round(dist.hard * 100)}%</span><span style="margin-left:auto">Faint bar = 80/20 target</span></div>
    <p class="sub" style="margin:12px 0 0">${dist.easy < 0.6 ? `Too much of your running is moderate: hard enough to tire you, not hard enough to drive big gains. Run easy days under <b>${T.z2Ceiling} bpm</b>.` : 'Good polarisation. Most running is easy, with focused hard work.'}</p>
  </div>` : ''}

  <div class="card">
    <div class="card-title">Running distance · 8 weeks</div>
    <div class="sub">${km8.at(-1).toFixed(1)} km this week · ${mean(km8).toFixed(1)} km average</div>
    ${bars(km8, { color: 'var(--fit)' })}
    <div class="axis"><span>8 weeks ago</span><span>This week</span></div>
  </div>

  <h2>Recent workouts <a class="more chev" href="#fitness/runs">All runs</a></h2>
  <div class="list">${recent.map(workoutRow).join('')}</div>`;
}

const workoutRow = (w) => {
  const isRun = RUN_TYPES.has(w.type) && w.distanceM;
  const attrs = isRun ? `href="#run/${esc(w.id)}"` : `data-sheet="workout" data-id="${esc(w.id)}"`;
  const Tag = isRun ? 'a' : 'button';
  return `<${Tag} class="row" ${attrs}>
      <div class="wk" style="grid-column:1/-1">
        <div class="badge">${workoutIcon(w.type)}</div>
        <div><div class="t">${TYPE_LABEL[w.type] ?? esc(w.type)}</div><div class="s">${dateShort(w.start)} · ${timeOf(w.start)}${getRunNotes()[w.id]?.tags?.length ? ` · ${esc(getRunNotes()[w.id].tags.join(', '))}` : ''}</div></div>
        <div class="n num">${w.distanceM ? `${(w.distanceM / 1000).toFixed(2)} km` : durStr(w.durationS)}<small>${w.distanceM ? `${paceStr(w)}/km` : `${w.avgHr} bpm avg`}</small></div>
      </div></${Tag}>`;
};

// ——— Runs: body check-in, form trend, every run ———
function trainRuns() {
  const runs = runsOf(A.data);
  const ft = formTrend(runs);
  const active = activeSymptoms(getSymptoms().filter((x) => !x.resolved), A.data.today);
  const trendRow = (key, label, unit, fmt, lowerBetter, isBal) => {
    const r = ft?.[key];
    if (!r) return '';
    const worse = isBal ? Math.abs(r.now - 50) - Math.abs(r.before - 50) > 0.7 : lowerBetter ? r.delta > Math.abs(r.before) * 0.03 : r.delta < -Math.abs(r.before) * 0.02;
    const better = isBal ? Math.abs(r.now - 50) - Math.abs(r.before - 50) < -0.7 : lowerBetter ? r.delta < -Math.abs(r.before) * 0.03 : r.delta > Math.abs(r.before) * 0.02;
    return `<div class="row"><div><div class="k">${label}</div><div class="v num">${fmt(r.now)}<small>${unit}</small></div>
      <span class="delta ${worse ? 'down' : better ? 'up' : 'flat'}">${worse || better ? `was ${fmt(r.before)}${unit}` : 'Steady'}</span></div>
      <div class="right">${sparkline(r.series, { color: worse ? 'var(--bad)' : 'var(--mint)' })}</div></div>`;
  };
  return `
  <form class="card" id="checkin" style="margin-bottom:12px">
    <div class="card-title" style="margin:0 0 10px">How’s your body?</div>
    <div class="ask" style="background:var(--bg-elev)"><input name="t" placeholder="e.g. I have a sore lower back" autocomplete="off" aria-label="Describe how you feel"><button type="submit" aria-label="Check">${icons.send.replace('<svg', '<svg width="18" height="18"')}</button></div>
    <div class="chip-row" style="margin-top:12px">${Object.entries(AREAS).map(([k, a]) => `<button type="button" class="chip" data-action="symptom" data-area="${k}">${a.label}</button>`).join('')}</div>
    <div class="sub" id="checkin-msg" style="margin-top:10px"></div>
  </form>

  ${active.length ? `<div class="list">${active.map((x) => `<a class="row lead" href="#body/${x.areas[0]}">
    <span class="circle" style="color:var(--warn)">${icons.body}</span>
    <div><div class="t">${esc(AREAS[x.areas[0]].label)}</div><div class="s">${x.date === A.data.today ? 'Reported today' : `Reported ${shortDate(x.date)}`} · ${x.severity}</div></div>
    <div class="n chev sub" style="font-weight:400">Analysis</div></a>`).join('')}</div>` : ''}

  ${ft ? `<h2>Running form <span class="more">last 3 runs vs 6 before</span></h2>
  <div class="list">
    ${trendRow('balanceL', 'Left / right balance', '% L', (v) => v.toFixed(1), false, true)}
    ${trendRow('voCm', 'Vertical oscillation', ' cm', (v) => v.toFixed(1), true)}
    ${trendRow('cadence', 'Cadence', ' spm', (v) => Math.round(v), false)}
    ${trendRow('gctMs', 'Ground contact', ' ms', (v) => Math.round(v), true)}
    ${trendRow('vertRatio', 'Vertical ratio', '%', (v) => v.toFixed(1), true)}
  </div>
  <p class="foot">Balance within 49–51% is even. Oscillation under ~10 cm and cadence around 165–185 are typical of efficient runners.</p>` : ''}

  <h2>All runs <span class="more">${runs.length}</span></h2>
  <div class="list">${[...runs].reverse().slice(0, 30).map(workoutRow).join('')}</div>`;
}

// ——— A single run ———
function viewRun(id) {
  const runs = runsOf(A.data);
  const run = runs.find((r) => r.id === id);
  if (!run) return `${header('', 'Run', '#fitness/runs')}<p class="foot">That run isn’t in your data.</p>`;
  const cmp = compareRun(run, runs);
  const th = thirds(run);
  const rec = recovery(run, runs, A.data);
  const ctx = context(run, A.data, getRunNotes());
  const km = run.distanceM / 1000;
  const recRuns = runs.filter((r) => r.recovery).slice(-12);
  if (!recRuns.includes(run) && run.recovery) recRuns.push(run);

  return `
  ${header(`${shortDate(run.start.slice(0, 10))} · ${timeOf(run.start)}`, TYPE_LABEL[run.type] ?? 'Run', '#fitness/runs')}

  <div class="card">
    <div class="big num">${km.toFixed(2)}<small>km</small></div>
    <div class="stats three" style="border:0;padding-top:0;margin-top:12px">
      <div class="stat"><div class="l">Time</div><div class="n num">${durStr(run.durationS)}</div></div>
      <div class="stat"><div class="l">Pace</div><div class="n num">${paceStr(run)}<small>/km</small></div></div>
      <div class="stat"><div class="l">Avg HR</div><div class="n num">${run.avgHr}<small>bpm</small></div></div>
    </div>
    ${run.series ? `${runProfile(run.series)}
    <div class="axis"><span>0 km</span><span>Final 15%</span><span>${km.toFixed(1)} km</span></div>
    <div class="legend"><span><i style="background:var(--mint)"></i>Heart rate</span><span><i style="background:var(--label3)"></i>Elevation · ${run.elevationM ?? 0} m climbed</span></div>` : ''}
  </div>

  <h2>Against your last 10 runs</h2>
  <div class="list">
    ${cmp.map((m) => `<div class="row simple"><div class="k" style="color:var(--label)">${m.label}</div>
      <div style="text-align:right"><div class="v num ${m.tone === 'down' ? 'down' : m.tone === 'up' ? 'up' : ''}" style="font-size:15px">${m.fmt(m.value)}<small>${m.unit}</small></div>
      <div class="sub" style="font-size:11px">${Number.isFinite(m.typical) ? `usual ${m.fmt(m.typical)}` : 'not enough history'}</div></div></div>`).join('')}
  </div>
  <p class="foot">Mint is better than your usual, coral is worse. Pace is effort-adjusted: each metre climbed counts as 7 m on the flat.</p>

  ${th ? `<h2>Form through the run</h2>
  <div class="card" style="padding:16px 18px">
    <div class="stats" style="grid-template-columns:1.3fr repeat(3,1fr);border:0;padding:0;margin:0;row-gap:12px">
      <div class="stat"><div class="l"> </div></div><div class="stat"><div class="l">Start</div></div><div class="stat"><div class="l">Middle</div></div><div class="stat"><div class="l">End</div></div>
      ${[['Cadence', 'cadence', (v) => Math.round(v), 'spm'], ['Bounce', 'vo', (v) => v.toFixed(1), 'cm'], ['Balance', 'bal', (v) => v.toFixed(1), '%L'], ['Contact', 'gct', (v) => Math.round(v), 'ms']]
        .map(([l, k, f, u]) => `<div class="stat"><div class="l">${l}</div></div>${th[k].map((v) => `<div class="stat"><div class="n num" style="font-size:15px">${f(v)}<small>${u}</small></div></div>`).join('')}`).join('')}
    </div>
    <p class="sub" style="margin:14px 0 0">${th.voFade >= 0.6 || th.cadFade <= -3
      ? `Your form faded as you tired: bounce up ${th.voFade.toFixed(1)} cm and cadence ${th.cadFade <= -1 ? `down ${Math.round(-th.cadFade)} spm` : 'held'} in the final third. Core and glute endurance is the fix, not more running.`
      : 'Your form held up well to the end.'}</p>
  </div>` : ''}

  ${rec ? `<h2>Recovery</h2>
  <div class="card">
    <div class="hero-top"><div><div class="card-title" style="margin:0">Heart rate drop in 60 s</div>
      <div class="hero-num num" style="font-size:44px">−${rec.drop}<small>bpm</small></div></div>
      <span class="pill ${rec.verdict === 'Normal' ? '' : rec.verdict.startsWith('Faster') ? 'good' : 'warn'}">${rec.verdict}</span></div>
    <div class="sub" style="margin-top:6px">${rec.hrEnd} → ${rec.hr60} bpm after 1 min → ${rec.hr120} after 2 · usually −${rec.typicalDrop} · ${rec.rank === 1 ? `fastest of your ${rec.of} runs` : rec.rank === rec.of ? `slowest of your ${rec.of} runs` : rec.rank <= rec.of / 2 ? `${ordinal(rec.rank)} fastest of ${rec.of} runs` : `${ordinal(rec.of - rec.rank + 1)} slowest of ${rec.of} runs`}</div>
    ${bars(recRuns.map((r) => r.recovery.hrEnd - r.recovery.hr60), { h: 90, tag: `−${rec.drop}` })}
    <div class="axis"><span>Your recent runs · 1-min drop</span><span>This run</span></div>
    <div style="margin-top:16px;display:grid;gap:12px">
      ${rec.reasons.map((r) => `<div class="insight ${r.weight >= 3 ? 'warn' : r.weight ? 'info' : 'good'}"><div class="bar"></div><p style="margin:6px 0 0;color:var(--label)">${esc(r.text)}</p></div>`).join('')}
    </div>
    ${rec.likeForLike ? `<p class="sub" style="margin:14px 0 0">${esc(rec.likeForLike.text)}</p>` : ''}
    ${rec.nextMorning ? `<p class="sub" style="margin:10px 0 0">Next morning: HRV ${rec.nextMorning.hrv} ms (${rec.nextMorning.pct >= 0 ? '+' : '−'}${Math.round(Math.abs(rec.nextMorning.pct) * 100)}% vs normal), resting HR ${rec.nextMorning.rhr}. ${rec.nextMorning.pct < -0.1 ? 'The run cost more than usual. Take the next day easy.' : 'Your body absorbed it well.'}</p>` : ''}
  </div>
  <p class="foot">1-minute recovery shows how quickly your heart winds down, and it improves as aerobic fitness grows. It’s compared as a share of the gap between finishing and resting heart rate, so hard and easy finishes are fair to compare.</p>` : ''}

  <h2>What may have affected it</h2>
  <div class="card">
    <div class="stats three" style="border:0;padding:0;margin:0;row-gap:14px">
      ${ctx.items.map((c) => `<div class="stat"><div class="l"><i style="background:${c.tone === 'warn' ? 'var(--warn)' : 'var(--mint)'}"></i>${c.label}</div><div class="n num" style="font-size:15px">${esc(c.value)}</div></div>`).join('')}
    </div>
    <div class="card-title" style="margin:18px 0 8px">Anything else? Tap to tag</div>
    <div style="display:flex;flex-wrap:wrap;gap:8px">${RUN_TAGS.map((t) => `<button class="chip" data-action="tag" data-id="${esc(run.id)}" data-tag="${esc(t)}" aria-pressed="${ctx.tags.includes(t)}" style="${ctx.tags.includes(t) ? 'background:var(--mint-soft);color:var(--mint);border-color:rgba(143,229,170,.3)' : ''}">${esc(t)}</button>`).join('')}</div>
    <textarea id="run-note" data-id="${esc(run.id)}" rows="2" placeholder="Add a note: shoes, route, fuelling, how it felt…" style="width:100%;margin-top:12px;background:var(--bg-elev);border:1px solid var(--border);border-radius:14px;padding:12px;color:var(--label);font:inherit;font-size:14px;resize:vertical">${esc(ctx.note)}</textarea>
  </div>
  ${askBox(`Why did this ${TYPE_LABEL[run.type]?.toLowerCase() ?? 'run'} on ${shortDate(run.start.slice(0, 10))} go the way it did?`, { run: run.id })}`;
}

const ordinal = (n) => `${n}${[, 'st', 'nd', 'rd'][n % 100 >> 3 ^ 1 && n % 10] || 'th'}`;

// ——— Body check-in result ———
function viewBody(area) {
  const list = getSymptoms().filter((x) => !x.resolved && x.areas.includes(area)).sort((a, b) => (a.date < b.date ? 1 : -1));
  const entry = list[0] ?? { date: A.data.today, text: '', severity: 'mild', areas: [area] };
  const x = explainSymptom(area, A.data, A.training, A.sleep, entry.severity);
  if (!x) return `${header('', 'Body', '#fitness/runs')}`;
  return `
  ${header(entry.date === A.data.today ? 'Reported today' : `Reported ${shortDate(entry.date)}`, x.label, '#fitness/runs')}

  <div class="card">
    ${entry.text ? `<div class="sub">You said “${esc(entry.text)}”</div>` : ''}
    <h3 style="font-size:18px;font-weight:400;line-height:1.45;margin-top:${entry.text ? 8 : 0}px">${esc(x.summary)}</h3>
    <div class="card-title" style="margin:18px 0 8px">How bad is it?</div>
    <div class="seg" style="margin:0">${['mild', 'moderate', 'severe'].map((s) => `<button data-action="severity" data-area="${area}" data-v="${s}" aria-pressed="${entry.severity === s}">${s[0].toUpperCase() + s.slice(1)}</button>`).join('')}</div>
  </div>

  ${x.findings.length ? `<h2>What your running shows</h2>
  ${x.findings.map((f) => `<div class="card insight ${f.neutral || f.context ? 'info' : 'warn'}"><div class="bar"></div><div>
    <div class="area">${esc(f.metric)} · ${esc(f.from)} → ${esc(f.to)}</div><h3>${esc(f.title)}</h3><p>${esc(f.why)}</p></div></div>`).join('')}
  <p class="foot">${esc(x.caveat)}</p>` : ''}

  <h2>What to do <a class="more chev" href="#fitness/plan">Adjusted plan</a></h2>
  <div class="list">${x.actions.map((t, i) => `<div class="row lead"><span class="circle num" style="font-size:13px">${i + 1}</span><div style="grid-column:2/-1;font-size:14px;line-height:1.5">${esc(t)}</div></div>`).join('')}</div>

  <h2>See a physio or doctor if</h2>
  <div class="card" style="border-color:rgba(232,144,127,.22)">${x.redFlags.map((t) => `<div style="display:flex;gap:10px;font-size:14px;line-height:1.5;padding:4px 0"><span style="color:var(--bad)">•</span><span>${esc(t)}</span></div>`).join('')}</div>

  <button class="btn secondary" data-action="resolve" data-area="${area}" style="margin-top:16px">It’s better now</button>
  ${askBox(`I have ${AREAS[area].phrase}${entry.text ? ` ("${entry.text}")` : ''}. What in my running data could explain it, and what should I change?`, { area })}`;
}

// ——— Plan: goal, prediction, this week, paces ———
function trainPlan() {
  const goal = getGoal(A.data.today);
  const v = currentVdot(A.data, A.training);
  const g = assessGoal(goal, v.vdot, A.data.today);
  const symptoms = activeSymptoms(getSymptoms().filter((x) => !x.resolved), A.data.today);
  const ft = formTrend(runsOf(A.data));
  const formIssue = ft && (Math.abs(ft.balanceL.now - 50) > 1.2 || ft.voCm.now > 9.5 || ft.cadence.now < 165);
  const plan = weekPlan({ data: A.data, training: A.training, readiness: A.readiness, goal, vdot: v.vdot, symptoms, form: formIssue });
  const P = paces(v.vdot, A.training.maxHeart, A.training.restHr);
  const totalWeeks = plan.phases.reduce((a, p) => a + p.weeks, 0);
  const tone = { 'Already in reach': 'good', Realistic: 'good', Ambitious: 'warn', Stretch: 'bad' }[g.label];

  const strength = [];
  if (symptoms.some((x) => x.areas.includes('back')) || (ft && ft.voCm.now > 9.5)) strength.push(['Core: curl-up, side plank, bird-dog', '3 rounds, daily while your back is sore']);
  if (ft && Math.abs(ft.balanceL.now - 50) > 1.2) strength.push([`Single-leg work, ${ft.balanceL.now > 50 ? 'right' : 'left'} side first`, 'Split squats, single-leg RDLs, step-ups · 3 × 8, extra set on the weaker side']);
  if (ft && ft.cadence.now < 165) strength.push(['Cadence drills', `Easy runs with a metronome at ${Math.round(ft.cadence.now * 1.05)} spm for 4 × 1 min`]);
  strength.push(['Calves and feet', 'Slow heel raises, straight and bent knee · 3 × 15']);
  strength.push(['Hips', 'Glute bridges and banded side steps · 3 × 12']);

  return `
  <div class="card mint">
    <div class="card-title">${goal.isDefault ? 'Suggested goal' : 'Your goal'} <button class="chip" data-sheet="goal" style="background:rgba(7,19,12,.1);border:0;color:var(--on-mint);padding:6px 12px">Edit</button></div>
    <div class="big num" style="color:var(--on-mint)">${DISTANCES[goal.distance] ?? `${goal.distance / 1000} km`} <small style="color:rgba(7,19,12,.6)">in</small>${fmtTime(goal.targetS)}</div>
    <div class="sub" style="margin-top:6px;font-size:13px">by ${new Date(`${goal.date}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long' })} · ${g.weeks} weeks away</div>
  </div>

  <div class="tiles">
    <div class="tile"><div class="lab">Predicted today</div><div class="val num">${fmtTime(g.predicted)}</div><div class="lab" style="margin-top:6px">VDOT ${v.vdot}</div></div>
    <div class="tile"><div class="lab">Realistic by race day</div><div class="val num">${fmtTime(Math.max(g.reachable, goal.targetS * (g.gap <= 0 ? 0 : 1)))}</div><div style="margin-top:8px"><span class="pill ${tone}">${g.label}</span></div></div>
  </div>
  <p class="foot">${g.gap > 0 ? `You need to improve by ${g.gap} VDOT points, about ${g.perWeek.toFixed(2)} a week. Up to ~0.25 a week is sustainable for most recreational runners.` : 'Your current fitness already predicts this time. Consider a faster target.'} Based on your watch VO₂ max (${v.watch ?? '—'}) and what your recent runs show (${v.runEst ?? '—'}).</p>

  <h2>This week <span class="more">${plan.phase} phase · ~${Math.round(plan.weekKm)} km</span></h2>
  <div class="list">
    ${plan.days.map((d) => `<div class="row lead">
      <span class="circle" style="flex-direction:column;font-size:11px;line-height:1.1;color:${d.kind === 'rest' ? 'var(--label3)' : 'var(--mint)'}"><span>${d.dow}</span></span>
      <div><div class="t">${esc(d.title)}${d.adjusted ? ` <span class="pill warn" style="padding:2px 8px;font-size:11px">${esc(d.adjusted)}</span>` : ''}</div><div class="s" style="line-height:1.45;margin-top:2px">${esc(d.detail)}</div></div>
      <div></div></div>`).join('')}
  </div>

  <h2>The road to race day</h2>
  <div class="card">
    <div class="stack" style="height:28px;gap:4px;margin:0">${plan.phases.map((p, i) => `<span style="width:${(p.weeks / totalWeeks) * 100}%;border-radius:8px;display:grid;place-items:center;font-size:11px;background:${i === 0 ? 'var(--mint)' : 'var(--bg-elev2)'};color:${i === 0 ? 'var(--on-mint)' : 'var(--label2)'}">${p.p}</span>`).join('')}</div>
    ${bars(plan.volume, { h: 90, highlightLast: false }).replace('opacity="0.42"', 'opacity="1"')}
    <div class="axis"><span>This week · ${Math.round(plan.volume[0])} km</span><span>Race week</span></div>
    <p class="sub" style="margin:12px 0 0">Volume builds about 8% a week, with a lighter week every fourth to absorb the work, then a taper so you arrive fresh. About 80% stays easy.</p>
  </div>

  <h2>Your paces</h2>
  <div class="list">${P.map((p) => `<div class="row"><div><div class="k" style="color:var(--label)">${p.label}</div><div class="sub" style="font-size:12px">${p.use}</div></div>
    <div style="text-align:right"><div class="num" style="font-size:15px;font-weight:500">${p.range}</div><div class="sub" style="font-size:12px">${p.hr}</div></div></div>`).join('')}</div>

  <h2>Strength & form <span class="more">tailored to your data</span></h2>
  <div class="list">${strength.map(([t, d]) => `<div class="row lead"><span class="circle">${icons.strength}</span><div><div class="t">${esc(t)}</div><div class="s">${esc(d)}</div></div><div></div></div>`).join('')}</div>

  <h2>Race predictions</h2>
  <div class="list">${Object.entries(DISTANCES).map(([m, l]) => `<div class="row simple"><div class="k" style="color:var(--label)">${l}</div><div class="v num">${fmtTime(predictSeconds(v.vdot, +m))}</div></div>`).join('')}</div>
  <p class="foot">Predictions use Jack Daniels’ VDOT tables and assume flat roads, good conditions and training for that distance.</p>`;
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
      <div class="track"><div class="fill" style="width:${r.pct}%"></div><div class="med" style="left:50%"></div><div class="me" style="left:${r.pct}%"></div></div>
      <div class="meta"><span>Better than <span class="rank">${r.pct}%</span> of peers</span><span>Median ${r.median}</span></div>
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

  <h2>Ask your coach</h2>
  <a class="card tap coach-card" href="#coach">
    <div class="card-title" style="margin:0 0 6px;justify-content:flex-start">${icons.chat.replace('<svg', '<svg width="16" height="16"')} Coach</div>
    <h3 style="font-weight:400;line-height:1.45">Ask anything about your training, sleep or recovery. The coach looks at your data fresh every time.</h3>
  </a>
  <div class="chips" style="margin-top:12px">${['Why was my deep sleep low this week?', 'Explain my weekly review', 'What should I change first?'].map((q) => `<button class="chip" data-ask="${esc(q)}">${esc(q)}</button>`).join('')}</div>`;
}

// Hands a question about this page (a run, a symptom) to the coach.
function askBox(preset, focus = {}) {
  return `<button class="card mint tap focus" style="width:100%;text-align:left;align-items:center;margin-top:16px" data-ask="${esc(preset)}" data-run="${esc(focus.run ?? '')}" data-area="${esc(focus.area ?? '')}">
    <span class="ico">${icons.chat}</span>
    <div><h3>Ask the coach about this</h3><p style="margin-top:2px">${esc(preset)}</p></div>
  </button>`;
}

// Forms that need more than a click: the body check-in and run notes.
function wireForms() {
  const checkin = $('#checkin');
  if (checkin) checkin.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = checkin.t.value.trim();
    if (!text) return;
    const areas = parseSymptoms(text);
    if (!areas.length) {
      $('#checkin-msg').textContent = 'I couldn’t tell which part of you that is. Tap the closest option above.';
      return;
    }
    addSymptom(areas, text);
  });
  const note = $('#run-note');
  if (note) note.addEventListener('change', () => {
    const all = getRunNotes();
    all[note.dataset.id] = { tags: all[note.dataset.id]?.tags ?? [], text: note.value.trim() };
    saveRunNotes(all);
  });
}

function wireCoach() {
  const form = $('#composer');
  if (form) form.addEventListener('submit', (e) => {
    e.preventDefault();
    const t = form.q.value.trim();
    if (!t) return;
    if (!onboarded()) answer(t); else send({ text: t });
  });
  const pass = $('[data-pass]');
  if (pass) pass.addEventListener('change', () => write(K.pass, pass.value));
}

function addSymptom(areas, text = '') {
  const list = getSymptoms();
  list.push({ id: `${Date.now()}`, date: A.data.today, text, areas, severity: 'mild' });
  saveSymptoms(list);
  location.hash = `#body/${areas[0]}`;
}

// ——— Coach ———
// Three live numbers. Tapping one asks the coach about it.
function glance() {
  const r = A.readiness, s = A.sleep, t = A.today;
  const tile = (label, value, sub, ask) => `<button class="gl" data-ask="${esc(ask)}"><div class="l">${label}</div><div class="v num">${value}</div><div class="s">${sub}</div></button>`;
  return `<div class="glance">
    ${tile('Readiness', r.score, esc(r.state.label), `Why is my readiness ${r.score} today, and what should I do about it?`)}
    ${tile('Sleep', hm(s.last.asleepMin).replace(' ', ''), `score ${s.score}`, 'How was my sleep last night, and what should I change tonight?')}
    ${Number.isFinite(t.hrv)
      ? tile('HRV', `${t.hrv}<small>ms</small>`, `usual ${Math.round(r.hrvBaseline.typical)}`, 'What is my HRV telling you about my recovery?')
      : tile('Resting HR', t.rhr, `usual ${Math.round(r.rhrBaseline.typical)}`, 'What is my resting heart rate telling you?')}
  </div>`;
}

// Suggested prompts: the coach's own follow-ups after an answer, otherwise built from what
// is in the data right now (latest run, active symptom, goal).
function suggestions() {
  const lastMsg = chat.at(-1);
  if (lastMsg?.role === 'assistant' && lastMsg.followups?.length) return lastMsg.followups;
  const run = runsOf(A.data).at(-1);
  const sym = activeSymptoms(getSymptoms().filter((x) => !x.resolved), A.data.today)[0];
  const goal = read('meridian.goal', null);
  return [
    'What should I do today?',
    run && `How did my ${(TYPE_LABEL[run.type] ?? 'run').toLowerCase()} on ${shortDate(run.start)} go?`,
    sym ? `My ${AREAS[sym.areas[0]].label.toLowerCase()}: is it improving?` : 'Something hurts. Check my running?',
    goal ? `Am I on track for my ${DISTANCES[goal.distance]}?` : 'Build me a race plan',
    'How has my running form changed?',
  ].filter(Boolean);
}

const briefLabel = (date) => `<div class="msg-label">${icons.today}Briefing · ${esc(shortDate(date))}</div>`;

function bubble(m) {
  if (m.role === 'user') return `<div class="msg user">${esc(m.content)}</div>`;
  if (m.kind === 'setup') return `<div class="msg coach q">${esc(m.content)}</div>`;
  if (m.kind === 'note') return `<div class="note ${m.error ? 'err' : ''}">${esc(m.content)}</div>`;
  return `<div class="msg coach ${m.kind === 'briefing' ? 'brief' : ''}">${m.kind === 'briefing' ? briefLabel(m.date) : ''}<div class="md">${renderMarkdown(m.content)}</div></div>`;
}

function viewCoach() {
  const step = onboarded() ? null : nextStep(setup);
  const right = onboarded() && coachOn() ? `<button class="icon-btn" data-action="brief" aria-label="New briefing">${icons.today}</button>` : '';
  const chips = step ? (step.chips ?? []) : suggestions();
  const offline = onboarded() && !coachOn();
  return `
  ${header(shortDate(A.data.today), 'Coach', '#today', right || '<span></span>')}
  ${onboarded() ? glance() : ''}
  <div class="thread">
    ${chat.map(bubble).join('')}
    ${step ? `<div class="msg coach q">${esc(questionText(step, setup))}</div>` : ''}
    ${offline ? `<div class="msg coach"><div class="md"><p><b>Your coach isn’t connected here.</b> Open the Meridian Artifact in claude.ai to use your own Claude account, or run the Meridian server with an API key.</p></div></div>` : ''}
    <div id="live"></div>
  </div>
  <!--dock--><div class="composer">
    ${chips.length ? `<div class="chips" id="chips">${chips.map((c) => `<button class="chip" data-${step ? 'answer' : 'ask'}="${esc(c)}">${esc(c)}</button>`).join('')}</div>` : ''}
    ${!step || step.input ? `<form class="ask" id="composer">
      <input name="q" ${step?.input === 'number' ? 'inputmode="numeric"' : ''} placeholder="${esc(step ? (step.placeholder ?? 'Type your answer') : 'Ask your coach anything')}" autocomplete="off" aria-label="Message">
      <button type="submit" aria-label="Send">${icons.send.replace('<svg', '<svg width="18" height="18"')}</button>
    </form>` : ''}
  </div>`;
}

// Setup answers, one question at a time.
function answer(text) {
  const step = nextStep(setup);
  if (!step) return;
  const value = step.parse ? step.parse(text) : text.trim();
  if (value === undefined || value === '') {
    chat.push({ role: 'assistant', kind: 'note', content: step.invalid ?? 'Could you answer that one?' });
    saveChat();
    return render();
  }
  chat = chat.filter((m) => !(m.kind === 'note' && !m.error));
  chat.push({ role: 'assistant', kind: 'setup', content: questionText(step, setup) });
  chat.push({ role: 'user', kind: 'setup', content: text.trim() });
  setup[step.key] = value;
  write(K.setup, setup);
  if (nextStep(setup)) { saveChat(); return render(); }

  athlete = toAthlete(setup);
  write(K.athlete, athlete);
  applyProfile();
  // The setup Q&A collapses to one line once it's done.
  chat = chat.filter((m) => m.kind !== 'setup' && m.kind !== 'note');
  chat.push({ role: 'assistant', kind: 'note', content: `Setup complete · ${athlete.goal}${athlete.raceGoal ? ` (${athlete.raceGoal})` : ''} · ${athlete.days} days a week` });
  saveChat();
  write(K.brief, `${A.data.today}|${A.data.device?.lastSync ?? ''}`); // the welcome replaces today's briefing
  render();
  if (coachOn()) send({ kind: 'welcome', show: 'Give me your first assessment.' });
}

// ——— Talking to the coach ———
async function send({ text, kind = 'chat', runId, show }) {
  if (busy) return;
  if (!coachOn()) {
    if (text) chat.push({ role: 'user', content: text });
    chat.push({ role: 'assistant', kind: 'note', error: true, content: 'The coach isn’t connected here. Open Meridian in claude.ai, or run the server.' });
    saveChat();
    return render();
  }
  busy = true;
  const history = chat.filter((m) => !m.kind || m.kind === 'briefing').slice(-16).map((m) => ({ role: m.role, content: m.content }));
  if (show ?? text) chat.push({ role: 'user', content: show ?? text, date: A.data.today });
  saveChat();
  render();
  $('#chips')?.remove();
  const live = $('#live');
  live.innerHTML = `<div class="msg coach ${kind === 'briefing' ? 'brief' : ''}">${kind === 'briefing' ? briefLabel(A.data.today) : ''}<div class="status"><i></i><span>Thinking</span></div><div class="md"></div></div>`;
  scrollToEnd();
  const md = live.querySelector('.md'), status = live.querySelector('.status');
  let textSoFar = '', followups = [], error = null;
  const showStatus = (t) => { status.hidden = false; status.querySelector('span').textContent = t; };
  const showText = (t) => { md.innerHTML = renderMarkdown(t); status.hidden = !t; scrollToEnd(); };
  const payload = { kind, message: text, runId, history, athlete, goal: getGoal(A.data.today), symptoms: getSymptoms(), runNotes: getRunNotes() };

  if (!STATUS.coach) {
    // Your Claude account: the tools run here in the page.
    try {
      const r = await askLocal(SAMPLE, { ...payload, data: A.data }, { onStatus: showStatus, onText: (t) => { textSoFar = t; showText(t); } });
      textSoFar = r.text;
      followups = r.followups;
      r.events.forEach(applyEvent);
    } catch (e) {
      if (typeof e?.text === 'string') textSoFar = e.text.split('FOLLOWUPS:')[0];
      if (e?.code === 'refused') textSoFar = '';
      if (e?.code !== 'cancelled') error = errorMessage(e);
    }
    return finish(kind, textSoFar, followups, error);
  }

  try {
    const res = await fetch('api/coach', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-meridian-passcode': read(K.pass, '') },
      body: JSON.stringify(payload),
    });
    if (!res.ok || !res.body) throw new Error((await res.json().catch(() => ({}))).error ?? `server error ${res.status}`);
    const reader = res.body.getReader(), dec = new TextDecoder();
    let buf = '';
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let nl;
      while ((nl = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, nl);
        buf = buf.slice(nl + 1);
        if (!line.trim()) continue;
        const ev = JSON.parse(line);
        if (ev.t === 'status') showStatus(ev.text);
        if (ev.t === 'text') { textSoFar += ev.d; showText(textSoFar); }
        if (ev.t === 'followups') followups = ev.items;
        if (ev.t === 'event') applyEvent(ev);
        if (ev.t === 'error') error = `Couldn’t reach the coach: ${ev.text}`;
      }
    }
  } catch (err) {
    error = `Couldn’t reach the coach: ${err.message}`;
  }
  finish(kind, textSoFar, followups, error);
}

function finish(kind, textSoFar, followups, error) {
  busy = false;
  if (textSoFar.trim()) chat.push({ role: 'assistant', kind: kind === 'briefing' ? 'briefing' : undefined, content: textSoFar.trim(), followups, date: A.data.today });
  if (error) chat.push({ role: 'assistant', kind: 'note', error: true, content: error });
  saveChat();
  if (document.body.dataset.route === 'coach') render();
}

function applyEvent({ name, data }) {
  if (name === 'save_goal') saveGoal(data);
  if (name === 'log_symptom') saveSymptoms([...getSymptoms(), data]);
  if (name === 'remember' && athlete) {
    athlete.facts = [...new Set([...(athlete.facts ?? []), data])].slice(-30);
    write(K.athlete, athlete);
  }
}

// A fresh briefing the first time you open the coach each day, and again after new data syncs.
function maybeBrief() {
  if (!onboarded() || !coachOn() || busy) return;
  const key = `${A.data.today}|${A.data.device?.lastSync ?? ''}`;
  if (read(K.brief, '') === key) return;
  write(K.brief, key);
  send({ kind: 'briefing' });
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
  goal() {
    const g = getGoal(A.data.today);
    return `${sheetHead('Your goal')}
      <form id="goal" class="list">
        <label class="field"><span>Distance</span><select name="distance">${Object.entries(DISTANCES).map(([m, l]) => `<option value="${m}" ${+m === g.distance ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
        <label class="field"><span>Target time</span><input name="time" value="${fmtTime(g.targetS)}" placeholder="50:00 or 1:45:00" inputmode="numeric"></label>
        <label class="field"><span>Race date</span><input name="date" type="date" value="${g.date}" min="${A.data.today}"></label>
      </form>
      <p class="foot">Your plan, paces and predictions update as soon as you change these.</p>`;
  },
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
        ${bars(last(r.history, 30).map((x) => x ?? 0), { min: 20 })}
        <div class="axis"><span>30 days ago</span><span>Today</span></div></div>
      <p class="foot">Readiness compares this morning with your own 60-day baseline. Bars to the right help, bars to the left hold you back. HRV and resting heart rate weigh most because they respond first to fatigue, illness and alcohol.</p>`;
  },
  workout(el) {
    const w = A.training.recent.find((x) => x.id === el.dataset.id);
    if (!w) return sheetHead('Workout');
    const T = A.training;
    const load = trimp(w, { restHr: T.restHr, maxHeart: T.maxHeart, sex: A.data.profile.sex });
    const zt = w.zones.reduce((a, b) => a + b, 0) || 1;
    const zc = ['var(--mint-4)', 'var(--mint-3)', 'var(--mint)', 'var(--warn)', 'var(--bad)'];
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

      <h2>Coach</h2>
      <div class="list">
        <div class="row simple"><div class="k">Status</div><div class="v sub"><span class="status-dot ${coachOn() ? 'on' : ''}"></span> ${SAMPLE ? 'Your Claude account' : STATUS.coach ? 'Meridian server' : 'Not connected'}</div></div>
        ${STATUS.locked ? `<label class="field"><span>Coach passcode</span><input data-pass type="password" value="${esc(read(K.pass, ''))}" placeholder="Required"></label>` : ''}
        ${(athlete?.facts ?? []).map((f, i) => `<div class="row simple"><div class="k" style="color:var(--label)">${esc(f)}</div><button class="done" data-action="forget" data-i="${i}" style="font-size:13px">Forget</button></div>`).join('')}
      </div>
      <div style="margin-top:12px">
        <button class="btn secondary" data-action="redo">Redo coach setup</button>
        <button class="btn secondary" data-action="clear">Clear coach conversation</button>
      </div>`;
  },
};

// ——— Events ———
async function onClick(e) {
  const el = e.target.closest('[data-sheet], [data-action], [data-ask], [data-answer]');
  if (!el) return;
  if (el.dataset.answer !== undefined) return answer(el.dataset.answer);
  if (el.dataset.ask !== undefined) {
    const q = { text: el.dataset.ask, runId: el.dataset.run || undefined };
    if (document.body.dataset.route !== 'coach') { pendingAsk = q; location.hash = '#coach'; return; }
    if (!onboarded()) return;
    return send(q);
  }
  if (el.dataset.sheet) {
    const sheet = openSheet(SHEETS[el.dataset.sheet](el));
    const goalForm = $('#goal', sheet);
    if (goalForm) goalForm.addEventListener('change', () => {
      const f = Object.fromEntries(new FormData(goalForm));
      const parts = String(f.time).split(':').map(Number);
      const secs = parts.reduce((acc, x) => acc * 60 + (x || 0), 0);
      if (!secs || !f.date) return;
      saveGoal({ distance: +f.distance, targetS: secs, date: f.date });
      render({ keepScroll: true });
    });
    const form = $('#profile', sheet);
    if (form) form.addEventListener('change', () => {
      const f = Object.fromEntries(new FormData(form));
      const p = { name: f.name.trim(), age: +f.age || 35, sex: f.sex, heightCm: +f.heightCm || null, sleepNeedH: +f.sleepNeedH || 7.75 };
      saveProfile(p);
      if (athlete) { athlete = { ...athlete, name: p.name, age: p.age, sex: p.sex, heightCm: p.heightCm }; write(K.athlete, athlete); }
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
  if (a === 'brief') send({ kind: 'briefing' });
  if (a === 'forget') { athlete.facts.splice(+el.dataset.i, 1); write(K.athlete, athlete); closeSheet(); }
  if (a === 'redo') { setup = {}; athlete = null; write(K.setup, {}); forget(K.athlete); closeSheet(); location.hash = '#coach'; render(); }
  if (a === 'clear') { chat = []; saveChat(); forget(K.brief); closeSheet(); location.hash = '#coach'; render(); }
  if (a === 'symptom') addSymptom([el.dataset.area]);
  if (a === 'severity' || a === 'resolve') {
    const list = getSymptoms();
    const mine = list.filter((x) => !x.resolved && x.areas.includes(el.dataset.area)).sort((p, q) => (p.date < q.date ? 1 : -1));
    if (!mine.length && a === 'severity') list.push({ id: `${Date.now()}`, date: A.data.today, text: '', areas: [el.dataset.area], severity: el.dataset.v });
    mine.forEach((x) => { if (a === 'severity') x.severity = el.dataset.v; else x.resolved = true; });
    saveSymptoms(list);
    if (a === 'resolve') location.hash = '#fitness/runs'; else render({ keepScroll: true });
  }
  if (a === 'tag') {
    const all = getRunNotes();
    const n = all[el.dataset.id] ?? { tags: [], text: '' };
    n.tags = n.tags.includes(el.dataset.tag) ? n.tags.filter((t) => t !== el.dataset.tag) : [...n.tags, el.dataset.tag];
    all[el.dataset.id] = n;
    saveRunNotes(all);
    if (el.dataset.tag === 'Sore back' && n.tags.includes('Sore back') && !getSymptoms().some((x) => !x.resolved && x.areas.includes('back'))) {
      const list = getSymptoms();
      list.push({ id: `${Date.now()}`, date: A.data.today, text: 'Tagged on a run', areas: ['back'], severity: 'mild' });
      saveSymptoms(list);
    }
    render({ keepScroll: true });
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

boot();
