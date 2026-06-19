# Lonrú Design — Premium Poster Store

A quiet-luxury, print-on-demand poster store. Editorial art direction, three
collections (Motorsport · Legendary Moments · Motivation), direct-to-checkout,
and fully automated fulfilment: a Stripe payment triggers a Printful order with
no manual step.

> All sample artwork is original, abstract/silhouette work — no team liveries,
> logos or recognisable likenesses anywhere.

## Stack

| Concern        | Tool |
| -------------- | ---- |
| Framework      | Next.js (App Router) · TypeScript · Tailwind |
| Hosting / CI   | Netlify (auto-deploy on push to `main`) |
| Payments       | Stripe Checkout (hosted) |
| Fulfilment     | Printful API via a Netlify Function webhook |
| Backend logic  | Netlify Functions (checkout, webhook→Printful, price sync) |
| Data           | Supabase (product catalogue + order log) |
| Images         | Cloudinary (optimised, lazy, blur-up) |

The site runs with **zero configuration** on seed data: the catalogue falls back
to `lib/seed-data.ts` and artwork falls back to the procedural `PosterArt`
renderer, so a fresh preview deploy looks finished before any keys are added.

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in as you wire each service
npm run dev                  # http://localhost:3000
```

Functions run locally via the Netlify CLI:

```bash
npm i -g netlify-cli
netlify dev                  # serves Next + /.netlify/functions/*
```

Useful scripts: `npm run build`, `npm run typecheck`, `npm run seed`.

## Design system

Defined in `tailwind.config.ts` + `app/globals.css`.

- **Colour** — warm near-black `ink`, soft `bone` off-white, one restrained
  accent: muted patina **brass** (`#BE9E63`). No Shopify red/orange.
- **Type** — Cormorant Garamond (display serif) + Inter (UI grotesk), wired via
  `next/font`. Fluid `.display-xl/lg/md` scale.
- **Primitives** — `.btn-primary` / `.btn-outline` / `.btn-ghost`, `.eyebrow`,
  `.link-underline`, `.rule`, plus `grain` + `vignette` cinematic utilities.

## Project structure

```
app/                 Pages (home, 3 collections, product, about, legal, success/cancel)
components/          Header, Footer, Poster/FramedPoster, ProductCard,
                    CollectionView (size/frame filter), ProductConfigurator, Accordion
lib/                products (Supabase + seed fallback), types, cloudinary, printful, supabase
netlify/functions/  create-checkout, stripe-webhook, printful-sync
scripts/seed.ts     Upserts the seed catalogue into Supabase
supabase/schema.sql Catalogue + order-log tables, RLS, triggers
```

## Going live — checklist

### 1. Environment variables
Add everything in `.env.example` to **Netlify → Site settings → Environment
variables**. `NEXT_PUBLIC_*` are browser-exposed; the rest are server-only.

| Variable | Where to get it |
| --- | --- |
| `SITE_URL` | Your production URL (e.g. `https://lonru.design`) |
| `STRIPE_SECRET_KEY` | Stripe → Developers → API keys |
| `STRIPE_WEBHOOK_SECRET` | Stripe → Developers → Webhooks (see step 3) |
| `PRINTFUL_API_KEY` | Printful → Settings → API |
| `PRINTFUL_STORE_ID` | Only if your token spans multiple stores |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API (server only) |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | Cloudinary dashboard |
| `SYNC_SECRET` | Any random string (protects the sync function) |
| `ALERT_WEBHOOK_URL` | Slack/Discord incoming webhook (optional but recommended) |

### 2. Supabase
1. Run `supabase/schema.sql` in the SQL editor.
2. `npm run seed` to load the placeholder catalogue (or add your own products).

### 3. Stripe webhook (critical)
1. Create an endpoint: `https://YOUR_SITE/.netlify/functions/stripe-webhook`
2. Subscribe to **`checkout.session.completed`**.
3. Copy the signing secret into `STRIPE_WEBHOOK_SECRET`.

The webhook is the most important code in the project. It is idempotent,
logs every order (`pending → fulfilled / failed`) to Supabase, returns `5xx`
on transient Printful failures so **Stripe automatically retries**, and fires
`ALERT_WEBHOOK_URL` if a customer ever pays without an order being created.
`lib/printful.ts` additionally retries transient errors within a single call.

### 4. Printful
Connect your store, map products, and put each variant's Printful catalogue
variant id into the product `variants[].printfulVariantId`. Run the
`printful-sync` function (scheduled daily in `netlify.toml`, or call
`/.netlify/functions/printful-sync?key=SYNC_SECRET`) to mirror live pricing.

### 5. Cloudinary
Upload artwork + lifestyle shots, then store each image's public id (e.g.
`posters/apex-amber`) in a product's `images` array. Until then the procedural
`PosterArt` renderer stands in automatically.

## Deploy

Connect the GitHub repo to Netlify. Pushes to `main` auto-deploy; the
`@netlify/plugin-nextjs` runtime handles the App Router and image optimisation.
Every commit is intended to be deployable.
