'use client';

import { useMemo, useState } from 'react';
import { ProductCard } from './ProductCard';
import type { Product } from '@/lib/types';

/**
 * CollectionView — editorial grid with minimal chrome. Filters by size and
 * frame only (per brief: no noisy filter sidebar). Filtering is purely
 * client-side over the already-loaded collection.
 */
export function CollectionView({ products }: { products: Product[] }) {
  const sizes = useMemo(
    () => Array.from(new Set(products.flatMap((p) => p.variants.map((v) => v.size)))),
    [products],
  );
  const frames = useMemo(
    () => Array.from(new Set(products.flatMap((p) => p.variants.map((v) => v.frame)))),
    [products],
  );

  const [size, setSize] = useState<string | null>(null);
  const [frame, setFrame] = useState<string | null>(null);

  const filtered = products.filter((p) =>
    p.variants.some(
      (v) => (!size || v.size === size) && (!frame || v.frame === frame),
    ),
  );

  const Pill = ({
    active,
    onClick,
    children,
  }: {
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
  }) => (
    <button
      onClick={onClick}
      className={`text-caption uppercase tracking-[0.14em] transition-colors duration-300 ${
        active ? 'text-brass' : 'text-bone-muted hover:text-bone'
      }`}
    >
      {children}
    </button>
  );

  return (
    <>
      <div className="container-edge flex flex-wrap items-center gap-x-8 gap-y-4 border-y border-line py-5">
        <span className="text-caption uppercase tracking-[0.2em] text-bone-muted">Size</span>
        <Pill active={!size} onClick={() => setSize(null)}>All</Pill>
        {sizes.map((s) => (
          <Pill key={s} active={size === s} onClick={() => setSize(s)}>{s}</Pill>
        ))}

        <span className="ml-auto text-caption uppercase tracking-[0.2em] text-bone-muted">Frame</span>
        <Pill active={!frame} onClick={() => setFrame(null)}>All</Pill>
        {frames.map((f) => (
          <Pill key={f} active={frame === f} onClick={() => setFrame(f)}>{f}</Pill>
        ))}
      </div>

      <div className="container-edge py-section">
        {filtered.length === 0 ? (
          <p className="py-20 text-center text-body text-bone-dim">
            Nothing in that combination yet. Try a different size or frame.
          </p>
        ) : (
          <div className="grid gap-x-8 gap-y-16 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((p, i) => (
              <ProductCard key={p.id} product={p} priority={i < 2} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
