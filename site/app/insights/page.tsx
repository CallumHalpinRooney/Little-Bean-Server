import { CTABand } from "@/components/marketing/Blocks";
import { ArticleCard } from "@/components/marketing/Cards";
import { Section } from "@/components/ui/Section";
import { PlaceholderNote } from "@/components/ui/Placeholder";
import { articles } from "@/content/insights";
import { E } from "@/lib/content";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Insights",
  description:
    "Practical writing on data protection assessment, remediation, awareness training and what enterprise buyers ask suppliers to evidence.",
  path: "/insights",
});

export default function InsightsPage() {
  return (
    <>
      <Section className="border-b border-line">
        <E id="insights.eyebrow" as="p" className="eyebrow">
          Insights
        </E>
        <E id="insights.title" as="h1" className="mt-5 max-w-4xl font-display text-display-lg">
          Notes from the work
        </E>
        <E id="insights.lead" as="p" className="prose-body mt-6 max-w-2xl text-lg">
          What we see repeatedly in assessments, what procurement teams actually ask for, and how to make awareness
          training change behaviour rather than completion rates.
        </E>
      </Section>

      <Section>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {articles.map((article) => (
            <ArticleCard key={article.slug} article={article} headingLevel="h2" />
          ))}
        </div>

        <PlaceholderNote label="Editorial" className="mt-12">
          All three articles are placeholder drafts demonstrating the template. Replace the bodies with real editorial,
          give each a named author and a publication date, and attribute every figure to a named, dated source before
          publishing.
        </PlaceholderNote>
      </Section>

      <CTABand
        id="insights.cta"
        title="Prefer to talk it through?"
        lead="Reading about it only goes so far. A short call will tell you where your own gaps are likely to be."
      />
    </>
  );
}
