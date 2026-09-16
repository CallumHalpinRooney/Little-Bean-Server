import Link from "next/link";
import type { ElementType } from "react";
import { getIcon } from "@/components/icons/map";
import { IconArrowRight, IconQuote } from "@/components/icons";
import { Placeholder } from "@/components/ui/Placeholder";
import type { Article } from "@/content/insights";
import type { Industry } from "@/content/industries";
import type { Service } from "@/content/services";

export function ServiceCard({ service, headingLevel = "h3" }: { service: Service; headingLevel?: ElementType }) {
  const Icon = getIcon(service.icon);
  const Heading = headingLevel;
  return (
    <article className="card group relative flex h-full flex-col p-6 transition-colors hover:border-accent">
      <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-accent-soft text-accent">
        <Icon width={22} height={22} />
      </span>
      <Heading className="mt-5 font-display text-2xl">
        <Link href={`/services/${service.slug}`} className="after:absolute after:inset-0 focus-visible:outline-none">
          {service.navLabel}
        </Link>
      </Heading>
      <p className="mt-2.5 flex-1 text-sm leading-relaxed text-muted">{service.summary}</p>
      <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-accent">
        Explore
        <IconArrowRight width={15} height={15} className="transition-transform group-hover:translate-x-0.5" />
      </span>
    </article>
  );
}

export function IndustryCard({ industry, headingLevel = "h3" }: { industry: Industry; headingLevel?: ElementType }) {
  const Icon = getIcon(industry.icon);
  const Heading = headingLevel;
  return (
    <article className="card h-full p-6">
      <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-accent-soft text-accent">
        <Icon width={22} height={22} />
      </span>
      <Heading className="mt-5 font-display text-2xl">{industry.name}</Heading>
      <p className="mt-2.5 text-sm leading-relaxed text-muted">{industry.lead}</p>
      <ul className="mt-4 space-y-2">
        {industry.pressures.map((pressure) => (
          <li key={pressure} className="flex gap-2.5 text-sm leading-relaxed text-muted">
            <span aria-hidden="true" className="mt-2 h-1 w-1 shrink-0 rounded-full bg-accent" />
            {pressure}
          </li>
        ))}
      </ul>
      <p className="mt-4 border-t border-line pt-4 text-sm leading-relaxed text-muted">{industry.focus}</p>
    </article>
  );
}

export function ArticleCard({ article, headingLevel = "h3" }: { article: Article; headingLevel?: ElementType }) {
  const Heading = headingLevel;
  return (
    <article className="card group relative flex h-full flex-col p-6 transition-colors hover:border-accent">
      <div className="flex items-center gap-3 text-xs text-muted">
        <span className="font-mono uppercase tracking-wider text-accent">{article.category}</span>
        <span aria-hidden="true">·</span>
        <span>{article.date}</span>
      </div>
      <Heading className="mt-3 font-display text-2xl leading-snug">
        <Link href={`/insights/${article.slug}`} className="after:absolute after:inset-0">
          {article.title}
        </Link>
      </Heading>
      <p className="mt-2.5 flex-1 text-sm leading-relaxed text-muted">{article.description}</p>
      <div className="mt-5 flex items-center justify-between text-xs text-muted">
        <span>{article.author.name}</span>
        {article.draft ? <Placeholder>Draft</Placeholder> : null}
      </div>
    </article>
  );
}

/**
 * Testimonial shell. Ships with placeholder content only — replace with a
 * real, attributable quote that you hold written permission to publish.
 */
export function TestimonialCard({ index }: { index: number }) {
  return (
    <figure className="card flex h-full flex-col p-6">
      <IconQuote width={26} height={26} className="text-accent" />
      <blockquote className="mt-4 flex-1 text-base leading-relaxed">
        <p>[PLACEHOLDER: customer quote {index}. Do not publish until the quote is approved in writing by the named individual.]</p>
      </blockquote>
      <figcaption className="mt-5 border-t border-line pt-4 text-sm">
        <span className="block font-medium">[PLACEHOLDER: name]</span>
        <span className="block text-muted">[PLACEHOLDER: role], [PLACEHOLDER: organisation]</span>
      </figcaption>
    </figure>
  );
}

/** Case study shell — structure only, no invented outcomes. */
export function CaseStudyCard({ index }: { index: number }) {
  return (
    <article className="card flex h-full flex-col p-6">
      <Placeholder>Case study {index}</Placeholder>
      <h3 className="mt-4 font-display text-2xl">[PLACEHOLDER: headline outcome]</h3>
      <dl className="mt-4 space-y-3 text-sm">
        <div>
          <dt className="font-medium">Sector</dt>
          <dd className="text-muted">[PLACEHOLDER]</dd>
        </div>
        <div>
          <dt className="font-medium">Challenge</dt>
          <dd className="text-muted">[PLACEHOLDER: what the organisation needed to resolve]</dd>
        </div>
        <div>
          <dt className="font-medium">What we did</dt>
          <dd className="text-muted">[PLACEHOLDER: services delivered]</dd>
        </div>
        <div>
          <dt className="font-medium">Result</dt>
          <dd className="text-muted">[PLACEHOLDER: measurable outcome, approved by the client]</dd>
        </div>
      </dl>
    </article>
  );
}
