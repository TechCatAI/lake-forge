'use client'
import { useState } from 'react'
import Button from '../../components/ui/button'
import Spinner from '../../components/Spinner'
import { toast } from 'sonner'
import {
  updateRawWatermark,
  type RawConfig,
  type WatermarkUpdatePayload,
  type APIError,
} from '../../lib/api'

export default function UpdateWatermarkDialog({
  row,
  onUpdated,
  onClose,
}: {
  row: RawConfig
  onUpdated: (r: RawConfig) => void
  onClose: () => void
}) {
  const [mode, setMode] = useState<WatermarkUpdatePayload['mode']>('set')
  const [newValue, setNewValue] = useState('')
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)

  const valid = mode === 'clear' || newValue.trim().length > 0

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!valid || saving) return
    setSaving(true)
    try {
      const payload: WatermarkUpdatePayload = {
        mode,
        reason: reason || undefined,
        ...(mode === 'set' ? { new_value: newValue } : {}),
      }
      const updated = await updateRawWatermark(row.id, payload)
      onUpdated(updated)
      toast.success('Watermark updated')
      onClose()
    } catch (err) {
      const detail = (err as APIError).detail
      const msg = Array.isArray(detail) ? detail[0].msg : detail
      toast.error(msg || 'Error updating watermark')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <form
        className="relative z-10 w-80 space-y-2
                  bg-sidebar border border-sidebar-border
                  rounded-[var(--radius)] shadow-md p-4"
        onSubmit={submit}
      >
        <h2 className="font-semibold">Update Watermark</h2>
        <select
          className="w-full border px-1"
          value={mode}
          onChange={(e) =>
            setMode(e.target.value as WatermarkUpdatePayload['mode'])
          }
        >
          <option value="set">Set</option>
          <option value="clear">Clear</option>
        </select>
        {mode === 'set' && (
          <input
            className="w-full border px-1"
            placeholder="ISO Timestamp"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
          />
        )}
        <input
          className="w-full border px-1"
          placeholder="Reason (optional)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={!valid || saving}>
            {saving ? <Spinner className="h-4 w-4" /> : 'Save'}
          </Button>
        </div>
      </form>
    </div>
  )
}
