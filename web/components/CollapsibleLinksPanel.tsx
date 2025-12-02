'use client';

import { useState } from 'react';
import Link from 'next/link';

type LinkItem = {
  href: string;
  label: string;
  external?: boolean;
};

type CollapsibleLinksPanelProps = {
  title?: string;
  links: LinkItem[];
  defaultExpanded?: boolean;
};

export function CollapsibleLinksPanel({ 
  title = 'ChainCheck Links', 
  links, 
  defaultExpanded = false 
}: CollapsibleLinksPanelProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="rounded-2xl border border-[#2f2862] bg-[#100e1d]/40 overflow-hidden backdrop-blur-sm">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-[#100e1d]/60 transition-colors text-left gap-4"
        aria-expanded={isExpanded}
        aria-label={isExpanded ? `Collapse ${title}` : `Expand ${title}`}
      >
        <span className="text-sm font-semibold text-white flex items-center gap-2">
          <svg
            className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
          {title}
        </span>
        <span className="text-xs text-slate-400 whitespace-nowrap">
          {links.length} {links.length === 1 ? 'link' : 'links'}
        </span>
      </button>
      
      {isExpanded && (
        <div className="px-6 pb-4 pt-2 flex flex-col gap-3 border-t border-[#2f2862] animate-in slide-in-from-top-2 duration-200">
          {links.map((link, index) => (
            <Link
              key={index}
              href={link.href}
              target={link.external ? '_blank' : undefined}
              rel={link.external ? 'noopener noreferrer' : undefined}
              className="rounded-xl bg-[#100e1d]/60 px-4 py-3 text-sm font-semibold text-white hover:bg-[#100e1d]/80 transition-colors text-center shadow-md shadow-black/20"
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

