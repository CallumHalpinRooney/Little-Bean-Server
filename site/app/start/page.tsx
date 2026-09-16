import { AssessmentFlow } from "@/components/forms/AssessmentFlow";
import { Section } from "@/components/ui/Section";
import { PlaceholderNote } from "@/components/ui/Placeholder";
import { E } from "@/lib/content";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Start your assessment",
  description:
    "Tell us about your organisation in three short steps. We will scope a compliance assessment with you and set out what happens next.",
  path: "/start",
});

export default function StartPage() {
  return (
    <Section>
      <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <E id="start.eyebrow" as="p" className="eyebrow">
            Start your assessment
          </E>
          <E id="start.title" as="h1" className="mt-5 font-display text-display-lg">
            Three steps, about three minutes
          </E>
          <E id="start.lead" as="p" className="prose-body mt-6">
            This is a short introduction so we can scope the work properly — not the assessment questionnaire itself.
            Nothing here is scored, and nothing commits you to anything.
          </E>

          <ol className="mt-10 space-y-4 border-t border-line pt-8">
            {[
              { title: "You tell us the basics", body: "Organisation, sector, size, what you are interested in and when." },
              { title: "We review it", body: "A specialist reads it before any call, so the first conversation is useful." },
              { title: "We come back to you", body: "With a scoping call, then a written proposal. [PLACEHOLDER: response time]" },
            ].map((item, index) => (
              <li key={item.title} className="flex gap-4">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-line font-mono text-xs">
                  {index + 1}
                </span>
                <div>
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted">{item.body}</p>
                </div>
              </li>
            ))}
          </ol>

          <PlaceholderNote label="Note" className="mt-8">
            This flow captures a lead only. The real compliance assessment questionnaire is issued to clients after
            scoping and sits behind authentication.
          </PlaceholderNote>
        </div>

        <AssessmentFlow />
      </div>
    </Section>
  );
}
