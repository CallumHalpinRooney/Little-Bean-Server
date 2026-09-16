export type Industry = {
  slug: string;
  name: string;
  icon: "finance" | "healthcare" | "technology" | "retail" | "public" | "professional";
  lead: string;
  pressures: string[];
  focus: string;
};

export const industries: Industry[] = [
  {
    slug: "financial-services",
    name: "Financial services",
    icon: "finance",
    lead:
      "Layered obligations, heavy supervision and customers who ask hard questions about how their data is handled.",
    pressures: [
      "Data protection obligations sitting alongside sector regulation and outsourcing rules",
      "Large processor estates covering core banking, payments and analytics",
      "Board-level accountability for operational and information risk",
    ],
    focus:
      "We tend to concentrate on processor oversight, retention across long-lived financial records, international transfers in shared service models, and evidence that staff awareness is current rather than historic.",
  },
  {
    slug: "healthcare",
    name: "Healthcare & life sciences",
    icon: "healthcare",
    lead:
      "Special category data at scale, clinical urgency, and systems that were never designed to be interrogated by a regulator.",
    pressures: [
      "Health data requiring an Article 9 condition as well as a lawful basis",
      "Legacy clinical systems with limited access logging and retention control",
      "Research, trial and third-party data sharing arrangements",
    ],
    focus:
      "Work usually centres on lawful basis and Article 9 conditions, access control and audit logging in clinical systems, DPIAs for new care pathways or research, and breach response where clinical staff are the first to notice.",
  },
  {
    slug: "technology",
    name: "Technology & SaaS",
    icon: "technology",
    lead:
      "You are somebody else's processor, and their security questionnaire is now part of your sales cycle.",
    pressures: [
      "Enterprise customers auditing you before they will sign",
      "Sub-processor chains that change as your architecture does",
      "Product decisions that quietly become processing decisions",
    ],
    focus:
      "We focus on Article 28 terms and sub-processor transparency, transfer mechanisms for multi-region infrastructure, data minimisation in product and telemetry, and having assessment evidence ready before a customer asks.",
  },
  {
    slug: "retail",
    name: "Retail & consumer",
    icon: "retail",
    lead:
      "High-volume consumer data, marketing consent, loyalty programmes and seasonal workforces.",
    pressures: [
      "Marketing consent and preference management across channels",
      "Loyalty and personalisation data accumulating without a retention rule",
      "Seasonal and high-turnover staff who still handle customer data",
    ],
    focus:
      "Attention usually goes to consent capture and withdrawal, retention for loyalty and CRM data, processor management across marketing platforms, and training that can be delivered quickly to a changing workforce.",
  },
  {
    slug: "public-sector",
    name: "Public sector",
    icon: "public",
    lead:
      "Statutory functions, public scrutiny and a duty to citizens who cannot simply take their data elsewhere.",
    pressures: [
      "Processing grounded in public task and legal obligation",
      "Data sharing between bodies and with contracted providers",
      "Access requests and transparency expectations",
    ],
    focus:
      "We look closely at lawful basis for public task processing, data sharing agreements, DPIAs for new services and technologies, retention under statutory schedules, and handling of access requests at volume.",
  },
  {
    slug: "professional-services",
    name: "Professional services",
    icon: "professional",
    lead:
      "Client confidentiality, long-lived files, and clients who increasingly audit their advisers.",
    pressures: [
      "Confidential client data held across matters and long retention periods",
      "Client and supply-chain audits reaching into your practice",
      "Distributed and mobile working across client sites",
    ],
    focus:
      "Typical focus areas are retention across matter files, access control and confidentiality, processor management for practice and document systems, and awareness training for staff who work from client sites.",
  },
];
