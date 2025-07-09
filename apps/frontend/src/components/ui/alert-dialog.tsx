'use client';
import { ReactNode } from 'react';

export function AlertDialog({ open, onOpenChange, children }: {
  open: boolean;
  onOpenChange(open: boolean): void;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={() => onOpenChange(false)} />
      <div className="bg-background p-4 z-10 max-w-sm w-full">
        {children}
      </div>
    </div>
  );
}

export function AlertDialogTitle({ children }: { children: ReactNode }) {
  return <h2 className="font-semibold mb-2">{children}</h2>;
}

export function AlertDialogDescription({ children }: { children: ReactNode }) {
  return <p className="mb-4 text-sm">{children}</p>;
}

export function AlertDialogFooter({ children }: { children: ReactNode }) {
  return <div className="flex justify-end gap-2">{children}</div>;
}
