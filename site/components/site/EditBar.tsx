"use client";

import { useState } from "react";
import { IconClose } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { useContentStore } from "@/lib/content";
import { siteConfig } from "@/site.config";

/**
 * Control bar for inline editing. Only rendered once edit mode is switched on
 * (?edit=1 or Ctrl/Cmd + Shift + E), so ordinary visitors never see it.
 */
export function EditBar() {
  const { editing, setEditing, draftCount, exportOverrides, clear, company, set } = useContentStore();
  const [collapsed, setCollapsed] = useState(false);

  if (!editing) return null;

  return (
    <div className="fixed bottom-4 left-4 z-[70] w-[min(22rem,calc(100vw-2rem))] rounded-card border border-accent bg-surface p-4 shadow-[0_18px_50px_-20px_rgba(10,17,36,0.55)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-display text-base">Edit mode</p>
          <p className="mt-0.5 text-xs text-muted">
            {draftCount === 0 ? "Click any text to change it." : `${draftCount} unsaved change${draftCount === 1 ? "" : "s"} in this browser.`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="rounded text-xs text-muted underline underline-offset-2 hover:text-accent"
          aria-expanded={!collapsed}
        >
          {collapsed ? "Show" : "Hide"}
        </button>
      </div>

      {!collapsed ? (
        <>
          <div className="mt-4">
            <label htmlFor="edit-company" className="block text-xs font-medium">
              Company name
            </label>
            <input
              id="edit-company"
              type="text"
              value={company}
              onChange={(event) => set("brand.companyName", event.target.value)}
              className="mt-1.5 w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm"
              placeholder={siteConfig.company.name}
            />
            <p className="mt-1.5 text-[0.7rem] leading-relaxed text-muted">
              Updates every page that uses the brand token. Permanent changes also belong in site.config.ts.
            </p>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={exportOverrides} className="text-xs">
              Export JSON
            </Button>
            <Button variant="secondary" onClick={() => clear()} className="text-xs">
              Reset edits
            </Button>
            <Button variant="ghost" onClick={() => setEditing(false)} className="text-xs">
              <IconClose width={14} height={14} />
              Exit
            </Button>
          </div>

          <p className="mt-3 border-t border-line pt-3 text-[0.7rem] leading-relaxed text-muted">
            Edits are held in this browser only. Export the JSON and save it as{" "}
            <code className="font-mono">content/overrides.json</code> to publish them for everyone.
          </p>
        </>
      ) : null}
    </div>
  );
}
