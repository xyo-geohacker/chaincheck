'use client';

import { useState } from 'react';

type Props = {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
};

export function CollapsibleSection({ title, children, defaultOpen = false }: Props) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="mt-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between text-xs uppercase tracking-[0.25em] text-[#8ea8ff] hover:text-[#9b7bff] transition-colors"
      >
        <span>{title}</span>
        <span className="text-lg">{isOpen ? '−' : '+'}</span>
      </button>
      {isOpen && (
        <div className="mt-2">
          {children}
        </div>
      )}
    </div>
  );
}

