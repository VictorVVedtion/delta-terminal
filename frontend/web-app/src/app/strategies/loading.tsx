import { MainLayout } from '@/components/layout/MainLayout'
import { ChatSkeleton , Skeleton } from '@/components/ui/skeleton'

export default function StrategiesLoading() {
  return (
    <MainLayout>
      <div className="h-[calc(100vh-64px)] flex flex-col">
        {/* Header */}
        <header className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="space-y-1">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-3 w-56" />
            </div>
          </div>
          <Skeleton className="h-6 w-16 rounded-full" />
        </header>

        {/* Chat Messages */}
        <div className="flex-1 overflow-hidden">
          <div className="max-w-3xl mx-auto">
            <ChatSkeleton />
          </div>
        </div>

        {/* Input */}
        <div className="border-t border-border p-4">
          <div className="max-w-3xl mx-auto">
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
