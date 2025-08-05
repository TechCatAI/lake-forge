'use client'
import React from 'react'
import { cn } from '../../lib/utils'

export interface SelectProps {
  value: string
  onValueChange(value: string): void
  children: React.ReactNode
  className?: string
}

export function Select({ value, onValueChange, children, className }: SelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
      className={cn('border rounded p-1 bg-background', className)}
    >
      {children}
    </select>
  )
}

export function SelectItem({ value, children }: { value: string; children: React.ReactNode }) {
  return <option value={value}>{children}</option>
}
