"use client";

/**
 * GDPR/ePrivacy cookie consent.
 *
 * Rules this implementation follows:
 *  - No non-essential cookies, storage or third-party scripts are set before
 *    the visitor has actively consented. The site ships with no analytics and
 *    no third-party trackers at all.
 *  - "Accept all" and "Reject all" are presented with identical visual weight.
 *  - Consent is granular (per category), recorded with a timestamp and a
 *    version, and can be withdrawn at any time from the footer.
 *  - Closing the banner without choosing is not treated as consent.
 *
 * TO ADD ANALYTICS LATER: gate the loader on hasConsent("analytics") and
 * listen for the "consentchange" event — see loadGatedScripts() below.
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { siteConfig } from "@/site.config";

const CONSENT_KEY = "cookie-consent-v1";
const CONSENT_VERSION = 1;

export type ConsentCategories = {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
};

type ConsentRecord = {
  version: number;
  timestamp: string;
  categories: ConsentCategories;
};

export function readConsent(): ConsentRecord | null {
  try {
    const raw = window.localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ConsentRecord;
    return parsed.version === CONSENT_VERSION ? parsed : null;
  } catch {
    return null;
  }
}

export function hasConsent(category: keyof ConsentCategories): boolean {
  if (category === "necessary") return true;
  return Boolean(readConsent()?.categories[category]);
}

export const OPEN_PREFERENCES_EVENT = "open-cookie-preferences";

export function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    const record = readConsent();
    if (!record) {
      setVisible(true);
      return;
    }
    setAnalytics(record.categories.analytics);
    setMarketing(record.categories.marketing);
  }, []);

  useEffect(() => {
    function reopen() {
      setVisible(true);
      setShowDetail(true);
    }
    window.addEventListener(OPEN_PREFERENCES_EVENT, reopen);
    return () => window.removeEventListener(OPEN_PREFERENCES_EVENT, reopen);
  }, []);

  const save = useCallback((categories: ConsentCategories) => {
    const record: ConsentRecord = {
      version: CONSENT_VERSION,
      timestamp: new Date().toISOString(),
      categories,
    };
    try {
      window.localStorage.setItem(CONSENT_KEY, JSON.stringify(record));
    } catch {
      /* ignore */
    }
    window.dispatchEvent(new CustomEvent("consentchange", { detail: record }));
    setVisible(false);
    setShowDetail(false);
  }, []);

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="cookie-title"
      aria-describedby="cookie-description"
      className="fixed inset-x-0 bottom-0 z-[60] border-t border-line bg-surface p-4 shadow-[0_-8px_40px_-24px_rgba(10,17,36,0.6)] md:inset-x-4 md:bottom-4 md:rounded-card md:border"
    >
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="max-w-2xl">
            <h2 id="cookie-title" className="font-display text-lg">
              Cookies on this site
            </h2>
            <p id="cookie-description" className="mt-1.5 text-sm leading-relaxed text-muted">
              We use strictly necessary storage to make the site work. Nothing optional is set unless you choose it,
              and we load no third-party trackers by default. You can change your choice at any time from the footer.{" "}
              <Link href="/legal/cookies" className="link-underline text-body">
                Cookie policy
              </Link>
              .
            </p>
          </div>

          {/* Accept and Reject carry identical weight, size and prominence. */}
          <div className="flex shrink-0 flex-col gap-2 sm:flex-row md:flex-col lg:flex-row">
            <Button
              variant="primary"
              onClick={() => save({ necessary: true, analytics: true, marketing: true })}
              className="sm:min-w-[9.5rem]"
            >
              Accept all
            </Button>
            <Button
              variant="primary"
              onClick={() => save({ necessary: true, analytics: false, marketing: false })}
              className="sm:min-w-[9.5rem]"
            >
              Reject all
            </Button>
            <Button variant="secondary" onClick={() => setShowDetail(!showDetail)} aria-expanded={showDetail}>
              {showDetail ? "Hide options" : "Manage options"}
            </Button>
          </div>
        </div>

        {showDetail ? (
          <div className="mt-5 border-t border-line pt-5">
            <ul className="grid gap-3 md:grid-cols-3">
              <li className="rounded-lg border border-control p-3">
                <div className="flex items-start justify-between gap-3">
                  <span className="text-sm font-medium">Strictly necessary</span>
                  <input type="checkbox" checked disabled aria-label="Strictly necessary storage (always on)" className="mt-1 h-4 w-4 accent-[var(--accent)]" />
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-muted">
                  Keeps your cookie choice and colour theme. Cannot be switched off.
                </p>
              </li>
              <li className="rounded-lg border border-control p-3">
                <div className="flex items-start justify-between gap-3">
                  <label htmlFor="consent-analytics" className="text-sm font-medium">
                    Analytics
                  </label>
                  <input
                    id="consent-analytics"
                    type="checkbox"
                    checked={analytics}
                    onChange={(event) => setAnalytics(event.target.checked)}
                    className="mt-1 h-4 w-4 accent-[var(--accent)]"
                  />
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-muted">
                  Aggregate page statistics. <span className="font-mono">[PLACEHOLDER: none configured]</span>
                </p>
              </li>
              <li className="rounded-lg border border-control p-3">
                <div className="flex items-start justify-between gap-3">
                  <label htmlFor="consent-marketing" className="text-sm font-medium">
                    Marketing
                  </label>
                  <input
                    id="consent-marketing"
                    type="checkbox"
                    checked={marketing}
                    onChange={(event) => setMarketing(event.target.checked)}
                    className="mt-1 h-4 w-4 accent-[var(--accent)]"
                  />
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-muted">
                  Campaign measurement. <span className="font-mono">[PLACEHOLDER: none configured]</span>
                </p>
              </li>
            </ul>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Button variant="primary" onClick={() => save({ necessary: true, analytics, marketing })}>
                Save my choices
              </Button>
              <p className="text-xs text-muted">
                Questions about your data? Contact <span className="font-mono">{siteConfig.contact.dpoEmail}</span>.
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** Footer control for withdrawing or changing consent. */
export function CookiePreferencesButton({ className = "" }: { className?: string }) {
  return (
    <button
      type="button"
      className={`link-underline text-left transition-colors hover:text-accent ${className}`}
      onClick={() => window.dispatchEvent(new Event(OPEN_PREFERENCES_EVENT))}
    >
      Cookie preferences
    </button>
  );
}

/**
 * ---------------------------------------------------------------------------
 * INTEGRATION HOOK — gated third-party scripts
 * ---------------------------------------------------------------------------
 * Nothing here runs today because the site ships without trackers. When you
 * add one, call this from a client component mounted in app/layout.tsx:
 *
 *   useEffect(() => {
 *     const load = () => { if (hasConsent("analytics")) { ...inject script... } };
 *     load();
 *     window.addEventListener("consentchange", load);
 *     return () => window.removeEventListener("consentchange", load);
 *   }, []);
 *
 * Never inject before the consent check, and remove the script plus any
 * cookies it set when consent is withdrawn.
 */
