# [COMPANY NAME] — marketing website

Enterprise marketing site for an Irish/EU data protection and cyber risk
company, covering awareness training, GDPR compliance assessment, remediation
and the **Verified** attestation.

Built with **Next.js (App Router) + TypeScript + Tailwind CSS**. Every route is
statically prerendered, so it deploys to Vercel (or any static-friendly host)
without a server runtime.

---

## Running it

```bash
cd site
npm install
npm run dev        # http://localhost:3000
npm run build      # production build
npm start          # serve the production build
```

Node 18.17+ is required (Node 22 recommended).

---

## Project layout

```
site/
├── app/                    Routes (App Router). Each folder is a page.
│   ├── layout.tsx          Fonts, metadata, header/footer, consent, edit bar
│   ├── page.tsx            Homepage
│   ├── how-it-works/       The six-stage journey in detail
│   ├── services/           Overview + [slug] sub-pages
│   ├── verified/           Attestation, incl. the "what it is and isn't" note
│   ├── industries/  pricing/  about/  trust/  insights/  contact/  start/
│   ├── legal/[slug]/       Privacy, cookies, terms, accessibility templates
│   ├── not-found.tsx       Custom 404
│   ├── sitemap.ts  robots.ts  opengraph-image.tsx  icon.svg
│   └── globals.css         Design tokens (light + dark) and base styles
├── components/
│   ├── site/               Header, Footer, ThemeToggle, CookieConsent, EditBar
│   ├── ui/                 Button, Section, Placeholder, Reveal
│   ├── marketing/          Journey diagram, cards, attestation seal, blocks
│   ├── forms/              Consultation form, multi-step assessment flow
│   └── icons/              Custom SVG icon set (no icon library)
├── content/                All editable content lives here
├── lib/                    Inline editing engine, SEO helpers, form hook
├── site.config.ts          Company name, contact details, navigation, CTAs
└── tailwind.config.ts      Colour palette, type scale, spacing
```

---

## Rebranding

Almost everything flows from two files.

1. **`site.config.ts`** — company name, legal entity, CRO/VAT numbers, address,
   email addresses, phone, social links, navigation, footer columns, CTA
   labels, company-size and role options for the forms.
2. **`app/globals.css`** — the semantic colour tokens (`--bg`, `--surface`,
   `--text`, `--accent`, `--brass`, …) for light and dark mode. Raw palette
   scales live in `tailwind.config.ts`.

The current palette is **Ink & Signal**: deep ink navy, a signal teal accent
for interaction, and brass reserved *exclusively* for attestation elements so
the Verified mark never reads as ordinary brand decoration. Typefaces are
Instrument Serif (display), Inter (UI and body) and JetBrains Mono (labels and
data), self-hosted at build time via `next/font` — no request is made to a
third-party font service when someone browses the site.

If you change the company name, also update the `brand.companyName` entry in
`content/overrides.json` (or clear it), since inline edits take precedence.

---

## Editing content

### 1. Inline editing in the browser (no code)

Every visible string on the site is editable.

1. Open any page with `?edit=1`, or press <kbd>Ctrl</kbd>/<kbd>Cmd</kbd> +
   <kbd>Shift</kbd> + <kbd>E</kbd>.
2. Click any text and type. <kbd>Enter</kbd> commits, <kbd>Esc</kbd> cancels.
3. Use the **Company name** field in the edit bar to rename the business
   everywhere at once (copy containing `{company}` updates automatically).
4. Click **Export JSON**. Save the downloaded file over
   `content/overrides.json` and commit it — those values are then baked in at
   build time for every visitor.

Edits before export live only in that browser's local storage, so nothing
published depends on a visitor's device.

### 2. Structured content files

| What | File |
|---|---|
| The six journey stages | `content/journey.ts` |
| The ten assessment domains | `content/assessment-domains.ts` |
| Services, training topics, Guided vs Managed comparison | `content/services.ts` |
| Industries | `content/industries.ts` |
| Packages and pricing FAQs | `content/pricing.ts` |
| Insight articles (block-structured) | `content/insights.ts` |
| Trust & security facts and practices | `content/trust.ts` |
| Legal document templates | `content/legal.ts` |

Adding a service, industry or article means adding an object to the relevant
array — routes, sitemap entries and navigation follow automatically.

---

## Placeholders

Nothing on this site invents a client, a quote, a case study, a statistic, a
certification, a team member or an award. The components exist and are filled
with obviously marked placeholder content.

- `[PLACEHOLDER: …]` — replace with real content.
- `[SOURCE NEEDED: …]` — a figure may only be published with a named, dated
  source attached.
- Blocks marked **legal review required** must be approved by a qualified
  Irish/EU adviser before launch.

`PLACEHOLDERS.md` in the repository root of this folder is the full checklist.

To find them all at any time:

```bash
grep -rn "\[PLACEHOLDER" app components content site.config.ts
grep -rn "\[SOURCE NEEDED" app components content
```

---

## Wording rule for the attestation

The attestation must always be described as **independent assessment** —
"independently assessed", "Verified by [COMPANY NAME]", "compliance assessment
and attestation".

It must **never** be described as GDPR certification, "certified GDPR
compliant", or as issued, approved, accredited or endorsed by the Data
Protection Commission or any other supervisory authority. The plain-English
explanation on `/verified` and in the footer states this explicitly; keep both
in step with any change to the criteria.

---

## Forms

Both forms validate on the client only and submit through a single hook.

- `lib/forms.ts` → `submitLead()` is the **backend hook**. It currently
  resolves locally and transmits nothing. The file documents how to point it at
  a route handler or a hosted form service.
- Before going live: add server-side validation, add privacy-respecting spam
  protection, confirm the lawful basis and retention period for submissions,
  and record the consent text shown at the point of submission.

---

## Cookies and consent

The site ships with **no analytics and no third-party trackers**. The consent
banner (`components/site/CookieConsent.tsx`):

- sets nothing optional before an active choice is made;
- presents **Accept all** and **Reject all** with identical visual weight;
- offers granular categories, all off by default;
- records the choice with a timestamp and version;
- can be reopened and withdrawn from any page footer.

To add a gated script later, follow the `hasConsent()` / `consentchange`
pattern documented at the bottom of that file. Never inject before the check.

---

## Accessibility

Built to target **WCAG 2.2 AA**: semantic landmarks, a skip link as the first
tab stop, visible focus indicators, keyboard-operable navigation and forms,
labelled inputs with `aria-invalid` and `role="alert"` error messages, no
heading-level skips, `prefers-reduced-motion` respected, and contrast checked
for text (≥4.5:1) and interactive borders (≥3:1) in both themes.

Complete the accessibility statement at `/legal/accessibility` with a real
conformance claim only after testing with assistive technology.

---

## SEO

- Per-page `title`, description, canonical URL and Open Graph tags via
  `pageMetadata()` in `lib/seo.ts`.
- Organization JSON-LD in the root layout; Service JSON-LD on each service
  page; Article JSON-LD on insight articles.
- `app/sitemap.ts` and `app/robots.ts` generate `/sitemap.xml` and
  `/robots.txt`. Draft articles are excluded from the sitemap and marked
  `noindex` until they carry real content.
- A social sharing image is generated at build time from
  `app/opengraph-image.tsx`.

**Before launch:** set the real domain in `site.config.ts` (`url`). Canonical
links, Open Graph URLs and the sitemap all derive from it.

---

## Measured quality

Lighthouse (production build, desktop, local run):

| Page | Performance | Accessibility | Best practices | SEO |
|---|---|---|---|---|
| `/` | 94 | 100 | 100 | 100 |
| `/contact` | 97 | 100 | 100 | 100 |
| `/verified` | 96 | 100 | 100 | 100 |
| `/start` | 99 | 100 | 100 | 100 |
| `/services/remediation` | 96 | 100 | 100 | 100 |
| `/legal/privacy` | 97 | 100 | 100 | 100 |

Re-run these after adding real images or any third-party script.

---

## Deploying to Vercel

1. Import the repository.
2. Set **Root Directory** to `site` (this project lives alongside an unrelated
   Express service at the repository root).
3. Framework preset: Next.js. Build `npm run build`, output handled
   automatically. No environment variables are required until a form backend is
   connected.

For a fully static export instead, add `output: 'export'` to
`next.config.mjs`; every route is already static and `images.unoptimized` is
set.
