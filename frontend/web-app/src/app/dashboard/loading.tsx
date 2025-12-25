import { DashboardSkeleton } from '@/components/ui/skeleton'
import { MainLayout } from '@/components/layout/MainLayout'

export default function DashboardLoading() {
  return (
    <MainLayout>
      <DashboardSkeleton />
    </MainLayout>
  )
}
