import Link from "next/link";
import { IconArrowRight } from "@/components/icons";
import { CTABand } from "@/components/marketing/Blocks";
import { ServiceCard } from "@/components/marketing/Cards";
import { JourneyDiagram } from "@/components/marketing/JourneyDiagram";
import { Section, SectionHeading } from "@/components/ui/Section";
import { services } from "@/content/services";
import { E } from "@/lib/content";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Services",
  description:
    "Compliance assessment, guided or managed remediation, and role-based awareness training — three connected services that share one prioritised plan.",
  path: "/services",
});

export default function ServicesPage() {
  return (
    <>
      <Section className="border-b border-line">
        <E id="services.eyebrow" as="p" className="eyebrow">
          Services
        </E>
        <E id="services.title" as="h1" className="mt-5 max-w-4xl font-display text-display-lg">
          Find the risk, close it, and keep it closed
        </E>
        <E id="services.lead" as="p" className="prose-body mt-6 max-w-2xl text-lg">
          Each service can be bought on its own. Most organisations use them in sequence, because the findings from one
          set the agenda for the next.
        </E>
      </Section>

      <Section>
        <div className="grid gap-6 lg:grid-cols-3">
          {services.map((service) => (
            <ServiceCard key={service.slug} service={service} headingLevel="h2" />
          ))}
        </div>

        <div className="mt-20">
          <SectionHeading
            eyebrow="Where they fit"
            eyebrowId="services.fit.eyebrow"
            title="How the services sit in the programme"
            titleId="services.fit.title"
            lead="Assessment produces the report. The report drives remediation. Remediation and training close the gaps. Verification attests to the result, and annual reassessment keeps it current."
            leadId="services.fit.lead"
          />
          <div className="mt-12">
            <JourneyDiagram compact />
          </div>
          <Link href="/how-it-works" className="mt-10 inline-flex items-center gap-2 font-medium text-accent">
            See the full programme
            <IconArrowRight width={16} height={16} />
          </Link>
        </div>
      </Section>

      <CTABand
        id="services.cta"
        title="Not sure which service you need?"
        lead="Describe your situation and we will tell you plainly where to start — including if that is nowhere near a full programme."
      />
    </>
  );
}
