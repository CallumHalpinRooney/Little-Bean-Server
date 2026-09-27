// The normalised data shape every source (demo, Huawei Health Kit, file import) must
// produce. Keeping it explicit means a new watch or API only needs an adapter.
//
// {
//   source: 'demo' | 'huawei' | 'import',
//   device: { model, battery?, lastSync },
//   profile: { name, age, sex: 'male'|'female', heightCm, weightKg, sleepNeedH },
//   today: 'YYYY-MM-DD',
//   reportedDeficitKcal?: number,        // the watch's own calorie-deficit claim, if any
//   days: [{
//     date: 'YYYY-MM-DD',
//     sleep: { bed: ISO, wake: ISO, deepMin, lightMin, remMin, awakeMin,
//              stages: [{ s: 'deep'|'light'|'rem'|'awake', min }], spo2Min?, breathingRate? } | null,
//     rhr, hrv?, steps, stress, spo2?, skinTemp?, weight?, activeKcal?
//   }],                                   // oldest → newest, one per calendar day
//   workouts: [{ id, type, start: ISO, durationS, distanceM, avgHr, maxHr, kcal, zones: [s×5] }],
//   vo2max: [{ date, value }],
//   hrToday: [{ t: minutesSinceMidnight, bpm }],
//   checks: [{ kind: 'ecg'|'pwa'|'arterial', at: ISO, result, detail }]
// }

export function validate(d) {
  const p = [];
  if (!d || typeof d !== 'object') return ['not an object'];
  if (!Array.isArray(d.days) || d.days.length < 14) p.push('need at least 14 days of data');
  if (!d.profile?.age) p.push('profile.age missing');
  if (!Array.isArray(d.workouts)) p.push('workouts must be an array');
  if (!Array.isArray(d.vo2max)) p.push('vo2max must be an array');
  (d.days ?? []).slice(-14).forEach((day, i) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day.date)) p.push(`days[${i}].date invalid`);
    if (day.rhr != null && !Number.isFinite(day.rhr)) p.push(`days[${i}].rhr must be a number`);
    if (day.sleep && !Array.isArray(day.sleep.stages)) p.push(`days[${i}].sleep.stages missing`);
  });
  return p;
}
