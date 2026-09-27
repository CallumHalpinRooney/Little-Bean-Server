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
