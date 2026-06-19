import type { Product } from './types';

/**
 * Seed catalogue — ~6 placeholder pieces used to lock the art direction and
 * exercise the full checkout flow before the live Supabase catalogue exists.
 *
 * NOTE: every piece is deliberately abstract/silhouette. No team liveries,
 * logos, driver names or recognisable athlete likenesses anywhere.
 *
 * Printful variant IDs below are placeholders (the 1-3xx range used by Printful
 * enhanced-matte posters) and are overwritten by the live printful-sync
 * function once a real Printful store is connected.
 */

function variants(base: number, ids: [number, number, number, number]) {
  return [
    { id: 'a', size: '30×40cm', frame: 'Unframed' as const, priceCents: base, printfulVariantId: ids[0] },
    { id: 'b', size: '50×70cm', frame: 'Unframed' as const, priceCents: base + 2000, printfulVariantId: ids[1] },
    { id: 'c', size: '50×70cm', frame: 'Oak' as const, priceCents: base + 6500, printfulVariantId: ids[2] },
    { id: 'd', size: '70×100cm', frame: 'Black' as const, priceCents: base + 9000, printfulVariantId: ids[3] },
  ];
}

export const SEED_PRODUCTS: Product[] = [
  {
    id: 'apex-amber',
    slug: 'apex-amber',
    title: 'Apex / Amber',
    collection: 'motorsport',
    story: 'The half-second the world goes quiet before the corner opens up.',
    blurb:
      'A single sweep of motion rendered as light. Warm amber bleeds into deep ink the way late sun smears across a circuit at the final session of the day. No car, no number — just the line.',
    images: [],
    artSeed: 'motorsport-amber-blur',
    variants: variants(3900, [3876, 3877, 4012, 4101]),
    featured: true,
  },
  {
    id: 'nightshift-circuit',
    slug: 'nightshift-circuit',
    title: 'Nightshift',
    collection: 'motorsport',
    story: 'Headlights stretched into ribbons by a long exposure that refused to end.',
    blurb:
      'Cool blue and graphite, the chromatic memory of an endurance race after midnight. Built from streaks rather than shapes — speed you feel before you read.',
    images: [],
    artSeed: 'motorsport-blue-streak',
    variants: variants(3900, [3878, 3879, 4013, 4102]),
  },
  {
    id: 'the-leap',
    slug: 'the-leap',
    title: 'The Leap',
    collection: 'sports-moments',
    story: 'Body at full extension, gravity briefly outvoted.',
    blurb:
      'A lone silhouette suspended against a field of warm dusk. The posture is unmistakable; the person, deliberately, is not. The moment belongs to anyone who has reached.',
    images: [],
    artSeed: 'sports-leap-silhouette',
    variants: variants(3900, [3880, 3881, 4014, 4103]),
    featured: true,
  },
  {
    id: 'final-whistle',
    slug: 'final-whistle',
    title: 'Final Whistle',
    collection: 'sports-moments',
    story: 'The half-breath between the result and the roar.',
    blurb:
      'Crowd reduced to texture, light reduced to a single shaft. An abstract study of collective held breath — the energy of a stadium without a single identifiable face.',
    images: [],
    artSeed: 'sports-stadium-light',
    variants: variants(3900, [3882, 3883, 4015, 4104]),
  },
  {
    id: 'begin-again',
    slug: 'begin-again',
    title: 'Begin Again',
    collection: 'motivation',
    story: 'Two words doing the work a thousand usually fail at.',
    blurb:
      'Set in a high-contrast serif at gallery scale, printed on heavyweight uncoated stock so the texture reads across the room. The opposite of a hustle poster — quiet enough to live with for years.',
    images: [],
    artSeed: 'motivation-serif-light',
    variants: variants(3500, [3884, 3885, 4016, 4105]),
    featured: true,
  },
  {
    id: 'do-less-better',
    slug: 'do-less-better',
    title: 'Do Less, Better',
    collection: 'motivation',
    story: 'A studio manifesto small enough to fit on a wall.',
    blurb:
      'Restrained type, generous margin, a single brass rule. A piece about subtraction — and a quiet rebuke to every cluttered motivational print that came before it.',
    images: [],
    artSeed: 'motivation-rule-brass',
    variants: variants(3500, [3886, 3887, 4017, 4106]),
  },
];

export function seedBySlug(slug: string): Product | undefined {
  return SEED_PRODUCTS.find((p) => p.slug === slug);
}
