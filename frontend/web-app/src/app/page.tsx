import { redirect } from 'next/navigation'

/**
 * 根路由 - 直接重定向到聊天页面
 *
 * 修复路由问题: 之前 / → /strategies → /chat 导致双重重定向
 * 现在直接 / → /chat
 */
export default function HomePage() {
  redirect('/chat')
}
