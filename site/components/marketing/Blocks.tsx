import Link from "next/link";
import type { ElementType } from "react";
import { IconArrowRight, IconCheck, IconChevronDown, IconDash } from "@/components/icons";
import { ButtonLink } from "@/components/ui/Button";
import { assessmentDomains } from "@/content/assessment-domains";
import type { ComparisonRow } from "@/content/services";
import type { Tier } from "@/content/pricing";
import { E } from "@/lib/content";
import { siteConfig } from "@/site.config";

/** Closing call to action used at the foot of most pages. */
export function CTABand({
  id,
  title,
  lead,
  primary = siteConfig.cta.primary,
  secondary = siteConfig.cta.secondary,
}: {
  id: string;
  title: string;
  lead: string;
  primary?: { label: string; href: string };
  secondary?: { label: string; href: string };
}) {
  return (
    <section className="py-section" aria-label={title}>
      <div className="shell">
        <div className="card relative overflow-hidden bg-ink-950 p-8 text-ink-50 md:p-14 dark:bg-ink-900">
          {/* Decorative grid, drawn rather than photographed. */}
          <svg
            className="pointer-events-none absolute -right-16 -top-16 h-72 w-72 text-ink-700"
            viewBox="0 0 200 200"
            aria-hidden="true"
          >
            <defs>
              <pattern id={`grid-${id}`} width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M20 0H0v20" fill="none" stroke="currentColor" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="200" height="200" fill={`url(#grid-${id})`} />
            <circle cx="140" cy="60" r="34" fill="none" stroke="var(--brass)" strokeWidth="1.5" />
          </svg>

          <div className="relative max-w-2xl">
            <E id={`${id}.title`} as="h2" className="font-display text-display-md">
              {title}
            </E>
            <E id={`${id}.lead`} as="p" className="mt-4 text-base leading-relaxed text-ink-200">
              {lead}
            </E>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href={primary.href} size="lg">
                {primary.label}
                <IconArrowRight width={16} height={16} />
              </ButtonLink>
              <Link
                href={secondary.href}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-ink-400 px-6 py-3.5 text-base text-ink-50 transition-colors hover:border-ink-200"
              >
                {secondary.label}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Native disclosure — keyboard accessible without any JavaScript. */
export function FAQ({ items }: { items: { question: string; answer: string }[] }) {
  return (
    <div className="divide-y divide-[color:var(--line)] border-y border-line">
      {items.map((item) => (
        <details key={item.question} className="group py-5">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-left font-medium marker:hidden">
            {item.question}
            <IconChevronDown
              width={18}
              height={18}
              className="shrink-0 text-muted transition-transform group-open:rotate-180"
            />
          </summary>
          <p className="mt-3 max-w-prose text-sm leading-relaxed text-muted">{item.answer}</p>
        </details>
      ))}
    </div>
  );
}

/** The ten assessment domains. */
export function DomainGrid() {
  return (
    <ol className="grid gap-px overflow-hidden rounded-card border border-line bg-line md:grid-cols-2">
      {assessmentDomains.map((domain) => (
        <li key={domain.code} className="bg-surface p-6">
          <p className="font-mono text-[0.7rem] tracking-wider text-accent">{domain.code}</p>
          <h3 className="mt-2 font-display text-xl">{domain.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted">{domain.description}</p>
        </li>
      ))}
    </ol>
  );
}

/** Guided vs Managed comparison. */
export function ComparisonTable({ rows }: { rows: ComparisonRow[] }) {
  function cell(value: string | boolean, label: string) {
    if (value === true) {
      return (
        <>
          <IconCheck width={18} height={18} className="text-accent" aria-hidden="true" />
          <span className="sr-only">Included in {label}</span>
        </>
      );
    }
    if (value === false) {
      return (
        <>
          <IconDash width={18} height={18} className="text-muted" aria-hidden="true" />
          <span className="sr-only">Not included in {label}</span>
        </>
      );
    }
    return <span className="text-sm text-muted">{value}</span>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[42rem] border-collapse text-left">
        <caption className="sr-only">Comparison of Guided Remediation and Managed Remediation</caption>
        <thead>
          <tr className="border-b border-line-strong">
            <th scope="col" className="py-4 pr-4 text-sm font-medium">
              <span className="sr-only">Feature</span>
            </th>
            <th scope="col" className="py-4 pr-4 align-bottom">
              <span className="block font-display text-xl">Guided</span>
              <span className="mt-1 block text-xs font-normal text-muted">Your team implements</span>
            </th>
            <th scope="col" className="py-4 align-bottom">
              <span className="block font-display text-xl">Managed</span>
              <span className="mt-1 block text-xs font-normal text-muted">Our specialists implement with you</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.feature} className="border-b border-line align-top">
              <th scope="row" className="py-4 pr-6 text-sm font-normal">
                {row.feature}
              </th>
              <td className="py-4 pr-6">{cell(row.guided, "Guided Remediation")}</td>
              <td className="py-4">{cell(row.managed, "Managed Remediation")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Package tiers. */
export function PricingTiers({ tiers, headingLevel: Heading = "h3" }: { tiers: Tier[]; headingLevel?: ElementType }) {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {tiers.map((tier) => (
        <article
          key={tier.id}
          className={`card flex h-full flex-col p-7 ${tier.featured ? "border-accent ring-1 ring-[color:var(--accent)]" : ""}`}
        >
          {tier.featured ? (
            <p className="mb-4 inline-flex w-fit rounded-full bg-accent-soft px-3 py-1 font-mono text-[0.7rem] uppercase tracking-wider text-accent">
              Most chosen
            </p>
          ) : null}
          <Heading className="font-display text-2xl">{tier.name}</Heading>
          <p className="mt-2 text-sm leading-relaxed text-muted">{tier.positioning}</p>

          <div className="mt-6 border-y border-line py-5">
            <p className="font-display text-display-sm">{tier.price}</p>
            <p className="mt-1 text-xs text-muted">{tier.priceNote}</p>
          </div>

          <p className="mt-5 text-sm leading-relaxed text-muted">
            <span className="font-medium text-body">Best for: </span>
            {tier.bestFor}
          </p>

          <ul className="mt-5 flex-1 space-y-2.5">
            {tier.includes.map((item) => (
              <li key={item} className="flex gap-2.5 text-sm leading-relaxed">
                <IconCheck width={16} height={16} className="mt-1 shrink-0 text-accent" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>

          <ButtonLink
            href={`/contact?package=${tier.id}`}
            variant={tier.featured ? "primary" : "secondary"}
            size="lg"
            className="mt-7"
          >
            {tier.ctaLabel}
          </ButtonLink>
        </article>
      ))}
    </div>
  );
}

/**
 * Abstract figure of the manager dashboard: risk by domain. Values are
 * illustrative placeholders, labelled as such.
 */
export function RiskFigure() {
  const bars = [
    { label: "Lawful basis", value: 78 },
    { label: "Records", value: 54 },
    { label: "Subject rights", value: 66 },
    { label: "Retention", value: 32 },
    { label: "Processors", value: 45 },
    { label: "Security", value: 84 },
    { label: "Breach", value: 61 },
    { label: "DPIAs", value: 38 },
    { label: "Transfers", value: 49 },
    { label: "Awareness", value: 72 },
  ];

  return (
    <figure className="card p-6">
      <figcaption className="flex items-baseline justify-between gap-4">
        <span className="font-display text-xl">Domain scores</span>
        <span className="font-mono text-[0.7rem] uppercase tracking-wider text-muted">Illustrative only</span>
      </figcaption>
      <ul className="mt-6 space-y-3">
        {bars.map((bar) => (
          <li key={bar.label} className="grid grid-cols-[7.5rem_1fr_2.5rem] items-center gap-3 text-sm">
            <span className="truncate text-muted">{bar.label}</span>
            <span className="h-2 overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
              <span
                className="block h-full rounded-full bg-accent"
                style={{ width: `${bar.value}%` }}
              />
            </span>
            <span className="text-right font-mono text-xs tabular text-muted">{bar.value}</span>
          </li>
        ))}
      </ul>
      <p className="mt-5 border-t border-line pt-4 text-xs leading-relaxed text-muted">
        Scores shown are placeholder values for layout purposes and do not represent any organisation.
      </p>
    </figure>
  );
}
