import Link from "next/link";
import { notFound } from "next/navigation";
import { Section } from "@/components/ui/Section";
import { PlaceholderNote } from "@/components/ui/Placeholder";
import { legalDocs } from "@/content/legal";
import { pageMetadata } from "@/lib/seo";

export function generateStaticParams() {
  return legalDocs.map((doc) => ({ slug: doc.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const doc = legalDocs.find((item) => item.slug === slug);
  if (!doc) return {};
  return pageMetadata({ title: doc.title, description: doc.description, path: `/legal/${doc.slug}` });
}

export default async function LegalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const doc = legalDocs.find((item) => item.slug === slug);
  if (!doc) notFound();

  return (
    <Section>
      <div className="grid gap-12 lg:grid-cols-[0.75fr_1.25fr] lg:gap-16">
        {/* Document switcher */}
        <nav aria-label="Legal documents" className="lg:sticky lg:top-28 lg:self-start">
          <p className="font-mono text-[0.7rem] uppercase tracking-wider text-muted">Legal</p>
          <ul className="mt-4 space-y-1.5">
            {legalDocs.map((item) => (
              <li key={item.slug}>
                <Link
                  href={`/legal/${item.slug}`}
                  aria-current={item.slug === doc.slug ? "page" : undefined}
                  className={`block rounded-lg px-3 py-2 text-sm transition-colors hover:bg-surface-2 ${
                    item.slug === doc.slug ? "bg-surface-2 font-medium text-accent" : "text-muted"
                  }`}
                >
                  {item.title}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <article>
          <h1 className="font-display text-display-lg">{doc.title}</h1>
          <p className="mt-3 font-mono text-xs text-muted">Last updated: {doc.lastUpdated}</p>
          <p className="prose-body mt-6 max-w-prose text-lg">{doc.summary}</p>

          <PlaceholderNote label="Template — legal review required" className="mt-8">
            This document is a drafting template, not legal advice, and it is not fit to publish as it stands. Every
            bracketed placeholder must be completed and the whole document reviewed and approved by a qualified Irish or
            EU legal adviser before launch.
          </PlaceholderNote>

          <div className="mt-12 max-w-prose space-y-10">
            {doc.sections.map((section) => (
              <section key={section.heading}>
                <h2 className="font-display text-display-sm">{section.heading}</h2>
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph} className="mt-4 leading-relaxed text-muted">
                    {paragraph}
                  </p>
                ))}
                {section.list ? (
                  <ul className="mt-5 space-y-2.5">
                    {section.list.map((item) => (
                      <li key={item} className="flex gap-3 leading-relaxed text-muted">
                        <span aria-hidden="true" className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-accent" />
                        {item}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </section>
            ))}
          </div>
        </article>
      </div>
    </Section>
  );
}
