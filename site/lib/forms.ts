/**
 * ===========================================================================
 * BACKEND HOOK — CONNECT YOUR FORM HANDLER HERE
 * ===========================================================================
 * Both the consultation form and the assessment lead flow call submitLead().
 * Today it only resolves locally: nothing is transmitted anywhere, which keeps
 * the site free of third-party requests until you choose one.
 *
 * To connect a backend, replace the body of submitLead with ONE of:
 *
 *   1. A Next.js route handler (keeps data in your own infrastructure):
 *        const res = await fetch("/api/leads", {
 *          method: "POST",
 *          headers: { "Content-Type": "application/json" },
 *          body: JSON.stringify(payload),
 *        });
 *        if (!res.ok) throw new Error("Submission failed");
 *
 *   2. A hosted form service (Formspree, HubSpot, Zapier, etc.):
 *        await fetch(process.env.NEXT_PUBLIC_FORM_ENDPOINT!, { ... });
 *
 * BEFORE GOING LIVE:
 *   - Add server-side validation. The checks in these components are for the
 *     visitor's benefit only and must never be trusted.
 *   - Add spam protection (a privacy-respecting option such as a honeypot plus
 *     rate limiting; avoid anything that sets cookies before consent).
 *   - Confirm the lawful basis and retention period for these submissions and
 *     make sure the privacy notice linked beside the form matches reality.
 *   - Record the consent text shown at the point of submission.
 * ===========================================================================
 */

export type LeadPayload = {
  formName: "consultation" | "assessment-intro";
  submittedAt: string;
  fields: Record<string, string | string[] | boolean>;
};

export async function submitLead(payload: LeadPayload): Promise<void> {
  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.info("[submitLead] No backend connected — payload:", payload);
  }
  // Simulates network latency so the loading state is visible while unwired.
  await new Promise((resolve) => setTimeout(resolve, 600));
}

/** Pragmatic work-email check: format plus a nudge away from free providers. */
const FREE_EMAIL_DOMAINS = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "icloud.com", "aol.com", "live.com", "proton.me"];

export function validateEmail(value: string): string | null {
  const email = value.trim();
  if (!email) return "Enter your work email address.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return "Enter a valid email address, for example name@company.ie.";
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  if (FREE_EMAIL_DOMAINS.includes(domain)) return "Please use your work email address so we can identify your organisation.";
  return null;
}

export function validateRequired(value: string, label: string): string | null {
  return value.trim() ? null : `${label} is required.`;
}
