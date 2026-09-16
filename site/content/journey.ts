/**
 * The customer journey — the spine of the whole site.
 * Timelines are deliberately left as placeholders until real delivery data
 * is available.
 */
export type JourneyStage = {
  id: string;
  step: string;
  title: string;
  summary: string;
  detail: string;
  deliverable: string;
  timeline: string;
  youDo: string[];
  weDo: string[];
  icon: "assess" | "report" | "remediate" | "train" | "verify" | "maintain";
};

export const journey: JourneyStage[] = [
  {
    id: "assess",
    step: "01",
    title: "Assess",
    summary: "A structured questionnaire across ten data protection domains, completed by your team.",
    detail:
      "You complete a structured assessment covering lawful basis and consent, records of processing, data subject rights, retention, processor management, security controls, breach response, DPIAs, international transfers and staff awareness. Questions are written in plain English, can be delegated to the right people internally, and evidence can be attached as you go.",
    deliverable: "Completed assessment with evidence attached",
    timeline: "[PLACEHOLDER: typical duration]",
    youDo: ["Nominate an internal owner", "Delegate sections to the right teams", "Attach supporting evidence"],
    weDo: ["Provide the questionnaire and guidance", "Answer queries as you complete it", "Check responses for completeness"],
    icon: "assess",
  },
  {
    id: "report",
    step: "02",
    title: "Report",
    summary: "Our specialists score your responses and set out the gaps in priority order.",
    detail:
      "Specialists review every response and supporting document, then produce a Compliance Assessment Report: an overall score, a risk rating for each of the ten domains, the specific gaps found, and recommendations ordered by risk and effort. The report is written to be read by both a board and a technical team.",
    deliverable: "Scored Compliance Assessment Report",
    timeline: "[PLACEHOLDER: typical turnaround]",
    youDo: ["Clarify anything our reviewers query", "Nominate attendees for the findings walkthrough"],
    weDo: ["Review responses and evidence", "Score each domain and rate risk", "Prioritise recommendations", "Walk your team through the findings"],
    icon: "report",
  },
  {
    id: "remediate",
    step: "03",
    title: "Remediate",
    summary: "Close the gaps — with your own team guided by us, or with our specialists doing the work.",
    detail:
      "Choose Guided Remediation, where you receive a step-by-step action plan with templates, policies and checklists for your team to work through, or Managed Remediation, where our specialists implement the fixes alongside you. Both track progress against the same prioritised plan from the report.",
    deliverable: "Prioritised action plan and closed gaps",
    timeline: "[PLACEHOLDER: depends on scope and package]",
    youDo: ["Choose guided or managed", "Assign internal owners", "Approve policy and process changes"],
    weDo: ["Produce the action plan", "Supply templates, policies and checklists", "Implement fixes directly (Managed)", "Track progress against the plan"],
    icon: "remediate",
  },
  {
    id: "train",
    step: "04",
    title: "Train",
    summary: "Role-based awareness training that adapts to each employee and reports to managers.",
    detail:
      "Staff complete interactive training matched to their role — covering GDPR, data handling, phishing, password hygiene, social engineering, remote working security and incident reporting. Content adapts to each person's role and progress, and managers see completion and risk dashboards across teams.",
    deliverable: "Trained workforce with completion evidence",
    timeline: "[PLACEHOLDER: rollout period]",
    youDo: ["Provide staff list and roles", "Communicate the rollout internally", "Review dashboards with managers"],
    weDo: ["Configure role-based learning paths", "Run the rollout", "Report completion and risk by team"],
    icon: "train",
  },
  {
    id: "verify",
    step: "05",
    title: "Verify",
    summary: "Meet the standard and receive a dated Verified attestation for tenders and audits.",
    detail:
      "Once gaps are closed and training is complete, we reassess the affected domains. Organisations that meet the required standard receive a dated attestation: a digital badge for your website and a certificate you can share with customers, partners and procurement teams. It confirms independent assessment — it is not a regulatory certification.",
    deliverable: "Dated digital badge and certificate",
    timeline: "[PLACEHOLDER: verification window]",
    youDo: ["Confirm remediation is complete", "Provide closing evidence"],
    weDo: ["Reassess the affected domains", "Issue the badge and certificate", "Publish your verification record"],
    icon: "verify",
  },
  {
    id: "maintain",
    step: "06",
    title: "Maintain",
    summary: "Annual reassessment keeps the attestation current as your organisation changes.",
    detail:
      "Data protection posture drifts as systems, suppliers and teams change. An annual reassessment re-scores every domain, refreshes training and renews the attestation, so what you show a customer or a procurement team is current rather than historic.",
    deliverable: "Renewed attestation and updated report",
    timeline: "[PLACEHOLDER: annual cycle]",
    youDo: ["Flag material changes during the year", "Complete the reassessment"],
    weDo: ["Monitor attestation validity", "Reassess annually", "Refresh training content", "Renew or withdraw the attestation"],
    icon: "maintain",
  },
];
