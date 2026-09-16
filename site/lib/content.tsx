"use client";

/**
 * SITE-WIDE INLINE EDITING
 * ------------------------
 * Every piece of visible copy on this site is wrapped in <E id="…">. In edit
 * mode each one becomes directly editable in the browser; edits are held in
 * localStorage so nothing is lost on navigation or refresh, and can be
 * exported as JSON.
 *
 * To make an edit permanent:
 *   1. Open any page with ?edit=1 (or press Ctrl/Cmd + Shift + E).
 *   2. Click text and type.
 *   3. "Export" in the edit bar downloads content-overrides.json.
 *   4. Replace content/overrides.json with that file and commit.
 *
 * Values in content/overrides.json are baked in at build time, so published
 * copy never depends on a visitor's browser storage.
 */

import buildOverrides from "@/content/overrides.json";
import { siteConfig } from "@/site.config";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ElementType,
  type ReactNode,
} from "react";

const STORAGE_KEY = "site-content-overrides-v1";
const MODE_KEY = "site-content-edit-mode";

type Overrides = Record<string, string>;

type ContentValue = {
  editing: boolean;
  setEditing: (on: boolean) => void;
  overrides: Overrides;
  draftCount: number;
  company: string;
  get: (id: string, fallback: string) => string;
  set: (id: string, value: string) => void;
  clear: (id?: string) => void;
  exportOverrides: () => void;
};

const ContentContext = createContext<ContentValue | null>(null);

/** Replaces brand tokens so renaming the company updates every sentence. */
export function fillTokens(text: string, company: string): string {
  return text.replace(/\{company\}/g, company).replace(/\{year\}/g, String(new Date().getFullYear()));
}

export function ContentProvider({ children }: { children: ReactNode }) {
  const committed = buildOverrides as Overrides;
  const [drafts, setDrafts] = useState<Overrides>({});
  const [editing, setEditingState] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) setDrafts(JSON.parse(stored) as Overrides);
      const params = new URLSearchParams(window.location.search);
      const wantsEdit = params.get("edit") === "1" || window.sessionStorage.getItem(MODE_KEY) === "1";
      if (wantsEdit) setEditingState(true);
    } catch {
      /* Storage can be unavailable (private mode, blocked cookies) — ignore. */
    }
  }, []);

  const persist = useCallback((next: Overrides) => {
    setDrafts(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* Non-fatal: edits simply will not survive a refresh. */
    }
  }, []);

  const setEditing = useCallback((on: boolean) => {
    setEditingState(on);
    try {
      if (on) window.sessionStorage.setItem(MODE_KEY, "1");
      else window.sessionStorage.removeItem(MODE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.shiftKey && (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "e") {
        event.preventDefault();
        setEditing(!editing);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editing, setEditing]);

  const overrides = useMemo(() => ({ ...committed, ...drafts }), [committed, drafts]);
  const company = overrides["brand.companyName"] ?? siteConfig.company.name;

  const value = useMemo<ContentValue>(
    () => ({
      editing,
      setEditing,
      overrides,
      draftCount: Object.keys(drafts).length,
      company,
      get: (id, fallback) => fillTokens(overrides[id] ?? fallback, company),
      set: (id, next) => {
        const original = committed[id];
        const trimmed = next.trim();
        if (trimmed === (original ?? "")) {
          const { [id]: _removed, ...rest } = drafts;
          persist(rest);
          return;
        }
        persist({ ...drafts, [id]: trimmed });
      },
      clear: (id) => {
        if (!id) {
          persist({});
          return;
        }
        const { [id]: _removed, ...rest } = drafts;
        persist(rest);
      },
      exportOverrides: () => {
        const blob = new Blob([JSON.stringify({ ...committed, ...drafts }, null, 2)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "content-overrides.json";
        link.click();
        URL.revokeObjectURL(url);
      },
    }),
    [committed, company, drafts, editing, overrides, persist, setEditing],
  );

  return <ContentContext.Provider value={value}>{children}</ContentContext.Provider>;
}

export function useContentStore(): ContentValue {
  const ctx = useContext(ContentContext);
  if (!ctx) throw new Error("useContentStore must be used inside <ContentProvider>");
  return ctx;
}

/** Resolve a single string outside of JSX (alt text, aria-labels, titles). */
export function useText(id: string, fallback: string): string {
  return useContentStore().get(id, fallback);
}

type EProps = {
  id: string;
  children: string;
  as?: ElementType;
  className?: string;
  /** Allows the same copy to be rendered inline without an extra wrapper. */
  title?: string;
};

/**
 * Editable text node. Renders plain text for visitors; in edit mode it becomes
 * a contenteditable region with a dashed outline.
 */
export function E({ id, children, as, className, title }: EProps) {
  const { editing, get, set, overrides } = useContentStore();
  const Tag = (as ?? "span") as ElementType;
  const ref = useRef<HTMLElement>(null);
  const text = get(id, children);
  const isEdited = Boolean(overrides[id]);

  if (!editing) {
    return (
      <Tag className={className} title={title}>
        {text}
      </Tag>
    );
  }

  return (
    <Tag
      ref={ref}
      className={className}
      data-editable="on"
      data-edited={isEdited}
      data-content-id={id}
      contentEditable
      suppressContentEditableWarning
      spellCheck
      role="textbox"
      tabIndex={0}
      aria-label={`Edit content: ${id}`}
      onKeyDown={(event: React.KeyboardEvent) => {
        if (event.key === "Enter") {
          event.preventDefault();
          (event.currentTarget as HTMLElement).blur();
        }
        if (event.key === "Escape") {
          (event.currentTarget as HTMLElement).textContent = text;
          (event.currentTarget as HTMLElement).blur();
        }
      }}
      onBlur={(event: React.FocusEvent<HTMLElement>) => {
        set(id, event.currentTarget.textContent ?? "");
      }}
    >
      {text}
    </Tag>
  );
}
