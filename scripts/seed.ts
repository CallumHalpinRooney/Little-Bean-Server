/**
 * Seed the Supabase catalogue with the placeholder products.
 *
 *   npm run seed
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the
 * environment (e.g. a local .env loaded by your shell, or `netlify env:...`).
 * Safe to re-run — it upserts on the product id.
 */
import { createClient } from '@supabase/supabase-js';
import { SEED_PRODUCTS } from '../lib/seed-data';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error(
    'Missing env. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before running.',
  );
  process.exit(1);
}

const db = createClient(url, key, { auth: { persistSession: false } });

const rows = SEED_PRODUCTS.map((p) => ({
  id: p.id,
  slug: p.slug,
  title: p.title,
  collection: p.collection,
  story: p.story,
  blurb: p.blurb,
  images: p.images,
  art_seed: p.artSeed,
  variants: p.variants,
  featured: p.featured ?? false,
}));

async function main() {
  const { error } = await db.from('products').upsert(rows, { onConflict: 'id' });
  if (error) {
    console.error('Seed failed:', error.message);
    process.exit(1);
  }
  console.log(`Seeded ${rows.length} products ✓`);
}

main();
