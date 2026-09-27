// Tiny SVG chart primitives. Each returns an SVG string sized by viewBox so it scales with
// its container. Colours come from CSS custom properties so light/dark just works.

const esc = (n) => (Number.isFinite(n) ? +n.toFixed(2) : 0);

function scale(values, h, pad = 2, { min, max } = {}) {
  const v = values.filter(Number.isFinite);
  const lo = min ?? Math.min(...v), hi = max ?? Math.max(...v);
  const span = hi - lo || 1;
  return (x) => esc(h - pad - ((x - lo) / span) * (h - pad * 2));
}

export function sparkline(values, { w = 72, h = 28, color = 'var(--accent)', fill = false } = {}) {
  const v = values.filter(Number.isFinite);
  if (v.length < 2) return '';
  const y = scale(v, h, 3);
  const step = w / (v.length - 1);
  const pts = v.map((x, i) => `${esc(i * step)},${y(x)}`).join(' ');
  const area = fill ? `<polygon points="0,${h} ${pts} ${w},${h}" fill="${color}" opacity=".12"/>` : '';
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true">${area}
    <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
    <circle cx="${w}" cy="${y(v.at(-1))}" r="2.5" fill="${color}"/></svg>`;
}

// Readiness ring. `value` 0–100. Gradient stroke, rounded cap, animated via CSS.
export function ring(value, { size = 188, stroke = 16, id = 'r' } = {}) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r;
  const off = c * (1 - value / 100);
  return `<svg class="ring" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="Readiness ${value} of 100">
    <defs><linearGradient id="${id}g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="var(--ring-a)"/><stop offset="1" stop-color="var(--ring-b)"/></linearGradient></defs>
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="var(--track)" stroke-width="${stroke}"/>
    <circle class="ring-arc" cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="url(#${id}g)" stroke-width="${stroke}"
      stroke-linecap="round" stroke-dasharray="${esc(c)}" stroke-dashoffset="${esc(off)}" style="--c:${esc(c)}"
      transform="rotate(-90 ${size / 2} ${size / 2})"/></svg>`;
}

const STAGE_ROW = { awake: 0, rem: 1, light: 2, deep: 3 };
const STAGE_COLOR = { awake: 'var(--st-awake)', rem: 'var(--st-rem)', light: 'var(--st-light)', deep: 'var(--st-deep)' };

export function hypnogram(stages, { w = 340, h = 140 } = {}) {
  const total = stages.reduce((a, s) => a + s.min, 0);
  const rowH = h / 4;
  let x = 0;
  const bars = [], links = [];
  let prev = null;
  for (const s of stages) {
    const bw = (s.min / total) * w;
    const y = STAGE_ROW[s.s] * rowH + rowH * 0.18;
    bars.push(`<rect x="${esc(x)}" y="${esc(y)}" width="${esc(Math.max(bw, 1.2))}" height="${esc(rowH * 0.64)}" rx="4" fill="${STAGE_COLOR[s.s]}"/>`);
    if (prev) {
      const y1 = STAGE_ROW[prev] * rowH + rowH / 2, y2 = STAGE_ROW[s.s] * rowH + rowH / 2;
      links.push(`<line x1="${esc(x)}" x2="${esc(x)}" y1="${esc(y1)}" y2="${esc(y2)}" stroke="var(--label3)" stroke-opacity=".5" stroke-width="1"/>`);
    }
    prev = s.s;
    x += bw;
  }
  return `<svg class="hyp" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" role="img" aria-label="Sleep stages across the night">${links.join('')}${bars.join('')}</svg>`;
}

// Line with a shaded "normal range" band — used for HRV and RHR against your baseline.
export function bandLine(values, { lo, hi, w = 340, h = 120, color = 'var(--accent)', labels } = {}) {
  const v = values.filter(Number.isFinite);
  const min = Math.min(lo, ...v) * 0.97, max = Math.max(hi, ...v) * 1.03;
  const y = scale(v, h, 8, { min, max });
  const step = w / (values.length - 1);
  const pts = values.map((x, i) => (Number.isFinite(x) ? `${esc(i * step)},${y(x)}` : null)).filter(Boolean).join(' ');
  const out = values.map((x, i) => (Number.isFinite(x) && (x < lo || x > hi)
    ? `<circle cx="${esc(i * step)}" cy="${y(x)}" r="2.6" fill="var(--bg-card)" stroke="${color}" stroke-width="1.5"/>` : '')).join('');
  return `<svg class="chart" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" role="img" aria-label="${labels ?? 'Trend'}">
    <rect x="0" y="${y(hi)}" width="${w}" height="${esc(y(lo) - y(hi))}" fill="${color}" opacity=".07" rx="6"/>
    <line x1="0" x2="${w}" y1="${y(hi)}" y2="${y(hi)}" stroke="${color}" stroke-opacity=".25" stroke-dasharray="2 5" vector-effect="non-scaling-stroke"/>
    <line x1="0" x2="${w}" y1="${y(lo)}" y2="${y(lo)}" stroke="${color}" stroke-opacity=".25" stroke-dasharray="2 5" vector-effect="non-scaling-stroke"/>
    <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>${out}
    <circle cx="${w - 1}" cy="${y(v.at(-1))}" r="4" fill="${color}"/></svg>`;
}

let gid = 0;

// Gradient bars (bright top fading to nothing), with an optional value tag on the latest bar.
export function bars(values, { w = 340, h = 110, color = 'var(--mint)', target, highlightLast = true, min = 0, tag } = {}) {
  const max = Math.max(target ?? 0, ...values) * (tag ? 1.22 : 1.08) || 1;
  const gap = values.length > 20 ? 3 : 6, bw = (w - gap * (values.length - 1)) / values.length;
  const y = (v) => h - ((Math.max(v, min) - min) / (max - min)) * h;
  const id = `bg${++gid}`;
  const rects = values.map((v, i) => {
    const last = highlightLast && i === values.length - 1;
    return `<rect x="${esc(i * (bw + gap))}" y="${esc(y(v))}" width="${esc(bw)}" height="${esc(h - y(v))}" rx="${esc(Math.min(6, bw / 2))}" fill="url(#${id})" opacity="${last ? 1 : 0.42}"/>`;
  }).join('');
  const line = target ? `<line x1="0" x2="${w}" y1="${esc(y(target))}" y2="${esc(y(target))}" stroke="var(--label3)" stroke-dasharray="2 5" stroke-width="1" vector-effect="non-scaling-stroke"/>` : '';
  let label = '';
  if (tag && values.length) {
    const cx = (values.length - 1) * (bw + gap) + bw / 2, ty = y(values.at(-1)) - 10;
    const tw = Math.max(34, String(tag).length * 7.5 + 14);
    const tx = Math.min(w - tw, Math.max(0, cx - tw / 2));
    label = `<rect x="${esc(tx)}" y="${esc(ty - 20)}" width="${esc(tw)}" height="20" rx="10" fill="var(--bg-elev2)" stroke="var(--border-strong)"/>
      <text x="${esc(tx + tw / 2)}" y="${esc(ty - 6)}" text-anchor="middle" font-size="11" fill="var(--label)" font-family="Inter, system-ui" font-weight="500">${tag}</text>`;
  }
  return `<svg class="chart" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true">
    <defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${color}"/><stop offset=".55" stop-color="${color}" stop-opacity=".45"/><stop offset="1" stop-color="${color}" stop-opacity=".04"/></linearGradient></defs>
    ${rects}${line}${label}</svg>`;
}

export function intraday(points, { w = 340, h = 110, color = 'var(--mint)' } = {}) {
  const v = points.map((p) => p.bpm);
  const y = scale(v, h, 6, { min: Math.min(...v) - 5, max: Math.max(...v) + 5 });
  const x = (t) => esc((t / 1440) * w);
  const pts = points.map((p) => `${x(p.t)},${y(p.bpm)}`).join(' ');
  const grid = [6, 12, 18].map((hh) => `<line x1="${x(hh * 60)}" x2="${x(hh * 60)}" y1="0" y2="${h}" stroke="var(--sep)" stroke-width="1" vector-effect="non-scaling-stroke"/>`).join('');
  return `<svg class="chart" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" role="img" aria-label="Heart rate today">${grid}
    <defs><linearGradient id="ig${++gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity=".35"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient></defs>
    <polygon points="${x(points[0].t)},${h} ${pts} ${x(points.at(-1).t)},${h}" fill="url(#ig${gid})"/>
    <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.6" stroke-linejoin="round" vector-effect="non-scaling-stroke"/></svg>`;
}
