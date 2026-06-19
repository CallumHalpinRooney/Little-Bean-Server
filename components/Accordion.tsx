'use client';

import { useState } from 'react';

export function Accordion({
  items,
}: {
  items: { title: string; body: React.ReactNode }[];
}) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="divide-y divide-line border-y border-line">
      {items.map((item, i) => {
        const isOpen = open === i;
        return (
          <div key={item.title}>
            <button
              onClick={() => setOpen(isOpen ? null : i)}
              className="flex w-full items-center justify-between py-5 text-left"
              aria-expanded={isOpen}
            >
              <span className="text-caption uppercase tracking-[0.16em] text-bone">
                {item.title}
              </span>
              <span className={`text-brass transition-transform duration-300 ${isOpen ? 'rotate-45' : ''}`}>
                +
              </span>
            </button>
            <div
              className={`grid transition-all duration-500 ease-editorial ${
                isOpen ? 'grid-rows-[1fr] pb-6 opacity-100' : 'grid-rows-[0fr] opacity-0'
              }`}
            >
              <div className="overflow-hidden text-body text-bone-dim">{item.body}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
