'use client'
import React, { useEffect, useState } from 'react'
import DQSuggestionTable from '../../components/DQSuggestionTable'
import GradientText from '../../components/GradientText'
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
    } catch (error) {
      console.error(error)
      toast.error('Failed to load')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  if (loading) {
    return (
      <div className="p-4 h-full">
        <Skeleton className="h-full w-full" />
      </div>
    );
  }

  return (
    <div className="p-4 grid grid-rows-[auto_1fr] h-full gap-4">
      <div className="flex justify-center">
        <GradientText
          animationSpeed={3}
          showBorder={false}
          className="text-2xl font-bold font-display"
        >
          DQ Rule Suggestions
        </GradientText>
      </div>
      <div className="overflow-auto">
        <DQSuggestionTable suggestions={data} refresh={load} />
      </div>
    </div>
  )
}