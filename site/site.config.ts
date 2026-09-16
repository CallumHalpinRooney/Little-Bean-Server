/**
 * SINGLE SOURCE OF TRUTH FOR BRANDING.
 * Change the company name, contact details, navigation and social links here
 * and the whole site follows. Colour tokens live in tailwind.config.ts and
 * app/globals.css.
 *
 * Anything wrapped in square brackets is a placeholder awaiting real content.
 */
export const siteConfig = {
  company: {
    /** Used in every heading, legal page and the attestation mark. */
    name: "[COMPANY NAME]",
    /** Short form for tight spaces (nav, badge, footer mark). */
    shortName: "[COMPANY NAME]",
    legalEntity: "[REGISTERED COMPANY NAME] Limited",
    companyNumber: "[CRO NUMBER]",
    vatNumber: "[VAT NUMBER]",
    tagline: "Assess. Remediate. Train. Verify.",
    description:
      "Independent GDPR and data protection assessment, remediation and awareness training for organisations across Ireland and the EU.",
    foundedYear: "[YEAR]",
  },

  /** [PLACEHOLDER] Replace with the real production domain. Must be a valid
   *  absolute URL — it drives canonical links, Open Graph URLs and the sitemap. */
  url: "https://example.ie",

  contact: {
    email: "[hello@example.ie]",
    salesEmail: "[sales@example.ie]",
    dpoEmail: "[dpo@example.ie]",
    phone: "[+353 1 000 0000]",
    address: {
      line1: "[Address line 1]",
      line2: "[Address line 2]",
      city: "[City]",
      postcode: "[Eircode]",
      country: "Ireland",
    },
  },

  social: {
    linkedin: "[https://www.linkedin.com/company/PLACEHOLDER]",
  },

  /** Primary navigation. Items with `children` render as a dropdown. */
  nav: [
    {
      label: "Services",
      href: "/services",
      children: [
        { label: "Compliance assessment", href: "/services/compliance-assessment", description: "Structured review across ten data protection domains" },
        { label: "Remediation", href: "/services/remediation", description: "Guided or managed closure of identified gaps" },
        { label: "Awareness training", href: "/services/training", description: "Role-based training that adapts to each employee" },
      ],
    },
    { label: "How it works", href: "/how-it-works" },
    { label: "Verified", href: "/verified" },
    { label: "Industries", href: "/industries" },
    { label: "Packages", href: "/pricing" },
    { label: "Insights", href: "/insights" },
  ],

  footerNav: [
    {
      title: "Services",
      links: [
        { label: "Compliance assessment", href: "/services/compliance-assessment" },
        { label: "Remediation", href: "/services/remediation" },
        { label: "Awareness training", href: "/services/training" },
        { label: "All services", href: "/services" },
      ],
    },
    {
      title: "Company",
      links: [
        { label: "About", href: "/about" },
        { label: "How it works", href: "/how-it-works" },
        { label: "Industries", href: "/industries" },
        { label: "Insights", href: "/insights" },
        { label: "Trust & security", href: "/trust" },
      ],
    },
    {
      title: "Get started",
      links: [
        { label: "Start your assessment", href: "/start" },
        { label: "Book a consultation", href: "/contact" },
        { label: "Packages", href: "/pricing" },
        { label: "Verified attestation", href: "/verified" },
      ],
    },
    {
      title: "Legal",
      links: [
        { label: "Privacy policy", href: "/legal/privacy" },
        { label: "Cookie policy", href: "/legal/cookies" },
        { label: "Terms of service", href: "/legal/terms" },
        { label: "Accessibility statement", href: "/legal/accessibility" },
      ],
    },
  ],

  cta: {
    primary: { label: "Book a consultation", href: "/contact" },
    secondary: { label: "Start your assessment", href: "/start" },
  },

  /** Company size options used by the contact and assessment forms. */
  companySizes: ["1–49 employees", "50–249 employees", "250–999 employees", "1,000–4,999 employees", "5,000+ employees"],

  roles: [
    "Data Protection Officer",
    "CISO / Head of Security",
    "Head of Compliance / Risk",
    "Legal Counsel",
    "HR / Learning & Development",
    "COO / CEO / Board",
    "IT Manager",
    "Other",
  ],

  interests: [
    { id: "assessment", label: "GDPR & data protection compliance assessment" },
    { id: "remediation", label: "Remediation (guided or managed)" },
    { id: "training", label: "Security & data protection awareness training" },
    { id: "verified", label: "Verified attestation for tenders and audits" },
  ],
} as const;

export type SiteConfig = typeof siteConfig;
