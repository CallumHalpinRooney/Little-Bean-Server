import Link from 'next/link';

/** Wordmark — restrained serif with the fada, the one piece of brand voice. */
export function Logo({ className = '' }: { className?: string }) {
  return (
    <Link href="/" className={`group inline-flex flex-col leading-none ${className}`}>
      <span className="font-serif text-2xl tracking-tight text-bone transition-colors group-hover:text-brass">
        Lonrú
      </span>
      <span className="mt-1 text-[0.55rem] uppercase tracking-[0.34em] text-bone-muted">
        Design
      </span>
    </Link>
  );
}
