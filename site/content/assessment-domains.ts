/** The ten domains covered by the compliance assessment. */
export type AssessmentDomain = {
  code: string;
  title: string;
  description: string;
};

export const assessmentDomains: AssessmentDomain[] = [
  {
    code: "D01",
    title: "Lawful basis and consent",
    description:
      "How you identify and record a lawful basis for each processing activity, and how consent is captured, evidenced and withdrawn.",
  },
  {
    code: "D02",
    title: "Records of processing",
    description:
      "Whether your record of processing activities exists, is current, and reflects what your systems and suppliers actually do.",
  },
  {
    code: "D03",
    title: "Data subject rights",
    description:
      "How access, rectification, erasure, portability and objection requests are received, verified, tracked and answered within statutory deadlines.",
  },
  {
    code: "D04",
    title: "Data retention",
    description:
      "Retention schedules, how they are applied in practice across systems and backups, and how deletion is evidenced.",
  },
  {
    code: "D05",
    title: "Third-party and processor management",
    description:
      "Due diligence, contracts and Article 28 terms for processors and sub-processors, and ongoing oversight of them.",
  },
  {
    code: "D06",
    title: "Security controls",
    description:
      "Access control, encryption, logging, patching, backup and recovery — the technical and organisational measures behind your obligations.",
  },
  {
    code: "D07",
    title: "Breach response",
    description:
      "Detection, internal escalation, assessment against the 72-hour notification duty, notification records and post-incident review.",
  },
  {
    code: "D08",
    title: "Data protection impact assessments",
    description:
      "When DPIAs are triggered, how they are conducted and documented, and how residual risk is signed off.",
  },
  {
    code: "D09",
    title: "International transfers",
    description:
      "Transfer mapping, transfer mechanisms, transfer impact assessments and the supplementary measures relied upon.",
  },
  {
    code: "D10",
    title: "Staff awareness",
    description:
      "Who is trained, on what, how often, and whether completion and comprehension can be evidenced to a regulator or a customer.",
  },
];
