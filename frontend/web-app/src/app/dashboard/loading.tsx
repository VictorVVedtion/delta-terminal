import { MainLayout } from '@/components/layout/MainLayout'
import { DashboardSkeleton } from '@/components/ui/skeleton'

export default function DashboardLoading() {
  return (
    <MainLayout>
      <DashboardSkeleton />
    </MainLayout>
  )
}
