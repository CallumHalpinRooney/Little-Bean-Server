import Link from "next/link";
import { IconArrowRight, IconCheck } from "@/components/icons";
import { AttestationSeal } from "@/components/marketing/Attestation";
import { CTABand, RiskFigure } from "@/components/marketing/Blocks";
import { ServiceCard, TestimonialCard } from "@/components/marketing/Cards";
import { JourneyDiagram } from "@/components/marketing/JourneyDiagram";
import { CredibilityNote, LogoBar, StatsBand, TrustBadges } from "@/components/marketing/Proof";
import { ButtonLink } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { Section, SectionHeading } from "@/components/ui/Section";
import { services } from "@/content/services";
import { E } from "@/lib/content";
import { pageMetadata } from "@/lib/seo";
import { siteConfig } from "@/site.config";

export const metadata = pageMetadata({
  title: "Assess, remediate and evidence your data protection risk",
  description: siteConfig.company.description,
  path: "/",
});

const whyItMatters = [
  {
    title: "Regulatory exposure",
    body: "Infringements of the GDPR carry administrative fines set out in Article 83, up to the higher tiers for the most serious breaches. Supervisory authorities also have corrective powers including orders to stop processing.",
    source: "[SOURCE NEEDED: cite Article 83 and current DPC enforcement figures with dates]",
  },
  {
    title: "The cost of an incident",
    body: "The direct cost of a breach — investigation, notification, legal advice, remediation and downtime — is typically dwarfed by the operational disruption that follows it.",
    source: "[SOURCE NEEDED: cite a dated, named study for any breach cost figure]",
  },
  {
    title: "Customer trust",
    body: "Customers and partners increasingly ask how their data is handled before they commit. A clear, evidenced answer shortens that conversation instead of stalling it.",
    source: "[SOURCE NEEDED: cite a dated source if you quote trust or churn figures]",
  },
  {
    title: "Tender requirements",
    body: "Public and enterprise procurement routinely requires evidence of data protection controls and staff training. Without it, otherwise strong bids are scored down or excluded.",
    source: "[SOURCE NEEDED: cite representative tender requirements or frameworks]",
  },
];

export default function HomePage() {
  return (
    <>
      {/* ---------------------------------------------------------------- Hero */}
      <section className="relative overflow-hidden border-b border-line" aria-labelledby="hero-title">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.45] dark:opacity-30"
          aria-hidden="true"
          style={{
            backgroundImage:
              "radial-gradient(60rem 30rem at 85% -10%, var(--accent-soft), transparent 60%)",
          }}
        />
        <div className="shell relative grid gap-14 py-16 md:py-24 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:gap-16">
          <div>
            <E id="home.hero.eyebrow" as="p" className="eyebrow">
              Data protection & cyber risk · Ireland and the EU
            </E>
            <E id="home.hero.title" as="h1" className="mt-5 font-display text-display-xl">
              Know where your data protection risk sits — then close it, and prove it.
            </E>
            <E id="home.hero.lead" as="p" className="prose-body mt-6 max-w-xl text-lg">
              {`{company} assesses your organisation against ten data protection domains, helps you close the gaps, trains your people on the risks that reach them, and issues a dated attestation you can put in front of customers, partners and procurement teams.`}
            </E>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href={siteConfig.cta.secondary.href} size="lg">
                {siteConfig.cta.secondary.label}
                <IconArrowRight width={16} height={16} />
              </ButtonLink>
              <ButtonLink href={siteConfig.cta.primary.href} variant="secondary" size="lg">
                {siteConfig.cta.primary.label}
              </ButtonLink>
            </div>

            <ul className="mt-9 flex flex-wrap gap-x-6 gap-y-2.5 text-sm text-muted">
              {["Independent assessment", "Irish and EU focused", "Specialist-reviewed, not automated"].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <IconCheck width={16} height={16} className="text-accent" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <Reveal className="lg:pl-4">
            <RiskFigure />
          </Reveal>
        </div>
      </section>

      {/* ----------------------------------------------------------- Logo bar */}
      <Section tone="tint" className="!py-12">
        <LogoBar />
      </Section>

      {/* ------------------------------------------------------------ Journey */}
      <Section id="journey" labelledBy="journey-title">
        <SectionHeading
          eyebrow="The programme"
          eyebrowId="home.journey.eyebrow"
          title="One route from unknown risk to evidenced assurance"
          titleId="home.journey.title"
          lead="Six stages, run once and then maintained annually. Each stage produces something concrete: a completed assessment, a scored report, a closed gap register, trained staff, a dated attestation."
          leadId="home.journey.lead"
        />
        <span id="journey-title" className="sr-only">
          The customer journey
        </span>
        <div className="mt-14">
          <JourneyDiagram />
        </div>
        <div className="mt-12">
          <Link href="/how-it-works" className="inline-flex items-center gap-2 font-medium text-accent">
            See how it works in detail
            <IconArrowRight width={16} height={16} />
          </Link>
        </div>
      </Section>

      {/* ----------------------------------------------------------- Services */}
      <Section tone="tint" labelledBy="services-title">
        <SectionHeading
          eyebrow="Services"
          eyebrowId="home.services.eyebrow"
          title="Three connected services, not three separate projects"
          titleId="home.services.title"
          lead="Each service stands on its own. Together they form a loop: what the assessment finds shapes the remediation plan, and what remediation changes shapes the training your people receive."
          leadId="home.services.lead"
        />
        <span id="services-title" className="sr-only">
          Our services
        </span>
        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {services.map((service) => (
            <ServiceCard key={service.slug} service={service} />
          ))}
        </div>
      </Section>

      {/* ----------------------------------------------------- Why it matters */}
      <Section labelledBy="why-title">
        <SectionHeading
          eyebrow="Why it matters"
          eyebrowId="home.why.eyebrow"
          title="Four pressures, one underlying question"
          titleId="home.why.title"
          lead="Regulators, customers and procurement teams are all asking the same thing in different words: can you show what you do with personal data, and evidence that it works?"
          leadId="home.why.lead"
        />
        <span id="why-title" className="sr-only">
          Why data protection risk matters
        </span>
        <div className="mt-12 grid gap-px overflow-hidden rounded-card border border-line bg-line md:grid-cols-2">
          {whyItMatters.map((item) => (
            <div key={item.title} className="bg-surface p-7">
              <h3 className="font-display text-2xl">{item.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted">{item.body}</p>
              <p className="mt-4 font-mono text-[0.7rem] leading-relaxed text-seal">{item.source}</p>
            </div>
          ))}
        </div>
        <p className="mt-6 max-w-prose text-xs leading-relaxed text-muted">
          We publish no statistic we cannot attribute to a named, dated source. Every claim above is descriptive until a
          citation replaces the marker.
        </p>
      </Section>

      {/* ----------------------------------------------------------- Verified */}
      <Section tone="tint" labelledBy="verified-title">
        <div className="grid items-center gap-12 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="flex justify-center lg:justify-start">
            <AttestationSeal size={220} />
          </div>
          <div>
            <E id="home.verified.eyebrow" as="p" className="eyebrow">
              Verified attestation
            </E>
            <E id="home.verified.title" as="h2" className="mt-5 font-display text-display-md">
              Evidence you can hand to a procurement team
            </E>
            <span id="verified-title" className="sr-only">
              The Verified attestation
            </span>
            <E id="home.verified.lead" as="p" className="prose-body mt-5">
              {`Organisations that meet the required standard receive a dated {company} Verified attestation — a digital badge for your website and a certificate for tenders, audits and customer due diligence.`}
            </E>
            <div className="mt-6 rounded-card border border-dashed border-seal bg-surface p-5">
              <p className="text-sm leading-relaxed text-muted">
                <strong className="font-medium text-body">What it is and is not.</strong> It confirms your organisation
                was independently assessed by {siteConfig.company.name} against our published criteria and met the
                required standard on the date shown. It is not a GDPR certification under Article 42, and it is not
                issued, approved or endorsed by the Data Protection Commission or any supervisory authority.
              </p>
            </div>
            <Link href="/verified" className="mt-6 inline-flex items-center gap-2 font-medium text-accent">
              How organisations earn it
              <IconArrowRight width={16} height={16} />
            </Link>
          </div>
        </div>
      </Section>

      {/* -------------------------------------------------------------- Trust */}
      <Section labelledBy="trust-title">
        <SectionHeading
          eyebrow="Trust"
          eyebrowId="home.trust.eyebrow"
          title="We hold our own data to the standard we assess you against"
          titleId="home.trust.title"
          lead="Your assessment responses describe your weaknesses in detail. How we store, restrict and retain that information is set out in full on our trust page."
          leadId="home.trust.lead"
        />
        <span id="trust-title" className="sr-only">
          Trust and security
        </span>
        <div className="mt-10">
          <TrustBadges />
        </div>
        <div className="mt-6">
          <Link href="/trust" className="inline-flex items-center gap-2 font-medium text-accent">
            Read our trust and security page
            <IconArrowRight width={16} height={16} />
          </Link>
        </div>

        <div className="mt-16">
          <StatsBand />
        </div>

        <div className="mt-16 grid gap-6 lg:grid-cols-3">
          {[1, 2, 3].map((index) => (
            <TestimonialCard key={index} index={index} />
          ))}
        </div>

        <div className="mt-8">
          <CredibilityNote />
        </div>
      </Section>

      <CTABand
        id="home.cta"
        title="Start with a clear picture of where you stand"
        lead="Tell us about your organisation and a specialist will scope an assessment with you. No obligation, and no sales sequence."
      />
    </>
  );
}
