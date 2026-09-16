/**
 * LEGAL DOCUMENT TEMPLATES — NOT LEGAL ADVICE.
 * These are drafting scaffolds. Every document must be reviewed, completed and
 * approved by a qualified Irish/EU legal adviser before publication, and kept
 * in step with what the business actually does.
 */
export type LegalSection = { heading: string; paragraphs: string[]; list?: string[] };

export type LegalDoc = {
  slug: string;
  title: string;
  description: string;
  lastUpdated: string;
  summary: string;
  sections: LegalSection[];
};

export const legalDocs: LegalDoc[] = [
  {
    slug: "privacy",
    title: "Privacy policy",
    description:
      "How we collect, use, share and retain personal data, the lawful bases we rely on, and the rights available to you.",
    lastUpdated: "[PLACEHOLDER: date]",
    summary:
      "This notice explains what we do with personal data when you use this website, enquire about our services or work with us as a client.",
    sections: [
      {
        heading: "Who we are",
        paragraphs: [
          "[COMPANY LEGAL NAME] ([COMPANY NAME]) is the controller of the personal data described in this notice. We are registered in Ireland under company number [CRO NUMBER], with a registered office at [REGISTERED ADDRESS].",
          "Questions about this notice, or about how we handle personal data, can be sent to [DPO EMAIL]. [PLACEHOLDER: state whether a Data Protection Officer has been appointed under Article 37 and give their contact details if so.]",
        ],
      },
      {
        heading: "What personal data we collect",
        paragraphs: ["We collect only what we need for the purposes set out below."],
        list: [
          "Enquiry details: name, work email address, organisation, organisation size, role, areas of interest and anything you tell us in a message.",
          "Engagement details: the contact details of people involved in an assessment, and the responses and evidence they provide on behalf of their organisation.",
          "Training records: where we deliver awareness training, the identifiers and completion records necessary to report progress to your organisation. [PLACEHOLDER: list exactly what is held.]",
          "Technical data: [PLACEHOLDER: describe server logs, IP addresses and retention. If no logs are kept beyond your hosting provider's defaults, say so and name the provider.]",
        ],
      },
      {
        heading: "Why we use it, and our lawful basis",
        paragraphs: [
          "[PLACEHOLDER: complete this table with legal advice. Each purpose needs a lawful basis under Article 6, and the reasoning must match what actually happens.]",
        ],
        list: [
          "Responding to your enquiry — lawful basis: [PLACEHOLDER: legitimate interests or steps prior to entering a contract].",
          "Delivering assessments, remediation and training under a contract — lawful basis: contract.",
          "Issuing and maintaining attestations, including the public verification record — lawful basis: [PLACEHOLDER].",
          "Meeting our own legal and regulatory obligations — lawful basis: legal obligation.",
          "Sending service updates or marketing — lawful basis: [PLACEHOLDER: consent, or ePrivacy soft opt-in where applicable]. You can withdraw at any time.",
        ],
      },
      {
        heading: "Who we share it with",
        paragraphs: [
          "We do not sell personal data. We share it only with service providers acting on our instructions, and where we are required to by law.",
          "[PLACEHOLDER: list your processors — hosting, email, CRM, training platform, document storage — with the purpose of each, and link to a sub-processor list if you maintain one.]",
        ],
      },
      {
        heading: "International transfers",
        paragraphs: [
          "[PLACEHOLDER: state whether any personal data leaves the EEA. If it does, identify the recipients, the countries, the transfer mechanism relied upon (adequacy decision, standard contractual clauses) and the supplementary measures in place. If nothing leaves the EEA, say so plainly.]",
        ],
      },
      {
        heading: "How long we keep it",
        paragraphs: [
          "[PLACEHOLDER: set a retention period for each category — enquiries, engagement records, assessment evidence, reports, training records, attestation records — and state what happens at the end of it.]",
        ],
      },
      {
        heading: "Your rights",
        paragraphs: [
          "Subject to the conditions in the GDPR, you have the right to access your personal data, to have inaccurate data corrected, to have data erased, to restrict or object to processing, to data portability, and to withdraw consent where we rely on it.",
          "To exercise any of these rights, contact [DPO EMAIL]. We will respond within one month, and will tell you if we need longer as the GDPR permits.",
          "If you are not satisfied with our response, you can complain to the Data Protection Commission, 6 Pembroke Row, Dublin 2, D02 XW46, or via dataprotection.ie. You may also complain to the supervisory authority where you live or work.",
        ],
      },
      {
        heading: "Cookies and similar technologies",
        paragraphs: [
          "This website sets no non-essential cookies or storage before you consent, and loads no third-party trackers by default. See our cookie policy for the detail and to change your choice.",
        ],
      },
      {
        heading: "Changes to this notice",
        paragraphs: [
          "We will update this notice when our practices change and record the date of the most recent version above. [PLACEHOLDER: state how material changes are communicated to clients.]",
        ],
      },
    ],
  },
  {
    slug: "cookies",
    title: "Cookie policy",
    description: "What this website stores in your browser, why, and how to change or withdraw your choice.",
    lastUpdated: "[PLACEHOLDER: date]",
    summary:
      "We use the minimum storage needed to make this site work. Nothing optional is set unless you actively choose it, and you can change your choice at any time.",
    sections: [
      {
        heading: "Our approach",
        paragraphs: [
          "Under the ePrivacy Regulations and the GDPR, consent is required before setting anything on your device that is not strictly necessary. We therefore set nothing optional until you choose it, present Accept and Reject with equal prominence, treat no response as a refusal, and make it as easy to withdraw consent as to give it.",
          "This site currently loads no analytics, advertising or social media scripts at all.",
        ],
      },
      {
        heading: "Strictly necessary storage",
        paragraphs: ["These entries are required for the site to function and cannot be switched off."],
        list: [
          "cookie-consent-v1 — records your cookie choice and the date you made it, so we do not ask again. Stored in your browser's local storage. Retention: [PLACEHOLDER: state period].",
          "theme — remembers whether you chose light or dark mode. Stored in your browser's local storage and never transmitted to us.",
          "site-content-edit-mode / site-content-overrides-v1 — used only by site editors working in edit mode. Not set for ordinary visitors.",
        ],
      },
      {
        heading: "Optional categories",
        paragraphs: [
          "The consent banner offers analytics and marketing categories so they can be enabled in future without changing how consent works. Both are off by default and nothing is currently configured in either.",
          "[PLACEHOLDER: when you add a tool, list its name, provider, purpose, the cookies it sets, their lifetime, and whether data leaves the EEA.]",
        ],
      },
      {
        heading: "Changing or withdrawing your choice",
        paragraphs: [
          "Select “Cookie preferences” in the footer of any page to change or withdraw your consent. You can also clear site data in your browser settings, which removes everything this site has stored.",
        ],
      },
      {
        heading: "Third-party requests",
        paragraphs: [
          "Fonts are served from this site rather than a third-party font service, so browsing does not disclose your IP address to a font provider. [PLACEHOLDER: confirm whether any embedded media, maps or forms introduce third-party requests, and list them.]",
        ],
      },
    ],
  },
  {
    slug: "terms",
    title: "Terms of service",
    description: "The terms on which we provide this website and our assessment, remediation, training and attestation services.",
    lastUpdated: "[PLACEHOLDER: date]",
    summary:
      "These terms govern your use of this website. Services are provided under a separate written agreement, which takes precedence over anything here.",
    sections: [
      {
        heading: "About these terms",
        paragraphs: [
          "This website is operated by [COMPANY LEGAL NAME]. By using it you accept these terms. If you do not accept them, please do not use the site.",
          "[PLACEHOLDER: legal review required for this entire document, including consumer-facing obligations if any of your services are sold to individuals.]",
        ],
      },
      {
        heading: "Information on this website",
        paragraphs: [
          "Content on this site is general information about our services. It is not legal advice, and it does not create an adviser relationship. Data protection obligations depend on your specific circumstances.",
        ],
      },
      {
        heading: "Our services",
        paragraphs: [
          "Assessments, remediation, training and attestation are provided under a separate written engagement agreement setting out scope, fees, responsibilities and liability. Where those terms differ from these, the engagement agreement prevails.",
          "[PLACEHOLDER: summarise or link to your standard engagement terms and data processing agreement.]",
        ],
      },
      {
        heading: "The Verified attestation",
        paragraphs: [
          "An attestation confirms that we independently assessed an organisation against our published assessment criteria and that it met the required standard on the date shown, for the scope shown. It is not a certification under Article 42 of the GDPR, and it is not issued, approved, accredited or endorsed by the Data Protection Commission or any other supervisory authority.",
          "An attestation does not guarantee compliance and does not transfer any obligation or liability to us. Responsibility for compliance remains with the assessed organisation at all times.",
          "[PLACEHOLDER: set out badge usage rights, prohibited uses, the circumstances in which an attestation may be suspended or withdrawn, and the effect of withdrawal.]",
        ],
      },
      {
        heading: "Intellectual property",
        paragraphs: [
          "The content, design, assessment criteria, templates and badge on this site belong to us or our licensors. You may not reproduce or adapt them except as permitted in writing or by law.",
        ],
      },
      {
        heading: "Limitation of liability",
        paragraphs: [
          "[PLACEHOLDER: liability wording must be drafted by legal counsel. It should address exclusions that cannot lawfully be excluded, caps, and the interaction with the engagement agreement.]",
        ],
      },
      {
        heading: "Governing law",
        paragraphs: [
          "These terms are governed by the laws of Ireland, and the courts of Ireland have exclusive jurisdiction. [PLACEHOLDER: confirm with counsel, including any consumer law carve-outs.]",
        ],
      },
    ],
  },
  {
    slug: "accessibility",
    title: "Accessibility statement",
    description: "Our commitment to accessibility on this website, the standard we aim for, and how to tell us about a problem.",
    lastUpdated: "[PLACEHOLDER: date]",
    summary:
      "We aim to meet WCAG 2.2 level AA on this website. If something stops you using it, we want to know and we will fix it.",
    sections: [
      {
        heading: "Our commitment",
        paragraphs: [
          "We want everyone to be able to use this site, whatever technology they use. It is built with semantic HTML, works with keyboard navigation alone, provides visible focus indicators, respects reduced-motion preferences, and offers light and dark themes with tested colour contrast.",
        ],
      },
      {
        heading: "Conformance status",
        paragraphs: [
          "This site is designed to conform to the Web Content Accessibility Guidelines (WCAG) 2.2 at level AA.",
          "[PLACEHOLDER: state the conformance claim precisely once the site has been tested — fully conformant, partially conformant, or not evaluated — and give the date and method of assessment. Do not claim conformance that has not been tested, including with assistive technology.]",
        ],
      },
      {
        heading: "Known limitations",
        paragraphs: [
          "[PLACEHOLDER: list any known issues, the reason, and when you expect to resolve them. If third-party content such as an embedded form or video is involved, say so.]",
        ],
      },
      {
        heading: "Feedback",
        paragraphs: [
          "If you cannot access something on this site, or you need information in another format, contact [CONTACT EMAIL] or call [PHONE]. Tell us the page, what you were trying to do and what happened, and we will respond within [PLACEHOLDER: response time].",
        ],
      },
      {
        heading: "Enforcement",
        paragraphs: [
          "[PLACEHOLDER: if you are a public body or supply public bodies, reference the relevant obligations, including the EU Web Accessibility Directive as transposed in Ireland and the European Accessibility Act where applicable, and name the enforcement route for complaints.]",
        ],
      },
      {
        heading: "Preparation of this statement",
        paragraphs: [
          "[PLACEHOLDER: state when this statement was prepared, when it was last reviewed, and how the site was evaluated — self-assessment, third-party audit, or both.]",
        ],
      },
    ],
  },
];

export function getLegalDoc(slug: string) {
  return legalDocs.find((doc) => doc.slug === slug);
}
