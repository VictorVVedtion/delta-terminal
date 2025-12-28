import { redirect } from 'next/navigation'

/**
 * 根路由 - 重定向到策略页面
 */
export default function HomePage() {
  redirect('/strategies')
}
