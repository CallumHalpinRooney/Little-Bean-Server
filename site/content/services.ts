export type Service = {
  slug: string;
  name: string;
  navLabel: string;
  summary: string;
  heroTitle: string;
  heroLead: string;
  icon: "assess" | "report" | "remediate" | "train" | "verify" | "maintain";
  outcomes: string[];
  features: { title: string; description: string }[];
  deliverables: string[];
  metaDescription: string;
};

export const services: Service[] = [
  {
    slug: "compliance-assessment",
    name: "GDPR & data protection compliance assessment",
    navLabel: "Compliance assessment",
    summary:
      "A structured questionnaire across ten domains, reviewed by specialists and returned as a scored report with prioritised recommendations.",
    heroTitle: "Know exactly where your data protection risk sits",
    heroLead:
      "A structured assessment across ten domains, analysed by our specialists and returned as a scored Compliance Assessment Report — with a risk rating per area, the specific gaps we found, and recommendations in priority order.",
    icon: "assess",
    outcomes: [
      "A defensible, evidence-backed view of your current position",
      "Risk rated by domain so effort goes where it matters",
      "Findings a board and a technical team can both act on",
      "A baseline to measure the next assessment against",
    ],
    features: [
      {
        title: "Ten domains, plain English",
        description:
          "Questions are written for the people who actually hold the answers, so sections can be delegated across legal, IT, HR and operations without translation.",
      },
      {
        title: "Evidence attached as you go",
        description:
          "Policies, contracts, screenshots and records are attached against the questions they support, so findings rest on evidence rather than assertion.",
      },
      {
        title: "Specialist review, not automated scoring",
        description:
          "Our specialists read every response and supporting document. Scoring reflects what your organisation does in practice, not just what a policy says.",
      },
      {
        title: "Prioritised by risk and effort",
        description:
          "Recommendations are sequenced so the highest-risk, lowest-effort gaps are addressed first, and the sequence carries straight into remediation.",
      },
    ],
    deliverables: [
      "Overall compliance score",
      "Risk rating for each of the ten domains",
      "Detailed gap register with evidence references",
      "Prioritised recommendations",
      "Findings walkthrough with your team",
      "Board-ready executive summary",
    ],
    metaDescription:
      "A structured GDPR and data protection assessment across ten domains, analysed by specialists and returned as a scored report with prioritised recommendations.",
  },
  {
    slug: "remediation",
    name: "Remediation",
    navLabel: "Remediation",
    summary:
      "Close the gaps the assessment found — guided by us with templates and checklists, or managed by our specialists alongside your team.",
    heroTitle: "Close the gaps, with as much help as you need",
    heroLead:
      "A report is only worth the actions it leads to. Choose Guided Remediation and your team works through a clear plan with our templates and checklists, or choose Managed Remediation and our specialists implement the fixes alongside you.",
    icon: "remediate",
    outcomes: [
      "Every finding tracked to closure against a single plan",
      "Policies and records that reflect real practice",
      "Evidence pack ready for customers, auditors and tenders",
      "A route to the Verified attestation",
    ],
    features: [
      {
        title: "One prioritised plan",
        description:
          "Both packages work from the same plan produced by your assessment, with owners, sequence and status against every finding.",
      },
      {
        title: "Templates built for Irish and EU practice",
        description:
          "Policies, notices, registers, contract clauses and checklists drafted for GDPR obligations as they apply in Ireland and the wider EU.",
      },
      {
        title: "Specialist implementation where you need it",
        description:
          "Under Managed Remediation, our specialists draft, configure and run the work with your teams rather than handing over a document.",
      },
      {
        title: "Evidence captured as you close",
        description:
          "Closure evidence is collected against each finding as you go, so verification and future reassessments do not restart the work.",
      },
    ],
    deliverables: [
      "Step-by-step remediation plan",
      "Policy, notice and register templates",
      "Implementation checklists per finding",
      "Progress tracking against the plan",
      "Specialist implementation (Managed only)",
      "Closure evidence pack",
    ],
    metaDescription:
      "Guided and Managed remediation packages that close the gaps found in your data protection assessment, with templates, checklists and specialist implementation.",
  },
  {
    slug: "training",
    name: "Security & data protection awareness training",
    navLabel: "Awareness training",
    summary:
      "AI-powered, role-based training that adapts to each employee, with completion and risk dashboards for managers.",
    heroTitle: "Training that adapts to the person taking it",
    heroLead:
      "Interactive awareness training covering GDPR, data handling, phishing, password hygiene, social engineering, remote working security and incident reporting. Content adapts to each employee's role and progress, and managers get completion and risk dashboards across their teams.",
    icon: "train",
    outcomes: [
      "Relevant training rather than one generic course for everyone",
      "Completion evidence for regulators, customers and tenders",
      "Visible risk concentrations by team and topic",
      "Staff awareness that stands up in your next assessment",
    ],
    features: [
      {
        title: "Role-based paths",
        description:
          "A finance approver, a developer and a front-line service agent face different risks. Each is given the modules and scenarios that match their work.",
      },
      {
        title: "Adapts to progress",
        description:
          "Where someone struggles, the platform reinforces that topic; where they demonstrate competence, it moves on. Time is spent where it changes behaviour.",
      },
      {
        title: "Manager dashboards",
        description:
          "Completion rates, outstanding assignments and risk concentration by team and topic, exportable as evidence for audits and tenders.",
      },
      {
        title: "Short, interactive modules",
        description:
          "Scenario-based sessions designed to fit around real work rather than a single long annual session nobody remembers.",
      },
    ],
    deliverables: [
      "Role-based learning paths",
      "Modules across the core risk topics",
      "Phishing and social engineering scenarios",
      "Completion and risk dashboards",
      "Exportable evidence of completion",
      "Annual refresh cycle",
    ],
    metaDescription:
      "AI-powered, role-based security and data protection awareness training covering GDPR, phishing, data handling and incident reporting, with manager dashboards.",
  },
];

export const trainingTopics = [
  "GDPR fundamentals",
  "Data handling and classification",
  "Phishing and email fraud",
  "Password hygiene and MFA",
  "Social engineering",
  "Remote and hybrid working",
  "Incident reporting",
  "Data subject requests",
];

/** Guided vs Managed comparison. Keep the two columns symmetrical. */
export type ComparisonRow = { feature: string; guided: string | boolean; managed: string | boolean };

export const remediationComparison: ComparisonRow[] = [
  { feature: "Prioritised remediation plan", guided: true, managed: true },
  { feature: "Policy, notice and register templates", guided: true, managed: true },
  { feature: "Implementation checklists", guided: true, managed: true },
  { feature: "Who carries out the work", guided: "Your team", managed: "Our specialists, with your team" },
  { feature: "Specialist support", guided: "Scheduled check-ins", managed: "Named lead throughout" },
  { feature: "Policy and notice drafting", guided: "Templates for you to adapt", managed: "Drafted for your organisation" },
  { feature: "Records of processing", guided: "Template and guidance", managed: "Built with your teams" },
  { feature: "Processor contract review", guided: "Checklist and clause library", managed: "Reviewed by our specialists" },
  { feature: "Progress tracking", guided: true, managed: true },
  { feature: "Closure evidence pack", guided: "Assembled by you", managed: "Assembled for you" },
  { feature: "Typical duration", guided: "[PLACEHOLDER]", managed: "[PLACEHOLDER]" },
  { feature: "Best suited to", guided: "Teams with internal capacity and a clear owner", managed: "Teams without spare capacity, or with a fixed deadline" },
];
