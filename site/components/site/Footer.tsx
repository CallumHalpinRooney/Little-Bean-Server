"use client";

import Link from "next/link";
import { IconLinkedIn, IconMail, IconPhone, IconPin } from "@/components/icons";
import { CookiePreferencesButton } from "@/components/site/CookieConsent";
import { Logo } from "@/components/site/Logo";
import { E } from "@/lib/content";
import { siteConfig } from "@/site.config";

export function Footer() {
  const { contact, company } = siteConfig;

  return (
    <footer className="border-t border-line bg-surface-2" aria-labelledby="footer-heading">
      <h2 id="footer-heading" className="sr-only">
        Site footer
      </h2>
      <div className="shell py-14 md:py-20">
        <div className="grid gap-12 lg:grid-cols-[1.3fr_2.4fr]">
          <div className="max-w-sm">
            <Logo />
            <E id="footer.blurb" as="p" className="mt-4 text-sm leading-relaxed text-muted">
              {`{company} helps organisations across Ireland and the EU assess, reduce and evidence their data protection and cyber risk.`}
            </E>

            <ul className="mt-6 space-y-2.5 text-sm text-muted">
              <li className="flex items-start gap-2.5">
                <IconMail width={16} height={16} className="mt-0.5 shrink-0 text-accent" />
                <a href={`mailto:${contact.email}`} className="link-underline hover:text-accent">
                  {contact.email}
                </a>
              </li>
              <li className="flex items-start gap-2.5">
                <IconPhone width={16} height={16} className="mt-0.5 shrink-0 text-accent" />
                <a href={`tel:${contact.phone.replace(/[^\d+]/g, "")}`} className="link-underline hover:text-accent">
                  {contact.phone}
                </a>
              </li>
              <li className="flex items-start gap-2.5">
                <IconPin width={16} height={16} className="mt-0.5 shrink-0 text-accent" />
                <address className="not-italic">
                  {contact.address.line1}, {contact.address.line2}
                  <br />
                  {contact.address.city}, {contact.address.postcode}, {contact.address.country}
                </address>
              </li>
            </ul>

            <a
              href={siteConfig.social.linkedin}
              className="mt-5 inline-flex items-center gap-2 text-sm text-muted transition-colors hover:text-accent"
              rel="noopener noreferrer me"
            >
              <IconLinkedIn width={18} height={18} />
              LinkedIn
            </a>
          </div>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {siteConfig.footerNav.map((column) => (
              <nav key={column.title} aria-label={column.title}>
                <h3 className="font-mono text-[0.7rem] uppercase tracking-wider text-muted">{column.title}</h3>
                <ul className="mt-4 space-y-2.5">
                  {column.links.map((link) => (
                    <li key={link.href}>
                      <Link href={link.href} className="text-sm text-body transition-colors hover:text-accent">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        <div className="mt-12 rounded-card border border-dashed border-line-strong bg-surface p-4">
          <p className="text-xs leading-relaxed text-muted">
            <strong className="font-medium text-body">About the {company.shortName} Verified attestation:</strong> it
            confirms an organisation has been independently assessed against our published assessment criteria and met
            the required standard on the date shown. It is not a GDPR certification, and it is not issued, approved or
            endorsed by the Data Protection Commission or any other supervisory authority.{" "}
            <Link href="/verified#what-it-is-and-isnt" className="link-underline text-body">
              Read the full explanation
            </Link>
            .
          </p>
        </div>

        <div className="mt-8 flex flex-col gap-4 border-t border-line pt-8 text-xs text-muted md:flex-row md:items-center md:justify-between">
          <p>
            © {new Date().getFullYear()} {company.legalEntity}. Registered in Ireland, company number{" "}
            {company.companyNumber}. VAT {company.vatNumber}.
          </p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <Link href="/legal/privacy" className="transition-colors hover:text-accent">
              Privacy
            </Link>
            <Link href="/legal/cookies" className="transition-colors hover:text-accent">
              Cookies
            </Link>
            <Link href="/legal/terms" className="transition-colors hover:text-accent">
              Terms
            </Link>
            <Link href="/legal/accessibility" className="transition-colors hover:text-accent">
              Accessibility
            </Link>
            <CookiePreferencesButton />
          </div>
        </div>
      </div>
    </footer>
  );
}
