// Setup questions. Asked one at a time in the chat so the coach can tailor every answer:
// profile numbers set heart-rate zones and peer norms; goals, time and history shape plans;
// tone and detail shape how the coach talks.

const num = (text, re) => {
  const m = String(text).match(re);
  return m ? +m[1] : null;
};

export const STEPS = [
  { key: 'name', q: 'Hi, I’m your coach. I’ll work from everything your watch records, plus a few answers from you. First, what should I call you?', input: 'text', placeholder: 'Your first name' },
  { key: 'age', q: (a) => `Good to meet you, ${a.name}. How old are you?`, input: 'number', placeholder: 'Age',
    parse: (t) => { const n = parseInt(t, 10); return n >= 14 && n <= 95 ? n : undefined; }, invalid: 'Just the number, e.g. 35.' },
  { key: 'sex', q: 'For heart-rate zones and comparing you with people like you: male or female?', chips: ['Male', 'Female'], parse: (t) => (/^f/i.test(t) ? 'female' : /^m/i.test(t) ? 'male' : undefined), invalid: 'Tap one of the options.' },
  { key: 'body', q: 'Height and weight? For example “182 cm, 89 kg”. Skip if you’d rather not.', input: 'text', chips: ['Skip'], optional: true,
    parse: (t) => (/^skip$/i.test(t.trim()) ? {} : {
      heightCm: num(t, /(\d{3})\s*cm/i) ?? num(t, /\b(1[4-9]\d|2[0-2]\d)\b/),
      weightKg: num(t, /(\d{2,3}(?:\.\d)?)\s*kg/i) ?? num(t, /\b([4-9]\d(?:\.\d)?|1[0-4]\d(?:\.\d)?)\b(?!\s*cm)/),
    }) },
  { key: 'goal', q: 'What’s the main thing you want from your running right now?', chips: ['Race a 5K', 'Race a 10K', 'Half marathon', 'Marathon', 'Get fitter', 'Lose weight', 'Stay healthy'], input: 'text', placeholder: 'Or tell me in your own words' },
  { key: 'raceGoal', when: (a) => /5k|10k|half|marathon|race/i.test(a.goal ?? ''), q: 'Do you have a target time and a race date? For example “sub-50 on 13 December”.', input: 'text', chips: ['Not yet'] },
  { key: 'experience', q: 'How long have you been running?', chips: ['Under 6 months', '6–24 months', '2–5 years', '5+ years', 'Coming back after a break'] },
  { key: 'days', q: 'How many days a week can you realistically train?', chips: ['2', '3', '4', '5', '6'] },
  { key: 'longDay', q: 'Which day suits a longer run?', chips: ['Saturday', 'Sunday', 'A weekday', 'Flexible'] },
  { key: 'injuries', q: 'Any injuries, niggles or health conditions I should know about, now or in the past?', chips: ['None'], input: 'text', placeholder: 'e.g. sore lower back, old knee injury' },
  { key: 'otherSports', q: 'Anything else you do that I should plan around?', chips: ['Golf', 'Gym', 'Cycling', 'Football', 'Nothing else'], input: 'text', placeholder: 'Or type it' },
  { key: 'style', q: 'How do you want me to coach you?', chips: ['Straight-talking, push me', 'Balanced', 'Encouraging'] },
  { key: 'detail', q: 'Last one. How much detail do you want?', chips: ['Just tell me what to do', 'Explain the why', 'Give me all the numbers'] },
];

export const nextStep = (answers) => STEPS.find((s) => !(s.key in answers) && (!s.when || s.when(answers)));
export const questionText = (step, answers) => (typeof step.q === 'function' ? step.q(answers) : step.q);

// Turn raw answers into the athlete profile the coach receives.
export function toAthlete(ans) {
  const body = ans.body ?? {};
  return {
    name: ans.name, age: ans.age, sex: ans.sex,
    heightCm: body.heightCm ?? null, weightKg: body.weightKg ?? null,
    goal: ans.goal, raceGoal: ans.raceGoal && !/^not yet$/i.test(ans.raceGoal) ? ans.raceGoal : null,
    experience: ans.experience, days: ans.days, longDay: ans.longDay,
    injuries: ans.injuries, otherSports: ans.otherSports, style: ans.style, detail: ans.detail,
    facts: ans.facts ?? [],
  };
}
