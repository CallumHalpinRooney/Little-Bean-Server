import Link from 'next/link';
import { Logo } from './Logo';

export function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="container-edge grid gap-12 py-section md:grid-cols-[1.5fr_1fr_1fr]">
        <div className="max-w-sm">
          <Logo />
          <p className="mt-6 text-body text-bone-dim">
            Editorial wall art, printed and framed to order. Made with restraint
            in Ireland, shipped worldwide.
          </p>
        </div>

        <nav className="flex flex-col gap-3">
          <span className="eyebrow mb-2">Collections</span>
          <Link href="/motorsport" className="link-underline w-fit">Motorsport</Link>
          <Link href="/sports-moments" className="link-underline w-fit">Legendary Moments</Link>
          <Link href="/motivation" className="link-underline w-fit">Motivation</Link>
        </nav>

        <nav className="flex flex-col gap-3">
          <span className="eyebrow mb-2">Studio</span>
          <Link href="/about" className="link-underline w-fit">Process</Link>
          <Link href="/legal#shipping" className="link-underline w-fit">Shipping &amp; Returns</Link>
          <Link href="/legal#privacy" className="link-underline w-fit">Privacy</Link>
          <Link href="/legal#terms" className="link-underline w-fit">Terms</Link>
        </nav>
      </div>

      <div className="container-edge flex flex-col gap-2 border-t border-line py-8 text-caption text-bone-muted md:flex-row md:items-center md:justify-between">
        <span>© {new Date().getFullYear()} Lonrú Design. All rights reserved.</span>
        <span>Printed &amp; fulfilled on demand. No two walls alike.</span>
      </div>
    </footer>
  );
}
