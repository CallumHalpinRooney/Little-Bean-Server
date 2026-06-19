import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Accordion } from '@/components/Accordion';
import { FramedPoster } from '@/components/Poster';
import { ProductConfigurator } from '@/components/ProductConfigurator';
import { ProductCard } from '@/components/ProductCard';
import { getAllProducts, getProductBySlug } from '@/lib/products';
import { COLLECTIONS } from '@/lib/types';

export async function generateStaticParams() {
  const products = await getAllProducts();
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const product = await getProductBySlug(params.slug);
  if (!product) return { title: 'Not found' };
  return {
    title: product.title,
    description: product.story,
    openGraph: { title: product.title, description: product.story },
  };
}

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const product = await getProductBySlug(params.slug);
  if (!product) notFound();

  const collection = COLLECTIONS[product.collection];
  const all = await getAllProducts();
  const related = all
    .filter((p) => p.collection === product.collection && p.id !== product.id)
    .slice(0, 3);

  return (
    <>
      <div className="container-edge pt-32 text-caption uppercase tracking-[0.16em] text-bone-muted">
        <Link href={`/${product.collection}`} className="link-underline">
          {collection.title}
        </Link>
        <span className="px-2">/</span>
        <span className="text-bone-dim">{product.title}</span>
      </div>

      <section className="container-edge grid gap-16 py-12 lg:grid-cols-[1.15fr_0.85fr] lg:gap-24">
        {/* Lifestyle hero */}
        <div>
          <div className="relative flex aspect-[4/5] items-center justify-center overflow-hidden bg-gradient-to-br from-ink-soft to-ink p-[12%]">
            <FramedPoster
              image={product.images[0]}
              collection={product.collection}
              seed={product.artSeed}
              title={product.title}
              frame="oak"
              priority
              className="w-full"
            />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-4">
            {(['black', 'walnut', 'oak'] as const).map((f) => (
              <div
                key={f}
                className="relative flex aspect-square items-center justify-center overflow-hidden bg-ink-soft p-4"
              >
                <FramedPoster
                  image={product.images[0]}
                  collection={product.collection}
                  seed={product.artSeed}
                  title={product.title}
                  frame={f}
                  className="w-[70%]"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Details */}
        <div className="lg:pt-8">
          <span className="eyebrow">{collection.tagline}</span>
          <h1 className="display-lg mt-5">{product.title}</h1>
          <p className="mt-6 font-serif text-xl italic text-brass-soft">“{product.story}”</p>
          <p className="mt-6 max-w-prose text-body text-bone-dim">{product.blurb}</p>

          <div className="mt-10">
            <ProductConfigurator product={product} />
          </div>

          <div className="mt-12">
            <Accordion
              items={[
                {
                  title: 'Materials',
                  body: (
                    <p>
                      Printed on 200gsm uncoated fine-art paper with archival pigment
                      inks. Framed options use solid timber mouldings with a shatter-
                      resistant acrylic glaze. Each piece is produced individually — no
                      two share a print run.
                    </p>
                  ),
                },
                {
                  title: 'Shipping',
                  body: (
                    <p>
                      Made to order and dispatched through a global production network,
                      so your piece ships from the facility nearest you. Production
                      typically takes 2–5 business days, plus tracked delivery. Framed
                      pieces are boxed with corner protection.{' '}
                      <Link href="/legal#shipping" className="link-underline text-bone">
                        Full shipping policy →
                      </Link>
                    </p>
                  ),
                },
                {
                  title: 'Returns',
                  body: (
                    <p>
                      As each piece is printed to order, we follow our print partner&apos;s
                      fulfilment terms: replacements or refunds are offered for items that
                      arrive damaged or with a production fault, reported within 30 days
                      with a photo.{' '}
                      <Link href="/legal#returns" className="link-underline text-bone">
                        Full returns policy →
                      </Link>
                    </p>
                  ),
                },
              ]}
            />
          </div>
        </div>
      </section>

      {/* Related */}
      {related.length > 0 && (
        <section className="container-edge border-t border-line py-section">
          <h2 className="display-md mb-12">More from {collection.title}</h2>
          <div className="grid gap-x-8 gap-y-16 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
