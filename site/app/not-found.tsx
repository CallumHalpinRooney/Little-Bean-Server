import Link from "next/link";
import { IconArrowRight } from "@/components/icons";
import { ButtonLink } from "@/components/ui/Button";
import { Section } from "@/components/ui/Section";

export const metadata = {
  title: "Page not found",
  robots: { index: false, follow: true },
};

const suggestions = [
  { label: "How it works", href: "/how-it-works", description: "The six-stage programme in detail" },
  { label: "Compliance assessment", href: "/services/compliance-assessment", description: "The ten domains we assess" },
  { label: "Verified attestation", href: "/verified", description: "What it is, and what it is not" },
  { label: "Book a consultation", href: "/contact", description: "Talk to a specialist" },
];

export default function NotFound() {
  return (
    <Section>
      <div className="grid gap-12 lg:grid-cols-[1fr_1fr] lg:items-center">
        <div>
          <p className="eyebrow">Error 404</p>
          <h1 className="mt-5 font-display text-display-lg">This page is not where you expected it</h1>
          <p className="prose-body mt-6 max-w-xl">
            The link may be out of date, or the page may have moved. Nothing has gone wrong with your request — and
            nothing about your visit was logged to a third party.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/" size="lg">
              Back to the homepage
              <IconArrowRight width={16} height={16} />
            </ButtonLink>
            <ButtonLink href="/contact" variant="secondary" size="lg">
              Tell us about the broken link
            </ButtonLink>
          </div>
        </div>

        <div>
          {/* A 404 drawn as a broken assessment trail. */}
          <svg viewBox="0 0 400 220" className="w-full" role="img" aria-label="Illustration of an interrupted path">
            <line x1="20" y1="110" x2="150" y2="110" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" />
            <line
              x1="170"
              y1="110"
              x2="250"
              y2="110"
              stroke="var(--line-strong)"
              strokeWidth="2"
              strokeDasharray="5 7"
              strokeLinecap="round"
            />
            <line x1="270" y1="110" x2="380" y2="110" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" />
            {[20, 80, 140, 280, 340, 380].map((x) => (
              <circle key={x} cx={x} cy="110" r="6" fill="none" stroke="var(--accent)" strokeWidth="2" />
            ))}
            <g stroke="var(--brass)" strokeWidth="2" strokeLinecap="round">
              <line x1="200" y1="92" x2="220" y2="128" />
              <line x1="220" y1="92" x2="200" y2="128" />
            </g>
          </svg>

          <ul className="mt-8 grid gap-3 sm:grid-cols-2">
            {suggestions.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="card block p-4 transition-colors hover:border-accent">
                  <span className="text-sm font-medium">{item.label}</span>
                  <span className="mt-1 block text-xs leading-relaxed text-muted">{item.description}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Section>
  );
}
