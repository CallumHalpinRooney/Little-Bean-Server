import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildDemo } from '../public/js/data/demo.js';
import { validate } from '../public/js/data/schema.js';
import { analyse } from '../public/js/analysis/engine.js';
import { welch, pearson, ewma } from '../public/js/analysis/stats.js';
import { vo2Percentile, fitnessAge, rhrPercentile, maxHr } from '../public/js/analysis/norms.js';
import { zonesOf } from '../public/js/analysis/training.js';

test('demo data is valid, deterministic and anchored to the screenshots', () => {
  const a = buildDemo(), b = buildDemo();
  assert.deepEqual(validate(a), []);
  assert.deepEqual(a, b);
  const today = a.days.at(-1);
  assert.equal(today.date, '2026-09-27');
  assert.equal(today.steps, 6894);
  assert.equal(new Date(today.sleep.bed).getHours(), 23);
  assert.ok(a.workouts.some((w) => w.distanceM === 4010 && w.type === 'trail_run'));
});

test('stats helpers behave', () => {
  assert.ok(Math.abs(pearson([1, 2, 3, 4], [2, 4, 6, 8]).r - 1) < 1e-9);
  const t = welch([10, 11, 12, 13, 14], [1, 2, 3, 4, 5]);
  assert.ok(t.diff === 9 && t.p < 0.001);
  assert.equal(ewma([5, 5, 5], 7).at(-1), 5);
});

test('cohort norms place people sensibly', () => {
  const man35 = { age: 35, sex: 'male' };
  assert.equal(vo2Percentile(42.4, man35), 50);
  assert.ok(vo2Percentile(60, man35) >= 90);
  assert.ok(rhrPercentile(50, man35) > 90); // low RHR beats most peers
  assert.ok(fitnessAge(48, man35) <= 25 && fitnessAge(32.6, man35) >= 54);
  assert.equal(maxHr(35), 184);
});

test('engine finds the relationships built into the demo data', () => {
  const a = analyse(buildDemo(), { experiments: [{ templateId: 'bed2330', startDate: '2026-09-14' }] });
  assert.ok(a.readiness.score >= 1 && a.readiness.score <= 99);
  const late = a.patterns.all.find((p) => p.id === 'lateWorkout:deepMin');
  assert.ok(late && !late.better, 'late workouts should cost deep sleep');
  assert.ok(a.training.distribution.easy < 0.4, 'demo runs are grey-zone heavy');
  assert.ok(a.review.some((r) => r.title.includes('easy runs')));
  assert.equal(a.experiments.length, 1);
  assert.equal(a.compare.cohort, 'Men 30–39');
});

test('engine copes with sparse live data (no HRV, missing sleep, no zones)', () => {
  const d = buildDemo();
  d.days.forEach((day, i) => { day.hrv = null; if (i % 5 === 0) day.sleep = null; });
  d.workouts.forEach((w) => { w.zones = [0, 0, 0, 0, 0]; });
  d.days.at(-1).sleep = null;
  const a = analyse(d);
  assert.ok(Number.isFinite(a.readiness.score));
  assert.ok(a.readiness.parts.every((p) => p.key !== 'hrv'));
  assert.ok(Number.isFinite(a.sleep.score));
});

test('zones are estimated from average HR when missing', () => {
  const z = zonesOf({ avgHr: 150, durationS: 1800, zones: [0, 0, 0, 0, 0] }, { restHr: 60, maxHeart: 184 });
  assert.deepEqual(z, [0, 0, 1800, 0, 0]);
});

import { runsOf, compareRun, recovery, formTrend } from '../public/js/analysis/runs.js';
import { parseSymptoms, explainSymptom } from '../public/js/analysis/body.js';
import { vdotFromRace, predictSeconds, paceAt, assessGoal, weekPlan, currentVdot } from '../public/js/analysis/plan.js';

test('runs: comparison, recovery and form trend find the demo story', () => {
  const d = buildDemo();
  const runs = runsOf(d);
  const last = runs.at(-1);
  assert.equal(last.start.slice(0, 10), '2026-09-22');
  const bal = compareRun(last, runs).find((m) => m.key === 'balanceL');
  assert.ok(bal.value > 51.5 && bal.typical < 51 && bal.tone === 'down');
  const rec = recovery(last, runs, d);
  assert.equal(rec.verdict, 'Slower than usual');
  assert.ok(rec.reasons[0].text.includes('climb'), 'the hill finish is the lead reason');
  const ft = formTrend(runs);
  assert.ok(ft.balanceL.delta > 1 && ft.voCm.delta > 0.5 && ft.cadence.delta < -3);
});

test('body: symptoms are parsed and explained from running data', () => {
  assert.deepEqual(parseSymptoms('I have a sore lower back'), ['back']);
  assert.deepEqual(parseSymptoms('pain in the back of thigh'), ['hamstring']);
  assert.deepEqual(parseSymptoms('had a great run'), []);
  const d = buildDemo();
  const a = analyse(d);
  const x = explainSymptom('back', d, a.training, a.sleep);
  assert.ok(x.findings.some((f) => f.metric === 'Left / right balance'));
  assert.ok(x.redFlags.length >= 3);
  assert.ok(explainSymptom('back', d, a.training, a.sleep, 'severe').actions[0].startsWith('Stop running'));
});

test('plan: VDOT maths matches Daniels tables and plans adapt to symptoms', () => {
  assert.ok(Math.abs(vdotFromRace(10000, 50 * 60) - 40) < 0.2); // Daniels: VDOT 40 ≈ 50:03 10K
  assert.ok(Math.abs(predictSeconds(50, 5000) - (19 * 60 + 57)) < 20); // VDOT 50 ≈ 19:57 5K
  assert.ok(paceAt(40, 0.65) > paceAt(40, 0.88)); // easy is slower than threshold
  const d = buildDemo();
  const a = analyse(d);
  const v = currentVdot(d, a.training);
  const goal = { distance: 10000, targetS: 3000, date: '2026-12-13' };
  assert.ok(['Realistic', 'Ambitious', 'Stretch', 'Already in reach'].includes(assessGoal(goal, v.vdot, d.today).label));
  const base = { data: d, training: a.training, readiness: a.readiness, goal, vdot: v.vdot, form: false };
  const clean = weekPlan({ ...base, symptoms: [] });
  const sore = weekPlan({ ...base, symptoms: [{ areas: ['back'], severity: 'mild' }] });
  assert.equal(clean.days.length, 7);
  assert.ok(sore.days.some((x) => x.adjusted === 'Sore back'));
  assert.ok(!sore.days.some((x) => /Threshold|Intervals/.test(x.title)));
});

import { renderMarkdown } from '../public/js/ui/markdown.js';
import { STEPS, nextStep, toAthlete } from '../public/js/ui/onboarding.js';

test('coach replies are formatted safely', () => {
  const html = renderMarkdown('Run **5 km** easy\n- <img src=x onerror=alert(1)>\n- second');
  assert.ok(html.includes('<b>5 km</b>'));
  assert.ok(html.includes('&lt;img'), 'HTML in a reply is escaped, never executed');
  assert.equal((html.match(/<li>/g) ?? []).length, 2);
});

test('setup questions parse answers and skip race questions when not racing', () => {
  const body = STEPS.find((s) => s.key === 'body');
  assert.deepEqual(body.parse('182 cm, 89 kg'), { heightCm: 182, weightKg: 89 });
  assert.deepEqual(body.parse('Skip'), {});
  assert.equal(STEPS.find((s) => s.key === 'age').parse('abc'), undefined);
  const a = { name: 'C', age: 35, sex: 'male', body: {}, goal: 'Get fitter' };
  assert.equal(nextStep(a).key, 'experience', 'no race-goal question for general fitness');
  assert.equal(nextStep({ ...a, goal: 'Race a 10K' }).key, 'raceGoal');
  assert.equal(toAthlete({ ...a, raceGoal: 'Not yet' }).raceGoal, null);
});
