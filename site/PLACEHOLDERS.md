# Pre-launch checklist

Everything on this site that is not real yet, in one place. Three kinds of item:

- **[PLACEHOLDER]** — content that must be replaced with something true.
- **[SOURCE NEEDED]** — a figure that may only be published with a named, dated source.
- **⚖️ Legal review** — must be reviewed and approved by a qualified Irish/EU adviser before launch.

Find them in code at any time:

```bash
grep -rn "\[PLACEHOLDER" app components content site.config.ts
grep -rn "\[SOURCE NEEDED" app components content
```

---

## 1. Brand and company identity — `site.config.ts`

- [ ] `company.name` / `shortName` — currently the literal `[COMPANY NAME]`.
- [ ] `company.legalEntity` — registered company name.
- [ ] `company.companyNumber` — CRO number.
- [ ] `company.vatNumber` — VAT number.
- [ ] `company.foundedYear`.
- [ ] `url` — currently `https://example.ie`. Drives canonical URLs, Open Graph and the sitemap.
- [ ] `contact.email`, `contact.salesEmail`, `contact.dpoEmail`.
- [ ] `contact.phone`, plus opening hours on `/contact`.
- [ ] `contact.address` — all five lines.
- [ ] `social.linkedin` — real profile URL.

## 2. Timelines — `content/journey.ts`

- [ ] Assess — typical duration.
- [ ] Report — typical turnaround.
- [ ] Remediate — duration by package.
- [ ] Train — rollout period.
- [ ] Verify — verification window.
- [ ] Maintain — annual cycle detail.
- [ ] `/how-it-works` FAQ: end-to-end programme duration; reassessment limits after a failed verification; how the assessment is delivered and how evidence is handled.

## 3. Services — `content/services.ts`, `app/services/[slug]`

- [ ] Guided vs Managed comparison: typical duration for each package.
- [ ] Compliance assessment: publish a redacted sample report, once approved.
- [ ] Training: module lengths, supported languages, accessibility conformance of the learning platform, SSO/HR integrations, how completion data is exported.
- [ ] Assessment scoring model — bands, what moves a rating, how the overall score is derived (also referenced in an insight article).

## 4. Verified attestation — `app/verified`, `components/marketing/Attestation.tsx`

- [ ] Validity period and the date it runs from.
- [ ] Training completion threshold required for attestation.
- [ ] Material-change notification obligation during the validity period.
- [ ] Circumstances for suspension or withdrawal, who decides, how the register and badge update. ⚖️ **Legal review**
- [ ] Verification lookup URL (public record).
- [ ] Badge embed snippet and asset pack.
- [ ] Badge usage guidelines. ⚖️ **Legal review**
- [ ] Certificate fields: criteria version, reference format, scope wording.
- [ ] ⚖️ **Legal review of the entire "what it is and is not" note**, and a sweep of every page, badge, email and sales document to confirm nothing describes the attestation as certification or implies regulatory endorsement.

## 5. Packages — `content/pricing.ts`

- [ ] Essentials: training seats included, support level.
- [ ] Professional: reassessment cycle detail, support level and response times.
- [ ] Enterprise: governance and reporting cadence, integration/SSO options, custom training content, contractual terms, SLAs and DPA specifics.
- [ ] FAQ: whether to publish indicative ranges; training licensing model incl. minimums and renewals; annual reassessment fees and what happens if an organisation does not reassess.
- [ ] ⚖️ **Commercial terms review** before publishing any package inclusions.

## 6. Trust & security — `content/trust.ts`, `app/trust`

Nothing on this page may be published until confirmed by whoever runs the infrastructure.

- [ ] Data residency (region) and hosting provider.
- [ ] Encryption in transit and at rest.
- [ ] ISO 27001 status — state exactly, never claim an unissued certificate.
- [ ] SOC 2 status.
- [ ] Penetration testing cadence and provider.
- [ ] Backup and recovery (RPO / RTO).
- [ ] Sub-processor list and link.
- [ ] Contractual breach notification window.
- [ ] Access review cadence and approval process.
- [ ] Tenancy/separation model for client data.
- [ ] Staff vetting, confidentiality undertakings and training.
- [ ] Retention and deletion of client assessment data, evidence and reports.
- [ ] Incident response: detection, escalation, client notification, post-incident review.
- [ ] Date and author of our most recent internal self-assessment.
- [ ] Responsible disclosure policy, security contact and response times.
- [ ] Trust badge row (`components/marketing/Proof.tsx`): ISO status, EU residency region, encryption summary, vetting standard.

## 7. Credibility components — currently placeholder by design

- [ ] Client logo bar — only logos you hold **written permission** to display.
- [ ] Testimonials (3) — real quotes with written approval from the named individual.
- [ ] Case studies (3) — sector, challenge, work done, client-approved result.
- [ ] Stats band — organisations assessed, employees trained, attestations issued. Date every figure.
- [ ] Team members (4) on `/about` — names, roles, backgrounds. Only verifiable qualifications.
- [ ] `/about` mission: founding story and the problem observed.

## 8. Figures requiring a source — `[SOURCE NEEDED]`

On the homepage "Why it matters" band:

- [ ] Regulatory exposure — cite Article 83 and current DPC enforcement figures, with dates.
- [ ] Cost of an incident — cite a dated, named study for any breach-cost figure.
- [ ] Customer trust — cite a dated source for any trust or churn figure.
- [ ] Tender requirements — cite representative tender requirements or frameworks.
- [ ] Insight article: procurement cycle / questionnaire volume statistics.

## 9. Insights — `content/insights.ts`

All three articles are placeholder drafts. They are `noindex` and excluded from the sitemap until `draft: false`.

- [ ] Article 1 "What procurement teams actually ask" — expand each question, closing section, real quote with permission.
- [ ] Article 2 "Ten domains" — expand groupings, scoring model, closing section.
- [ ] Article 3 "Awareness training" — measurement section, real quote with permission, closing section.
- [ ] For each: named author and role, publication date, reading time, and set `draft: false`.

## 10. Forms — `lib/forms.ts`

- [ ] Connect `submitLead()` to a route handler or form service (marked hook).
- [ ] Add server-side validation — client checks are for the visitor only.
- [ ] Add privacy-respecting spam protection (honeypot + rate limiting).
- [ ] Confirm lawful basis and retention period for submissions; record the consent text shown at submission. ⚖️ **DPO review**
- [ ] Response-time promises on `/contact`, `/start` confirmation and the consultation confirmation.
- [ ] Scoping-call duration and proposal turnaround on the `/start` confirmation.

## 11. Legal documents — `content/legal.ts` ⚖️ **All four require legal review**

**Privacy policy**
- [ ] Controller identity, registered address, whether a DPO is appointed under Article 37.
- [ ] Exactly what training records hold; what technical data/server logs are kept and for how long.
- [ ] Lawful basis for every purpose, including enquiries, attestation records and marketing.
- [ ] Processor list (hosting, email, CRM, training platform, storage).
- [ ] International transfers: recipients, countries, mechanism, supplementary measures — or a plain statement that nothing leaves the EEA.
- [ ] Retention period per data category.
- [ ] How material changes are communicated.

**Cookie policy**
- [ ] Retention period for the stored consent record.
- [ ] Any tool added later: name, provider, purpose, cookies set, lifetime, whether data leaves the EEA.
- [ ] Confirm whether embedded media, maps or forms introduce third-party requests.

**Terms of service**
- [ ] Summary of / link to standard engagement terms and DPA.
- [ ] Badge usage rights, prohibited uses, suspension and withdrawal.
- [ ] Limitation of liability — must be drafted by counsel.
- [ ] Governing law and any consumer carve-outs.

**Accessibility statement**
- [ ] Conformance claim, only after testing with assistive technology — state date and method.
- [ ] Known limitations and expected resolution dates.
- [ ] Feedback contact and response time.
- [ ] Enforcement route if you are or supply a public body (Web Accessibility Directive, European Accessibility Act).
- [ ] When the statement was prepared and last reviewed.

## 12. Before you ship

- [ ] Replace `site.config.ts` `url` with the production domain and redeploy so canonicals, Open Graph and the sitemap are correct.
- [ ] Remove any credibility component you cannot fill with real material — an empty logo bar is better than a fake one.
- [ ] Re-run Lighthouse after adding real images or any third-party script.
- [ ] Test the full site with a keyboard and a screen reader.
- [ ] Confirm the cookie banner still sets nothing before consent after any new integration.
