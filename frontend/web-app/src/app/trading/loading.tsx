import { MainLayout } from '@/components/layout/MainLayout'
import { TradingViewSkeleton } from '@/components/ui/skeleton'

export default function TradingLoading() {
  return (
    <MainLayout>
      <TradingViewSkeleton />
    </MainLayout>
  )
}
