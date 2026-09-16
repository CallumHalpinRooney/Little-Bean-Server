import Link from "next/link";
import { getIcon } from "@/components/icons/map";
import { IconArrowRight } from "@/components/icons";
import { CTABand, FAQ } from "@/components/marketing/Blocks";
import { JourneyDiagram } from "@/components/marketing/JourneyDiagram";
import { Section, SectionHeading } from "@/components/ui/Section";
import { PlaceholderNote } from "@/components/ui/Placeholder";
import { journey } from "@/content/journey";
import { E } from "@/lib/content";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "How it works",
  description:
    "The full programme in detail: assess, report, remediate, train, verify and maintain — what happens at each stage, what you do, and what we deliver.",
  path: "/how-it-works",
});

const faqs = [
  {
    question: "How long does the whole programme take?",
    answer:
      "[PLACEHOLDER: state typical end-to-end duration and the factors that move it — number of entities, systems in scope, remediation package chosen.]",
  },
  {
    question: "Who needs to be involved internally?",
    answer:
      "A nominated owner, plus input from whoever holds the answers: IT or security, legal, HR, and the teams that run customer-facing processes. Most organisations spend more time coordinating than answering.",
  },
  {
    question: "Can we stop after the report?",
    answer:
      "Yes. The assessment and report stand alone, and many organisations use them to build an internal business case before deciding on remediation.",
  },
  {
    question: "What happens if we do not meet the standard at verification?",
    answer:
      "No attestation is issued. You receive the outstanding findings, and we reassess once they are closed. [PLACEHOLDER: state any limits on reassessment attempts or timeframes.]",
  },
  {
    question: "How is the assessment delivered?",
    answer: "[PLACEHOLDER: describe the delivery mechanism — platform, workshops, document exchange — and evidence handling.]",
  },
];

export default function HowItWorksPage() {
  return (
    <>
      <Section className="border-b border-line">
        <E id="how.eyebrow" as="p" className="eyebrow">
          How it works
        </E>
        <E id="how.title" as="h1" className="mt-5 max-w-4xl font-display text-display-lg">
          Six stages from unknown risk to evidenced assurance
        </E>
        <E id="how.lead" as="p" className="prose-body mt-6 max-w-2xl text-lg">
          The programme runs once end to end, then repeats annually. Each stage has a defined input, a defined output,
          and a clear split between what your team does and what ours does.
        </E>
        <div className="mt-14">
          <JourneyDiagram compact />
        </div>
      </Section>

      {/* Stage detail */}
      <Section>
        <div className="space-y-20">
          {journey.map((stage, index) => {
            const Icon = getIcon(stage.icon);
            return (
              <article key={stage.id} id={stage.id} className="scroll-mt-28">
                <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr]">
                  <div>
                    <div className="flex items-center gap-4">
                      <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent-soft text-accent">
                        <Icon width={24} height={24} />
                      </span>
                      <span className="font-mono text-sm tracking-wider text-muted">{stage.step}</span>
                    </div>
                    <h2 className="mt-5 font-display text-display-md">{stage.title}</h2>
                    <p className="prose-body mt-4">{stage.detail}</p>

                    <dl className="mt-7 space-y-4 border-t border-line pt-6 text-sm">
                      <div className="flex flex-wrap gap-x-3 gap-y-1">
                        <dt className="font-medium">Deliverable</dt>
                        <dd className="text-muted">{stage.deliverable}</dd>
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-1">
                        <dt className="font-medium">Timeline</dt>
                        <dd className="font-mono text-xs text-seal">{stage.timeline}</dd>
                      </div>
                    </dl>
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="card p-6">
                      <h3 className="font-mono text-[0.7rem] uppercase tracking-wider text-muted">Your team</h3>
                      <ul className="mt-4 space-y-2.5">
                        {stage.youDo.map((item) => (
                          <li key={item} className="flex gap-2.5 text-sm leading-relaxed">
                            <span aria-hidden="true" className="mt-2 h-1 w-1 shrink-0 rounded-full bg-line-strong" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="card border-accent/40 p-6">
                      <h3 className="font-mono text-[0.7rem] uppercase tracking-wider text-accent">Our team</h3>
                      <ul className="mt-4 space-y-2.5">
                        {stage.weDo.map((item) => (
                          <li key={item} className="flex gap-2.5 text-sm leading-relaxed">
                            <span aria-hidden="true" className="mt-2 h-1 w-1 shrink-0 rounded-full bg-accent" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
                {index === journey.length - 1 ? null : <div className="mt-20 h-px bg-line" />}
              </article>
            );
          })}
        </div>

        <PlaceholderNote label="Timelines" className="mt-16">
          Every timeline on this page is a placeholder. Replace them with figures you can consistently meet, and state
          clearly what they depend on.
        </PlaceholderNote>
      </Section>

      <Section tone="tint" label="Frequently asked questions">
        <SectionHeading eyebrow="Questions" eyebrowId="how.faq.eyebrow" title="Common questions" titleId="how.faq.title" />
        <div className="mt-10 max-w-3xl">
          <FAQ items={faqs} />
        </div>
        <Link href="/contact" className="mt-8 inline-flex items-center gap-2 font-medium text-accent">
          Ask us something else
          <IconArrowRight width={16} height={16} />
        </Link>
      </Section>

      <CTABand
        id="how.cta"
        title="See what the first stage would look like for you"
        lead="A short scoping conversation is enough to size the assessment and set a realistic timeline."
      />
    </>
  );
}
