import { siteConfig } from "@/site.config";

/**
 * The Verified attestation mark. Drawn in brass — a colour reserved on this
 * site exclusively for attestation, so verification never reads as ordinary
 * brand decoration.
 *
 * WORDING: this mark attests to independent assessment against our published
 * criteria. It is never described as GDPR certification, and never presented
 * as issued or endorsed by a supervisory authority.
 */
export function AttestationSeal({ size = 160, date = "[DATE]" }: { size?: number; date?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      role="img"
      aria-label={`${siteConfig.company.name} Verified attestation mark, valid from ${date}`}
      className="shrink-0"
    >
      <circle cx="100" cy="100" r="94" fill="none" stroke="var(--brass)" strokeWidth="1.5" />
      <circle cx="100" cy="100" r="86" fill="none" stroke="var(--brass)" strokeWidth="3" />
      <circle cx="100" cy="100" r="66" fill="var(--brass-soft)" />

      {/* Twelve ticks: one per month of validity. */}
      {Array.from({ length: 12 }, (_, index) => {
        const angle = (index / 12) * Math.PI * 2 - Math.PI / 2;
        const inner = 72;
        const outer = 80;
        return (
          <line
            key={index}
            x1={100 + Math.cos(angle) * inner}
            y1={100 + Math.sin(angle) * inner}
            x2={100 + Math.cos(angle) * outer}
            y2={100 + Math.sin(angle) * outer}
            stroke="var(--brass)"
            strokeWidth="2"
            strokeLinecap="round"
          />
        );
      })}

      <path
        d="M78 100.5l14 14 30-31"
        fill="none"
        stroke="var(--brass)"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <text
        x="100"
        y="132"
        textAnchor="middle"
        fill="var(--brass)"
        fontSize="13"
        letterSpacing="3"
        fontFamily="var(--font-mono), monospace"
      >
        VERIFIED
      </text>
      <text
        x="100"
        y="150"
        textAnchor="middle"
        fill="var(--brass)"
        fontSize="10"
        letterSpacing="1.5"
        fontFamily="var(--font-mono), monospace"
      >
        {date}
      </text>
    </svg>
  );
}

/** Preview of the issued certificate. Content is illustrative placeholder. */
export function CertificatePreview() {
  return (
    <figure className="card overflow-hidden">
      <div className="border-b border-line bg-surface-2 px-5 py-2.5">
        <p className="font-mono text-[0.7rem] uppercase tracking-wider text-muted">Certificate preview</p>
      </div>
      <div className="p-8">
        <div className="rounded-lg border-2 border-seal p-6 text-center">
          <p className="font-mono text-[0.7rem] uppercase tracking-[0.2em] text-seal">Certificate of independent assessment</p>
          <p className="mt-6 text-sm text-muted">This confirms that</p>
          <p className="mt-2 font-display text-2xl">[CLIENT ORGANISATION NAME]</p>
          <p className="mt-4 mx-auto max-w-sm text-sm leading-relaxed text-muted">
            has been independently assessed by {siteConfig.company.name} against the {siteConfig.company.shortName}{" "}
            Assessment Criteria <span className="font-mono">[VERSION]</span> and met the required standard.
          </p>
          <dl className="mt-6 grid grid-cols-2 gap-4 text-left text-xs">
            <div>
              <dt className="text-muted">Date of assessment</dt>
              <dd className="mt-0.5 font-mono">[DATE]</dd>
            </div>
            <div>
              <dt className="text-muted">Valid until</dt>
              <dd className="mt-0.5 font-mono">[DATE]</dd>
            </div>
            <div>
              <dt className="text-muted">Reference</dt>
              <dd className="mt-0.5 font-mono">[REFERENCE]</dd>
            </div>
            <div>
              <dt className="text-muted">Scope</dt>
              <dd className="mt-0.5 font-mono">[ENTITIES / SITES IN SCOPE]</dd>
            </div>
          </dl>
          <p className="mt-6 border-t border-line pt-4 text-[0.7rem] leading-relaxed text-muted">
            This is not a GDPR certification under Article 42 and is not issued, approved or endorsed by the Data
            Protection Commission or any other supervisory authority.
          </p>
        </div>
      </div>
    </figure>
  );
}
