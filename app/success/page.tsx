import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Order confirmed', robots: { index: false } };

export default function SuccessPage() {
  return (
    <section className="container-edge flex min-h-[80svh] flex-col items-center justify-center py-section text-center">
      <span className="eyebrow">Thank you</span>
      <h1 className="display-lg mt-6 max-w-xl text-balance">
        Your piece is on its way into production.
      </h1>
      <p className="mt-6 max-w-md text-body text-bone-dim">
        Payment received. We&apos;ve sent your order straight to print — you&apos;ll get a
        confirmation email, then tracking once it&apos;s dispatched. No two walls alike.
      </p>
      <Link href="/" className="btn-outline mt-10">
        Back to the gallery
      </Link>
    </section>
  );
}
