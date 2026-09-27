// The coach's tools. Each one runs the app's analysis code on the athlete's real data and
// returns facts (numbers, dates, comparisons). The model decides which to call and turns
// the facts into advice, so numbers are always computed, never invented.
//
// Pure module: no network, no model. createToolbox(data, state) → { definitions, run }.

import { analyse, hhmm, hm } from '../analysis/engine.js';
import { runsOf, compareRun, thirds, recovery, context, formTrend, FORM_GUIDE, summary, fmtPace } from '../analysis/runs.js';
import { AREAS, explainSymptom, activeSymptoms } from '../analysis/body.js';
import { currentVdot, paces, assessGoal, weekPlan, predictSeconds, fmtTime, DISTANCES } from '../analysis/plan.js';
import { last } from '../analysis/stats.js';

const round = (v, d = 1) => (Number.isFinite(v) ? +v.toFixed(d) : null);
const asleepOf = (s) => (s ? s.deepMin + s.lightMin + s.remMin : null);
const timeOf = (iso) => new Date(iso).toISOString().slice(11, 16);

export const TOOL_STATUS = {
  get_today: 'Checking today’s recovery',
  get_daily_metrics: 'Pulling your daily history',
  list_runs: 'Looking through your runs',
  analyse_run: 'Analysing the run in detail',
  running_form_trend: 'Checking how your running form has changed',
  check_symptom: 'Relating that to your running data',
  training_plan: 'Working out your plan and paces',
  set_goal: 'Saving your goal',
  compare_to_peers: 'Comparing you with your age group',
  personal_patterns: 'Looking for patterns in your habits',
  remember: 'Noting that for next time',
};

const DEFINITIONS = [
  {
    name: 'get_today',
    description: 'Today at a glance: readiness score and what drives it (HRV and resting HR vs personal baseline, sleep, sleep debt, training load), last night’s sleep, steps, stress, early-strain alert, this week’s running, active symptoms and the current goal. Call this first for any question about today, training decisions, or how the athlete is doing.',
    input_schema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'get_daily_metrics',
    description: 'Day-by-day history (oldest first) of sleep (asleep minutes, deep, REM, bedtime, wake), HRV, resting HR, steps, stress, SpO2 and weight. Use for trends, or to check a specific date.',
    input_schema: {
      type: 'object',
      properties: { days: { type: 'integer', minimum: 3, maximum: 120, description: 'How many recent days. Default 14.' } },
      additionalProperties: false,
    },
  },
  {
    name: 'list_runs',
    description: 'Recent runs, newest first: id, date, type, distance, pace, grade-adjusted pace, average HR, climbing, running form (cadence, stride, ground contact, vertical oscillation, vertical ratio, left/right balance), 1-minute HR recovery, and the athlete’s own tags and notes. Use to find a run or compare runs.',
    input_schema: {
      type: 'object',
      properties: { limit: { type: 'integer', minimum: 1, maximum: 40, description: 'Default 10.' } },
      additionalProperties: false,
    },
  },
  {
    name: 'analyse_run',
    description: 'Deep dive on one run: each metric vs the median of the previous 10 runs, form in the first/middle/last third (fade), heart-rate drift, 1-minute recovery ranked against all runs with the contributing reasons (e.g. a climb at the end), pre-run context (sleep, morning HRV, stress, days since last run, time of day), next-morning HRV, the athlete’s notes, and a 1-minute series of HR, pace, elevation and form.',
    input_schema: {
      type: 'object',
      properties: { run_id: { type: 'string', description: 'A run id from list_runs, or "latest".' } },
      required: ['run_id'],
      additionalProperties: false,
    },
  },
  {
    name: 'running_form_trend',
    description: 'How running form has changed: the last 3 runs vs the 6 before for balance, vertical oscillation, cadence, ground contact and vertical ratio, per-run values for the last 12 runs, and typical healthy ranges.',
    input_schema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'check_symptom',
    description: 'When the athlete reports pain, soreness, tiredness or illness: finds the changes in their running form, load, terrain and sleep that fit that body area, with before→after numbers, plus the red flags that need a physio or doctor. Also logs the symptom so their plan adapts.',
    input_schema: {
      type: 'object',
      properties: {
        area: { type: 'string', enum: Object.keys(AREAS) },
        severity: { type: 'string', enum: ['mild', 'moderate', 'severe'] },
        description: { type: 'string', description: 'The athlete’s own words.' },
      },
      required: ['area', 'severity'],
      additionalProperties: false,
    },
  },
  {
    name: 'training_plan',
    description: 'Current fitness as VDOT (from watch VO2max and recent runs), predicted race times, goal feasibility, training paces with heart-rate ranges, periodisation (weeks of base/build/peak/taper and weekly km), and a computed 7-day plan already adapted to readiness and active symptoms. Use for anything about goals, plans, paces or what to do this week. Adjust the sessions to the athlete’s available days and preferences.',
    input_schema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'set_goal',
    description: 'Save a race goal when the athlete states one (distance, target time, date). Then call training_plan.',
    input_schema: {
      type: 'object',
      properties: {
        distance_m: { type: 'integer', enum: [5000, 10000, 21097, 42195] },
        target_time: { type: 'string', description: 'mm:ss or h:mm:ss' },
        race_date: { type: 'string', description: 'YYYY-MM-DD, in the future' },
      },
      required: ['distance_m', 'target_time', 'race_date'],
      additionalProperties: false,
    },
  },
  {
    name: 'compare_to_peers',
    description: 'Percentiles vs people of the same age and sex for VO2max, resting HR, HRV, sleep and steps, plus fitness age.',
    input_schema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'personal_patterns',
    description: 'Statistically tested cause-and-effect patterns from the athlete’s own data (e.g. late workouts → less deep sleep), each with effect size and evidence.',
    input_schema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'remember',
    description: 'Save a durable fact about the athlete that should shape future coaching (an injury history, a schedule constraint, a preference, a race they entered). Not for passing remarks.',
    input_schema: {
      type: 'object',
      properties: { fact: { type: 'string', maxLength: 200 } },
      required: ['fact'],
      additionalProperties: false,
    },
  },
];

// Tool inputs are model output: check them before use.
function validate(name, input) {
  const def = DEFINITIONS.find((d) => d.name === name);
  if (!def) return `Unknown tool ${name}`;
  if (!input || typeof input !== 'object' || Array.isArray(input)) return 'Input must be an object';
  const { properties = {}, required = [] } = def.input_schema;
  for (const k of required) if (input[k] === undefined) return `Missing ${k}`;
  for (const [k, v] of Object.entries(input)) {
    const p = properties[k];
    if (!p) return `Unexpected field ${k}`;
    if (p.type === 'integer' && (!Number.isInteger(v) || (p.minimum != null && v < p.minimum) || (p.maximum != null && v > p.maximum))) return `${k} must be an integer in range`;
    if (p.type === 'string' && typeof v !== 'string') return `${k} must be a string`;
    if (p.enum && !p.enum.includes(v)) return `${k} must be one of ${p.enum.join(', ')}`;
    if (p.maxLength && v.length > p.maxLength) return `${k} is too long`;
  }
  return null;
}

const runBrief = (w, notes) => {
  const s = summary(w);
  return {
    id: w.id, date: w.start.slice(0, 10), start: timeOf(w.start), type: w.type,
    km: round(w.distanceM / 1000, 2), duration_min: Math.round(w.durationS / 60),
    pace: fmtPace(s.pace), grade_adjusted_pace: fmtPace(s.gap), avg_hr: w.avgHr, max_hr: w.maxHr, climb_m: w.elevationM ?? 0,
    form: w.dynamics ?? null,
    hr_recovery_60s: Number.isFinite(s.hrr60) ? s.hrr60 : null,
    notes: notes[w.id] ?? null,
  };
};

export function createToolbox(data, state = {}) {
  const A = analyse(data);
  const runs = runsOf(data);
  const notes = state.runNotes ?? {};
  let goal = state.goal;
  const symptoms = () => activeSymptoms((state.symptoms ?? []).filter((x) => !x.resolved), data.today);
  const events = [];

  function planFacts() {
    const v = currentVdot(data, A.training);
    const g = goal ? assessGoal(goal, v.vdot, data.today) : null;
    const ft = formTrend(runs);
    const formIssue = !!ft && (Math.abs(ft.balanceL.now - 50) > 1.2 || ft.voCm.now > 9.5 || ft.cadence.now < 165);
    const plan = goal ? weekPlan({ data, training: A.training, readiness: A.readiness, goal, vdot: v.vdot, symptoms: symptoms(), form: formIssue }) : null;
    return {
      fitness: { vdot: v.vdot, watch_vo2max: v.watch, vo2max_from_recent_runs: v.runEst },
      predictions: Object.fromEntries(Object.entries(DISTANCES).map(([m, l]) => [l, fmtTime(predictSeconds(v.vdot, +m))])),
      goal: goal ? {
        distance: DISTANCES[goal.distance], target: fmtTime(goal.targetS), date: goal.date, is_default_suggestion: !!goal.isDefault,
        weeks_away: g.weeks, vdot_needed: g.need, vdot_gap: g.gap, needed_per_week: round(g.perWeek, 2),
        verdict: g.label, predicted_today: fmtTime(g.predicted), realistic_by_race_day: fmtTime(g.reachable),
      } : 'No goal set. Ask the athlete for one.',
      paces: paces(v.vdot, A.training.maxHeart, A.training.restHr).map((p) => ({ zone: p.label, pace: p.range, hr: p.hr, use: p.use })),
      periodisation: plan && { current_phase: plan.phase, phases: plan.phases, weekly_km_by_week: plan.volume.map((x) => Math.round(x)) },
      this_week: plan && plan.days.map((d) => ({ date: d.date, day: d.dow, session: d.title, detail: d.detail, adapted_for: d.adjusted ?? null })),
      form_issue_flagged: formIssue,
      rules: 'Weekly km +≤8–10%, deload every 4th week, ~80% easy. Sessions are a computed template; fit them to the athlete’s available days.',
    };
  }

  const impl = {
    get_today() {
      const t = A.today, r = A.readiness, s = A.sleep, n = s.last, sl = s.lastDay?.sleep;
      return {
        date: data.today,
        readiness: { score: r.score, state: r.state.label, drivers: r.parts.map((p) => ({ factor: p.label, detail: p.detail, effect: p.impact > 0.05 ? 'helping' : p.impact < -0.05 ? 'holding back' : 'neutral' })) },
        early_strain_alert: r.strainAlert,
        hrv: { today: t.hrv, usual: Math.round(r.hrvBaseline.typical), normal_range: [Math.round(Math.exp(r.hrvBaseline.mean - r.hrvBaseline.sd)), Math.round(Math.exp(r.hrvBaseline.mean + r.hrvBaseline.sd))] },
        resting_hr: { today: t.rhr, usual: Math.round(r.rhrBaseline.typical) },
        last_night: sl && {
          asleep: hm(n.asleepMin), bed: timeOf(sl.bed), wake: timeOf(sl.wake), efficiency_pct: Math.round(n.efficiency * 100),
          deep_min: sl.deepMin, rem_min: sl.remMin, awake_min: sl.awakeMin, score: s.score, lowest_spo2: sl.spo2Min ?? null,
        },
        sleep: { need: hm(s.needMin), debt_14_nights: hm(s.debtMin), regularity_score: s.regularity.score, weekend_shift_min: Math.round(s.regularity.socialJetLag), suggested_lights_out: hhmm(s.bedtimeTarget) },
        steps: t.steps, stress: t.stress,
        training_load: { acute_chronic_ratio: round(A.training.acwr, 2), sweet_spot: '0.8–1.3', run_km_this_week: round(A.training.weeks.at(-1).km), run_km_by_week_last_8: A.training.weeks.map((w) => round(w.km)), easy_hr_ceiling: A.training.z2Ceiling, intensity_last_4_weeks: { easy: round(A.training.distribution.easy, 2), moderate: round(A.training.distribution.moderate, 2), hard: round(A.training.distribution.hard, 2) } },
        latest_run: runs.length ? runBrief(runs.at(-1), notes) : null,
        active_symptoms: symptoms(),
        goal: goal ? `${DISTANCES[goal.distance]} in ${fmtTime(goal.targetS)} on ${goal.date}${goal.isDefault ? ' (suggested default, not confirmed by athlete)' : ''}` : null,
        weight_trend: A.weight && { trend_kg: round(A.weight.trend), per_week_kg: round(A.weight.perWeek, 2), watch_reported_deficit_kcal: data.reportedDeficitKcal ?? null },
      };
    },
    get_daily_metrics({ days = 14 } = {}) {
      return last(data.days, days).map((d) => ({
        date: d.date, asleep_min: asleepOf(d.sleep), deep_min: d.sleep?.deepMin ?? null, rem_min: d.sleep?.remMin ?? null,
        bed: d.sleep ? timeOf(d.sleep.bed) : null, wake: d.sleep ? timeOf(d.sleep.wake) : null,
        hrv: d.hrv ?? null, rhr: d.rhr ?? null, steps: d.steps, stress: d.stress ?? null, spo2: d.spo2 ?? null, weight: d.weight ?? null,
      }));
    },
    list_runs({ limit = 10 } = {}) {
      return [...runs].reverse().slice(0, limit).map((w) => runBrief(w, notes));
    },
    analyse_run({ run_id }) {
      const run = run_id === 'latest' ? runs.at(-1) : runs.find((r) => r.id === run_id);
      if (!run) return { error: `No run with id ${run_id}. Call list_runs to find the id.` };
      const th = thirds(run);
      return {
        run: runBrief(run, notes),
        vs_previous_10_runs: compareRun(run, runs).map((m) => ({ metric: m.label, value: round(m.value, 2), usual: round(m.typical, 2), unit: m.unit, verdict: m.tone === 'up' ? 'better' : m.tone === 'down' ? 'worse' : 'similar' })),
        form_by_third: th && { cadence: th.cadence.map(Math.round), vertical_oscillation_cm: th.vo.map((v) => round(v)), balance_left_pct: th.bal.map((v) => round(v)), ground_contact_ms: th.gct.map(Math.round), hr: th.hr.map(Math.round), pace: th.pace.map(fmtPace), hr_drift_pct: round(th.drift * 100) },
        recovery: (() => {
          const rec = recovery(run, runs, data);
          return rec && { hr_end: rec.hrEnd, hr_after_60s: rec.hr60, hr_after_120s: rec.hr120, drop_60s: rec.drop, usual_drop: rec.typicalDrop, verdict: rec.verdict, rank: `${rec.rank} of ${rec.of} (1 = fastest)`, contributing_factors: rec.reasons.map((x) => x.text), like_for_like: rec.likeForLike?.text ?? null, next_morning: rec.nextMorning && { hrv: rec.nextMorning.hrv, vs_normal_pct: Math.round(rec.nextMorning.pct * 100), rhr: rec.nextMorning.rhr } };
        })(),
        context_before_run: context(run, data, notes).items.map((c) => `${c.label}: ${c.value}`),
        series_per_minute: run.series?.filter((_, i) => i % 2 === 0).map((p) => ({ min: Math.round(p.t / 60), hr: p.hr, pace: fmtPace(p.pace), elev_m: Math.round(p.elev), cadence: p.cadence, vo_cm: p.vo, gct_ms: p.gct, bal_l: p.bal })) ?? null,
      };
    },
    running_form_trend() {
      const ft = formTrend(runs);
      if (!ft) return { error: 'Not enough runs with running-form data yet.' };
      return {
        last_3_vs_previous_6: Object.fromEntries(Object.entries(ft).map(([k, v]) => [k, { before: round(v.before, 2), now: round(v.now, 2), change: round(v.delta, 2) }])),
        per_run: runs.filter((r) => r.dynamics).slice(-12).map((r) => ({ date: r.start.slice(0, 10), type: r.type, ...r.dynamics })),
        healthy_ranges: Object.fromEntries(Object.entries(FORM_GUIDE).map(([k, v]) => [k, `${v.good[0]}–${v.good[1]}: ${v.note}`])),
      };
    },
    check_symptom({ area, severity, description = '' }) {
      const x = explainSymptom(area, data, A.training, A.sleep, severity);
      const entry = { id: `${Date.now()}`, date: data.today, text: description, areas: [area], severity };
      state.symptoms = [...(state.symptoms ?? []), entry];
      events.push({ name: 'log_symptom', data: entry });
      return {
        area: x.label, severity,
        evidence_from_running: x.findings.map((f) => ({ metric: f.metric, before: f.from, now: f.to, finding: f.title, mechanism: f.why })),
        cause_vs_effect: x.caveat,
        red_flags_needing_a_clinician: x.redFlags,
        standard_actions: x.actions,
        note: 'Logged. The training plan now adapts for this for 7 days.',
      };
    },
    training_plan() {
      return planFacts();
    },
    set_goal({ distance_m, target_time, race_date }) {
      const secs = target_time.split(':').map(Number).reduce((a, x) => a * 60 + x, 0);
      if (!Number.isFinite(secs) || secs < 600) return { error: 'target_time must look like 49:30 or 1:45:00' };
      if (!/^\d{4}-\d{2}-\d{2}$/.test(race_date) || race_date <= data.today) return { error: 'race_date must be a future YYYY-MM-DD' };
      goal = { distance: distance_m, targetS: secs, date: race_date };
      events.push({ name: 'save_goal', data: goal });
      return { saved: `${DISTANCES[distance_m]} in ${fmtTime(secs)} on ${race_date}` };
    },
    compare_to_peers() {
      const c = A.compare;
      return { cohort: c.cohort, fitness_age: c.fitnessAge, actual_age: data.profile.age, metrics: c.rows.map((r) => ({ metric: r.label, value: `${r.value} ${r.unit}`.trim(), cohort_median: r.median, better_than_pct_of_peers: r.pct })), vo2max_change_60_days: round(c.vo2Trend), note: 'Wrist-based estimates; percentiles are approximate.' };
    },
    personal_patterns() {
      return { nights_analysed: A.patterns.nights, patterns: A.patterns.all.slice(0, 8).map((p) => ({ finding: p.headline, change: p.relText, evidence: p.evidence, good_for_you: p.better })) };
    },
    remember({ fact }) {
      events.push({ name: 'remember', data: fact.trim() });
      return { saved: true };
    },
  };

  return {
    definitions: DEFINITIONS,
    run(name, input) {
      const problem = validate(name, input);
      if (problem) return { isError: true, content: JSON.stringify({ error: problem }) };
      try {
        return { isError: false, content: JSON.stringify(impl[name](input)) };
      } catch (err) {
        return { isError: true, content: JSON.stringify({ error: `Tool failed: ${err.message}` }) };
      }
    },
    events,
  };
}

