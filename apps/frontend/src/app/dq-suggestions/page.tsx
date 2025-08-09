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

  return loading ? (
    <Skeleton className="h-32 w-full" />
  ) : (
    <div className="p-4 w-screen overflow-x-hidden">
      <div className="sticky top-0 bg-background z-10 mb-2 w-full">
        <div className="relative flex justify-center w-full">
          <GradientText
            animationSpeed={3}
            showBorder={false}
            className="text-2xl font-bold font-display"
          >
            DQ Rule Suggestions
          </GradientText>
        </div>
      </div>
      <div className="overflow-auto w-full">
        <DQSuggestionTable suggestions={data} refresh={load} />
      </div>
    </div>
  )
}
