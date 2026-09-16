import { CTABand } from "@/components/marketing/Blocks";
import { TrustBadges } from "@/components/marketing/Proof";
import { Section, SectionHeading } from "@/components/ui/Section";
import { PlaceholderNote } from "@/components/ui/Placeholder";
import { trustFacts, trustPractices } from "@/content/trust";
import { E } from "@/lib/content";
import { pageMetadata } from "@/lib/seo";
import { siteConfig } from "@/site.config";

export const metadata = pageMetadata({
  title: "Trust & security",
  description:
    "How we protect the assessment responses, evidence and reports our clients entrust to us: hosting, encryption, access control, retention and incident response.",
  path: "/trust",
});

export default function TrustPage() {
  return (
    <>
      <Section className="border-b border-line">
        <E id="trust.eyebrow" as="p" className="eyebrow">
          Trust & security
        </E>
        <E id="trust.title" as="h1" className="mt-5 max-w-4xl font-display text-display-lg">
          Your assessment describes your weaknesses. Here is how we protect it.
        </E>
        <E id="trust.lead" as="p" className="prose-body mt-6 max-w-2xl text-lg">
          An honest assessment requires you to tell us where you are exposed. That information deserves at least the
          standard of care we assess you against.
        </E>
      </Section>

      <Section label="Security facts">
        <SectionHeading
          eyebrow="The facts"
          eyebrowId="trust.facts.eyebrow"
          title="Where your data lives and how it is protected"
          titleId="trust.facts.title"
        />
        <dl className="mt-12 grid gap-px overflow-hidden rounded-card border border-line bg-line md:grid-cols-2">
          {trustFacts.map((fact) => (
            <div key={fact.label} className="bg-surface p-6">
              <dt className="text-sm font-medium">{fact.label}</dt>
              <dd className="mt-1.5 font-mono text-sm text-seal">{fact.value}</dd>
              {fact.note ? <p className="mt-2 text-xs leading-relaxed text-muted">{fact.note}</p> : null}
            </div>
          ))}
        </dl>

        <PlaceholderNote label="Accuracy matters most here" className="mt-8">
          Every value above is a placeholder. Nothing on this page may be published until it has been confirmed by
          whoever runs your infrastructure. Never state or imply a certification you do not hold — describe the status
          exactly, for example &ldquo;ISO 27001 implementation in progress, certification not yet awarded&rdquo;.
        </PlaceholderNote>
      </Section>

      <Section tone="tint" label="Our practices">
        <SectionHeading
          eyebrow="Practices"
          eyebrowId="trust.practices.eyebrow"
          title="How we work with client data"
          titleId="trust.practices.title"
        />
        <div className="mt-12 grid gap-px overflow-hidden rounded-card border border-line bg-line md:grid-cols-2 lg:grid-cols-3">
          {trustPractices.map((practice) => (
            <div key={practice.title} className="bg-surface p-7">
              <h3 className="font-display text-2xl">{practice.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted">{practice.description}</p>
            </div>
          ))}
        </div>
        <div className="mt-12">
          <TrustBadges />
        </div>
      </Section>

      <Section label="About this website">
        <SectionHeading
          eyebrow="This website"
          eyebrowId="trust.site.eyebrow"
          title="What this site itself does"
          titleId="trust.site.title"
          lead="We would fail our own assessment if this site tracked you without asking. It does not."
          leadId="trust.site.lead"
        />
        <ul className="mt-10 grid gap-4 md:grid-cols-2">
          {[
            "No third-party analytics, advertising or tracking scripts are loaded by default.",
            "No non-essential cookies or storage are set before you consent, and Accept and Reject carry equal weight.",
            "Your colour theme preference is stored locally in your browser and never transmitted.",
            "Form submissions are not sent anywhere until a handler is connected — see our privacy notice for what happens then.",
            "Fonts are self-hosted at build time, so no request is made to a third-party font service when you browse.",
            "Consent can be changed or withdrawn at any time from the footer of every page.",
          ].map((item) => (
            <li key={item} className="card p-5 text-sm leading-relaxed text-muted">
              {item}
            </li>
          ))}
        </ul>
      </Section>

      <Section tone="tint">
        <div className="max-w-2xl">
          <h2 className="font-display text-display-sm">Reporting a security issue</h2>
          <p className="prose-body mt-4">
            If you believe you have found a vulnerability in our systems or this website, contact{" "}
            <a href={`mailto:${siteConfig.contact.dpoEmail}`} className="link-underline text-body">
              {siteConfig.contact.dpoEmail}
            </a>
            . <span className="font-mono text-xs text-seal">[PLACEHOLDER: publish a responsible disclosure policy, a security contact address and expected response times.]</span>
          </p>
        </div>
      </Section>

      <CTABand
        id="trust.cta"
        title="Ask us the hard questions"
        lead="Security questionnaires, DPAs, sub-processor lists — send them over. We would rather answer them before you are a client than after."
      />
    </>
  );
}
