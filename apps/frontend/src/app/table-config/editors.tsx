'use client'
import { useState, useRef, useEffect } from 'react'
import { cn } from '../../lib/utils'

export function EditableCell<T>({
  initialValue,
  onSave,
  className,
  parse = (v: string) => v as unknown as T,
  format = (v: T) => String(v ?? ''),
}: {
  initialValue: T
  onSave(value: T): void
  className?: string
  parse?: (val: string) => T
  format?: (val: T) => string
}) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(format(initialValue))
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setValue(format(initialValue))
  }, [initialValue, format])

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      setEditing(false)
      onSave(parse(value))
    } else if (e.key === 'Escape') {
      setEditing(false)
      setValue(format(initialValue))
    }
  }

  return editing ? (
    <input
      ref={inputRef}
      className={cn('w-full border px-1', className)}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => {
        setEditing(false)
        onSave(parse(value))
      }}
      onKeyDown={handleKey}
    />
  ) : (
    <div
      className={cn('w-full px-1 py-1', className)}
      onClick={() => setEditing(true)}
    >
      {format(initialValue)}
    </div>
  )
}

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
