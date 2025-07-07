'use client';
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface SheetContextValue {
  open: boolean;
  setOpen(open: boolean): void;
}

const SheetContext = createContext<SheetContextValue | null>(null);

export function Sheet({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <SheetContext.Provider value={{ open, setOpen }}>{children}</SheetContext.Provider>
  );
}

export function SheetTrigger({ children }: { children: ReactNode }) {
  const ctx = useContext(SheetContext);
  if (!ctx) return null;
  return <div onClick={() => ctx.setOpen(true)}>{children}</div>;
}

export function SheetContent({
  children,
  side = 'left',
  className,
}: {
  children: ReactNode;
  side?: 'left' | 'right';
  className?: string;
}) {
  const ctx = useContext(SheetContext);
  if (!ctx) return null;
  return (
    <div className={cn('fixed inset-0 z-50', !ctx.open && 'hidden')}>
      <div className="absolute inset-0 bg-black/50" onClick={() => ctx.setOpen(false)} />
      <div
        className={cn(
          'fixed bg-background w-60 h-full shadow-xl',
          side === 'left' ? 'left-0' : 'right-0',
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}
