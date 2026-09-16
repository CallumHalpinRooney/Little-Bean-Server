"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { getIcon } from "@/components/icons/map";
import { journey } from "@/content/journey";

/**
 * The six-stage journey. Horizontal on wide screens with a spine that draws
 * itself once on first view; vertical on narrow screens. The animation is
 * decorative — the content reads identically without it.
 */
export function JourneyDiagram({ compact = false }: { compact?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [drawn, setDrawn] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      setDrawn(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setDrawn(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref}>
      {/* Desktop: single spine with six nodes. */}
      <ol className="relative hidden lg:grid lg:grid-cols-6 lg:gap-4">
        <div className="pointer-events-none absolute left-0 right-0 top-7 h-px" aria-hidden="true">
          <svg width="100%" height="2" preserveAspectRatio="none" className="overflow-visible">
            <line x1="4%" y1="1" x2="96%" y2="1" stroke="var(--line-strong)" strokeWidth="2" strokeDasharray="4 6" />
            <line
              x1="4%"
              y1="1"
              x2="96%"
              y2="1"
              stroke="var(--accent)"
              strokeWidth="2"
              pathLength={100}
              strokeDasharray="100"
              style={{
                strokeDashoffset: drawn ? 0 : 100,
                transition: "stroke-dashoffset 1.6s cubic-bezier(0.2, 0.6, 0.2, 1)",
              }}
            />
          </svg>
        </div>

        {journey.map((stage, index) => {
          const Icon = getIcon(stage.icon);
          return (
            <li key={stage.id} className="relative">
              <div
                className="flex h-14 w-14 items-center justify-center rounded-full border border-line bg-surface text-accent transition-transform"
                style={{
                  transform: drawn ? "none" : "scale(0.85)",
                  opacity: drawn ? 1 : 0.4,
                  transition: `transform 0.4s ease ${index * 120}ms, opacity 0.4s ease ${index * 120}ms`,
                }}
              >
                <Icon width={24} height={24} />
              </div>
              <p className="mt-4 font-mono text-[0.7rem] tracking-wider text-muted">{stage.step}</p>
              <h3 className="mt-1 font-display text-xl">
                <Link href={`/how-it-works#${stage.id}`} className="transition-colors hover:text-accent">
                  {stage.title}
                </Link>
              </h3>
              {!compact ? <p className="mt-2 text-sm leading-relaxed text-muted">{stage.summary}</p> : null}
            </li>
          );
        })}
      </ol>

      {/* Mobile and tablet: vertical rail. */}
      <ol className="relative space-y-8 border-l border-dashed border-line-strong pl-8 lg:hidden">
        {journey.map((stage) => {
          const Icon = getIcon(stage.icon);
          return (
            <li key={stage.id} className="relative">
              <span className="absolute -left-[3.375rem] flex h-11 w-11 items-center justify-center rounded-full border border-line bg-surface text-accent">
                <Icon width={20} height={20} />
              </span>
              <p className="font-mono text-[0.7rem] tracking-wider text-muted">{stage.step}</p>
              <h3 className="mt-0.5 font-display text-xl">
                <Link href={`/how-it-works#${stage.id}`} className="transition-colors hover:text-accent">
                  {stage.title}
                </Link>
              </h3>
              {!compact ? <p className="mt-1.5 text-sm leading-relaxed text-muted">{stage.summary}</p> : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
