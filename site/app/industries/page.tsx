import { CTABand } from "@/components/marketing/Blocks";
import { CaseStudyCard, IndustryCard } from "@/components/marketing/Cards";
import { CredibilityNote } from "@/components/marketing/Proof";
import { Section, SectionHeading } from "@/components/ui/Section";
import { industries } from "@/content/industries";
import { E } from "@/lib/content";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Industries",
  description:
    "How data protection risk differs across financial services, healthcare, technology, retail, the public sector and professional services — and where we focus in each.",
  path: "/industries",
});

export default function IndustriesPage() {
  return (
    <>
      <Section className="border-b border-line">
        <E id="industries.eyebrow" as="p" className="eyebrow">
          Industries
        </E>
        <E id="industries.title" as="h1" className="mt-5 max-w-4xl font-display text-display-lg">
          The obligations are the same. The pressure points are not.
        </E>
        <E id="industries.lead" as="p" className="prose-body mt-6 max-w-2xl text-lg">
          Every assessment covers the same ten domains. What differs is where the risk concentrates, which findings tend
          to be material, and what your customers and regulators will ask you to evidence.
        </E>
      </Section>

      <Section>
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {industries.map((industry) => (
            <div key={industry.slug} id={industry.slug} className="scroll-mt-28">
              <IndustryCard industry={industry} headingLevel="h2" />
            </div>
          ))}
        </div>
      </Section>

      <Section tone="tint" label="Case studies">
        <SectionHeading
          eyebrow="Case studies"
          eyebrowId="industries.cases.eyebrow"
          title="Worked examples, once we can publish them"
          titleId="industries.cases.title"
          lead="We do not publish client work without written permission and an approved write-up. The structure below is ready for real material."
          leadId="industries.cases.lead"
        />
        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {[1, 2, 3].map((index) => (
            <CaseStudyCard key={index} index={index} />
          ))}
        </div>
        <div className="mt-8">
          <CredibilityNote />
        </div>
      </Section>

      <CTABand
        id="industries.cta"
        title="Ask about your sector specifically"
        lead="Tell us what your customers and regulators are asking for, and we will tell you where an assessment would focus."
      />
    </>
  );
}
