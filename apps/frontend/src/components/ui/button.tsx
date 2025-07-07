'use client';
import { ButtonHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

export default function Button({ className, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium transition-colors bg-blueprint-pink hover:bg-blueprint-magenta text-white',
        className,
      )}
      {...props}
    />
  );
}
