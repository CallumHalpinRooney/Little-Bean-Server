import Link from 'next/link';
import { Poster } from './Poster';
import { priceFrom, formatPrice, type Product } from '@/lib/types';
import { COLLECTIONS } from '@/lib/types';

export function ProductCard({ product, priority = false }: { product: Product; priority?: boolean }) {
  return (
    <Link href={`/product/${product.slug}`} className="group block">
      <div className="relative aspect-[3/4] overflow-hidden bg-ink-soft">
        <div className="absolute inset-0 transition-transform duration-[1.2s] ease-editorial group-hover:scale-[1.04]">
          <Poster
            image={product.images[0]}
            collection={product.collection}
            seed={product.artSeed}
            title={product.title}
            priority={priority}
            sizes="(max-width: 768px) 90vw, 30vw"
          />
        </div>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/60 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
      </div>

      <div className="mt-5 flex items-baseline justify-between gap-4">
        <div>
          <h3 className="font-serif text-xl font-normal text-bone">{product.title}</h3>
          <p className="mt-1 text-caption uppercase tracking-[0.16em] text-bone-muted">
            {COLLECTIONS[product.collection].title}
          </p>
        </div>
        <span className="shrink-0 text-caption text-bone-dim">
          from {formatPrice(priceFrom(product))}
        </span>
      </div>
      <p className="mt-3 max-w-sm text-caption italic text-bone-dim">{product.story}</p>
    </Link>
  );
}
