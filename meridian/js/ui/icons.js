// Stroke icons drawn to a 24px grid, matching the weight of SF Symbols "regular".
const s = (d, extra = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${d}</svg>`;

export const icons = {
  today: s('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'),
  sleep: s('<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z"/>'),
  heart: s('<path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.3a4.3 4.3 0 0 1 7.5 2.5C19.5 15.4 12 20 12 20Z"/>'),
  fitness: s('<circle cx="14.5" cy="4.5" r="1.8"/><path d="M8 21l3-6 3 2.5V21M6 12.5l3-3.5h4l2.5 3.5 3 1M11 15l1.5-6"/>'),
  discover: s('<path d="M12 3.5l1.6 4.4 4.4 1.6-4.4 1.6L12 15.5l-1.6-4.4L6 9.5l4.4-1.6L12 3.5Z"/><path d="M18.5 15.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7.7-1.8Z"/>'),
  run: s('<circle cx="14.5" cy="4.5" r="1.8"/><path d="M8 21l3-6 3 2.5V21M6 12.5l3-3.5h4l2.5 3.5 3 1M11 15l1.5-6"/>'),
  walk: s('<circle cx="12.5" cy="4.5" r="1.8"/><path d="M10 21l2-6 2 2v4M9 12l1.5-4h3l1.5 4M12 15l.5-7"/>'),
  golf: s('<path d="M8 21V3l9 3.5L8 10"/><path d="M5 21h8"/>'),
  strength: s('<path d="M6.5 7v10M17.5 7v10M3.5 9.5v5M20.5 9.5v5M6.5 12h11"/>'),
  bolt: s('<path d="M13 2.5 5 13.5h6l-1 8 8-11h-6l1-8Z"/>'),
  moon: s('<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z"/>'),
  leaf: s('<path d="M5 19c8 0 14-6 14-14-8 0-14 5-14 13v1ZM5 19l7-7"/>'),
  alert: s('<path d="M12 4 2.5 20h19L12 4ZM12 10v4.5M12 17.2v.1"/>'),
  send: s('<path d="M12 19V5M6 11l6-6 6 6"/>', 'stroke-width="2.4"'),
  watch: s('<rect x="6.5" y="6" width="11" height="12" rx="3"/><path d="M9 6l.6-3h4.8l.6 3M9 18l.6 3h4.8l.6-3M12 9.5V12l1.5 1"/>'),
  person: s('<circle cx="12" cy="8.5" r="3.5"/><path d="M5.5 19.5c1.2-3 3.7-4.5 6.5-4.5s5.3 1.5 6.5 4.5"/>'),
  pulse: s('<path d="M3 12h4l2.5-6 4 12 2.5-6H21"/>'),
  gear: s('<circle cx="12" cy="12" r="3"/><path d="M12 2.8v2.4M12 18.8v2.4M4.2 7.5l2.1 1.2M17.7 15.3l2.1 1.2M4.2 16.5l2.1-1.2M17.7 8.7l2.1-1.2"/><circle cx="12" cy="12" r="7"/>'),
  steps: s('<path d="M8.5 3.5c1.7 0 2.5 1.6 2.5 3.6 0 2.2-1 3.9-1.2 5.4H6.3C6 11 5.5 9.5 5.5 7.5c0-2.3 1.2-4 3-4ZM6.4 15h3.3v1.2a1.65 1.65 0 0 1-3.3 0V15ZM15.5 7.5c1.8 0 3 1.7 3 4 0 2-.5 3.5-.8 5h-3.5c-.2-1.5-1.2-3.2-1.2-5.4 0-2 .8-3.6 2.5-3.6ZM14.3 18.5h3.3v1.2a1.65 1.65 0 0 1-3.3 0v-1.2Z"/>'),
  flask: s('<path d="M9.5 3.5h5M10.5 3.5v5.2L5 18.5A1.6 1.6 0 0 0 6.4 21h11.2a1.6 1.6 0 0 0 1.4-2.5l-5.5-9.8V3.5"/><path d="M7.5 15h9"/>'),
};

export const workoutIcon = (type) => icons[type === 'trail_run' ? 'run' : type] ?? icons.bolt;
