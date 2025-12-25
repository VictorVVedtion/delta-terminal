import { TradingViewSkeleton } from '@/components/ui/skeleton'
import { MainLayout } from '@/components/layout/MainLayout'

export default function TradingLoading() {
  return (
    <MainLayout>
      <TradingViewSkeleton />
    </MainLayout>
  )
}
