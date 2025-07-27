'use client'
import React, { useState, useRef, useEffect } from 'react'
import { cn } from '../lib/utils'
import Spinner from './Spinner'

export interface EditableCellProps<T> {
  initialValue: T
  onSave(value: T): void
  className?: string
  parse?: (val: string) => T
  format?: (val: T) => string
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

  useEffect(() => {
    setValue(format(initialValue))
  }, [initialValue]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing])

  function save() {
    setEditing(false)
    onSave(parse(value))
  }

  function cancel() {
    setEditing(false)
    setValue(format(initialValue))
  }

  function startEditing(initial?: string) {
    setEditing(true)
    setValue(initial !== undefined ? initial : format(initialValue))
  }

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

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      save()
    } else if (e.key === 'Escape') {
      cancel()
    }
  }

  if (saving) {
    return (
      <div className={cn('flex justify-center items-center py-1', className)}>
        <Spinner className="h-4 w-4" />
      </div>
    )
  }

  return editing ? (
    <input
      ref={inputRef}
      className={cn('w-full border px-1', className)}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={handleKey}
      onBlur={save}
      autoFocus
    />
  ) : (
    <div
      className={cn('w-full px-1 py-1 cursor-text outline-none', className)}
      tabIndex={0}
      onClick={() => startEditing()}
      onKeyDown={handleDisplayKey}
    >
      {format(initialValue)}
    </div>
  )
}

export const EditableCell = React.memo(
  EditableCellInner,
  (a, b) => a.initialValue === b.initialValue && a.saving === b.saving,
) as typeof EditableCellInner

export function Switch({ checked, onChange }: { checked: boolean; onChange(v: boolean): void }) {
  return (
    <button
      className={cn(
        'w-10 h-5 rounded-full flex items-center px-0.5',
        checked ? 'bg-green-500' : 'bg-gray-300'
      )}
      onClick={() => onChange(!checked)}
    >
      <span
        className={cn(
          'h-4 w-4 bg-white rounded-full transition-transform',
          checked ? 'translate-x-5' : 'translate-x-0'
        )}
      />
    </button>
  )
}
