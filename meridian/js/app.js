// Meridian: a coach you talk to. The Coach tab is a conversation that is generated fresh
// every time: the server-side coach pulls the facts it needs from your data and decides
// what you should do. Runs shows your measured data. You holds your profile and settings.

import { loadData, serverStatus, getRunNotes, saveRunNotes, getSymptoms, saveSymptoms, getGoal, saveGoal } from './data/store.js';
import { analyse, hm } from './analysis/engine.js';
import { TYPE_LABEL, paceStr, durStr } from './analysis/training.js';
import { runsOf, compareRun, thirds, context, RUN_TAGS } from './analysis/runs.js';
import { AREAS, activeSymptoms } from './analysis/body.js';
import { DISTANCES, fmtTime } from './analysis/plan.js';
import { bars, runProfile } from './ui/charts.js';
import { icons, workoutIcon } from './ui/icons.js';
import { STEPS, nextStep, questionText, toAthlete } from './ui/onboarding.js';
import { renderMarkdown } from './ui/markdown.js';

const $ = (sel, el = document) => el.querySelector(sel);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const shortDate = (iso) => new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
const timeOf = (iso) => new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

// ——— Local state ———
const read = (k, f) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : f; } catch { return f; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable */ } };
const forget = (k) => { try { localStorage.removeItem(k); } catch { /* storage unavailable */ } };
const K = { chat: 'meridian.chat', setup: 'meridian.setup', athlete: 'meridian.athlete', pass: 'meridian.passcode', brief: 'meridian.briefingKey' };

let A = null;          // analysis of the current data (for the glance strip and Runs)
let STATUS = {};       // what the server can do
let chat = read(K.chat, []);
let athlete = read(K.athlete, null);
let setup = read(K.setup, {});
let busy = false;

const saveChat = () => { chat = chat.slice(-80); write(K.chat, chat); };
const onboarded = () => Boolean(athlete);
const applyProfile = () => {
  if (!athlete) return;
  Object.assign(A.data.profile, {
    name: athlete.name, age: athlete.age ?? A.data.profile.age, sex: athlete.sex ?? A.data.profile.sex,
    heightCm: athlete.heightCm ?? A.data.profile.heightCm, isDefault: false,
  });
  A = analyse(A.data);
};

// ——— Boot & routing ———
async function boot() {
  STATUS = await serverStatus();
  A = analyse(await loadData());
  applyProfile();
  window.addEventListener('hashchange', () => render());
  document.addEventListener('click', onClick);
  render();
  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
}

const ROUTES = { coach: viewCoach, runs: viewRuns, run: viewRun, you: viewYou };
const TAB_OF = { run: 'runs' };

function render({ keepScroll = false } = {}) {
  const [raw, ...args] = decodeURIComponent(location.hash.slice(1) || 'coach').split('/');
  const route = ROUTES[raw] ? raw : 'coach';
  document.body.dataset.route = route;
  // Fixed-position UI (the message box) lives outside the animated page, because an
  // animated transform would otherwise become its positioning container.
  const [page, dock = ''] = ROUTES[route](...args).split('<!--dock-->');
  $('#view').innerHTML = `<div class="view">${page}</div>`;
  $('#dock').innerHTML = dock;
  const tab = TAB_OF[route] ?? route;
  document.querySelectorAll('nav.tabs a').forEach((a) => (a.hash === `#${tab}` ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current')));
  wire();
  if (route === 'coach') {
    if (!keepScroll) scrollToEnd();
    maybeBrief();
  } else if (!keepScroll) window.scrollTo({ top: 0 });
}

const header = (sub, title, { back, right = '' } = {}) => `
  <header class="top">
    ${back ? `<a class="icon-btn" href="${back}" aria-label="Back">${icons.back}</a>` : `<a class="icon-btn avatar" href="#you" aria-label="You">${athlete?.name ? esc(athlete.name[0].toUpperCase()) : icons.person}</a>`}
    <div class="title"><div class="t">${esc(title)}</div><div class="s">${esc(sub)}</div></div>
    ${right || '<span></span>'}
  </header>`;

const scrollToEnd = () => requestAnimationFrame(() => window.scrollTo({ top: document.body.scrollHeight }));

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
  const right = onboarded() && STATUS.coach ? `<button class="icon-btn" data-action="brief" aria-label="New briefing">${icons.today}</button>` : '';
  const chips = step ? (step.chips ?? []) : suggestions();
  const offline = onboarded() && !STATUS.coach;
  return `
  ${header(shortDate(A.data.today), 'Coach', { right })}
  ${onboarded() ? glance() : ''}
  <div class="thread">
    ${chat.map(bubble).join('')}
    ${step ? `<div class="msg coach q">${esc(questionText(step, setup))}</div>` : ''}
    ${offline ? `<div class="msg coach"><div class="md"><p><b>Your coach needs the Meridian server.</b> This copy of the app can show your data but can’t think. Deploy the server with your Anthropic API key (one click with <b>render.yaml</b> in the repo) and install the app from there.</p></div></div>` : ''}
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
  if (STATUS.coach) send({ kind: 'welcome', show: 'Give me your first assessment.' });
}

// ——— Talking to the coach ———
async function send({ text, kind = 'chat', runId, show }) {
  if (busy) return;
  if (!STATUS.coach) {
    if (text) chat.push({ role: 'user', content: text });
    chat.push({ role: 'assistant', kind: 'note', error: true, content: 'The coach is offline: the Meridian server isn’t running here.' });
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

  try {
    const res = await fetch('api/coach', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-meridian-passcode': read(K.pass, '') },
      body: JSON.stringify({
        kind, message: text, runId, history,
        athlete, goal: getGoal(A.data.today), symptoms: getSymptoms(), runNotes: getRunNotes(),
      }),
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
        if (ev.t === 'status') { status.hidden = false; status.querySelector('span').textContent = ev.text; }
        if (ev.t === 'text') { textSoFar += ev.d; md.innerHTML = renderMarkdown(textSoFar); status.hidden = true; scrollToEnd(); }
        if (ev.t === 'followups') followups = ev.items;
        if (ev.t === 'event') applyEvent(ev);
        if (ev.t === 'error') error = ev.text;
      }
    }
  } catch (err) {
    error = err.message;
  }
  busy = false;
  if (textSoFar.trim()) chat.push({ role: 'assistant', kind: kind === 'briefing' ? 'briefing' : undefined, content: textSoFar.trim(), followups, date: A.data.today });
  if (error) chat.push({ role: 'assistant', kind: 'note', error: true, content: `Couldn’t reach the coach: ${error}` });
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
  if (!onboarded() || !STATUS.coach || busy) return;
  const key = `${A.data.today}|${A.data.device?.lastSync ?? ''}`;
  if (read(K.brief, '') === key) return;
  write(K.brief, key);
  send({ kind: 'briefing' });
}

// ——— Runs: measured data only ———
function viewRuns() {
  const runs = [...runsOf(A.data)].reverse();
  const notes = getRunNotes();
  return `
  ${header(`${runs.length} runs`, 'Runs')}
  <div class="list">${runs.slice(0, 40).map((w) => `<a class="row" href="#run/${esc(w.id)}">
      <div class="wk" style="grid-column:1/-1">
        <div class="badge">${workoutIcon(w.type)}</div>
        <div><div class="t">${TYPE_LABEL[w.type] ?? esc(w.type)}</div><div class="s">${shortDate(w.start)} · ${timeOf(w.start)}${notes[w.id]?.tags?.length ? ` · ${esc(notes[w.id].tags.join(', '))}` : ''}</div></div>
        <div class="n num">${(w.distanceM / 1000).toFixed(2)} km<small>${paceStr(w)}/km · ${w.avgHr} bpm</small></div>
      </div></a>`).join('')}</div>`;
}

function viewRun(id) {
  const runs = runsOf(A.data);
  const run = runs.find((r) => r.id === id);
  if (!run) return `${header('', 'Run', { back: '#runs' })}<p class="foot">That run isn’t in your data.</p>`;
  const cmp = compareRun(run, runs);
  const th = thirds(run);
  const ctx = context(run, A.data, getRunNotes());
  const km = run.distanceM / 1000;
  const rec = run.recovery;
  const recRuns = runs.filter((r) => r.recovery && r.start <= run.start).slice(-12);
  const label = `${(TYPE_LABEL[run.type] ?? 'run').toLowerCase()} on ${shortDate(run.start)}`;

  return `
  ${header(`${shortDate(run.start)} · ${timeOf(run.start)}`, TYPE_LABEL[run.type] ?? 'Run', { back: '#runs' })}

  <button class="card mint tap focus" data-run="${esc(run.id)}" data-ask="How did my ${esc(label)} go? Compare it with my usual and tell me what to change." style="width:100%;text-align:left;align-items:center">
    <span class="ico">${icons.discover}</span>
    <div><h3>Ask the coach about this run</h3><p style="margin-top:2px">Recovery, form, what affected it, what to change</p></div>
  </button>

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

  ${th ? `<h2>Form through the run</h2>
  <div class="card" style="padding:16px 18px">
    <div class="stats" style="grid-template-columns:1.3fr repeat(3,1fr);border:0;padding:0;margin:0;row-gap:12px">
      <div class="stat"><div class="l"> </div></div><div class="stat"><div class="l">Start</div></div><div class="stat"><div class="l">Middle</div></div><div class="stat"><div class="l">End</div></div>
      ${[['Cadence', 'cadence', (v) => Math.round(v), 'spm'], ['Bounce', 'vo', (v) => v.toFixed(1), 'cm'], ['Balance', 'bal', (v) => v.toFixed(1), '%L'], ['Contact', 'gct', (v) => Math.round(v), 'ms'], ['Heart rate', 'hr', (v) => Math.round(v), '']]
        .map(([l, k, f, u]) => `<div class="stat"><div class="l">${l}</div></div>${th[k].map((v) => `<div class="stat"><div class="n num" style="font-size:15px">${f(v)}<small>${u}</small></div></div>`).join('')}`).join('')}
    </div>
  </div>` : ''}

  ${rec ? `<h2>Recovery</h2>
  <div class="card">
    <div class="card-title" style="margin:0">Heart rate drop in the first minute</div>
    <div class="hero-num num" style="font-size:44px">−${rec.hrEnd - rec.hr60}<small>bpm</small></div>
    <div class="sub" style="margin-top:6px">${rec.hrEnd} → ${rec.hr60} bpm after 1 min → ${rec.hr120} after 2</div>
    ${bars(recRuns.map((r) => r.recovery.hrEnd - r.recovery.hr60), { h: 90, tag: `−${rec.hrEnd - rec.hr60}` })}
    <div class="axis"><span>Your previous ${recRuns.length - 1} runs</span><span>This run</span></div>
  </div>` : ''}

  <h2>Conditions & notes</h2>
  <div class="card">
    <div class="stats three" style="border:0;padding:0;margin:0;row-gap:14px">
      ${ctx.items.map((c) => `<div class="stat"><div class="l">${c.label}</div><div class="n num" style="font-size:15px">${esc(c.value)}</div></div>`).join('')}
    </div>
    <div class="card-title" style="margin:18px 0 8px">Tag anything the watch can’t see</div>
    <div class="tags">${RUN_TAGS.map((t) => `<button class="chip ${ctx.tags.includes(t) ? 'on' : ''}" data-action="tag" data-id="${esc(run.id)}" data-tag="${esc(t)}" aria-pressed="${ctx.tags.includes(t)}">${esc(t)}</button>`).join('')}</div>
    <textarea id="run-note" data-id="${esc(run.id)}" rows="2" placeholder="Add a note: shoes, route, fuelling, how it felt…">${esc(ctx.note)}</textarea>
  </div>`;
}

// ——— You ———
const FIELD_LABEL = { name: 'Name', age: 'Age', sex: 'Sex', goal: 'Main goal', raceGoal: 'Race goal', experience: 'Running for', days: 'Days a week', longDay: 'Long-run day', injuries: 'Injuries', otherSports: 'Other sports', style: 'Coaching tone', detail: 'Detail' };

function viewYou() {
  const goal = read('meridian.goal', null);
  const keys = STEPS.map((s) => s.key).filter((k) => FIELD_LABEL[k]);
  return `
  ${header(athlete?.name || 'Profile', 'You')}
  ${athlete ? `<div class="list">
    ${keys.map((k) => `<label class="field"><span>${FIELD_LABEL[k]}</span><input data-field="${k}" value="${esc(athlete[k] ?? '')}" placeholder="—"></label>`).join('')}
    <label class="field"><span>Height (cm)</span><input data-field="heightCm" inputmode="numeric" value="${esc(athlete.heightCm ?? '')}" placeholder="—"></label>
    <label class="field"><span>Weight (kg)</span><input data-field="weightKg" inputmode="decimal" value="${esc(athlete.weightKg ?? '')}" placeholder="—"></label>
  </div>
  <p class="foot">Your coach reads this before every answer. Change anything, any time.</p>`
    : `<div class="card"><h3>Not set up yet</h3><p class="sub" style="margin:6px 0 0">Answer a few questions on the Coach tab so the advice fits you.</p></div>`}

  <h2>Goal</h2>
  <div class="list"><div class="row simple"><div class="k" style="color:var(--label)">${goal ? `${DISTANCES[goal.distance]} in ${fmtTime(goal.targetS)}` : 'No race goal yet'}</div><div class="v sub">${goal ? shortDate(goal.date) : 'Tell your coach'}</div></div></div>

  ${athlete?.facts?.length ? `<h2>Your coach remembers</h2>
  <div class="list">${athlete.facts.map((f, i) => `<div class="row simple"><div class="k" style="color:var(--label)">${esc(f)}</div><button class="done" data-action="forget" data-i="${i}" style="font-size:13px">Forget</button></div>`).join('')}</div>` : ''}

  <h2>Watch & coach</h2>
  <div class="list">
    <div class="row simple"><div class="k">${icons.watch.replace('<svg', '<svg width="18" height="18"')} ${esc(A.data.device?.model ?? 'Watch')}</div><div class="v sub">${A.data.source === 'huawei' ? 'Live' : 'Demo data'}</div></div>
    <div class="row simple"><div class="k">Coach</div><div class="v sub"><span class="status-dot ${STATUS.coach ? 'on' : ''}"></span> ${STATUS.coach ? 'Online' : STATUS.server ? 'No API key on the server' : 'Server not running'}</div></div>
    ${STATUS.locked ? `<label class="field"><span>Coach passcode</span><input data-pass type="password" value="${esc(read(K.pass, ''))}" placeholder="Required"></label>` : ''}
  </div>
  <div style="margin-top:12px">
    ${STATUS.huawei?.configured ? (STATUS.huawei.connected
      ? '<button class="btn secondary" data-action="sync">Sync watch now</button>'
      : '<a class="btn" href="api/huawei/login">Connect Huawei Health</a>') : ''}
    <button class="btn secondary" data-action="redo">Redo setup questions</button>
    <button class="btn secondary" data-action="clear">Clear conversation</button>
  </div>
  <p class="foot">Your chat, profile and notes stay on this phone. Questions go to your Meridian server, which asks Claude.</p>`;
}

// ——— Events ———
function wire() {
  const form = $('#composer');
  if (form) form.addEventListener('submit', (e) => {
    e.preventDefault();
    const t = form.q.value.trim();
    if (!t) return;
    if (!onboarded()) answer(t); else send({ text: t });
  });
  const note = $('#run-note');
  if (note) note.addEventListener('change', () => {
    const all = getRunNotes();
    all[note.dataset.id] = { tags: all[note.dataset.id]?.tags ?? [], text: note.value.trim() };
    saveRunNotes(all);
  });
  document.querySelectorAll('[data-field]').forEach((inp) => inp.addEventListener('change', () => {
    const k = inp.dataset.field;
    let v = inp.value.trim();
    if (['age', 'heightCm', 'weightKg'].includes(k)) v = v ? +v : null;
    athlete = { ...athlete, [k]: v };
    write(K.athlete, athlete);
    applyProfile();
  }));
  const pass = $('[data-pass]');
  if (pass) pass.addEventListener('change', () => write(K.pass, pass.value));
}

async function onClick(e) {
  const el = e.target.closest('[data-ask], [data-answer], [data-action]');
  if (!el) return;
  if (el.dataset.answer !== undefined) return answer(el.dataset.answer);
  if (el.dataset.ask !== undefined) {
    if (!onboarded()) { location.hash = '#coach'; return; }
    if (document.body.dataset.route !== 'coach') { history.pushState(null, '', '#coach'); }
    return send({ text: el.dataset.ask, runId: el.dataset.run });
  }
  const a = el.dataset.action;
  if (a === 'brief') send({ kind: 'briefing' });
  if (a === 'tag') {
    const all = getRunNotes();
    const n = all[el.dataset.id] ?? { tags: [], text: '' };
    n.tags = n.tags.includes(el.dataset.tag) ? n.tags.filter((t) => t !== el.dataset.tag) : [...n.tags, el.dataset.tag];
    all[el.dataset.id] = n;
    saveRunNotes(all);
    render({ keepScroll: true });
  }
  if (a === 'forget') { athlete.facts.splice(+el.dataset.i, 1); write(K.athlete, athlete); render({ keepScroll: true }); }
  if (a === 'sync') { await fetch('api/huawei/sync', { method: 'POST' }); location.reload(); }
  if (a === 'redo') { setup = {}; athlete = null; write(K.setup, {}); forget(K.athlete); location.hash = '#coach'; render(); }
  if (a === 'clear') { chat = []; saveChat(); forget(K.brief); location.hash = '#coach'; render(); }
}

boot();
