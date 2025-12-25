import { MainLayout } from '@/components/layout/MainLayout'
import { Skeleton } from '@/components/ui/skeleton'

export default function BacktestLoading() {
  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <Skeleton className="h-9 w-32 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>

        {/* Tabs */}
        <Skeleton className="h-10 w-80" />

        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form Card */}
          <div className="lg:col-span-2">
            <div className="border border-border rounded-lg p-6 space-y-6">
              <Skeleton className="h-6 w-32" />

              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <div className="flex gap-2">
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-6 w-20" />
                  </div>
                </div>
              </div>

              {/* Strategy Type Grid */}
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[...Array(8)].map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              </div>

              {/* Date Range */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </div>

              {/* Submit Button */}
              <Skeleton className="h-12 w-full" />
            </div>
          </div>

          {/* Tips Card */}
          <div>
            <div className="border border-border rounded-lg p-6 space-y-4">
              <Skeleton className="h-5 w-24" />
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-4 w-full" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
