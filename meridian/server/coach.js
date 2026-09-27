// The coach: Claude with tools over the athlete's data. Every answer is generated fresh:
// the model decides what to look up, the tools compute the facts, and the reply streams
// back as newline-delimited JSON events:
//   {t:'status', text}        a tool is running ("Analysing the run in detail")
//   {t:'text', d}             a chunk of the answer
//   {t:'followups', items}    3 suggested next questions, generated with the answer
//   {t:'event', name, data}   state the app should save (goal, symptom, remembered fact)
//   {t:'error', text} / {t:'done'}

import Anthropic from '@anthropic-ai/sdk';
import { createToolbox, TOOL_STATUS } from './tools.js';

const MODEL = 'claude-opus-5';
const MAX_TOOL_ROUNDS = 8;
const FOLLOW = 'FOLLOWUPS:';

const SYSTEM = `You are Meridian, a world-class running coach and sports scientist inside the athlete's watch app (Huawei Watch GT 6 Pro). You coach one person, using their own data, to perform at their best and stay healthy.

Expertise you draw on: Daniels' VDOT training, polarised/80-20 intensity distribution, progressive overload (weekly volume +≤10%, deload every 3–4 weeks), acute:chronic workload, HRV-guided training, running economy and form (cadence, vertical oscillation, ground contact, left/right balance), heart-rate recovery, strength training for runners, sleep and recovery, fuelling basics, and injury management (load modification, pain-monitoring rules, red flags).

How you work:
- Always get facts with your tools before answering anything about the athlete. Never invent or estimate a number the tools can give you. Call several tools when a question needs it (e.g. a sore back → check_symptom and running_form_trend; "how was my run" → analyse_run).
- Make a decision. Tell them what to do, with specific sessions, paces, heart rates, times or dates. Explain *why* with their numbers and dates, briefly.
- Be honest and critical when the data supports it, in the tone the athlete asked for. Don't pad, don't flatter, don't repeat what they already know.
- Fit advice to their profile: available days, experience, goals, injuries, other sports, and anything remembered. If a computed plan conflicts with their availability, adapt it and say so.
- If the athlete states a race goal, save it with set_goal. If they share a durable fact (injury history, schedule, race entry), save it with remember.
- Pain and illness: relate symptoms to specific changes in their data, say plainly that the data can't diagnose or separate cause from effect, give the red flags that need a physio or doctor, and never encourage running through severe pain, chest pain, or with a fever.
- Don't narrate tool use (the app shows progress). Don't mention JSON, tools or data sources.

Format (a phone screen):
- Lead with the answer in one or two sentences. Then at most 4 short bullets or a compact day-by-day list for plans.
- Use **bold** for the key numbers and decisions. No headings, no tables. Keep most answers under 150 words; plans may be longer.
- Finish with a final line exactly like: ${FOLLOW} question one | question two | question three
  These are 3 short, specific questions the athlete would plausibly ask next, written in their voice (under 8 words each).`;

const PROMPTS = {
  briefing: 'Give me my briefing for today. Check today’s recovery, my latest run and anything notable in my data, then tell me exactly what to do today (training, and anything for sleep or recovery) and the one thing I should focus on this week. Keep it tight.',
  welcome: 'I’ve just answered your setup questions (see my profile). Go through my data properly (today’s recovery, recent runs, running form and my goal) and give me your honest first assessment: where I stand, the biggest thing holding me back, and what my next 7 days should look like. If I gave a race goal, save it first.',
};

function athleteBlock(a = {}, today) {
  const lines = Object.entries({
    Name: a.name, Age: a.age, Sex: a.sex, Height: a.heightCm && `${a.heightCm} cm`, Weight: a.weightKg && `${a.weightKg} kg`,
    'Main goal': a.goal, 'Race goal (their words)': a.raceGoal, Experience: a.experience, 'Training days per week': a.days,
    'Long-run day': a.longDay, 'Injuries / health': a.injuries, 'Other sports': a.otherSports,
    'Coaching tone': a.style, 'Detail level': a.detail,
  }).filter(([, v]) => v !== undefined && v !== null && v !== '').map(([k, v]) => `- ${k}: ${v}`);
  const facts = (a.facts ?? []).map((f) => `- ${f}`);
  return `Today is ${today}.\n\nAthlete profile (from setup):\n${lines.join('\n') || '- (setup not completed yet: ask what they want to achieve)'}${facts.length ? `\n\nThings you've been told to remember:\n${facts.join('\n')}` : ''}`;
}

// Holds back the FOLLOWUPS line while streaming so it never flashes on screen.
function followupFilter(emit) {
  let buf = '', done = false;
  return {
    push(d) {
      if (done) { buf += d; return; }
      buf += d;
      const i = buf.indexOf(FOLLOW);
      if (i >= 0) { emit(buf.slice(0, i)); buf = buf.slice(i); done = true; return; }
      const keep = FOLLOW.length; // a marker may be split across chunks
      if (buf.length > keep) { emit(buf.slice(0, -keep)); buf = buf.slice(-keep); }
    },
    finish() {
      if (!done) { emit(buf); return []; }
      return buf.slice(FOLLOW.length).split('\n')[0].split('|').map((q) => q.trim().replace(/^["“']+|["”']+$/g, '')).filter(Boolean).slice(0, 3);
    },
  };
}

let client = null;
// Tests inject a scripted client; production creates the real one lazily.
export const setClientForTests = (c) => { client = c; };

export async function coach(req, res, body, loadData) {
  const send = (o) => res.write(`${JSON.stringify(o)}\n`);
  const { kind = 'chat', history = [], message = '', runId, athlete = {}, goal = null, symptoms = [], runNotes = {} } = body ?? {};

  // A question asked from a run's page carries its id so the coach can analyse that run.
  const runRef = typeof runId === 'string' && /^[\w-]{1,64}$/.test(runId) ? `\n\n(Run id: ${runId})` : '';
  const base = PROMPTS[kind] ?? String(message).trim();
  if (!base || base.length > 2000) {
    res.writeHead(400, { 'content-type': 'application/json' }).end(JSON.stringify({ error: 'Message must be 1–2000 characters.' }));
    return;
  }
  res.writeHead(200, { 'content-type': 'application/x-ndjson; charset=utf-8', 'cache-control': 'no-store', 'x-accel-buffering': 'no' });

  const data = await loadData();
  // The athlete's setup answers are the source of truth for profile fields.
  data.profile = {
    ...data.profile,
    ...(athlete.age ? { age: +athlete.age } : {}),
    ...(athlete.sex ? { sex: athlete.sex } : {}),
    ...(athlete.heightCm ? { heightCm: +athlete.heightCm } : {}),
    ...(athlete.name ? { name: athlete.name } : {}),
    isDefault: !athlete.age,
  };
  const tools = createToolbox(data, { goal, symptoms, runNotes });

  // Only plain text turns are replayed; tool calls are re-run fresh on every question.
  const messages = history
    .filter((m) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .slice(-16)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }));
  if (messages[0]?.role === 'assistant') messages.unshift({ role: 'user', content: 'Hi' });
  messages.push({ role: 'user', content: PROMPTS[kind] ? base : base + runRef });

  client ??= new Anthropic();
  const filter = followupFilter((d) => d && send({ t: 'text', d }));
  let aborted = false, current = null;
  res.on('close', () => { aborted = true; current?.abort(); });

  try {
    let jsonRetries = 0;
    for (let round = 0; round < MAX_TOOL_ROUNDS && !aborted; round++) {
      const stream = client.beta.messages.stream({
        model: MODEL,
        max_tokens: 16000,
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        thinking: { type: 'adaptive' },
        output_config: { effort: 'medium' },
        cache_control: { type: 'ephemeral' },
        system: [
          { type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } },
          { type: 'text', text: athleteBlock(athlete, data.today) },
        ],
        tools: tools.definitions.map((t) => ({ ...t, eager_input_streaming: true })),
        messages,
      });
      current = stream;
      stream.on('text', (d) => filter.push(d));

      let message;
      try {
        message = await stream.finalMessage();
        jsonRetries = 0;
      } catch (err) {
        // Only an unparseable tool input is retried; API errors go to the user.
        if (err instanceof Anthropic.APIError || aborted || jsonRetries++ >= 2) throw err;
        continue;
      }

      if (message.stop_reason === 'refusal') { send({ t: 'text', d: '\n\nI can’t help with that one. Ask me about your training, recovery or runs.' }); break; }
      if (message.stop_reason === 'pause_turn') { messages.push({ role: 'assistant', content: message.content }); continue; }
      const calls = message.content.filter((b) => b.type === 'tool_use');
      if (!calls.length || message.stop_reason === 'end_turn') break;
      if (message.stop_reason === 'max_tokens') { send({ t: 'text', d: '…' }); break; }

      messages.push({ role: 'assistant', content: message.content });
      const results = calls.map((c) => {
        send({ t: 'status', text: TOOL_STATUS[c.name] ?? 'Working it out' });
        const r = tools.run(c.name, c.input);
        return { type: 'tool_result', tool_use_id: c.id, content: r.content, ...(r.isError ? { is_error: true } : {}) };
      });
      messages.push({ role: 'user', content: results });
    }
    const followups = filter.finish();
    if (followups.length) send({ t: 'followups', items: followups });
    for (const e of tools.events) send({ t: 'event', name: e.name, data: e.data });
  } catch (err) {
    filter.finish();
    const msg = err instanceof Anthropic.AuthenticationError ? 'The server’s Anthropic API key was rejected.'
      : err instanceof Anthropic.RateLimitError ? 'Too many requests right now. Try again in a minute.'
      : err instanceof Anthropic.APIError ? `The coach is unavailable (${err.status}).`
      : `Something went wrong: ${err.message}`;
    if (!aborted) send({ t: 'error', text: msg });
  }
  send({ t: 'done' });
  res.end();
}
