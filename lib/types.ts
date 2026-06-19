export type Collection = 'motorsport' | 'sports-moments' | 'motivation';

export const COLLECTIONS: Record<
  Collection,
  { slug: Collection; title: string; tagline: string; description: string }
> = {
  motorsport: {
    slug: 'motorsport',
    title: 'Motorsport',
    tagline: 'Speed, distilled',
    description:
      'Mood and energy over machinery. Silhouette, motion blur and colour story — the feeling of the apex, never a team livery or a logo.',
  },
  'sports-moments': {
    slug: 'sports-moments',
    title: 'Legendary Moments',
    tagline: 'The weight of the moment',
    description:
      'Abstract treatments of sporting energy — the arc of a body, the hush before the roar. Suggestion, not photography; no faces, no badges.',
  },
  motivation: {
    slug: 'motivation',
    title: 'Motivation',
    tagline: 'Restraint as a statement',
    description:
      'Typographic prints with the volume turned down. Considered type, real paper texture, a single idea given room to breathe.',
  },
};

/** A purchasable size/frame combination — maps to a Printful variant. */
export interface ProductVariant {
  id: string;
  size: string; // e.g. "50×70cm"
  frame: 'Unframed' | 'Oak' | 'Black' | 'Walnut';
  /** Price in minor units (cents). Synced from Printful where available. */
  priceCents: number;
  printfulVariantId: number;
}

export interface Product {
  id: string;
  slug: string;
  title: string;
  collection: Collection;
  /** One-line story — never SEO filler. */
  story: string;
  blurb: string;
  /** Cloudinary public IDs (or full URLs). First is the hero. */
  images: string[];
  /** Art-direction seed used to render the procedural placeholder art. */
  artSeed: string;
  variants: ProductVariant[];
  featured?: boolean;
}

export function priceFrom(product: Product): number {
  return Math.min(...product.variants.map((v) => v.priceCents));
}

export function formatPrice(cents: number, currency = 'EUR'): string {
  return new Intl.NumberFormat('en-IE', {
    style: 'currency',
    currency,
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}
