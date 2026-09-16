import Link from "next/link";
import { siteConfig } from "@/site.config";

/**
 * Wordmark plus a custom monogram: three stacked bars forming an ascending
 * assurance mark, enclosed by an open frame (assessment, never closed off).
 */
export function Logo({ className = "", href = "/" }: { className?: string; href?: string | null }) {
  const mark = (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg width="30" height="30" viewBox="0 0 32 32" aria-hidden="true" focusable="false" className="shrink-0">
        <rect x="1" y="1" width="30" height="30" rx="8" fill="var(--accent)" />
        <path d="M9 21.5h5.5M9 16h9M9 10.5h14" stroke="var(--accent-contrast)" strokeWidth="2.1" strokeLinecap="round" />
        <circle cx="22.5" cy="21.5" r="2.6" stroke="var(--accent-contrast)" strokeWidth="2.1" fill="none" />
      </svg>
      <span className="font-display text-lg leading-none tracking-tight">{siteConfig.company.shortName}</span>
    </span>
  );

  if (!href) return mark;

  return (
    <Link href={href} className="rounded-lg" aria-label={`${siteConfig.company.name} — home`}>
      {mark}
    </Link>
  );
}
