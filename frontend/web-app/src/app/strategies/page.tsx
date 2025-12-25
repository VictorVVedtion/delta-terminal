'use client'

import React from 'react'
import { MainLayout } from '@/components/layout/MainLayout'
import { ChatInterface } from '@/components/strategy/ChatInterface'
import type { InsightData, InsightParam } from '@/types/insight'

// =============================================================================
// Strategies Page - ChatGPT-style AI Strategy Interface
// =============================================================================

export default function StrategiesPage() {
  // A2UI: Handle insight approval - create strategy from approved params
  const handleInsightApprove = React.useCallback((insight: InsightData, params: InsightParam[]) => {
    console.log('Strategy approved:', insight.id, params)
    // TODO: Call API to create strategy with approved params
  }, [])

  // A2UI: Handle insight rejection
  const handleInsightReject = React.useCallback((insight: InsightData) => {
    console.log('Strategy rejected:', insight.id)
  }, [])

  return (
    <MainLayout>
      <div className="h-[calc(100vh-64px)]">
        <ChatInterface
          onStrategyGenerated={(strategy) => {
            console.log('Strategy generated:', strategy)
          }}
          onInsightApprove={handleInsightApprove}
          onInsightReject={handleInsightReject}
        />
      </div>
    </MainLayout>
  )
}
