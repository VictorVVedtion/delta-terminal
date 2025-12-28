'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

import { SystemLoading } from '@/components/system/SystemLoading'

/**
 * Strategies Page - Redirection
 * 
 * This route is being deprecated in favor of the unified /chat interface.
 * Redirects users to the main chat experience where they can also manage strategies.
 */
export default function StrategiesPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/chat')
  }, [router])

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-background">
      <SystemLoading message="Redirecting to Unified Command..." />
    </div>
  )
}
