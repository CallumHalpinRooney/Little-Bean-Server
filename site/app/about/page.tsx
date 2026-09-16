import { CTABand } from "@/components/marketing/Blocks";
import { Section, SectionHeading } from "@/components/ui/Section";
import { Placeholder, PlaceholderNote } from "@/components/ui/Placeholder";
import { E } from "@/lib/content";
import { pageMetadata } from "@/lib/seo";
import { siteConfig } from "@/site.config";

export const metadata = pageMetadata({
  title: "About",
  description:
    "Our mission, how we approach data protection and cyber risk, and the principles that govern what we will and will not claim.",
  path: "/about",
});

const principles = [
  {
    title: "Evidence over assertion",
    body: "A finding is only as good as what supports it. We score what we can see, and we say plainly when something cannot be evidenced.",
  },
  {
    title: "Plain language",
    body: "Reports are written to be acted on by the people who have to act on them — not to demonstrate familiarity with the legislation.",
  },
  {
    title: "Proportionate recommendations",
    body: "The right control for a 40-person firm is rarely the right control for a 4,000-person group. Recommendations are sized to the organisation.",
  },
  {
    title: "No fear-selling",
    body: "We do not quote unsourced fine figures or frighten boards into buying. The risk is real enough described accurately.",
  },
  {
    title: "Clear about our limits",
    body: "Our attestation says what it says and nothing more. We are not a regulator and we do not imply otherwise.",
  },
  {
    title: "We assess ourselves too",
    body: "We run the same assessment against our own organisation and publish our position on the trust page.",
  },
];

export default function AboutPage() {
  return (
    <>
      <Section className="border-b border-line">
        <E id="about.eyebrow" as="p" className="eyebrow">
          About us
        </E>
        <E id="about.title" as="h1" className="mt-5 max-w-4xl font-display text-display-lg">
          Data protection work that ends in something you can show
        </E>
        <E id="about.lead" as="p" className="prose-body mt-6 max-w-2xl text-lg">
          {`{company} was founded to close the gap between knowing an organisation has data protection obligations and being able to demonstrate it is meeting them.`}
        </E>
      </Section>

      <Section label="Our mission">
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr]">
          <SectionHeading eyebrow="Mission" eyebrowId="about.mission.eyebrow" title="Why we exist" titleId="about.mission.title" />
          <div className="prose-body max-w-prose space-y-5">
            <p>
              Most organisations are not indifferent to data protection. They are unsure where they stand, uncertain
              which of a hundred possible actions matters most, and short of the time to find out.
            </p>
            <p>
              Advice alone rarely resolves that. A report that nobody implements changes nothing, and training that
              nobody remembers changes less. So we built one route that runs from assessment through to closed gaps,
              trained staff and a dated attestation — with each stage producing something concrete.
            </p>
            <p>
              <Placeholder>Expand with the founding story, the problem observed, and what you set out to change</Placeholder>
            </p>
          </div>
        </div>
      </Section>

      <Section tone="tint" label="Our principles">
        <SectionHeading
          eyebrow="Approach"
          eyebrowId="about.principles.eyebrow"
          title="How we work"
          titleId="about.principles.title"
          lead="Six principles that decide what goes into a report, what we recommend, and what we refuse to claim."
          leadId="about.principles.lead"
        />
        <div className="mt-12 grid gap-px overflow-hidden rounded-card border border-line bg-line md:grid-cols-2 lg:grid-cols-3">
          {principles.map((principle) => (
            <div key={principle.title} className="bg-surface p-7">
              <h3 className="font-display text-2xl">{principle.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted">{principle.body}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section label="Our team">
        <SectionHeading
          eyebrow="Team"
          eyebrowId="about.team.eyebrow"
          title="The people doing the work"
          titleId="about.team.title"
          lead="Assessments are reviewed by named specialists, not scored automatically. Add real people here before launch — with real credentials."
          leadId="about.team.lead"
        />
        <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((index) => (
            <li key={index} className="card p-6">
              <div className="h-16 w-16 rounded-full border border-dashed border-line-strong bg-surface-2" aria-hidden="true" />
              <h3 className="mt-5 font-display text-xl">[PLACEHOLDER: name {index}]</h3>
              <p className="mt-1 text-sm text-muted">[PLACEHOLDER: role]</p>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                [PLACEHOLDER: one-line background. Only list qualifications that can be verified.]
              </p>
            </li>
          ))}
        </ul>
        <PlaceholderNote label="Before launch" className="mt-10">
          Do not publish team members, qualifications, certifications, memberships or awards that cannot be evidenced.
          Where a named individual is a practising DPO or holds a professional qualification, confirm they are happy for
          it to appear.
        </PlaceholderNote>
      </Section>

      <Section tone="tint">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <h2 className="font-display text-2xl">Registered office</h2>
            <address className="mt-3 text-sm not-italic leading-relaxed text-muted">
              {siteConfig.company.legalEntity}
              <br />
              {siteConfig.contact.address.line1}
              <br />
              {siteConfig.contact.address.line2}
              <br />
              {siteConfig.contact.address.city}, {siteConfig.contact.address.postcode}
              <br />
              {siteConfig.contact.address.country}
            </address>
          </div>
          <div>
            <h2 className="font-display text-2xl">Company details</h2>
            <dl className="mt-3 space-y-1.5 text-sm text-muted">
              <div className="flex gap-2">
                <dt>Registered number:</dt>
                <dd className="font-mono text-xs">{siteConfig.company.companyNumber}</dd>
              </div>
              <div className="flex gap-2">
                <dt>VAT:</dt>
                <dd className="font-mono text-xs">{siteConfig.company.vatNumber}</dd>
              </div>
              <div className="flex gap-2">
                <dt>Founded:</dt>
                <dd className="font-mono text-xs">{siteConfig.company.foundedYear}</dd>
              </div>
            </dl>
          </div>
          <div>
            <h2 className="font-display text-2xl">Data protection</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              Questions about how we handle personal data go to{" "}
              <a href={`mailto:${siteConfig.contact.dpoEmail}`} className="link-underline text-body">
                {siteConfig.contact.dpoEmail}
              </a>
              .
            </p>
          </div>
        </div>
      </Section>

      <CTABand id="about.cta" title="Talk to us" lead="Tell us where you are and we will tell you plainly what we would do about it." />
    </>
  );
}
