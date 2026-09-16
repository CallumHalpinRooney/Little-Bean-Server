"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { IconArrowRight, IconCheck } from "@/components/icons";
import { CheckboxGroup, SelectField, TextArea, TextField } from "@/components/forms/fields";
import { Button } from "@/components/ui/Button";
import { industries } from "@/content/industries";
import { submitLead, validateEmail, validateRequired } from "@/lib/forms";
import { siteConfig } from "@/site.config";

/**
 * LEAD CAPTURE ONLY.
 * This is the short intro flow that starts a conversation — it is NOT the
 * compliance assessment questionnaire. The real questionnaire is issued to
 * clients after scoping.
 */

const STEPS = [
  { id: "organisation", title: "Your organisation", description: "Who we would be working with." },
  { id: "priorities", title: "Your priorities", description: "What you want to achieve, and by when." },
  { id: "details", title: "Your details", description: "Where to send the next steps." },
] as const;

const drivers = [
  "A customer or tender requires evidence",
  "Preparing for an audit or certification",
  "A recent incident or near miss",
  "New systems, suppliers or markets",
  "Board or executive request",
  "Periodic review of our position",
];

const timelines = ["As soon as possible", "Within 1–3 months", "Within 3–6 months", "Later this year", "Exploring options"];

export function AssessmentFlow() {
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const [sending, setSending] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const headingRef = useRef<HTMLHeadingElement>(null);

  const [form, setForm] = useState({
    company: "",
    sector: "",
    size: "",
    interests: [] as string[],
    driver: "",
    timeline: "",
    context: "",
    name: "",
    email: "",
    role: "",
  });

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function validateStep(index: number): Record<string, string> {
    const next: Record<string, string> = {};
    if (index === 0) {
      const companyError = validateRequired(form.company, "Organisation name");
      if (companyError) next.company = companyError;
      if (!form.sector) next.sector = "Select the closest sector.";
      if (!form.size) next.size = "Select your organisation size.";
    }
    if (index === 1) {
      if (form.interests.length === 0) next.interests = "Select at least one area of interest.";
      if (!form.timeline) next.timeline = "Select a timeframe.";
    }
    if (index === 2) {
      const nameError = validateRequired(form.name, "Full name");
      if (nameError) next.name = nameError;
      const emailError = validateEmail(form.email);
      if (emailError) next.email = emailError;
      if (!form.role) next.role = "Select the option closest to your role.";
    }
    return next;
  }

  function goNext() {
    const found = validateStep(step);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setStep((current) => Math.min(current + 1, STEPS.length - 1));
    window.requestAnimationFrame(() => headingRef.current?.focus());
  }

  function goBack() {
    setErrors({});
    setStep((current) => Math.max(current - 1, 0));
    window.requestAnimationFrame(() => headingRef.current?.focus());
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const found = validateStep(2);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setSending(true);
    await submitLead({ formName: "assessment-intro", submittedAt: new Date().toISOString(), fields: { ...form } });
    setSending(false);
    setDone(true);
  }

  if (done) {
    return (
      <div className="card p-8 md:p-10" role="status" aria-live="polite">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-accent">
          <IconCheck width={24} height={24} />
        </span>
        <h2 className="mt-5 font-display text-display-sm">We will be in touch</h2>
        <p className="prose-body mt-3 max-w-prose">
          Thank you, {form.name.split(" ")[0] || "and welcome"}. A specialist will review what you have told us about{" "}
          {form.company || "your organisation"} and contact you at {form.email} within{" "}
          <span className="font-mono text-xs">[PLACEHOLDER: response time]</span>.
        </p>

        <ol className="mt-8 space-y-5 border-t border-line pt-8">
          {[
            { title: "A short scoping call", body: "We confirm entities, systems and timescales so the assessment is scoped accurately. [PLACEHOLDER: duration]" },
            { title: "Your proposal", body: "A written proposal covering scope, package, timeline and cost. [PLACEHOLDER: turnaround]" },
            { title: "Assessment issued", body: "On acceptance, we issue the structured questionnaire and brief your internal owner." },
          ].map((item, index) => (
            <li key={item.title} className="flex gap-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line font-mono text-xs">
                {index + 1}
              </span>
              <div>
                <p className="font-medium">{item.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted">{item.body}</p>
              </div>
            </li>
          ))}
        </ol>

        <p className="mt-8 rounded-lg border border-dashed border-line-strong bg-surface-2 p-4 text-xs leading-relaxed text-muted">
          No backend is connected yet, so nothing was transmitted. See lib/forms.ts to connect a handler.
        </p>
      </div>
    );
  }

  const current = STEPS[step];

  return (
    <div>
      {/* Step indicator */}
      <ol className="mb-8 grid gap-3 sm:grid-cols-3">
        {STEPS.map((item, index) => {
          const state = index === step ? "current" : index < step ? "complete" : "upcoming";
          return (
            <li key={item.id}>
              <div
                className={`flex items-center gap-3 rounded-lg border p-3 ${
                  state === "current" ? "border-accent bg-accent-soft" : "border-line"
                }`}
                aria-current={state === "current" ? "step" : undefined}
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-mono text-xs ${
                    state === "complete" ? "bg-accent text-accent-contrast" : "border border-line-strong"
                  }`}
                >
                  {state === "complete" ? <IconCheck width={14} height={14} /> : index + 1}
                </span>
                <span className="text-sm font-medium">{item.title}</span>
              </div>
            </li>
          );
        })}
      </ol>

      <form onSubmit={handleSubmit} noValidate className="card p-6 md:p-8">
        <h2 ref={headingRef} tabIndex={-1} className="font-display text-display-sm focus:outline-none">
          {current.title}
        </h2>
        <p className="mt-1.5 text-sm text-muted">
          {current.description} <span className="sr-only">Step {step + 1} of {STEPS.length}.</span>
        </p>

        <div className="mt-7 space-y-6">
          {step === 0 ? (
            <>
              <TextField
                id="company"
                label="Organisation name"
                value={form.company}
                onChange={(value) => update("company", value)}
                error={errors.company}
                required
                autoComplete="organization"
              />
              <SelectField
                id="sector"
                label="Sector"
                value={form.sector}
                onChange={(value) => update("sector", value)}
                options={[...industries.map((industry) => industry.name), "Other"]}
                error={errors.sector}
                required
              />
              <SelectField
                id="size"
                label="Organisation size"
                value={form.size}
                onChange={(value) => update("size", value)}
                options={siteConfig.companySizes}
                error={errors.size}
                required
              />
            </>
          ) : null}

          {step === 1 ? (
            <>
              <CheckboxGroup
                legend="What are you interested in?"
                hint="Select all that apply."
                options={siteConfig.interests}
                selected={form.interests}
                onToggle={(id) =>
                  update("interests", form.interests.includes(id) ? form.interests.filter((item) => item !== id) : [...form.interests, id])
                }
                error={errors.interests}
              />
              <SelectField
                id="driver"
                label="What is prompting this?"
                value={form.driver}
                onChange={(value) => update("driver", value)}
                options={drivers}
              />
              <SelectField
                id="timeline"
                label="When would you like to start?"
                value={form.timeline}
                onChange={(value) => update("timeline", value)}
                options={timelines}
                error={errors.timeline}
                required
              />
              <TextArea
                id="context"
                label="Anything specific we should know?"
                value={form.context}
                onChange={(value) => update("context", value)}
                hint="Tender deadlines, systems in scope, entities or jurisdictions."
                rows={4}
              />
            </>
          ) : null}

          {step === 2 ? (
            <>
              <TextField id="name" label="Full name" value={form.name} onChange={(value) => update("name", value)} error={errors.name} required autoComplete="name" />
              <TextField
                id="email"
                label="Work email"
                type="email"
                value={form.email}
                onChange={(value) => update("email", value)}
                error={errors.email}
                required
                autoComplete="email"
                placeholder="name@company.ie"
              />
              <SelectField id="role" label="Your role" value={form.role} onChange={(value) => update("role", value)} options={siteConfig.roles} error={errors.role} required />
              <p className="text-xs leading-relaxed text-muted">
                We use these details only to scope and respond to your enquiry. See our{" "}
                <Link href="/legal/privacy" className="link-underline text-body">
                  privacy policy
                </Link>
                .
              </p>
            </>
          ) : null}
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6">
          <Button type="button" variant="secondary" onClick={goBack} disabled={step === 0}>
            Back
          </Button>
          {step < STEPS.length - 1 ? (
            <Button type="button" onClick={goNext}>
              Continue
              <IconArrowRight width={16} height={16} />
            </Button>
          ) : (
            <Button type="submit" disabled={sending}>
              {sending ? "Sending…" : "Submit and finish"}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
