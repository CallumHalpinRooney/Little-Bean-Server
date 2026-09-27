import { test } from 'node:test';
import assert from 'node:assert/strict';
import { askLocal, splitFollowups } from '../public/js/coach/local.js';
import { buildDemo } from '../public/js/data/demo.js';

test('follow-up line is split off, even while it is still being written', () => {
  assert.deepEqual(splitFollowups('Answer.\nFOLLOWUPS: a | "b" | c?'), { shown: 'Answer.', followups: ['a', 'b', 'c?'] });
  assert.equal(splitFollowups('Answer.\nFOLLO').shown, 'Answer.\n');
  assert.equal(splitFollowups('Plain answer').shown, 'Plain answer');
});

test('the Artifact coach runs the tools in the page through the sample capability', async () => {
  let seen;
  const statuses = [], shown = [];
  // Stand-in for claude.use("sample"): calls two tools, then writes the answer.
  const sample = async (turns, opts) => {
    seen = { turns, opts };
    const today = JSON.parse(await opts.tools.find((t) => t.name === 'get_today').execute({}, {}));
    const run = JSON.parse(await opts.tools.find((t) => t.name === 'analyse_run').execute({ run_id: 'latest' }, {}));
    await assert.rejects(async () => opts.tools.find((t) => t.name === 'list_runs').execute({ limit: 999 }, {}), /limit/);
    opts.tools.find((t) => t.name === 'set_goal').execute({ distance_m: 10000, target_time: '49:00', race_date: '2026-12-13' }, {});
    const text = `Readiness **${today.readiness.score}**. Recovery ${run.recovery.verdict.toLowerCase()}.\nFOLLOWUPS: Plan my week | Why so slow? | Is my back OK?`;
    opts.onText({ text: text.slice(0, 20), delta: text.slice(0, 20) });
    opts.onText({ text, delta: text.slice(20) });
    return { text, truncated: false, modelTierApplied: 'default' };
  };
  const r = await askLocal(sample, {
    message: 'How was my last run?', runId: 'w-2026-09-22-1800',
    history: [{ role: 'assistant', content: 'Earlier briefing' }],
    athlete: { name: 'Callum', age: 35, sex: 'male', style: 'Balanced' }, goal: null, symptoms: [], runNotes: {}, data: buildDemo(),
  }, { onStatus: (s) => statuses.push(s), onText: (t) => shown.push(t) });

  assert.equal(seen.turns[0].role, 'user');
  assert.ok(seen.turns[0].content.includes('You are Meridian') && seen.turns[0].content.includes('Name: Callum'));
  assert.ok(seen.turns.at(-1).content.endsWith('(Run id: w-2026-09-22-1800)'));
  assert.equal(seen.opts.tools.length, 11);
  assert.equal(seen.opts.cache, undefined, 'tool calls must not pass cache');
  assert.match(r.text, /^Readiness \*\*\d+\*\*\. Recovery slower than usual\.$/);
  assert.deepEqual(r.followups, ['Plan my week', 'Why so slow?', 'Is my back OK?']);
  assert.ok(shown.every((t) => !t.includes('FOLLOWUPS')));
  assert.deepEqual(statuses.slice(0, 2), ['Checking today’s recovery', 'Analysing the run in detail']);
  assert.equal(r.events[0].name, 'save_goal');
});
