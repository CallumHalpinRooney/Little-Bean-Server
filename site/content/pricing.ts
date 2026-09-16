export type Tier = {
  id: string;
  name: string;
  positioning: string;
  bestFor: string;
  price: string;
  priceNote: string;
  featured?: boolean;
  includes: string[];
  ctaLabel: string;
};

/**
 * Deliberately no fixed prices — packages are scoped per organisation.
 * Replace the [PLACEHOLDER] lines with real inclusions before launch.
 */
export const tiers: Tier[] = [
  {
    id: "essentials",
    name: "Essentials",
    positioning: "Establish a baseline and evidence it.",
    bestFor: "Organisations getting a defensible view of their position for the first time, or preparing for a supply-chain audit.",
    price: "Contact sales",
    priceNote: "Scoped on organisation size and complexity",
    includes: [
      "Compliance assessment across all ten domains",
      "Scored Compliance Assessment Report",
      "Findings walkthrough with your team",
      "Guided Remediation plan and templates",
      "Awareness training — [PLACEHOLDER: seats included]",
      "[PLACEHOLDER: support level]",
    ],
    ctaLabel: "Contact sales",
  },
  {
    id: "professional",
    name: "Professional",
    positioning: "Close the gaps and earn the attestation.",
    bestFor: "Organisations that need gaps closed to a deadline and want the Verified attestation for customers and tenders.",
    price: "Contact sales",
    priceNote: "Scoped on organisation size, complexity and remediation effort",
    featured: true,
    includes: [
      "Everything in Essentials",
      "Managed Remediation with a named specialist lead",
      "Verification and Verified attestation on meeting the standard",
      "Role-based training with manager dashboards",
      "Annual reassessment — [PLACEHOLDER: cycle detail]",
      "[PLACEHOLDER: support level and response times]",
    ],
    ctaLabel: "Contact sales",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    positioning: "Run the programme across a group.",
    bestFor: "Multi-entity groups, regulated organisations and businesses running data protection as an ongoing programme.",
    price: "Contact sales",
    priceNote: "Scoped per group structure and jurisdictions",
    includes: [
      "Everything in Professional",
      "Multi-entity and multi-jurisdiction assessment",
      "[PLACEHOLDER: governance and reporting cadence]",
      "[PLACEHOLDER: integration and SSO options]",
      "[PLACEHOLDER: custom training content]",
      "[PLACEHOLDER: contractual terms, SLAs and DPA specifics]",
    ],
    ctaLabel: "Contact sales",
  },
];

export const pricingFaqs: { question: string; answer: string }[] = [
  {
    question: "Why are prices not published?",
    answer:
      "Scope drives cost: the number of entities, systems, processors and staff changes the work materially. We scope on a short call and quote against that scope. [PLACEHOLDER: add any indicative ranges you are comfortable publishing.]",
  },
  {
    question: "Can we start with the assessment alone?",
    answer:
      "Yes. Many organisations start with an assessment and report, then decide on remediation once they can see what the gaps actually are.",
  },
  {
    question: "Do you charge per employee for training?",
    answer: "[PLACEHOLDER: describe the training licensing model, including minimums and renewal terms.]",
  },
  {
    question: "What does the attestation cost to maintain?",
    answer:
      "[PLACEHOLDER: describe annual reassessment fees and what happens if an organisation does not reassess.]",
  },
];
