'use client'

import SpiritLogPage from '@/components/spirit/SpiritLogView' // Moving logic to component for cleaner page
import { SpiritPreferencesPanel } from '@/components/spirit/SpiritPreferencesPanel'

export default function Page() {
  return (
    <div className="container max-w-6xl py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2">
         <SpiritLogPage />
      </div>
      <div>
         <SpiritPreferencesPanel />
      </div>
    </div>
  )
}

