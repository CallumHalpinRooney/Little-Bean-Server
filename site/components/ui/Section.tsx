import type { ReactNode } from "react";
import { E } from "@/lib/content";

type SectionProps = {
  children: ReactNode;
  id?: string;
  className?: string;
  /** `tint` lifts the band off the page background for rhythm. */
  tone?: "default" | "tint" | "ink";
  labelledBy?: string;
};

export function Section({ children, id, className = "", tone = "default", labelledBy }: SectionProps) {
  const tones = {
    default: "",
    tint: "bg-surface-2",
    ink: "bg-ink-950 text-ink-50 dark:bg-ink-900",
  } as const;

  return (
    <section id={id} aria-labelledby={labelledBy} className={`py-section ${tones[tone]} ${className}`}>
      <div className="shell">{children}</div>
    </section>
  );
}

type HeadingProps = {
  eyebrowId?: string;
  eyebrow?: string;
  titleId: string;
  title: string;
  leadId?: string;
  lead?: string;
  /** Heading level — keeps document outline correct per page. */
  level?: "h1" | "h2" | "h3";
  align?: "left" | "center";
  anchor?: string;
  className?: string;
};

export function SectionHeading({
  eyebrow,
  eyebrowId,
  title,
  titleId,
  lead,
  leadId,
  level = "h2",
  align = "left",
  anchor,
  className = "",
}: HeadingProps) {
  const sizes = { h1: "text-display-xl", h2: "text-display-md", h3: "text-display-sm" } as const;

  return (
    <div className={`${align === "center" ? "mx-auto max-w-3xl text-center" : "max-w-3xl"} ${className}`}>
      {eyebrow && eyebrowId ? <E id={eyebrowId} as="p" className="eyebrow mb-4 block">{eyebrow}</E> : null}
      <E id={titleId} as={level} className={`${sizes[level]} font-display`}>
        {title}
      </E>
      {lead && leadId ? <E id={leadId} as="p" className="prose-body mt-5">{lead}</E> : null}
      {anchor ? <span id={anchor} className="sr-only" /> : null}
    </div>
  );
}
