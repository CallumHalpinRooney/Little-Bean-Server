import { CTABand, FAQ, PricingTiers } from "@/components/marketing/Blocks";
import { Section, SectionHeading } from "@/components/ui/Section";
import { PlaceholderNote } from "@/components/ui/Placeholder";
import { pricingFaqs, tiers } from "@/content/pricing";
import { E } from "@/lib/content";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Packages",
  description:
    "Essentials, Professional and Enterprise packages covering assessment, remediation, training and the Verified attestation. Scoped and quoted per organisation.",
  path: "/pricing",
});

export default function PricingPage() {
  return (
    <>
      <Section className="border-b border-line">
        <E id="pricing.eyebrow" as="p" className="eyebrow">
          Packages
        </E>
        <E id="pricing.title" as="h1" className="mt-5 max-w-4xl font-display text-display-lg">
          Three packages, scoped to your organisation
        </E>
        <E id="pricing.lead" as="p" className="prose-body mt-6 max-w-2xl text-lg">
          Cost follows scope: entities, systems, processors and headcount. We scope on a short call, quote against that
          scope, and hold the price for the engagement.
        </E>
      </Section>

      <Section>
        <PricingTiers tiers={tiers} headingLevel="h2" />
        <PlaceholderNote label="Before launch" className="mt-10">
          Package inclusions above are placeholders. Confirm exactly what each tier contains, the training seat model,
          reassessment terms and any minimum commitment, and have the commercial terms reviewed before publishing.
        </PlaceholderNote>
      </Section>

      <Section tone="tint" label="Pricing questions">
        <SectionHeading eyebrow="Questions" eyebrowId="pricing.faq.eyebrow" title="How pricing works" titleId="pricing.faq.title" />
        <div className="mt-10 max-w-3xl">
          <FAQ items={pricingFaqs} />
        </div>
      </Section>

      <CTABand
        id="pricing.cta"
        title="Get a scoped quote"
        lead="A short call is enough to size the work. You will get a written proposal with scope, timeline and cost."
        primary={{ label: "Contact sales", href: "/contact" }}
      />
    </>
  );
}
