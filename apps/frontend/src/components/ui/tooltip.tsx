'use client';
import { ReactNode, useState } from 'react';
import { cn } from '../../lib/utils';

export default function Tooltip({ children, content, className }: { children: ReactNode; content: string; className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span
      className={cn('relative inline-block', className)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      {children}
      {open && (
        <span className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-black px-1 py-0.5 text-xs text-white z-50 top-full mt-1">
          {content}
        </span>
      )}
    </span>
  );
}
