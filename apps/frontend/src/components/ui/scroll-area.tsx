'use client';
import { ReactNode } from 'react';
import { cn } from '../../lib/utils';

export default function ScrollArea({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('overflow-y-auto', className)}>{children}</div>;
}
