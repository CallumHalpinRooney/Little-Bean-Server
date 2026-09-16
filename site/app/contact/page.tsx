import { ConsultationForm } from "@/components/forms/ConsultationForm";
import { IconMail, IconPhone, IconPin } from "@/components/icons";
import { Section } from "@/components/ui/Section";
import { E } from "@/lib/content";
import { pageMetadata } from "@/lib/seo";
import { siteConfig } from "@/site.config";

export const metadata = pageMetadata({
  title: "Book a consultation",
  description:
    "Talk to a specialist about a compliance assessment, remediation, awareness training or the Verified attestation. No obligation.",
  path: "/contact",
});

export default function ContactPage() {
  return (
    <Section>
      <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
        <div>
          <E id="contact.eyebrow" as="p" className="eyebrow">
            Book a consultation
          </E>
          <E id="contact.title" as="h1" className="mt-5 font-display text-display-lg">
            Start a conversation
          </E>
          <E id="contact.lead" as="p" className="prose-body mt-6">
            Tell us where your organisation is and what is prompting the question. A specialist will come back to you —
            with a straight answer, including if what you need is smaller than a full programme.
          </E>

          <ul className="mt-10 space-y-5">
            <li className="flex gap-4">
              <IconMail width={20} height={20} className="mt-0.5 shrink-0 text-accent" />
              <div>
                <p className="text-sm font-medium">Email</p>
                <a href={`mailto:${siteConfig.contact.salesEmail}`} className="link-underline text-sm text-muted hover:text-accent">
                  {siteConfig.contact.salesEmail}
                </a>
              </div>
            </li>
            <li className="flex gap-4">
              <IconPhone width={20} height={20} className="mt-0.5 shrink-0 text-accent" />
              <div>
                <p className="text-sm font-medium">Phone</p>
                <a href={`tel:${siteConfig.contact.phone.replace(/[^\d+]/g, "")}`} className="link-underline text-sm text-muted hover:text-accent">
                  {siteConfig.contact.phone}
                </a>
                <p className="mt-1 font-mono text-[0.7rem] text-seal">[PLACEHOLDER: opening hours]</p>
              </div>
            </li>
            <li className="flex gap-4">
              <IconPin width={20} height={20} className="mt-0.5 shrink-0 text-accent" />
              <div>
                <p className="text-sm font-medium">Office</p>
                <address className="text-sm not-italic leading-relaxed text-muted">
                  {siteConfig.contact.address.line1}
                  <br />
                  {siteConfig.contact.address.line2}
                  <br />
                  {siteConfig.contact.address.city}, {siteConfig.contact.address.postcode}
                </address>
              </div>
            </li>
          </ul>

          <div className="mt-10 rounded-card border border-dashed border-line-strong bg-surface-2 p-5">
            <p className="text-sm leading-relaxed text-muted">
              Prefer to start with your organisation&rsquo;s details?{" "}
              <a href="/start" className="link-underline text-body">
                Start your assessment
              </a>{" "}
              takes about three minutes.
            </p>
          </div>
        </div>

        <ConsultationForm />
      </div>
    </Section>
  );
}
