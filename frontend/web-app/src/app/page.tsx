'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

import { SystemLoading } from '@/components/system/SystemLoading'

export default function HomePage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // Artificial delay for effect only if needed, or rely on SystemLoading's internal timer
    if (ready) {
      router.push('/chat')
    }
  }, [ready, router])

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <SystemLoading onComplete={() => { setReady(true); }} />
    </div>
  )
}
