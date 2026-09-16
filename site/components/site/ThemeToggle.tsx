"use client";

import { useEffect, useState } from "react";
import { IconMoon, IconSun } from "@/components/icons";

/**
 * Light/dark toggle. The stored value is a functional preference held in
 * localStorage (not a cookie) and is never used for tracking.
 */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
    try {
      window.localStorage.setItem("theme", next);
    } catch {
      /* ignore */
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border border-control text-muted transition-colors hover:border-accent hover:text-accent ${className}`}
      aria-label={mounted ? `Switch to ${theme === "dark" ? "light" : "dark"} mode` : "Switch colour theme"}
    >
      {mounted && theme === "dark" ? <IconSun className="h-4.5 w-4.5" width={18} height={18} /> : <IconMoon width={18} height={18} />}
    </button>
  );
}
