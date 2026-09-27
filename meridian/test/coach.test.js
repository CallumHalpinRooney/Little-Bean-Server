import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { coach, setClientForTests } from '../server/coach.js';
import { buildDemo } from '../public/js/data/demo.js';

// A scripted stand-in for the Anthropic client: each call returns the next turn.
function scriptedClient(turns, calls) {
  return {
    beta: { messages: { stream(params) {
      calls.push(structuredClone(params));
      const turn = turns.shift();
      const handlers = [];
      return {
        on(ev, fn) { if (ev === 'text') handlers.push(fn); return this; },
        async finalMessage() { (turn.texts ?? []).forEach((t) => handlers.forEach((h) => h(t))); return turn.message; },
        abort() {},
      };
    } } },
  };
}

function fakeRes() {
  const res = new EventEmitter();
  res.out = '';
  res.writeHead = (code) => { res.code = code; return res; };
  res.write = (s) => { res.out += s; return true; };
  res.end = (s) => { if (s) res.out += s; };
  return res;
}

test('coach runs tools, streams the answer, hides follow-ups and emits events', async () => {
  const calls = [];
  setClientForTests(scriptedClient([
    { message: { stop_reason: 'tool_use', content: [
      { type: 'tool_use', id: 't1', name: 'analyse_run', input: { run_id: 'latest' } },
      { type: 'tool_use', id: 't2', name: 'check_symptom', input: { area: 'back', severity: 'mild', description: 'sore lower back' } },
    ] } },
    { texts: ['Your **22 Sept** run finished on a climb.\n', '- Shorter steps\n', 'FOLLOW', 'UPS: Why was recovery slow? | Plan my week | Is my back OK?'],
      message: { stop_reason: 'end_turn', content: [{ type: 'text', text: '…' }] } },
  ], calls));

  const res = fakeRes();
  await coach(new EventEmitter(), res, {
    message: 'My back is sore, how was my last run?',
    history: [{ role: 'assistant', content: 'Earlier briefing' }],
    athlete: { name: 'Callum', age: 35, sex: 'male', days: '4', style: 'Straight-talking, push me' },
    goal: { distance: 10000, targetS: 3000, date: '2026-12-13' },
  }, async () => buildDemo());

  const events = res.out.trim().split('\n').map((l) => JSON.parse(l));
  const text = events.filter((e) => e.t === 'text').map((e) => e.d).join('');
  assert.equal(res.code, 200);
  assert.ok(text.includes('finished on a climb'));
  assert.ok(!text.includes('FOLLOWUPS'), 'the follow-up line never reaches the screen');
  assert.deepEqual(events.find((e) => e.t === 'followups').items, ['Why was recovery slow?', 'Plan my week', 'Is my back OK?']);
  assert.deepEqual(events.filter((e) => e.t === 'status').map((e) => e.text), ['Analysing the run in detail', 'Relating that to your running data']);
  assert.equal(events.find((e) => e.t === 'event').name, 'log_symptom');
  assert.equal(events.at(-1).t, 'done');

  // First request: profile in the system prompt, history starts with a user turn.
  assert.ok(calls[0].system[1].text.includes('Coaching tone: Straight-talking'));
  assert.equal(calls[0].messages[0].role, 'user');
  assert.equal(calls[0].model, 'claude-opus-5');
  // Second request carries real tool results computed from the data.
  const results = calls[1].messages.at(-1).content;
  assert.equal(results.length, 2);
  assert.ok(JSON.parse(results[0].content).vs_previous_10_runs.length > 5);
  assert.ok(JSON.parse(results[1].content).evidence_from_running.some((f) => f.metric === 'Left / right balance'));
});

test('invalid tool input is returned to the model as an error, not run', async () => {
  const calls = [];
  setClientForTests(scriptedClient([
    { message: { stop_reason: 'tool_use', content: [{ type: 'tool_use', id: 'x', name: 'list_runs', input: { limit: 500 } }] } },
    { texts: ['Done.'], message: { stop_reason: 'end_turn', content: [] } },
  ], calls));
  const res = fakeRes();
  await coach(new EventEmitter(), res, { message: 'List my runs' }, async () => buildDemo());
  const result = calls[1].messages.at(-1).content[0];
  assert.equal(result.is_error, true);
  assert.match(result.content, /limit/);
});

test('empty questions are rejected', async () => {
  const res = fakeRes();
  await coach(new EventEmitter(), res, { message: '   ' }, async () => buildDemo());
  assert.equal(res.code, 400);
});
