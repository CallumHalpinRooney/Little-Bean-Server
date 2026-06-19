'use client';

import { useMemo, useState } from 'react';
import { formatPrice, type Product, type ProductVariant } from '@/lib/types';

const CHECKOUT_ENDPOINT = '/.netlify/functions/create-checkout';

/**
 * ProductConfigurator — size + frame selection with live price, and
 * direct-to-checkout (no cart). Posts the chosen variant to the Netlify
 * create-checkout function and redirects to Stripe's hosted page.
 */
export function ProductConfigurator({ product }: { product: Product }) {
  const sizes = useMemo(
    () => Array.from(new Set(product.variants.map((v) => v.size))),
    [product],
  );

  const [size, setSize] = useState(sizes[0]);
  const framesForSize = product.variants.filter((v) => v.size === size);
  const [frame, setFrame] = useState(framesForSize[0]?.frame);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected: ProductVariant | undefined =
    product.variants.find((v) => v.size === size && v.frame === frame) ?? framesForSize[0];

  function chooseSize(s: string) {
    setSize(s);
    const avail = product.variants.filter((v) => v.size === s);
    if (!avail.some((v) => v.frame === frame)) setFrame(avail[0]?.frame);
  }

  async function checkout() {
    if (!selected) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(CHECKOUT_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          slug: product.slug,
          variantId: selected.id,
          printfulVariantId: selected.printfulVariantId,
          title: `${product.title} — ${selected.size}, ${selected.frame}`,
          priceCents: selected.priceCents,
          image: product.images[0] ?? null,
        }),
      });
      if (!res.ok) throw new Error(`Checkout failed (${res.status})`);
      const data = (await res.json()) as { url?: string; error?: string };
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error ?? 'No checkout URL returned');
      }
    } catch (e) {
      setError(
        e instanceof Error
          ? 'We couldn’t start checkout. Please try again in a moment.'
          : 'Something went wrong.',
      );
      setLoading(false);
    }
  }

  const Option = ({
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
      className={`border px-5 py-3 text-caption uppercase tracking-[0.12em] transition-all duration-300 ${
        active
          ? 'border-brass text-brass'
          : 'border-line text-bone-dim hover:border-bone/40 hover:text-bone'
      }`}
    >
      {children}
    </button>
  );

  return (
    <div>
      <div className="flex items-baseline gap-3">
        <span className="font-serif text-4xl text-bone">
          {selected ? formatPrice(selected.priceCents) : '—'}
        </span>
        <span className="text-caption text-bone-muted">incl. frame &amp; print</span>
      </div>

      <div className="mt-8">
        <span className="eyebrow">Size</span>
        <div className="mt-3 flex flex-wrap gap-2">
          {sizes.map((s) => (
            <Option key={s} active={size === s} onClick={() => chooseSize(s)}>
              {s}
            </Option>
          ))}
        </div>
      </div>

      <div className="mt-7">
        <span className="eyebrow">Frame</span>
        <div className="mt-3 flex flex-wrap gap-2">
          {framesForSize.map((v) => (
            <Option key={v.frame} active={frame === v.frame} onClick={() => setFrame(v.frame)}>
              {v.frame}
            </Option>
          ))}
        </div>
      </div>

      <button
        onClick={checkout}
        disabled={loading || !selected}
        className="btn-primary mt-10 w-full"
      >
        {loading ? 'Taking you to checkout…' : 'Buy now'}
      </button>
      {error && <p className="mt-3 text-caption text-brass-soft">{error}</p>}
      <p className="mt-4 text-center text-caption text-bone-muted">
        Secure checkout via Stripe · Made &amp; shipped to order
      </p>
    </div>
  );
}
