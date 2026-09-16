import Link from "next/link";
import { notFound } from "next/navigation";
import { IconArrowRight, IconQuote } from "@/components/icons";
import { CTABand } from "@/components/marketing/Blocks";
import { ArticleCard } from "@/components/marketing/Cards";
import { Section } from "@/components/ui/Section";
import { Placeholder } from "@/components/ui/Placeholder";
import { articles, type Block } from "@/content/insights";
import { jsonLdProps, pageMetadata } from "@/lib/seo";
import { siteConfig } from "@/site.config";

export function generateStaticParams() {
  return articles.map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = articles.find((item) => item.slug === slug);
  if (!article) return {};
  return pageMetadata({
    title: article.title,
    description: article.description,
    path: `/insights/${article.slug}`,
    // Drafts are kept out of search results until they carry real content.
    index: !article.draft,
  });
}

function renderBlock(block: Block, index: number) {
  switch (block.type) {
    case "heading":
      return (
        <h2 key={index} className="mt-12 font-display text-display-sm">
          {block.text}
        </h2>
      );
    case "paragraph":
      return (
        <p key={index} className="mt-5 leading-relaxed text-muted">
          {block.text}
        </p>
      );
    case "list":
      return (
        <ul key={index} className="mt-5 space-y-2.5">
          {block.items.map((item) => (
            <li key={item} className="flex gap-3 leading-relaxed text-muted">
              <span aria-hidden="true" className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-accent" />
              {item}
            </li>
          ))}
        </ul>
      );
    case "quote":
      return (
        <figure key={index} className="my-10 border-l-2 border-accent pl-6">
          <IconQuote width={22} height={22} className="text-accent" />
          <blockquote className="mt-3 font-display text-2xl leading-snug">{block.text}</blockquote>
          <figcaption className="mt-3 text-sm text-muted">{block.attribution}</figcaption>
        </figure>
      );
    case "callout":
      return (
        <aside key={index} className="my-10 rounded-card border border-dashed border-seal bg-surface-2 p-5" role="note">
          <p className="font-mono text-[0.7rem] uppercase tracking-wider text-seal">{block.title}</p>
          <p className="mt-2 text-sm leading-relaxed text-muted">{block.text}</p>
        </aside>
      );
  }
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = articles.find((item) => item.slug === slug);
  if (!article) notFound();

  const related = articles.filter((item) => item.slug !== article.slug).slice(0, 2);

  const schema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.description,
    author: { "@type": "Person", name: article.author.name },
    publisher: { "@type": "Organization", name: siteConfig.company.name, url: siteConfig.url },
    mainEntityOfPage: `${siteConfig.url}/insights/${article.slug}`,
  };

  return (
    <>
      <script {...jsonLdProps(schema)} />

      <article>
        <Section className="border-b border-line">
          <nav aria-label="Breadcrumb" className="mb-8 text-sm text-muted">
            <ol className="flex flex-wrap items-center gap-2">
              <li>
                <Link href="/insights" className="transition-colors hover:text-accent">
                  Insights
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li aria-current="page" className="text-body">
                {article.category}
              </li>
            </ol>
          </nav>

          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted">
              <span className="font-mono uppercase tracking-wider text-accent">{article.category}</span>
              <span aria-hidden="true">·</span>
              <span>{article.date}</span>
              <span aria-hidden="true">·</span>
              <span>{article.readingTime}</span>
              {article.draft ? <Placeholder>Draft — not for publication</Placeholder> : null}
            </div>
            <h1 className="mt-5 font-display text-display-lg">{article.title}</h1>
            <p className="prose-body mt-6 text-lg">{article.description}</p>
            <div className="mt-8 flex items-center gap-3 border-t border-line pt-6">
              <div className="h-10 w-10 rounded-full border border-dashed border-line-strong bg-surface-2" aria-hidden="true" />
              <div className="text-sm">
                <p className="font-medium">{article.author.name}</p>
                <p className="text-muted">{article.author.role}</p>
              </div>
            </div>
          </div>
        </Section>

        <Section>
          <div className="max-w-prose">{article.body.map(renderBlock)}</div>
        </Section>
      </article>

      <Section tone="tint" label="related">
        <h2 id="related" className="font-display text-display-sm">
          More insights
        </h2>
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {related.map((item) => (
            <ArticleCard key={item.slug} article={item} />
          ))}
        </div>
        <Link href="/insights" className="mt-8 inline-flex items-center gap-2 font-medium text-accent">
          All insights
          <IconArrowRight width={16} height={16} />
        </Link>
      </Section>

      <CTABand
        id={`article.${article.slug}.cta`}
        title="Turn reading into a plan"
        lead="An assessment gives you the specifics for your own organisation, in priority order."
      />
    </>
  );
}
