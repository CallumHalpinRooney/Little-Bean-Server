import type { ReactNode } from "react";

/**
 * Makes unfinished content impossible to miss. Every logo, quote, statistic,
 * case study and team member on this site uses one of these until real
 * material replaces it.
 */
export function Placeholder({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded border border-dashed border-line-strong bg-surface-2 px-1.5 py-0.5 font-mono text-[0.7rem] uppercase tracking-wider text-muted ${className}`}
    >
      {children}
    </span>
  );
}

/** Callout used where a whole block awaits real content or legal sign-off. */
export function PlaceholderNote({
  label = "Placeholder",
  children,
  className = "",
}: {
  label?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <aside
      className={`rounded-card border border-dashed border-line-strong bg-surface-2 p-5 text-sm leading-relaxed text-muted ${className}`}
      role="note"
    >
      <p className="mb-1.5 font-mono text-[0.7rem] uppercase tracking-wider text-seal">{label}</p>
      {children}
    </aside>
  );
}

/** Neutral grey box standing in for a client logo. */
export function LogoPlaceholder({ index }: { index: number }) {
  return (
    <div
      className="flex h-12 w-full items-center justify-center rounded border border-dashed border-line-strong bg-surface-2 px-4"
      aria-hidden="true"
    >
      <span className="font-mono text-[0.7rem] uppercase tracking-wider text-muted">Logo {index}</span>
    </div>
  );
}
