'use client'
import { ReactNode } from 'react'
import * as Dialog from '@radix-ui/react-alert-dialog'
import { cn } from '../../lib/utils'

export const AlertDialog = Dialog.Root
export const AlertDialogTrigger = Dialog.Trigger
export const AlertDialogCancel = Dialog.Cancel
export const AlertDialogAction = Dialog.Action

export function AlertDialogContent({ children, className, ...props }: Dialog.AlertDialogContentProps) {
  return (
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
      <Dialog.Content
        {...props}
        className={cn(
          'fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background p-4 shadow-xl',
          className,
        )}
      >
        {children}
      </Dialog.Content>
    </Dialog.Portal>
  )
}

export function AlertDialogHeader({ children }: { children: ReactNode }) {
  return <div className="mb-2 font-semibold">{children}</div>
}

export function AlertDialogFooter({ children }: { children: ReactNode }) {
  return <div className="mt-4 flex justify-end gap-2">{children}</div>
}
