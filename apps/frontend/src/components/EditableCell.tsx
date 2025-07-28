/* apps/frontend/src/components/EditableCell.tsx */
'use client'

import React, { useState, useRef, useEffect } from 'react'
import { cn } from '../lib/utils'
import Spinner from './Spinner'

export interface EditableCellProps<T> {
  /** Current value shown in the cell */
  initialValue: T
  /** Called when the user finishes editing */
  onSave(value: T): void
  /** Extra Tailwind/clsx classes to inject */
  className?: string
  /** Parse the string back to a typed value */
  parse?: (val: string) => T
  /** Render the typed value to a string */
  format?: (val: T) => string
  /** Show a spinner while the row is saving */
  saving?: boolean
}

function EditableCellInner<T>({
  initialValue,
  onSave,
  className,
  parse = (v: string) => v as unknown as T,
  format = (v: T) => String(v ?? ''),
  saving,
}: EditableCellProps<T>) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(format(initialValue))
  const inputRef = useRef<HTMLInputElement>(null)

  /* keep local state in sync when the prop changes */
  useEffect(() => {
    setValue(format(initialValue))
  }, [initialValue]) // eslint-disable-line react-hooks/exhaustive-deps

  /* auto-focus when entering edit mode */
  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing])

  /** save and exit edit mode */
  function save() {
    setEditing(false)
    onSave(parse(value))
  }

  /** cancel editing and restore original display */
  function cancel() {
    setEditing(false)
    setValue(format(initialValue))
  }

  /** begin editing, optionally seeding the field with a string */
  function startEditing(initial?: string) {
    setEditing(true)
    setValue(initial !== undefined ? initial : format(initialValue))
  }

  /* keyhandlers for the DISPLAY mode (non-editing div) */
  function handleDisplayKey(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      startEditing()
    } else if (e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault()
      startEditing('')
    } else if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault()
      startEditing(e.key)
    }
  }

  /* keyhandlers for the INPUT (editing) mode */
  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      save()
    } else if (e.key === 'Escape') {
      cancel()
    }
  }

  /* show spinner while the parent row is saving */
  if (saving) {
    return (
      <div className={cn('flex justify-center items-center py-1', className)}>
        <Spinner className="h-4 w-4" />
      </div>
    )
  }

  /* EDITING ─────────────────────────────────────────────── */
  return editing ? (
    <input
      ref={inputRef}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={handleKey}
      onBlur={save}
      /* fresh visual treatment */
      className={cn(
        'w-full rounded-sm px-2 py-1 bg-transparent',
        'border border-[color:var(--border)/60]',
        'focus:outline-none focus:ring-2',
        'focus:ring-[color:var(--primary)] focus:border-[color:var(--primary)]',
        className,
      )}
      autoFocus
    />
  ) : (
    /* DISPLAY ────────────────────────────────────────────── */
    <div
      tabIndex={0}
      onClick={() => startEditing()}
      onKeyDown={handleDisplayKey}
      className={cn(
        'w-full px-2 py-1 cursor-text outline-none rounded-sm',
        /* faint outline only on hover/focus to avoid clutter */
        'border border-transparent',
        'hover:border-[color:var(--border)/40] focus-visible:border-[color:var(--border)/60]',
        className,
      )}
    >
      {format(initialValue)}
    </div>
  )
}

/* memo-ise to avoid re-rendering unchanged rows */
export const EditableCell = React.memo(
  EditableCellInner,
  (a, b) => a.initialValue === b.initialValue && a.saving === b.saving,
) as typeof EditableCellInner

/* simple boolean switch used elsewhere in your tables */
export function Switch({ checked, onChange }: { checked: boolean; onChange(v: boolean): void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={cn(
        'w-10 h-5 rounded-full flex items-center px-0.5',
        checked ? 'bg-green-500' : 'bg-gray-300',
      )}
    >
      <span
        className={cn(
          'h-4 w-4 bg-white rounded-full transition-transform',
          checked ? 'translate-x-5' : 'translate-x-0',
        )}
      />
    </button>
  )
}
