import Link from "next/link";
import { IconArrowRight, IconCheck } from "@/components/icons";
import { AttestationSeal, CertificatePreview } from "@/components/marketing/Attestation";
import { CTABand, FAQ } from "@/components/marketing/Blocks";
import { Section, SectionHeading } from "@/components/ui/Section";
import { PlaceholderNote } from "@/components/ui/Placeholder";
import { E } from "@/lib/content";
import { pageMetadata } from "@/lib/seo";
import { siteConfig } from "@/site.config";

export const metadata = pageMetadata({
  title: "Verified attestation",
  description:
    "What the Verified attestation is, how organisations earn it, how it is displayed and checked, how long it lasts — and, plainly, what it is not.",
  path: "/verified",
});

const steps = [
  {
    title: "Complete the assessment",
    body: "All ten domains, with supporting evidence. Partial assessments cannot lead to an attestation.",
  },
  {
    title: "Close the findings",
    body: "Work through the prioritised plan under Guided or Managed Remediation until the required standard is met in every domain.",
  },
  {
    title: "Train your people",
    body: "Complete role-based awareness training to the threshold set out in the criteria. [PLACEHOLDER: state the completion threshold.]",
  },
  {
    title: "Verification review",
    body: "We reassess the affected domains and confirm the evidence supports the closures.",
  },
  {
    title: "Attestation issued",
    body: "You receive a dated digital badge, a certificate, and an entry in our verification register.",
  },
];

const faqs = [
  {
    question: "How long is an attestation valid?",
    answer:
      "[PLACEHOLDER: state the validity period — typically twelve months — and the date basis.] After that, an annual reassessment is required to renew it.",
  },
  {
    question: "What happens if something material changes during the year?",
    answer:
      "[PLACEHOLDER: describe the notification obligation for material change — new entities, major systems, a notifiable breach — and the effect on validity.]",
  },
  {
    question: "Can an attestation be withdrawn?",
    answer:
      "[PLACEHOLDER: set out the circumstances in which an attestation is withdrawn, who decides, and how the register and badge are updated.] Legal review required.",
  },
  {
    question: "Who can verify it?",
    answer:
      "Anyone. Each badge links to a verification record showing the organisation, the scope, the date of assessment and the expiry date.",
  },
  {
    question: "Is this a GDPR certification?",
    answer:
      "No. It is an independent assessment against our own published criteria. It is not a certification under Article 42 of the GDPR, and no supervisory authority issues, approves or endorses it.",
  },
  {
    question: "Does it guarantee compliance?",
    answer:
      "No. It records that an independent assessment found the required standard was met on a given date, for a defined scope. Compliance is a continuing obligation that rests with your organisation.",
  },
];

export default function VerifiedPage() {
  return (
    <>
      <Section className="border-b border-line">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <E id="verified.eyebrow" as="p" className="eyebrow">
              Verified attestation
            </E>
            <E id="verified.title" as="h1" className="mt-5 font-display text-display-lg">
              Independently assessed. Dated. Checkable.
            </E>
            <E id="verified.lead" as="p" className="prose-body mt-6 max-w-xl text-lg">
              {`Organisations that complete the programme and meet the required standard receive a dated {company} Verified attestation — something concrete to put in front of customers, partners and procurement teams instead of a promise.`}
            </E>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/start"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-6 py-3.5 text-base font-medium text-accent-contrast transition-colors hover:bg-accent-hover"
              >
                Start your assessment
                <IconArrowRight width={16} height={16} />
              </Link>
              <a
                href="#what-it-is-and-isnt"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-control px-6 py-3.5 text-base transition-colors hover:border-accent hover:text-accent"
              >
                What it is and is not
              </a>
            </div>
          </div>
          <div className="flex justify-center">
            <AttestationSeal size={260} />
          </div>
        </div>
      </Section>

      {/* What it is and isn't — required plain-English note */}
      <Section id="what-it-is-and-isnt" tone="tint" label="What the attestation is and is not" className="scroll-mt-24">
        <div className="max-w-3xl">
          <E id="verified.plain.eyebrow" as="p" className="eyebrow">
            In plain English
          </E>
          <E id="verified.plain.title" as="h2" className="mt-5 font-display text-display-md">
            What this attestation is, and what it is not
          </E>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <div className="card p-7">
            <h3 className="font-display text-2xl">What it is</h3>
            <ul className="mt-5 space-y-3">
              {[
                `A statement that ${siteConfig.company.name} independently assessed your organisation against our published assessment criteria.`,
                "Confirmation that you met the required standard on the date shown, for the scope shown.",
                "Evidence you can share with customers, partners and procurement teams.",
                "A record that can be checked by anyone, and that expires.",
              ].map((item) => (
                <li key={item} className="flex gap-3 text-sm leading-relaxed">
                  <IconCheck width={17} height={17} className="mt-0.5 shrink-0 text-accent" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="card border-seal p-7">
            <h3 className="font-display text-2xl">What it is not</h3>
            <ul className="mt-5 space-y-3">
              {[
                "It is not a GDPR certification under Article 42 of the GDPR.",
                "It is not issued, approved, accredited or endorsed by the Data Protection Commission or any other supervisory authority.",
                "It is not a guarantee of compliance, now or in the future — compliance remains your organisation's responsibility.",
                "It does not cover anything outside the scope stated on the certificate.",
                "It does not transfer any liability for data protection obligations to us.",
              ].map((item) => (
                <li key={item} className="flex gap-3 text-sm leading-relaxed">
                  <span aria-hidden="true" className="mt-2 h-1 w-1 shrink-0 rounded-full bg-seal" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <PlaceholderNote label="Legal review required" className="mt-8">
          This wording, the assessment criteria it refers to, and the terms governing use of the badge must be reviewed
          and approved by legal counsel before launch. Take particular care that no page, badge, email or sales document
          describes the attestation as certification or implies regulatory endorsement.
        </PlaceholderNote>
      </Section>

      {/* How to earn it */}
      <Section label="How to earn the attestation">
        <SectionHeading
          eyebrow="How to earn it"
          eyebrowId="verified.earn.eyebrow"
          title="Five things have to happen first"
          titleId="verified.earn.title"
          lead="There is no shortcut and no self-declaration. Every attestation follows the same route."
          leadId="verified.earn.lead"
        />
        <ol className="mt-12 grid gap-px overflow-hidden rounded-card border border-line bg-line md:grid-cols-2 lg:grid-cols-5">
          {steps.map((step, index) => (
            <li key={step.title} className="bg-surface p-6">
              <span className="font-mono text-xs tracking-wider text-accent">0{index + 1}</span>
              <h3 className="mt-3 font-display text-xl">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{step.body}</p>
            </li>
          ))}
        </ol>
      </Section>

      {/* Display and check */}
      <Section tone="tint" label="Displaying and checking the attestation">
        <div className="grid gap-12 lg:grid-cols-[1fr_1fr] lg:items-start">
          <div>
            <SectionHeading
              eyebrow="Display and verification"
              eyebrowId="verified.display.eyebrow"
              title="How the badge is displayed and checked"
              titleId="verified.display.title"
            />
            <div className="mt-8 space-y-6">
              {[
                {
                  title: "On your website",
                  body: "A digital badge with the assessment date, linking to your verification record. [PLACEHOLDER: supply the embed snippet and badge asset pack.]",
                },
                {
                  title: "In tenders and questionnaires",
                  body: "A PDF certificate stating scope, dates and reference, suitable for attaching to a bid or a vendor security questionnaire.",
                },
                {
                  title: "In email signatures and sales material",
                  body: "Permitted within the badge usage terms. [PLACEHOLDER: link to badge usage guidelines once approved.]",
                },
                {
                  title: "Checked by anyone",
                  body: "Each record shows the organisation, scope, assessment date and expiry. [PLACEHOLDER: publish the verification lookup URL.]",
                },
              ].map((item) => (
                <div key={item.title} className="border-l-2 border-seal pl-5">
                  <h3 className="font-display text-xl">{item.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
          <CertificatePreview />
        </div>
      </Section>

      <Section label="Attestation questions">
        <SectionHeading eyebrow="Questions" eyebrowId="verified.faq.eyebrow" title="Validity, renewal and limits" titleId="verified.faq.title" />
        <div className="mt-10 max-w-3xl">
          <FAQ items={faqs} />
        </div>
      </Section>

      <CTABand
        id="verified.cta"
        title="Work towards your attestation"
        lead="It starts with an assessment. Tell us about your organisation and we will scope one with you."
      />
    </>
  );
}
