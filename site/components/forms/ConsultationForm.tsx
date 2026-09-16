"use client";

import Link from "next/link";
import { useState } from "react";
import { IconCheck } from "@/components/icons";
import { CheckboxGroup, SelectField, TextArea, TextField } from "@/components/forms/fields";
import { Button } from "@/components/ui/Button";
import { submitLead, validateEmail, validateRequired } from "@/lib/forms";
import { siteConfig } from "@/site.config";

type Errors = Partial<Record<string, string>>;

export function ConsultationForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [size, setSize] = useState("");
  const [role, setRole] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<"idle" | "sending" | "done">("idle");

  function validate(): Errors {
    const next: Errors = {};
    const nameError = validateRequired(name, "Full name");
    if (nameError) next.name = nameError;
    const emailError = validateEmail(email);
    if (emailError) next.email = emailError;
    const companyError = validateRequired(company, "Company");
    if (companyError) next.company = companyError;
    if (!size) next.size = "Select your company size.";
    if (!role) next.role = "Select the option closest to your role.";
    if (interests.length === 0) next.interests = "Select at least one area you would like to discuss.";
    return next;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) {
      const firstField = document.querySelector<HTMLElement>("[aria-invalid='true'], [role='alert']");
      firstField?.scrollIntoView({ block: "center", behavior: "smooth" });
      return;
    }
    setStatus("sending");
    await submitLead({
      formName: "consultation",
      submittedAt: new Date().toISOString(),
      fields: { name, email, company, size, role, interests, message },
    });
    setStatus("done");
  }

  if (status === "done") {
    return (
      <div className="card p-8" role="status" aria-live="polite">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-accent">
          <IconCheck width={24} height={24} />
        </span>
        <h2 className="mt-5 font-display text-display-sm">Thank you — we will be in touch</h2>
        <p className="prose-body mt-3">
          A specialist will respond to {email || "your email address"} within{" "}
          <span className="font-mono text-xs">[PLACEHOLDER: response time]</span>. If your enquiry is urgent, call{" "}
          {siteConfig.contact.phone}.
        </p>
        <p className="mt-6 rounded-lg border border-dashed border-line-strong bg-surface-2 p-4 text-xs leading-relaxed text-muted">
          No backend is connected yet, so this submission was not transmitted anywhere. See lib/forms.ts to wire it up.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="card space-y-6 p-6 md:p-8">
      <div className="grid gap-6 sm:grid-cols-2">
        <TextField id="name" label="Full name" value={name} onChange={setName} error={errors.name} required autoComplete="name" />
        <TextField
          id="email"
          label="Work email"
          type="email"
          value={email}
          onChange={setEmail}
          error={errors.email}
          required
          autoComplete="email"
          placeholder="name@company.ie"
        />
        <TextField id="company" label="Company" value={company} onChange={setCompany} error={errors.company} required autoComplete="organization" />
        <SelectField id="size" label="Company size" value={size} onChange={setSize} options={siteConfig.companySizes} error={errors.size} required />
        <div className="sm:col-span-2">
          <SelectField id="role" label="Your role" value={role} onChange={setRole} options={siteConfig.roles} error={errors.role} required />
        </div>
      </div>

      <CheckboxGroup
        legend="What would you like to discuss?"
        hint="Select all that apply."
        options={siteConfig.interests}
        selected={interests}
        onToggle={(id) => setInterests((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]))}
        error={errors.interests}
      />

      <TextArea
        id="message"
        label="Anything else we should know?"
        value={message}
        onChange={setMessage}
        hint="Deadlines, upcoming tenders, audit dates or specific concerns."
      />

      <div className="border-t border-line pt-6">
        <p className="text-xs leading-relaxed text-muted">
          We use these details only to respond to your enquiry. See our{" "}
          <Link href="/legal/privacy" className="link-underline text-body">
            privacy policy
          </Link>
          . <span className="font-mono">[PLACEHOLDER: confirm lawful basis and retention period with your DPO.]</span>
        </p>
        <Button type="submit" size="lg" className="mt-5 w-full sm:w-auto" disabled={status === "sending"}>
          {status === "sending" ? "Sending…" : "Request a consultation"}
        </Button>
      </div>
    </form>
  );
}
