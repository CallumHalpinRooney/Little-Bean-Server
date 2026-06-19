import { COLLECTIONS, type Collection } from '@/lib/types';

export function CollectionHeader({ collection }: { collection: Collection }) {
  const c = COLLECTIONS[collection];
  return (
    <section className="container-edge pb-12 pt-40">
      <span className="eyebrow">{c.tagline}</span>
      <h1 className="display-xl mt-6 text-balance">{c.title}</h1>
      <p className="mt-8 max-w-readable text-lead text-bone-dim">{c.description}</p>
    </section>
  );
}
