import Stripe from 'stripe';

/**
 * create-checkout
 *
 * Creates a Stripe-hosted Checkout session for a single poster variant
 * (direct-to-checkout — no cart). The variant + Printful IDs are stashed in
 * session metadata so the webhook can place the fulfilment order after payment.
 */

interface CheckoutBody {
  productId: string;
  slug: string;
  variantId: string;
  printfulVariantId: number;
  title: string;
  priceCents: number;
  image?: string | null;
}

const SHIP_TO = [
  'IE', 'GB', 'US', 'CA', 'AU', 'NZ',
  'FR', 'DE', 'ES', 'IT', 'NL', 'BE', 'AT', 'PT', 'SE', 'DK', 'FI', 'PL',
] as Stripe.Checkout.SessionCreateParams.ShippingAddressCollection.AllowedCountry[];

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    return json({ error: 'Stripe is not configured' }, 500);
  }

  let body: CheckoutBody;
  try {
    body = (await req.json()) as CheckoutBody;
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  if (!body.printfulVariantId || !Number.isFinite(body.priceCents) || body.priceCents <= 0) {
    return json({ error: 'Missing or invalid product details' }, 400);
  }

  const stripe = new Stripe(secret, { apiVersion: '2024-06-20' });
  const site = (process.env.SITE_URL ?? process.env.URL ?? 'http://localhost:3000').replace(/\/$/, '');

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'eur',
            unit_amount: Math.round(body.priceCents),
            product_data: {
              name: body.title,
              images: body.image && body.image.startsWith('http') ? [body.image] : undefined,
              metadata: { productId: body.productId, slug: body.slug },
            },
          },
        },
      ],
      // Fulfilment needs a real address + contact.
      shipping_address_collection: { allowed_countries: SHIP_TO },
      phone_number_collection: { enabled: true },
      billing_address_collection: 'auto',
      // Everything the webhook needs to create the Printful order.
      metadata: {
        productId: body.productId,
        slug: body.slug,
        variantId: body.variantId,
        printfulVariantId: String(body.printfulVariantId),
        title: body.title,
      },
      success_url: `${site}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${site}/cancel`,
    });

    return json({ url: session.url });
  } catch (err) {
    console.error('create-checkout error', err);
    return json({ error: 'Unable to create checkout session' }, 500);
  }
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
