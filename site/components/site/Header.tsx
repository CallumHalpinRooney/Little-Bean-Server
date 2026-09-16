"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { IconArrowRight, IconChevronDown, IconClose, IconMenu } from "@/components/icons";
import { Logo } from "@/components/site/Logo";
import { ThemeToggle } from "@/components/site/ThemeToggle";
import { ButtonLink } from "@/components/ui/Button";
import { siteConfig } from "@/site.config";

export function Header() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setMobileOpen(false);
    setOpenMenu(null);
  }, [pathname]);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 8);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpenMenu(null);
        setMobileOpen(false);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  function isActive(href: string) {
    return pathname === href || (href !== "/" && pathname.startsWith(href));
  }

  return (
    <header
      className={`sticky top-0 z-50 border-b transition-colors ${
        scrolled ? "border-line bg-bg/90 backdrop-blur-md" : "border-transparent bg-bg"
      }`}
    >
      <div className="shell flex h-16 items-center justify-between gap-4 md:h-[72px]">
        <Logo />

        <nav ref={navRef} aria-label="Primary" className="hidden items-center gap-1 lg:flex">
          {siteConfig.nav.map((item) =>
            "children" in item && item.children ? (
              <div
                key={item.href}
                className="relative"
                onMouseEnter={() => setOpenMenu(item.href)}
                onMouseLeave={() => setOpenMenu(null)}
              >
                <button
                  type="button"
                  aria-expanded={openMenu === item.href}
                  aria-haspopup="true"
                  onClick={() => setOpenMenu(openMenu === item.href ? null : item.href)}
                  className={`inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm transition-colors hover:text-accent ${
                    isActive(item.href) ? "text-accent" : "text-body"
                  }`}
                >
                  {item.label}
                  <IconChevronDown width={14} height={14} className={openMenu === item.href ? "rotate-180 transition-transform" : "transition-transform"} />
                </button>
                {openMenu === item.href ? (
                  <div className="absolute left-0 top-full w-[22rem] pt-2">
                    <ul className="card overflow-hidden p-1.5">
                      {item.children.map((child) => (
                        <li key={child.href}>
                          <Link
                            href={child.href}
                            className="block rounded-lg px-3 py-2.5 transition-colors hover:bg-surface-2"
                          >
                            <span className="block text-sm font-medium">{child.label}</span>
                            <span className="mt-0.5 block text-xs leading-relaxed text-muted">{child.description}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ) : (
              <Link
                key={item.href}
                href={item.href}
                aria-current={pathname === item.href ? "page" : undefined}
                className={`rounded-lg px-3 py-2 text-sm transition-colors hover:text-accent ${
                  isActive(item.href) ? "text-accent" : "text-body"
                }`}
              >
                {item.label}
              </Link>
            ),
          )}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle className="hidden sm:inline-flex" />
          <ButtonLink href={siteConfig.cta.primary.href} className="hidden md:inline-flex">
            {siteConfig.cta.primary.label}
            <IconArrowRight width={16} height={16} />
          </ButtonLink>
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line text-body lg:hidden"
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            <span className="sr-only">{mobileOpen ? "Close menu" : "Open menu"}</span>
            {mobileOpen ? <IconClose width={20} height={20} /> : <IconMenu width={20} height={20} />}
          </button>
        </div>
      </div>

      {mobileOpen ? (
        <div id="mobile-nav" className="border-t border-line bg-bg lg:hidden">
          <nav aria-label="Mobile" className="shell flex flex-col gap-1 py-4">
            {siteConfig.nav.map((item) => (
              <div key={item.href}>
                <Link
                  href={item.href}
                  className="block rounded-lg px-2 py-2.5 text-base transition-colors hover:text-accent"
                >
                  {item.label}
                </Link>
                {"children" in item && item.children ? (
                  <div className="ml-3 border-l border-line pl-3">
                    {item.children.map((child) => (
                      <Link key={child.href} href={child.href} className="block py-2 text-sm text-muted hover:text-accent">
                        {child.label}
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
            <div className="mt-3 flex items-center gap-3">
              <ButtonLink href={siteConfig.cta.primary.href} size="lg" className="flex-1">
                {siteConfig.cta.primary.label}
              </ButtonLink>
              <ThemeToggle />
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
