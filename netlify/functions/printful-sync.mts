import { listSyncVariants } from '../../lib/printful';
import { supabaseService } from '../../lib/supabase';
import type { ProductVariant } from '../../lib/types';

/**
 * printful-sync
 *
 * Pulls live retail pricing from Printful and writes it back onto the matching
 * variants in the Supabase catalogue (matched on printfulVariantId), so the
 * prices shown on the site never drift from what Printful actually charges.
 *
 * Trigger manually, or on a schedule via netlify.toml. Protected by a shared
 * secret (?key=… or x-sync-key header) so it can't be hammered publicly.
 */

export default async function handler(req: Request): Promise<Response> {
  const expected = process.env.SYNC_SECRET;
  const url = new URL(req.url);
  const provided = url.searchParams.get('key') ?? req.headers.get('x-sync-key');
  if (expected && provided !== expected) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const db = supabaseService();
  if (!db) return json({ error: 'Supabase service role not configured' }, 500);

  let variants;
  try {
    variants = await listSyncVariants();
  } catch (err) {
    console.error('printful-sync: failed to fetch variants', err);
    return json({ error: 'Failed to fetch Printful variants' }, 502);
  }

  // Map live price by Printful catalogue variant id.
  const priceByVariant = new Map<number, number>();
  for (const v of variants) {
    const cents = Math.round(parseFloat(v.retail_price) * 100);
    if (Number.isFinite(cents)) priceByVariant.set(v.variant_id, cents);
  }

  const { data: products, error } = await db.from('products').select('id,variants');
  if (error) return json({ error: error.message }, 500);

  let updated = 0;
  for (const p of products ?? []) {
    const vars = (p.variants ?? []) as ProductVariant[];
    let changed = false;
    const next = vars.map((variant) => {
      const live = priceByVariant.get(variant.printfulVariantId);
      if (live && live !== variant.priceCents) {
        changed = true;
        return { ...variant, priceCents: live };
      }
      return variant;
    });
    if (changed) {
      await db.from('products').update({ variants: next }).eq('id', p.id);
      updated++;
    }
  }

  return json({ ok: true, variantsFromPrintful: priceByVariant.size, productsUpdated: updated });
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
