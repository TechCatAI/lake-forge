'use client'
import React, { useEffect, useState } from 'react'
import DQSuggestionTable from '../../components/DQSuggestionTable'
import { DQSuggestion, fetchDQSuggestions } from '../../lib/api'
import { toast } from 'sonner'
import { Skeleton } from '../../components/ui/skeleton'

export default function DQSuggestionsPage() {
  const [data, setData] = useState<DQSuggestion[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    try {
      setLoading(true)
      const rows = await fetchDQSuggestions()
      setData(rows)
    } catch (err) {
      toast.error('Failed to load')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  return loading ? (
    <Skeleton className="h-32 w-full" />
  ) : (
    <DQSuggestionTable suggestions={data} refresh={load} />
  )
}
