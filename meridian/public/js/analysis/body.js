// Body check-in: you say how you feel ("sore back", "tight calves") and the engine looks for
// the running data that fits, explains why, and says what to do. Watch data can show *how*
// your running changed. It can't diagnose, and it can't tell cause from effect: pain changes
// how you run, and how you run can cause pain. The output says so.

import { mean } from './stats.js';
import { runsOf, formTrend, thirds } from './runs.js';

export const AREAS = {
  back: { label: 'Sore back', phrase: 'a sore back', words: ['back', 'lumbar', 'spine', 'sciatic', 'si joint'] },
  knee: { label: 'Knee pain', phrase: 'knee pain', words: ['knee', 'patella', 'itb', 'it band'] },
  hip: { label: 'Hip pain', phrase: 'hip pain', words: ['hip', 'glute', 'groin', 'piriformis'] },
  calf: { label: 'Calf / Achilles', phrase: 'calf or Achilles trouble', words: ['calf', 'calves', 'achilles', 'soleus'] },
  shin: { label: 'Shin pain', phrase: 'shin pain', words: ['shin', 'tibia'] },
  foot: { label: 'Foot / heel', phrase: 'foot or heel pain', words: ['foot', 'feet', 'heel', 'plantar', 'arch', 'toe'] },
  hamstring: { label: 'Hamstring', phrase: 'a hamstring problem', words: ['hamstring', 'back of thigh'] },
  fatigue: { label: 'Tired / heavy legs', phrase: 'heavy, tired legs', words: ['tired', 'fatigue', 'heavy', 'exhausted', 'drained', 'no energy', 'flat'] },
  ill: { label: 'Feeling ill', phrase: 'feeling ill', words: ['ill', 'sick', 'cold', 'flu', 'fever', 'sore throat', 'covid', 'chest'] },
};

export function parseSymptoms(text) {
  const t = ` ${String(text).toLowerCase()} `;
  // Check longer phrases first so "back of thigh" isn't read as a back problem.
  if (t.includes('back of thigh')) return ['hamstring'];
  return Object.entries(AREAS).filter(([, a]) => a.words.some((w) => t.includes(w))).map(([k]) => k);
}

const f1 = (v) => v.toFixed(1);

// Gather every signal once; area rules pick what's relevant.
function evidence(data, training, sleep) {
  const runs = runsOf(data);
  const ft = formTrend(runs);
  const recent = runs.slice(-3), before = runs.slice(-9, -3);
  const fade = (rs) => mean(rs.map((r) => thirds(r)?.voFade).filter(Number.isFinite));
  const climbPerKm = (rs) => mean(rs.map((r) => (r.elevationM ?? 0) / (r.distanceM / 1000)));
  const w = training.weeks;
  const km2 = w.slice(-2).reduce((a, x) => a + x.km, 0) / 2, kmPrev = w.slice(-6, -2).reduce((a, x) => a + x.km, 0) / 4;
  return {
    runs, ft, recent, before,
    fadeNow: fade(recent), fadeBefore: fade(before),
    climbNow: climbPerKm(recent), climbBefore: climbPerKm(before),
    km2, kmPrev, acwr: training.acwr, hardShare: training.distribution.hard,
    debt: sleep.debtMin, since: ft ? new Date(`${ft.balanceL.since}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '',
  };
}

// Reusable findings. Each returns null when the data doesn't support it.
const F = {
  balance: (e) => e.ft && Math.abs(e.ft.balanceL.now - 50) - Math.abs(e.ft.balanceL.before - 50) >= 1 && {
    metric: 'Left / right balance', from: `${f1(e.ft.balanceL.before)}% L`, to: `${f1(e.ft.balanceL.now)}% L`,
    title: `You’re favouring your ${e.ft.balanceL.now > 50 ? 'left' : 'right'} side`,
    why: `Since ${e.since}, ${f1(e.ft.balanceL.now)}% of your ground contact is on the ${e.ft.balanceL.now > 50 ? 'left' : 'right'} foot, up from ${f1(e.ft.balanceL.before)}%. A shift this size is a classic sign of protecting one side, often the opposite side of the lower back or pelvis.`,
    strength: Math.abs(e.ft.balanceL.delta) * 1.5,
  },
  bounce: (e) => e.ft && e.ft.voCm.delta >= 0.5 && {
    metric: 'Vertical oscillation', from: `${f1(e.ft.voCm.before)} cm`, to: `${f1(e.ft.voCm.now)} cm`,
    title: 'You’re bouncing more',
    why: `Each stride now lifts you ${f1(e.ft.voCm.delta)} cm more. More vertical travel means a harder landing, and that impact goes through your spine about 160 times a minute.`,
    strength: e.ft.voCm.delta,
  },
  cadence: (e) => e.ft && e.ft.cadence.delta <= -3 && {
    metric: 'Cadence', from: `${Math.round(e.ft.cadence.before)} spm`, to: `${Math.round(e.ft.cadence.now)} spm`,
    title: 'Fewer, longer steps',
    why: `Cadence dropped ${Math.round(-e.ft.cadence.delta)} steps/min. Lower cadence usually means reaching out in front (overstriding), which brakes each step and loads the joints and lower back.`,
    strength: -e.ft.cadence.delta / 3,
  },
  contact: (e) => e.ft && e.ft.gctMs.delta >= 10 && {
    metric: 'Ground contact', from: `${Math.round(e.ft.gctMs.before)} ms`, to: `${Math.round(e.ft.gctMs.now)} ms`,
    title: 'Slower, stiffer steps',
    why: `Your feet stay on the ground ${Math.round(e.ft.gctMs.delta)} ms longer each step. That usually shows stiffness or pain: the stride has lost its spring.`,
    strength: e.ft.gctMs.delta / 10,
  },
  fade: (e) => Number.isFinite(e.fadeNow) && e.fadeNow - e.fadeBefore >= 0.3 && {
    metric: 'Late-run form', from: `+${f1(e.fadeBefore)} cm`, to: `+${f1(e.fadeNow)} cm`,
    title: 'Form falls apart late in runs',
    why: `In the last third of your recent runs, bounce rises ${f1(e.fadeNow)} cm (it used to be ${f1(e.fadeBefore)} cm). That’s your core and glutes tiring, and the lower back taking over as stabiliser.`,
    strength: (e.fadeNow - e.fadeBefore) * 2,
  },
  hills: (e) => e.climbNow > 18 && e.climbNow > e.climbBefore * 1.3 && {
    metric: 'Climbing', from: `${Math.round(e.climbBefore)} m/km`, to: `${Math.round(e.climbNow)} m/km`,
    title: 'More hills and trail',
    why: 'Your recent runs are much hillier. Steep downhills in particular increase braking forces and arch the lower back.',
    strength: 1,
  },
  spike: (e) => e.acwr > 1.3 && {
    metric: 'Training load', from: '1.0×', to: `${e.acwr.toFixed(1)}×`,
    title: 'Load jumped',
    why: `Your last week was ${e.acwr.toFixed(1)}× your 4-week average. Tissues adapt more slowly than fitness, and spikes above 1.3× are when most running injuries start.`,
    strength: (e.acwr - 1.3) * 5,
  },
  notLoad: (e) => e.acwr < 1 && e.kmPrev > 0 && e.km2 < e.kmPrev && {
    metric: 'Training load', from: `${f1(e.kmPrev)} km/wk`, to: `${f1(e.km2)} km/wk`,
    title: 'Not caused by too much running',
    why: 'Your running volume has gone down, not up, so simple overload is unlikely. How you are running matters more here than how much.',
    strength: 0.5, neutral: true,
  },
  speed: (e) => e.hardShare > 0.3 && {
    metric: 'Hard running', from: '≈20%', to: `${Math.round(e.hardShare * 100)}%`,
    title: 'Lots of fast running',
    why: `${Math.round(e.hardShare * 100)}% of your running is in zones 4–5. Fast running loads calves, Achilles and hamstrings much more than easy running.`,
    strength: e.hardShare * 3,
  },
  sleepDebt: (e) => e.debt > 180 && {
    metric: 'Sleep debt', from: '0', to: `${Math.floor(e.debt / 60)}h ${Math.round(e.debt % 60)}m`,
    title: 'Recovery is running behind',
    why: 'Much of tissue repair happens in deep sleep. With this much debt, niggles take longer to settle.',
    strength: 0.6, context: true,
  },
};

const RULES = {
  back: {
    checks: ['balance', 'bounce', 'fade', 'cadence', 'contact', 'hills', 'spike', 'notLoad', 'sleepDebt'],
    actions: [
      'Run flat and easy only for the next 7 days. Pain up to 3/10 during a run is OK if it’s no worse the next morning.',
      'Take shorter, quicker steps: aim for about 5% more cadence. It softens every landing and lowers bounce.',
      'Daily, 10 minutes: curl-ups, side planks and bird-dogs (McGill’s “big 3”), 3 rounds.',
      'Three times a week: glute bridges and single-leg Romanian deadlifts, working your weaker side first.',
      'Skip steep downhills until it settles, and walk for 5 minutes after runs rather than sitting straight down.',
    ],
    redFlags: ['Pain spreading below the knee, numbness, tingling or weakness in a leg', 'Changes in bladder or bowel control, or numbness around the groin: urgent, same day', 'Pain at night that doesn’t ease with rest, fever, or unexplained weight loss', 'Pain that started after a fall or impact'],
  },
  knee: {
    checks: ['cadence', 'bounce', 'balance', 'hills', 'spike', 'notLoad', 'fade'],
    actions: ['Raise cadence 5–7%: the single best-evidenced change for runner’s knee.', 'Avoid downhills and stairs-heavy routes for 2 weeks.', 'Strengthen hips and quads: side-lying leg raises, step-downs, wall sits, 3×/week.', 'Reduce run length by a third until it’s pain-free, then build back 10% a week.'],
    redFlags: ['Swelling, locking or the knee giving way', 'Pain after a twist or impact', 'Unable to take weight'],
  },
  hip: {
    checks: ['balance', 'fade', 'cadence', 'hills', 'spike', 'notLoad'],
    actions: ['Strengthen glute med: side planks with leg lift, banded crab walks, single-leg squats.', 'Keep runs flat and easy, and shorten your stride.', 'Pay attention to your weaker side: do an extra set on it.'],
    redFlags: ['Deep groin pain that worsens with running (possible stress fracture)', 'Pain at night or at rest'],
  },
  calf: {
    checks: ['speed', 'hills', 'spike', 'contact', 'balance', 'notLoad'],
    actions: ['Pause hill and interval sessions, easy flat running only.', 'Slow heel-raises daily (straight and bent knee), 3 × 15, building to single-leg.', 'Keep the drop in your shoes the same. Don’t switch to minimal shoes now.'],
    redFlags: ['Sudden sharp pain or a “kick” sensation at the back of the heel', 'Swelling, heat or redness in the calf (possible clot, urgent if you also have breathlessness)'],
  },
  shin: {
    checks: ['spike', 'cadence', 'bounce', 'contact', 'notLoad'],
    actions: ['Cut volume by 30–50% for a week. Run on softer surfaces if you can.', 'Raise cadence slightly to reduce impact.', 'Calf and tibialis strength: heel raises and toe raises, 3 × 15.'],
    redFlags: ['A tender spot on the bone you can point to with one finger (possible stress fracture)', 'Pain when walking or at rest'],
  },
  foot: {
    checks: ['spike', 'contact', 'balance', 'hills', 'notLoad'],
    actions: ['Reduce running volume and avoid barefoot walking on hard floors.', 'Calf stretching and towel scrunches daily; roll the arch on a ball.', 'Check your shoes’ mileage (replace after 600–800 km).'],
    redFlags: ['Pain on the top of the foot that’s worse with each step (possible stress fracture)', 'Numbness in the toes'],
  },
  hamstring: {
    checks: ['speed', 'fade', 'spike', 'notLoad'],
    actions: ['No sprints or strides for 2 weeks.', 'Nordic hamstring curls (eccentric) twice a week, starting with 2 × 5.', 'Easy running only while it settles.'],
    redFlags: ['A sudden pop or bruising at the back of the thigh'],
  },
  fatigue: {
    checks: ['sleepDebt', 'spike', 'speed', 'notLoad'],
    actions: ['Swap the next hard session for an easy run or rest.', 'Prioritise 8 hours in bed for 3 nights.', 'Check that you’re eating enough on training days, especially carbohydrate.'],
    redFlags: ['Fatigue for more than 2 weeks despite rest', 'Breathlessness, chest pain or palpitations when exercising'],
  },
  ill: {
    checks: [],
    actions: ['“Neck check”: symptoms only above the neck (runny nose, mild sore throat) → an easy 20–30 min is usually fine.', 'Symptoms below the neck (chest, fever, body aches) → no training until 24 h after they’ve gone.', 'Come back with 2–3 easy days before any hard session.'],
    redFlags: ['Chest pain, palpitations or breathlessness: never train through these', 'Fever for more than 3 days'],
  },
};

export function explainSymptom(area, data, training, sleep, severity = 'mild') {
  const rule = RULES[area];
  if (!rule) return null;
  const e = evidence(data, training, sleep);
  const findings = rule.checks.map((k) => F[k](e)).filter(Boolean).sort((a, b) => Number(!!(a.neutral || a.context)) - Number(!!(b.neutral || b.context)) || b.strength - a.strength);
  const strong = findings.filter((f) => !f.neutral && !f.context);
  const summary = strong.length
    ? `${strong.length} change${strong.length > 1 ? 's' : ''} in your running ${strong.length > 1 ? 'are' : 'is'} consistent with ${AREAS[area].phrase}. The biggest: ${strong[0].title.charAt(0).toLowerCase() + strong[0].title.slice(1)}.`
    : area === 'ill' ? 'Illness is about symptoms, not running form. Follow the neck check below.'
      : 'Your running data looks normal, so this may come from outside running (sitting, lifting, sleep position) or be too new to show up yet.';
  return {
    area, label: AREAS[area].label, severity, summary,
    findings: [...strong.slice(0, 5), ...findings.filter((f) => f.neutral || f.context)],
    caveat: 'Pain changes how you run, and how you run can cause pain. Your watch can show the change, but not which came first. Either way, fixing the pattern helps.',
    actions: severity === 'severe' ? ['Stop running until you’ve been assessed. Severe pain needs a physio or doctor, not a plan.', ...rule.actions.slice(2)] : rule.actions,
    redFlags: rule.redFlags,
  };
}

// Symptoms reported in the last 7 days, most recent first; used to adapt the training plan.
export const activeSymptoms = (list, today) => list
  .filter((s) => (new Date(`${today}T12:00:00`) - new Date(`${s.date}T12:00:00`)) / 864e5 <= 7)
  .sort((a, b) => (a.date < b.date ? 1 : -1));
