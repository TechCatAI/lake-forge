'use client';
import { SVGProps } from 'react';

export default function MenuIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M3 6h18" strokeLinecap="round" />
      <path d="M3 12h18" strokeLinecap="round" />
      <path d="M3 18h18" strokeLinecap="round" />
    </svg>
  );
}
