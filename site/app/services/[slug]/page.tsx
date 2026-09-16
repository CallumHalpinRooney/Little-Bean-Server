import { notFound } from "next/navigation";
import Link from "next/link";
import { getIcon } from "@/components/icons/map";
import { IconArrowRight, IconCheck } from "@/components/icons";
import { CTABand, ComparisonTable, DomainGrid, RiskFigure } from "@/components/marketing/Blocks";
import { CertificatePreview } from "@/components/marketing/Attestation";
import { Section, SectionHeading } from "@/components/ui/Section";
import { PlaceholderNote } from "@/components/ui/Placeholder";
import { remediationComparison, services, trainingTopics } from "@/content/services";
import { jsonLdProps, pageMetadata, serviceSchema } from "@/lib/seo";

export function generateStaticParams() {
  return services.map((service) => ({ slug: service.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const service = services.find((item) => item.slug === slug);
  if (!service) return {};
  return pageMetadata({
    title: service.navLabel,
    description: service.metaDescription,
    path: `/services/${service.slug}`,
  });
}

export default async function ServicePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const service = services.find((item) => item.slug === slug);
  if (!service) notFound();

  const Icon = getIcon(service.icon);

  return (
    <>
      <script {...jsonLdProps(serviceSchema({ name: service.name, description: service.metaDescription, path: `/services/${service.slug}` }))} />

      <Section className="border-b border-line">
        <nav aria-label="Breadcrumb" className="mb-8 text-sm text-muted">
          <ol className="flex flex-wrap items-center gap-2">
            <li>
              <Link href="/services" className="transition-colors hover:text-accent">
                Services
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="text-body">
              {service.navLabel}
            </li>
          </ol>
        </nav>

        <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent-soft text-accent">
              <Icon width={24} height={24} />
            </span>
            <h1 className="mt-6 font-display text-display-lg">{service.heroTitle}</h1>
            <p className="prose-body mt-6 max-w-xl text-lg">{service.heroLead}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/start"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-6 py-3.5 text-base font-medium text-accent-contrast transition-colors hover:bg-accent-hover"
              >
                Start your assessment
                <IconArrowRight width={16} height={16} />
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-control px-6 py-3.5 text-base transition-colors hover:border-accent hover:text-accent"
              >
                Book a consultation
              </Link>
            </div>
          </div>

          <div className="card p-7">
            <h2 className="font-mono text-[0.7rem] uppercase tracking-wider text-muted">What you get out of it</h2>
            <ul className="mt-5 space-y-3">
              {service.outcomes.map((outcome) => (
                <li key={outcome} className="flex gap-3 text-sm leading-relaxed">
                  <IconCheck width={17} height={17} className="mt-0.5 shrink-0 text-accent" aria-hidden="true" />
                  {outcome}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      <Section label="Features">
        <SectionHeading
          eyebrow="How it works"
          eyebrowId={`service.${service.slug}.features.eyebrow`}
          title="What the service actually involves"
          titleId={`service.${service.slug}.features.title`}
        />
        <div className="mt-12 grid gap-px overflow-hidden rounded-card border border-line bg-line md:grid-cols-2">
          {service.features.map((feature) => (
            <div key={feature.title} className="bg-surface p-7">
              <h3 className="font-display text-2xl">{feature.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted">{feature.description}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Service-specific detail */}
      {service.slug === "compliance-assessment" ? (
        <Section tone="tint" label="Assessment domains">
          <SectionHeading
            eyebrow="Scope"
            eyebrowId="service.assessment.domains.eyebrow"
            title="Ten domains, each rated for risk"
            titleId="service.assessment.domains.title"
            lead="Every assessment covers all ten. Each is scored, rated and reported separately, so effort can be directed at the areas carrying the most risk."
            leadId="service.assessment.domains.lead"
          />
          <div className="mt-12">
            <DomainGrid />
          </div>
          <div className="mt-12 grid gap-8 lg:grid-cols-2 lg:items-start">
            <RiskFigure />
            <PlaceholderNote label="Report contents">
              <p className="mb-3">Your Compliance Assessment Report contains:</p>
              <ul className="space-y-1.5">
                {service.deliverables.map((item) => (
                  <li key={item}>— {item}</li>
                ))}
              </ul>
              <p className="mt-3">[PLACEHOLDER: add a redacted sample report for download once one is approved.]</p>
            </PlaceholderNote>
          </div>
        </Section>
      ) : null}

      {service.slug === "remediation" ? (
        <Section tone="tint" label="Guided versus Managed remediation">
          <SectionHeading
            eyebrow="Compare"
            eyebrowId="service.remediation.compare.eyebrow"
            title="Guided or Managed"
            titleId="service.remediation.compare.title"
            lead="The plan is the same. The difference is who does the work, and how much of your team's time it takes."
            leadId="service.remediation.compare.lead"
          />
          <div className="mt-12">
            <ComparisonTable rows={remediationComparison} />
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <div className="card p-6">
              <h3 className="font-display text-2xl">Choose Guided if</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                You have an internal owner with capacity, existing governance to build on, and you want the knowledge to
                stay in-house.
              </p>
            </div>
            <div className="card p-6">
              <h3 className="font-display text-2xl">Choose Managed if</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                You are working to a fixed deadline, the findings span several teams, or nobody internally has the time
                to drive it to completion.
              </p>
            </div>
          </div>
        </Section>
      ) : null}

      {service.slug === "training" ? (
        <Section tone="tint" label="Training topics">
          <SectionHeading
            eyebrow="Curriculum"
            eyebrowId="service.training.topics.eyebrow"
            title="What your people are trained on"
            titleId="service.training.topics.title"
            lead="Core topics for everyone, with role-specific scenarios layered on top. Content adapts as each person progresses."
            leadId="service.training.topics.lead"
          />
          <ul className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {trainingTopics.map((topic) => (
              <li key={topic} className="card flex items-center gap-3 p-4 text-sm">
                <IconCheck width={16} height={16} className="shrink-0 text-accent" aria-hidden="true" />
                {topic}
              </li>
            ))}
          </ul>
          <div className="mt-12 grid gap-8 lg:grid-cols-2 lg:items-start">
            <RiskFigure />
            <PlaceholderNote label="Platform detail">
              <p>
                [PLACEHOLDER: confirm module lengths, supported languages, accessibility conformance of the learning
                platform, SSO and HR system integrations, and how completion data is exported.]
              </p>
            </PlaceholderNote>
          </div>
        </Section>
      ) : null}

      <Section label="Deliverables">
        <div className="grid gap-12 lg:grid-cols-[1fr_1fr] lg:items-start">
          <div>
            <SectionHeading
              eyebrow="Deliverables"
              eyebrowId={`service.${service.slug}.deliverables.eyebrow`}
              title="What lands on your desk"
              titleId={`service.${service.slug}.deliverables.title`}
            />
            <ul className="mt-8 space-y-3">
              {service.deliverables.map((item) => (
                <li key={item} className="flex gap-3 text-sm leading-relaxed">
                  <IconCheck width={17} height={17} className="mt-0.5 shrink-0 text-accent" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          {service.slug === "compliance-assessment" ? <CertificatePreview /> : null}
          {service.slug !== "compliance-assessment" ? (
            <div className="card p-7">
              <h3 className="font-display text-2xl">Next step</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                Most engagements begin with a compliance assessment, so remediation and training address what is
                actually there rather than what is assumed.
              </p>
              <Link href="/services/compliance-assessment" className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-accent">
                About the compliance assessment
                <IconArrowRight width={15} height={15} />
              </Link>
            </div>
          ) : null}
        </div>
      </Section>

      <CTABand
        id={`service.${service.slug}.cta`}
        title="Talk to a specialist about your situation"
        lead="Fifteen minutes is usually enough to tell you whether this service fits, and what it would involve."
      />
    </>
  );
}
