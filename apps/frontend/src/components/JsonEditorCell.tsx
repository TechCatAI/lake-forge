'use client'

import React, { useState, useEffect } from 'react'
import { JsonEditor, githubDarkTheme } from 'json-edit-react'
import { cn } from '../lib/utils'
import Spinner from './Spinner'
import Button from './ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
} from './ui/sheet'

export interface JsonEditorCellProps<T extends object> {
  initialValue: T
  onSave(value: T): void
  className?: string
  saving?: boolean
}

export function JsonEditorCellInner<T extends object>({
  initialValue,
  onSave,
  className,
  saving,
}: JsonEditorCellProps<T>) {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState<T>(initialValue)

  useEffect(() => {
    setValue(initialValue)
  }, [initialValue])

  function handleSave() {
    onSave(value)
    setOpen(false)
  }

  function handleCancel() {
    setOpen(false)
    setValue(initialValue)
  }

  if (saving) {
    return (
      <div className={cn('flex justify-center items-center py-1', className)}>
        <Spinner className="h-4 w-4" />
      </div>
    )
  }

  return (
    <>
      <div
        tabIndex={0}
        onClick={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            setOpen(true)
          }
        }}
        className={cn(
          'w-full px-2 py-1 cursor-text outline-none rounded-sm',
          'border border-transparent',
          'hover:border-[color:var(--border)/40] focus-visible:border-[color:var(--border)/60]',
          'truncate',
          className,
        )}
      >
        {JSON.stringify(initialValue ?? {})}
      </div>
      <Sheet
        open={open}
        onOpenChange={(o) => {
          setOpen(o)
          if (!o) setValue(initialValue)
        }}
      >
        <SheetContent side="bottom" className="h-[80vh] flex flex-col">
          <SheetHeader>
            <SheetTitle>Edit JSON</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-auto">
            <JsonEditor data={value} setData={setValue} theme={githubDarkTheme} />
          </div>
          <SheetFooter className="flex-row justify-end gap-2">
            <Button onClick={handleSave}>Save</Button>
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  )
}

export const JsonEditorCell = React.memo(
  JsonEditorCellInner,
  (a, b) => a.initialValue === b.initialValue && a.saving === b.saving,
) as typeof JsonEditorCellInner

