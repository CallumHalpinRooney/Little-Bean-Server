// Where the data comes from. Priority: live Huawei Health Kit sync (via our server) →
// an imported file → the built-in demo. The profile and experiments are stored locally.

import { buildDemo } from './demo.js';
import { validate } from './schema.js';

const K = { profile: 'meridian.profile', data: 'meridian.imported', exps: 'meridian.experiments', source: 'meridian.source' };

const read = (k, fallback = null) => {
  try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
};
const write = (k, v) => {
  try { v === null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ }
};

export async function serverStatus() {
  try {
    const r = await fetch('api/status', { cache: 'no-store' });
    return r.ok ? await r.json() : { server: false };
  } catch {
    return { server: false };
  }
}

export async function loadData() {
  const pref = read(K.source, 'auto');
  let data = null;

  if (pref !== 'demo') {
    const status = await serverStatus();
    if (status.huawei?.connected) {
      try {
        const r = await fetch('api/huawei/data?days=120', { cache: 'no-store' });
        if (r.ok) data = await r.json();
      } catch { /* fall through to other sources */ }
    }
    if (!data) data = read(K.data);
  }
  if (!data) data = buildDemo();

  const problems = validate(data);
  if (problems.length) {
    console.warn('Data failed validation, using demo instead:', problems);
    data = buildDemo();
  }

  const saved = read(K.profile);
  if (saved) data.profile = { ...data.profile, ...saved, isDefault: false };
  return data;
}

export const saveProfile = (p) => write(K.profile, p);
export const setSource = (s) => write(K.source, s);

export function importFile(json) {
  const problems = validate(json);
  if (problems.length) throw new Error(problems.slice(0, 3).join('; '));
  write(K.data, json);
  write(K.source, 'auto');
}
export const clearImport = () => write(K.data, null);

// Seed one running experiment for the demo so the section never starts empty.
export const getExperiments = () => read(K.exps, [{ templateId: 'bed2330', startDate: '2026-09-14', lengthDays: 14 }]);
export const saveExperiments = (list) => write(K.exps, list);

// Per-run notes and tags, keyed by workout id: { [id]: { tags: [], text } }.
export const getRunNotes = () => read('meridian.runNotes', {});
export const saveRunNotes = (n) => write('meridian.runNotes', n);

// Body check-ins: [{ id, date, text, areas: [], severity: 'mild'|'moderate'|'severe', resolved? }].
export const getSymptoms = () => read('meridian.symptoms', []);
export const saveSymptoms = (s) => write('meridian.symptoms', s);

// Race goal. The default gives the plan something sensible to show before you set your own.
export const getGoal = (today) => read('meridian.goal', null) ?? {
  distance: 10000, targetS: 50 * 60,
  date: new Date(new Date(`${today}T12:00:00`).getTime() + 11 * 7 * 864e5).toISOString().slice(0, 10),
  isDefault: true,
};
export const saveGoal = (g) => write('meridian.goal', g);
