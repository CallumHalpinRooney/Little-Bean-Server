import Link from 'next/link';
import { FramedPoster } from '@/components/Poster';
import { ProductCard } from '@/components/ProductCard';
import { getFeaturedProducts } from '@/lib/products';
import { COLLECTIONS, type Collection } from '@/lib/types';

const COLLECTION_ORDER: Collection[] = ['motorsport', 'sports-moments', 'motivation'];

const PROCESS = [
  {
    n: '01',
    title: 'Museum-grade stock',
    body:
      '200gsm uncoated fine-art paper with a soft tooth that holds ink without glare. Archival pigments rated to outlast the wall they hang on.',
  },
  {
    n: '02',
    title: 'Framed to order',
    body:
      'Solid timber mouldings — oak, walnut or matte black — assembled per order. Nothing sits in a warehouse waiting to be sold.',
  },
  {
    n: '03',
    title: 'Made the moment you order',
    body:
      'Printed and dispatched through a global production network, so your piece travels the shortest distance to your door. Tracked, worldwide.',
  },
];

export default async function HomePage() {
  const featured = await getFeaturedProducts(3);

  return (
    <>
      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <section className="relative flex min-h-[100svh] items-center overflow-hidden pt-20">
        <div
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              'radial-gradient(80% 60% at 70% 30%, rgba(190,158,99,0.10), transparent 60%), radial-gradient(60% 50% at 20% 80%, rgba(46,111,158,0.06), transparent 60%)',
          }}
        />
        <div className="container-edge grid w-full items-center gap-16 md:grid-cols-[1.1fr_0.9fr]">
          <div className="animate-rise">
            <span className="eyebrow">Lonrú Design — Editorial Wall Art</span>
            <h1 className="display-xl mt-7 text-balance">
              Art that holds<br />
              <span className="italic text-brass">the room.</span>
            </h1>
            <p className="mt-8 max-w-md text-lead text-bone-dim">
              Cinematic poster art across motorsport, sport&apos;s great moments and
              quiet motivation. Printed on fine-art stock and framed to order — never
              a template, never off a warehouse shelf.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Link href="/motorsport" className="btn-primary">Explore the collections</Link>
              <Link href="/about" className="btn-ghost">Our process →</Link>
            </div>
          </div>

          <div className="relative mx-auto w-[68%] animate-rise [animation-delay:150ms] md:w-[78%]">
            <FramedPoster
              collection="motorsport"
              seed="apex-amber-blur"
              title="Apex / Amber"
              frame="oak"
              priority
            />
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-caption uppercase tracking-[0.3em] text-bone-muted">
          Scroll
        </div>
      </section>

      {/* ── Collections ────────────────────────────────────────────────── */}
      <section className="container-edge py-section">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <span className="eyebrow">Three collections</span>
            <h2 className="display-lg mt-5 max-w-xl text-balance">
              Pick a feeling, not a poster.
            </h2>
          </div>
          <p className="max-w-sm text-body text-bone-dim">
            Each collection is a distinct mood. None of them shouts. All of them are
            built to live with for years.
          </p>
        </div>

        <div className="mt-16 grid gap-px overflow-hidden rounded-sm bg-line md:grid-cols-3">
          {COLLECTION_ORDER.map((key, i) => {
            const c = COLLECTIONS[key];
            return (
              <Link
                key={key}
                href={`/${key}`}
                className="group relative flex min-h-[26rem] flex-col justify-end overflow-hidden bg-ink-soft p-8 transition-colors duration-500 hover:bg-ink-softer"
              >
                <div className="absolute inset-0 opacity-70 transition-all duration-[1.2s] ease-editorial group-hover:scale-105 group-hover:opacity-90">
                  <FramedPoster
                    collection={key}
                    seed={`${key}-tile-${i}`}
                    frame={i === 1 ? 'walnut' : i === 2 ? 'black' : 'oak'}
                    className="absolute inset-0 flex items-center justify-center p-12"
                  />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-transparent" />
                <div className="relative">
                  <span className="text-caption uppercase tracking-[0.2em] text-brass">
                    {c.tagline}
                  </span>
                  <h3 className="display-md mt-2">{c.title}</h3>
                  <span className="mt-4 inline-block text-caption uppercase tracking-[0.16em] text-bone-dim transition-colors group-hover:text-bone">
                    View collection →
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ── Featured ───────────────────────────────────────────────────── */}
      {featured.length > 0 && (
        <section className="container-edge py-section">
          <div className="mb-16 flex items-end justify-between">
            <h2 className="display-lg max-w-md text-balance">Selected pieces</h2>
            <span className="hidden text-caption uppercase tracking-[0.18em] text-bone-muted md:block">
              Curated this season
            </span>
          </div>
          <div className="grid gap-x-8 gap-y-16 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((p, i) => (
              <ProductCard key={p.id} product={p} priority={i === 0} />
            ))}
          </div>
        </section>
      )}

      {/* ── How it's made ──────────────────────────────────────────────── */}
      <section className="border-y border-line bg-ink-soft/40">
        <div className="container-edge py-section">
          <span className="eyebrow">How it&apos;s made</span>
          <h2 className="display-lg mt-5 max-w-xl text-balance">
            Premium isn&apos;t a sticker. It&apos;s the stock, the frame and the patience.
          </h2>
          <div className="mt-16 grid gap-12 md:grid-cols-3">
            {PROCESS.map((p) => (
              <div key={p.n} className="border-t border-line pt-6">
                <span className="font-serif text-3xl text-brass">{p.n}</span>
                <h3 className="mt-4 font-serif text-2xl">{p.title}</h3>
                <p className="mt-3 text-body text-bone-dim">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Closing CTA ────────────────────────────────────────────────── */}
      <section className="container-edge py-section text-center">
        <span className="eyebrow">Lonrú — Irish for radiance</span>
        <h2 className="display-xl mx-auto mt-7 max-w-3xl text-balance">
          Give a wall something worth looking at twice.
        </h2>
        <div className="mt-10 flex justify-center">
          <Link href="/motorsport" className="btn-outline">Browse the collections</Link>
        </div>
      </section>
    </>
  );
}
