import { IconCheck, IconGlobe, IconShieldData, IconTeam } from "@/components/icons";
import { LogoPlaceholder, Placeholder, PlaceholderNote } from "@/components/ui/Placeholder";
import { E } from "@/lib/content";

/**
 * Credibility components. Every one of these ships with placeholder content.
 * Nothing here asserts a client, a number or a certification we hold.
 */

export function LogoBar({ count = 6 }: { count?: number }) {
  return (
    <div>
      <E id="proof.logobar.label" as="p" className="text-center text-xs uppercase tracking-wider text-muted">
        Trusted by teams at
      </E>
      <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: count }, (_, index) => (
          <li key={index}>
            <LogoPlaceholder index={index + 1} />
          </li>
        ))}
      </ul>
      <p className="mt-4 text-center text-xs text-muted">
        <Placeholder>Replace with client logos you have written permission to display</Placeholder>
      </p>
    </div>
  );
}

/** Stats band — deliberately unpopulated. Every figure needs a source. */
export function StatsBand() {
  const stats = [
    { label: "Organisations assessed", value: "[PLACEHOLDER]" },
    { label: "Domains per assessment", value: "10" },
    { label: "Employees trained", value: "[PLACEHOLDER]" },
    { label: "Attestations issued", value: "[PLACEHOLDER]" },
  ];

  return (
    <div>
      <dl className="grid gap-px overflow-hidden rounded-card border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-surface p-6">
            <dt className="text-sm text-muted">{stat.label}</dt>
            <dd className="mt-2 font-display text-display-sm tabular">{stat.value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-xs text-muted">
        Figures are placeholders. Only publish numbers you can evidence, and date them.
      </p>
    </div>
  );
}

/** Security / trust badges — status is stated plainly, never implied. */
export function TrustBadges() {
  const badges = [
    { icon: IconShieldData, title: "ISO 27001", status: "[PLACEHOLDER: status]" },
    { icon: IconGlobe, title: "EU data residency", status: "[PLACEHOLDER: region]" },
    { icon: IconCheck, title: "Encryption", status: "[PLACEHOLDER: in transit and at rest]" },
    { icon: IconTeam, title: "Vetted specialists", status: "[PLACEHOLDER: vetting standard]" },
  ];

  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {badges.map((badge) => (
        <li key={badge.title} className="card flex items-start gap-3 p-4">
          <badge.icon width={22} height={22} className="mt-0.5 shrink-0 text-accent" />
          <div>
            <p className="text-sm font-medium">{badge.title}</p>
            <p className="mt-0.5 font-mono text-[0.7rem] leading-relaxed text-muted">{badge.status}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function CredibilityNote() {
  return (
    <PlaceholderNote label="Before launch">
      Logos, quotes, case studies, statistics and certification statuses on this site are placeholders. Replace each one
      with material you can evidence and are permitted to publish, and remove any component you cannot fill.
    </PlaceholderNote>
  );
}
