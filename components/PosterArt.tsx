import type { Collection } from '@/lib/types';

/**
 * PosterArt — procedural, deterministic placeholder artwork.
 *
 * Renders cinematic, collection-aware SVG art seeded from a string so the same
 * product always looks the same. This is what the catalogue shows until real
 * Cloudinary artwork is uploaded — it keeps preview deploys looking art-directed
 * rather than full of broken-image icons.
 */

function hash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

// Deterministic pseudo-random sequence from a seed.
function rng(seed: string) {
  let s = hash(seed) || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const PALETTES: Record<Collection, [string, string, string][]> = {
  motorsport: [
    ['#1B120A', '#C97B2C', '#F2C078'], // amber
    ['#0A1018', '#2E6F9E', '#9FCBE8'], // cool blue
    ['#160A0A', '#B23A2E', '#E89B7A'], // oxide red
  ],
  'sports-moments': [
    ['#140E08', '#9A6B2F', '#E7C58C'], // dusk gold
    ['#0B1012', '#3C6B5E', '#A7D0BE'], // teal field
    ['#100A14', '#6A4A86', '#C5A8DE'], // floodlight violet
  ],
  motivation: [
    ['#0E0C0A', '#BE9E63', '#E9DCC2'], // brass on ink
    ['#0C0E0E', '#7E8A82', '#DCE3DD'], // stone
    ['#120A0C', '#9C5A52', '#E3C4BC'], // clay
  ],
};

const MOT_WORDS: Record<string, [string, string]> = {
  'motivation-serif-light': ['Begin', 'Again'],
  'motivation-rule-brass': ['Do Less,', 'Better'],
};

export function PosterArt({
  collection,
  seed,
  title,
  className = '',
}: {
  collection: Collection;
  seed: string;
  title?: string;
  className?: string;
}) {
  const rand = rng(seed);
  const palettes = PALETTES[collection];
  const [bg, mid, hi] = palettes[hash(seed) % palettes.length];
  const id = `g-${hash(seed)}`;

  return (
    <svg
      viewBox="0 0 600 800"
      preserveAspectRatio="xMidYMid slice"
      className={className}
      role="img"
      aria-label={title ? `${title} — artwork preview` : 'Poster artwork preview'}
    >
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={bg} />
          <stop offset="100%" stopColor="#080706" />
        </linearGradient>
        <radialGradient id={`${id}-glow`} cx="50%" cy="38%" r="70%">
          <stop offset="0%" stopColor={mid} stopOpacity="0.55" />
          <stop offset="60%" stopColor={mid} stopOpacity="0.06" />
          <stop offset="100%" stopColor={mid} stopOpacity="0" />
        </radialGradient>
        <filter id={`${id}-soft`}>
          <feGaussianBlur stdDeviation="14" />
        </filter>
      </defs>

      <rect width="600" height="800" fill={`url(#${id}-bg)`} />
      <rect width="600" height="800" fill={`url(#${id}-glow)`} />

      {collection === 'motorsport' && (
        <g filter={`url(#${id}-soft)`} opacity="0.9">
          {Array.from({ length: 7 }).map((_, i) => {
            const y = 120 + i * 90 + rand() * 30;
            const w = 200 + rand() * 360;
            const x = rand() * 200 - 100;
            return (
              <rect
                key={i}
                x={x}
                y={y}
                width={w}
                height={6 + rand() * 16}
                fill={i % 2 ? hi : mid}
                opacity={0.25 + rand() * 0.5}
                transform={`rotate(-12 300 400)`}
              />
            );
          })}
        </g>
      )}

      {collection === 'sports-moments' && (
        <g>
          <path
            d="M300 700 C 240 520, 300 360, 360 300 C 300 380, 320 540, 300 700 Z"
            fill={mid}
            opacity="0.5"
            filter={`url(#${id}-soft)`}
          />
          <circle cx="300" cy="300" r="120" fill={`url(#${id}-glow)`} />
          {/* lone silhouette mid-leap */}
          <path
            d="M286 470 q -6 -40 8 -70 q -22 -14 -10 -34 q 14 -18 34 -6 q 26 14 24 48 q 30 18 36 56 q -34 -20 -56 -10 q 4 30 -8 56 q -18 8 -28 -2 q -8 -22 -2 -44 q -18 6 -28 -4 q 12 -22 30 -34 z"
            fill="#0a0908"
            opacity="0.85"
            transform="scale(1.1) translate(-26 -20)"
          />
        </g>
      )}

      {collection === 'motivation' && (
        <g>
          {(() => {
            const words = MOT_WORDS[seed] ?? [
              (title ?? 'Less').split(' ')[0] ?? 'Less',
              (title ?? 'is More').split(' ').slice(1).join(' ') || 'is More',
            ];
            return (
              <>
                <text
                  x="64"
                  y="360"
                  fontFamily="Cormorant Garamond, Georgia, serif"
                  fontSize="92"
                  fontWeight="300"
                  fill={hi}
                  letterSpacing="-2"
                >
                  {words[0]}
                </text>
                <text
                  x="64"
                  y="448"
                  fontFamily="Cormorant Garamond, Georgia, serif"
                  fontSize="92"
                  fontWeight="300"
                  fontStyle="italic"
                  fill={mid}
                  letterSpacing="-2"
                >
                  {words[1]}
                </text>
                <rect x="66" y="500" width="120" height="2" fill={mid} />
              </>
            );
          })()}
        </g>
      )}

      {/* film grain + vignette */}
      <rect
        width="600"
        height="800"
        fill="none"
        stroke="rgba(244,239,230,0.06)"
        strokeWidth="1"
      />
    </svg>
  );
}
