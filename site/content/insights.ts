/**
 * Blog / insight articles.
 *
 * These three are PLACEHOLDER drafts that demonstrate the article template.
 * Replace the bodies with real editorial before launch, and give every
 * article a named author. Any figure must be sourced — use the "source"
 * block type rather than asserting a number.
 */
export type Block =
  | { type: "paragraph"; text: string }
  | { type: "heading"; text: string }
  | { type: "list"; items: string[] }
  | { type: "quote"; text: string; attribution: string }
  | { type: "callout"; title: string; text: string };

export type Article = {
  slug: string;
  title: string;
  description: string;
  category: string;
  date: string;
  readingTime: string;
  author: { name: string; role: string };
  draft: boolean;
  body: Block[];
};

export const articles: Article[] = [
  {
    slug: "what-procurement-teams-actually-ask-about-data-protection",
    title: "What procurement teams actually ask about data protection",
    description:
      "Enterprise buyers have moved from asking whether you comply to asking you to show it. Here is the shape of that request, and what a good answer looks like.",
    category: "Tenders & supply chain",
    date: "[PLACEHOLDER: publication date]",
    readingTime: "[PLACEHOLDER] min read",
    author: { name: "[PLACEHOLDER: author name]", role: "[PLACEHOLDER: role]" },
    draft: true,
    body: [
      {
        type: "paragraph",
        text: "Supplier due diligence used to end with a signed data processing agreement. It increasingly starts there. Procurement and vendor risk teams now ask for evidence: who assessed you, against what, when, and what you did about what they found.",
      },
      { type: "heading", text: "The questions behind the questionnaire" },
      {
        type: "paragraph",
        text: "Most security questionnaires converge on the same underlying concerns, however they are worded. Read past the format and you tend to find four:",
      },
      {
        type: "list",
        items: [
          "Do you know what personal data you hold on our behalf, and where it goes?",
          "Can you evidence the controls you claim, rather than assert them?",
          "What happens in the first 72 hours of an incident?",
          "Are the people handling our data trained, recently, on the things that go wrong?",
        ],
      },
      {
        type: "paragraph",
        text: "[PLACEHOLDER: expand each question with what a strong answer contains and the common weak answer that costs deals.]",
      },
      { type: "heading", text: "Assertion versus evidence" },
      {
        type: "paragraph",
        text: "The gap that stalls deals is rarely the absence of a policy. It is the absence of a link between the policy and what happens in practice — a retention schedule nobody applies, a training module nobody completed, a processor register that predates two migrations.",
      },
      {
        type: "callout",
        title: "Where figures belong",
        text: "[SOURCE NEEDED] Any statistic on procurement cycles, questionnaire volumes or deal delays must be attributed to a named, dated source before this article is published.",
      },
      {
        type: "quote",
        text: "[PLACEHOLDER: quote from a named customer or specialist, with permission on file.]",
        attribution: "[PLACEHOLDER: name, role, organisation]",
      },
      {
        type: "paragraph",
        text: "[PLACEHOLDER: closing section — how independent assessment shortens the evidence conversation, and what to prepare before the next tender.]",
      },
    ],
  },
  {
    slug: "ten-domains-why-we-assess-in-this-order",
    title: "Ten domains, and why we assess them in this order",
    description:
      "A walk through the structure of our compliance assessment: what each domain covers, why sequence matters, and what usually surfaces first.",
    category: "Assessment",
    date: "[PLACEHOLDER: publication date]",
    readingTime: "[PLACEHOLDER] min read",
    author: { name: "[PLACEHOLDER: author name]", role: "[PLACEHOLDER: role]" },
    draft: true,
    body: [
      {
        type: "paragraph",
        text: "An assessment that jumps straight to security controls tends to produce a tidy answer to the wrong question. Controls protect processing — so the processing has to be understood first.",
      },
      { type: "heading", text: "Start with what you do, not what you have" },
      {
        type: "paragraph",
        text: "Lawful basis and records of processing come first because everything downstream depends on them. Retention cannot be assessed without knowing what is held and why. Transfers cannot be mapped without knowing which processors are involved.",
      },
      {
        type: "list",
        items: [
          "Domains 1–2 establish what you process and on what grounds.",
          "Domains 3–5 examine how that processing is governed over time.",
          "Domains 6–9 test the controls and the response when they fail.",
          "Domain 10 asks whether the people involved know any of it.",
        ],
      },
      {
        type: "paragraph",
        text: "[PLACEHOLDER: expand each grouping, with the questions that typically expose a gap and how findings are rated.]",
      },
      {
        type: "callout",
        title: "Scoring",
        text: "[PLACEHOLDER: describe the scoring model — bands, what drives a rating up or down, and how the overall score is derived from domain ratings.]",
      },
      {
        type: "paragraph",
        text: "[PLACEHOLDER: closing section — what organisations most often discover in their first assessment.]",
      },
    ],
  },
  {
    slug: "awareness-training-that-changes-behaviour",
    title: "Awareness training that changes behaviour, not just completion rates",
    description:
      "A completed module is not a trained employee. What role-based, adaptive training changes — and how to tell whether yours is working.",
    category: "Training",
    date: "[PLACEHOLDER: publication date]",
    readingTime: "[PLACEHOLDER] min read",
    author: { name: "[PLACEHOLDER: author name]", role: "[PLACEHOLDER: role]" },
    draft: true,
    body: [
      {
        type: "paragraph",
        text: "Annual training exists in many organisations as an administrative event: a course is assigned, a deadline passes, a completion figure is reported. The figure satisfies an auditor. It rarely changes what somebody does at 4:50pm on a Friday when an invoice arrives with changed bank details.",
      },
      { type: "heading", text: "Relevance before repetition" },
      {
        type: "paragraph",
        text: "A finance approver, a clinician and a software engineer face genuinely different risks. Training that treats them identically spends most of its time on scenarios two of the three will never meet — and loses their attention before it reaches the one that matters.",
      },
      {
        type: "list",
        items: [
          "Match scenarios to the systems and decisions a role actually involves.",
          "Reinforce where someone struggles; move on where they demonstrate competence.",
          "Measure risk concentration by team and topic, not just completion.",
          "Make reporting an incident easy to do and safe to get wrong.",
        ],
      },
      {
        type: "callout",
        title: "Measuring it honestly",
        text: "[PLACEHOLDER: describe which measures are meaningful — reporting rates, time to report, repeat susceptibility — and which are vanity metrics.]",
      },
      {
        type: "quote",
        text: "[PLACEHOLDER: quote from a named L&D or security lead, with permission on file.]",
        attribution: "[PLACEHOLDER: name, role, organisation]",
      },
      {
        type: "paragraph",
        text: "[PLACEHOLDER: closing section — how training evidence feeds the staff awareness domain of the assessment.]",
      },
    ],
  },
];

export function getArticle(slug: string) {
  return articles.find((article) => article.slug === slug);
}
