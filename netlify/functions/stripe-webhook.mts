import Stripe from 'stripe';
import { createPrintfulOrder, PrintfulError } from '../../lib/printful';
import { supabaseService } from '../../lib/supabase';

/**
 * stripe-webhook  ── THE most important function in the project.
 *
 * Fires when a Stripe payment succeeds and turns it into a Printful fulfilment
 * order. A customer must never pay and receive nothing, so this handler is
 * defensive throughout:
 *
 *   1. Verifies the Stripe signature (raw body) — rejects forgeries.
 *   2. Is idempotent — the same session is never fulfilled twice (keyed on the
 *      Stripe session id, plus Printful's own external_id dedupe).
 *   3. Logs every order (pending → fulfilled / failed) to Supabase so there's a
 *      record independent of the Stripe & Printful dashboards.
 *   4. On Printful failure AFTER payment, it records the failure, fires an
 *      alert, and returns 5xx so Stripe automatically retries (up to ~3 days).
 *      Printful's retry in lib/printful covers transient blips within a call.
 */

export default async function handler(req: Request): Promise<Response> {
  const secret = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !webhookSecret) {
    console.error('stripe-webhook: missing Stripe configuration');
    return new Response('Stripe not configured', { status: 500 });
  }

  const stripe = new Stripe(secret, { apiVersion: '2024-06-20' });
  const sig = req.headers.get('stripe-signature');
  const raw = await req.text(); // raw body required for signature verification

  let event: Stripe.Event;
  try {
    if (!sig) throw new Error('Missing stripe-signature header');
    event = await stripe.webhooks.constructEventAsync(raw, sig, webhookSecret);
  } catch (err) {
    console.error('stripe-webhook: signature verification failed', err);
    return new Response('Invalid signature', { status: 400 });
  }

  if (event.type !== 'checkout.session.completed') {
    // Acknowledge everything else so Stripe stops resending.
    return new Response('ignored', { status: 200 });
  }

  const session = event.data.object as Stripe.Checkout.Session;

  try {
    await fulfil(stripe, session);
    return new Response('ok', { status: 200 });
  } catch (err) {
    const transient =
      !(err instanceof PrintfulError) || err.status === 429 || err.status >= 500;

    await alert(session, err);

    // Transient → ask Stripe to retry. Permanent (e.g. bad variant id) → 200 so
    // Stripe stops hammering, but we've already logged + alerted for manual fix.
    if (transient) {
      return new Response('retry', { status: 500 });
    }
    return new Response('logged-for-manual-review', { status: 200 });
  }
}

async function fulfil(stripe: Stripe, session: Stripe.Checkout.Session) {
  const db = supabaseService();

  // 1) Idempotency — skip if we've already fulfilled this session.
  if (db) {
    const { data: existing } = await db
      .from('orders')
      .select('id,status')
      .eq('stripe_session_id', session.id)
      .maybeSingle();
    if (existing?.status === 'fulfilled') {
      console.log(`stripe-webhook: ${session.id} already fulfilled, skipping`);
      return;
    }
  }

  // 2) Re-fetch the session with the details we need (address + items).
  const full = await stripe.checkout.sessions.retrieve(session.id, {
    expand: ['line_items', 'customer_details'],
  });

  const meta = full.metadata ?? {};
  const printfulVariantId = Number(meta.printfulVariantId);
  const shipping = full.customer_details;
  const addr = (full as Stripe.Checkout.Session).shipping_details?.address ?? shipping?.address;

  if (!printfulVariantId || !addr || !shipping?.name) {
    throw new PrintfulError('Missing variant id or shipping address on session', 400, meta);
  }

  const orderRecord = {
    stripe_session_id: full.id,
    product_id: meta.productId ?? null,
    variant_id: meta.variantId ?? null,
    printful_variant_id: printfulVariantId,
    title: meta.title ?? null,
    amount_total: full.amount_total ?? null,
    currency: full.currency ?? 'eur',
    customer_email: shipping.email ?? full.customer_email ?? null,
    customer_name: shipping.name,
    status: 'pending' as 'pending' | 'fulfilled' | 'failed',
    printful_order_id: null as number | null,
    error: null as string | null,
  };

  // 3) Log as pending before we call Printful.
  if (db) {
    await db.from('orders').upsert(orderRecord, { onConflict: 'stripe_session_id' });
  }

  // 4) Create the Printful order (external_id = session id → Printful dedupes).
  const result = await createPrintfulOrder({
    externalId: full.id,
    recipient: {
      name: shipping.name,
      address1: addr.line1 ?? '',
      address2: addr.line2 ?? undefined,
      city: addr.city ?? '',
      state_code: addr.state ?? undefined,
      country_code: addr.country ?? '',
      zip: addr.postal_code ?? '',
      email: orderRecord.customer_email ?? undefined,
      phone: shipping.phone ?? undefined,
    },
    items: [
      {
        variant_id: printfulVariantId,
        quantity: 1,
        retail_price: full.amount_total ? (full.amount_total / 100).toFixed(2) : undefined,
        name: meta.title ?? undefined,
      },
    ],
    confirm: true,
  });

  // 5) Mark fulfilled.
  if (db) {
    await db
      .from('orders')
      .update({ status: 'fulfilled', printful_order_id: result.id })
      .eq('stripe_session_id', full.id);
  }
  console.log(`stripe-webhook: fulfilled ${full.id} → Printful order ${result.id}`);
}

/** Record the failure and notify, so a paid-but-unfulfilled order never hides. */
async function alert(session: Stripe.Checkout.Session, err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`stripe-webhook: FULFILMENT FAILED for ${session.id}: ${message}`, err);

  const db = supabaseService();
  if (db) {
    await db
      .from('orders')
      .upsert(
        { stripe_session_id: session.id, status: 'failed', error: message },
        { onConflict: 'stripe_session_id' },
      )
      .then(undefined, (e) => console.error('stripe-webhook: failed to log error', e));
  }

  const hook = process.env.ALERT_WEBHOOK_URL;
  if (hook) {
    try {
      await fetch(hook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `:rotating_light: Lonrú: payment succeeded but Printful fulfilment FAILED for session ${session.id}. Error: ${message}. Customer has paid — needs manual order.`,
        }),
      });
    } catch (e) {
      console.error('stripe-webhook: alert webhook failed', e);
    }
  }
}
