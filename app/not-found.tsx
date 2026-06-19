import Link from 'next/link';

export default function NotFound() {
  return (
    <section className="container-edge flex min-h-[80svh] flex-col items-center justify-center py-section text-center">
      <span className="eyebrow">404</span>
      <h1 className="display-xl mt-6">Off the wall.</h1>
      <p className="mt-6 max-w-sm text-body text-bone-dim">
        This page doesn&apos;t exist — but plenty of walls still need filling.
      </p>
      <Link href="/" className="btn-outline mt-10">
        Back to the gallery
      </Link>
    </section>
  );
}
