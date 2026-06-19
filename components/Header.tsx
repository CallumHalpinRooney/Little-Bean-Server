'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Logo } from './Logo';

const NAV = [
  { href: '/motorsport', label: 'Motorsport' },
  { href: '/sports-moments', label: 'Moments' },
  { href: '/motivation', label: 'Motivation' },
  { href: '/about', label: 'Process' },
];

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
  }, [open]);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 transition-all duration-500 ease-editorial ${
        scrolled
          ? 'border-b border-line bg-ink/85 backdrop-blur-md'
          : 'border-b border-transparent bg-gradient-to-b from-ink/60 to-transparent'
      }`}
    >
      <div className="container-edge flex h-20 items-center justify-between">
        <Logo />

        <nav className="hidden items-center gap-10 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-caption uppercase tracking-[0.18em] text-bone-dim transition-colors hover:text-bone"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <button
          aria-label="Menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="relative z-50 flex h-8 w-8 flex-col items-center justify-center gap-[5px] md:hidden"
        >
          <span
            className={`h-px w-6 bg-bone transition-all duration-300 ${open ? 'translate-y-[6px] rotate-45' : ''}`}
          />
          <span className={`h-px w-6 bg-bone transition-all duration-300 ${open ? 'opacity-0' : ''}`} />
          <span
            className={`h-px w-6 bg-bone transition-all duration-300 ${open ? '-translate-y-[6px] -rotate-45' : ''}`}
          />
        </button>
      </div>

      {/* Mobile drawer */}
      <div
        className={`fixed inset-0 z-40 flex flex-col justify-center bg-ink px-gutter transition-all duration-500 ease-editorial md:hidden ${
          open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
      >
        <nav className="flex flex-col gap-8">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="font-serif text-4xl font-light text-bone"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
