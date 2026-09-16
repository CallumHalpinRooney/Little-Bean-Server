/** Content for the Trust & security page. Every value needs confirming. */
export const trustFacts: { label: string; value: string; note?: string }[] = [
  { label: "Data residency", value: "[PLACEHOLDER: hosting region]", note: "Confirm the cloud provider, region and any replication before publishing." },
  { label: "Hosting provider", value: "[PLACEHOLDER: provider]" },
  { label: "Encryption in transit", value: "[PLACEHOLDER: e.g. TLS 1.2+]" },
  { label: "Encryption at rest", value: "[PLACEHOLDER: e.g. AES-256]" },
  { label: "ISO 27001", value: "[PLACEHOLDER: status — certified, in progress, or not held]", note: "Do not claim certification until the certificate is issued. State the status plainly." },
  { label: "SOC 2", value: "[PLACEHOLDER: status]" },
  { label: "Penetration testing", value: "[PLACEHOLDER: cadence and provider]" },
  { label: "Backup and recovery", value: "[PLACEHOLDER: RPO / RTO]" },
  { label: "Sub-processors", value: "[PLACEHOLDER: link to sub-processor list]" },
  { label: "Breach notification", value: "[PLACEHOLDER: contractual notification window]" },
];

export const trustPractices: { title: string; description: string }[] = [
  {
    title: "Least privilege by default",
    description:
      "Access to client assessment data is granted per engagement and removed when it ends. [PLACEHOLDER: describe your access review cadence and approval process.]",
  },
  {
    title: "Separation of client data",
    description:
      "[PLACEHOLDER: describe tenancy model — logical separation, per-client encryption keys, or otherwise.]",
  },
  {
    title: "Specialist vetting",
    description:
      "[PLACEHOLDER: describe background checks, confidentiality undertakings and ongoing training for staff who see client data.]",
  },
  {
    title: "Retention of your data",
    description:
      "[PLACEHOLDER: state how long assessment responses, evidence and reports are retained, and how deletion is requested and evidenced.]",
  },
  {
    title: "Incident response",
    description:
      "[PLACEHOLDER: describe detection, escalation, client notification commitments and post-incident review.]",
  },
  {
    title: "Our own assessment",
    description:
      "We run the same assessment against ourselves. [PLACEHOLDER: state the date of our most recent internal assessment and who conducted it.]",
  },
];
