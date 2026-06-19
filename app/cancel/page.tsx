import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Checkout cancelled', robots: { index: false } };

export default function CancelPage() {
  return (
    <section className="container-edge flex min-h-[80svh] flex-col items-center justify-center py-section text-center">
      <span className="eyebrow">No charge made</span>
      <h1 className="display-lg mt-6 max-w-xl text-balance">Checkout cancelled.</h1>
      <p className="mt-6 max-w-md text-body text-bone-dim">
        Nothing was charged. Your selection is still waiting whenever you&apos;re ready.
      </p>
      <Link href="/" className="btn-outline mt-10">
        Return to the gallery
      </Link>
    </section>
  );
}
