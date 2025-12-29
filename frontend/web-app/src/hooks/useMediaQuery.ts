/**
 * useMediaQuery - 响应式媒体查询 Hook
 *
 * 提供类型安全的响应式检测能力
 * 支持 SSR (服务端渲染) 和动态窗口大小变化
 */

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'

// =============================================================================
// 断点定义 (与 Tailwind 保持一致)
// =============================================================================

export const BREAKPOINTS = {
  xs: 0, // 手机 (< 640px)
  sm: 640, // 小屏手机横屏 / 小平板
  md: 768, // 平板
  lg: 1024, // 小型桌面 / 大平板
  xl: 1280, // 桌面
  '2xl': 1536, // 大屏桌面
} as const

export type Breakpoint = keyof typeof BREAKPOINTS

// =============================================================================
// 核心 Hook: useMediaQuery
// =============================================================================

/**
 * 通用媒体查询 Hook
 *
 * @param query - CSS 媒体查询字符串
 * @returns 是否匹配查询条件
 *
 * @example
 * const isPortrait = useMediaQuery('(orientation: portrait)')
 * const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
 */
export function useMediaQuery(query: string): boolean {
  // SSR 支持: 使用 useSyncExternalStore 确保服务端和客户端一致
  const subscribe = useCallback(
    (callback: () => void) => {
      if (typeof window === 'undefined') {
        return () => {}
      }

      const mql = window.matchMedia(query)

      // 使用现代 API
      if (mql.addEventListener) {
        mql.addEventListener('change', callback)
        return () => mql.removeEventListener('change', callback)
      } else {
        // 兼容旧浏览器
        mql.addListener(callback)
        return () => mql.removeListener(callback)
      }
    },
    [query]
  )

  const getSnapshot = useCallback(() => {
    if (typeof window === 'undefined') {
      return false
    }
    return window.matchMedia(query).matches
  }, [query])

  const getServerSnapshot = useCallback(() => false, [])

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

// =============================================================================
// 便捷断点 Hooks
// =============================================================================

/**
 * 检测是否为移动设备 (< 768px)
 */
export function useIsMobile(): boolean {
  return useMediaQuery(`(max-width: ${BREAKPOINTS.md - 1}px)`)
}

/**
 * 检测是否为平板设备 (768px - 1023px)
 */
export function useIsTablet(): boolean {
  return useMediaQuery(
    `(min-width: ${BREAKPOINTS.md}px) and (max-width: ${BREAKPOINTS.lg - 1}px)`
  )
}

/**
 * 检测是否为桌面设备 (>= 1024px)
 */
export function useIsDesktop(): boolean {
  return useMediaQuery(`(min-width: ${BREAKPOINTS.lg}px)`)
}

/**
 * 检测是否为小屏手机 (< 640px)
 */
export function useIsSmallMobile(): boolean {
  return useMediaQuery(`(max-width: ${BREAKPOINTS.sm - 1}px)`)
}

/**
 * 检测是否为大屏桌面 (>= 1280px)
 */
export function useIsLargeDesktop(): boolean {
  return useMediaQuery(`(min-width: ${BREAKPOINTS.xl}px)`)
}

// =============================================================================
// 断点匹配 Hook
// =============================================================================

/**
 * 获取当前断点
 *
 * @returns 当前匹配的最大断点
 *
 * @example
 * const breakpoint = useBreakpoint()
 * // 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
 */
export function useBreakpoint(): Breakpoint {
  const is2xl = useMediaQuery(`(min-width: ${BREAKPOINTS['2xl']}px)`)
  const isXl = useMediaQuery(`(min-width: ${BREAKPOINTS.xl}px)`)
  const isLg = useMediaQuery(`(min-width: ${BREAKPOINTS.lg}px)`)
  const isMd = useMediaQuery(`(min-width: ${BREAKPOINTS.md}px)`)
  const isSm = useMediaQuery(`(min-width: ${BREAKPOINTS.sm}px)`)

  if (is2xl) return '2xl'
  if (isXl) return 'xl'
  if (isLg) return 'lg'
  if (isMd) return 'md'
  if (isSm) return 'sm'
  return 'xs'
}

/**
 * 检测是否达到指定断点 (min-width)
 *
 * @param breakpoint - 目标断点
 * @returns 是否达到或超过该断点
 *
 * @example
 * const isAtLeastMd = useBreakpointUp('md')
 */
export function useBreakpointUp(breakpoint: Breakpoint): boolean {
  return useMediaQuery(`(min-width: ${BREAKPOINTS[breakpoint]}px)`)
}

/**
 * 检测是否低于指定断点 (max-width)
 *
 * @param breakpoint - 目标断点
 * @returns 是否低于该断点
 *
 * @example
 * const isBelowLg = useBreakpointDown('lg')
 */
export function useBreakpointDown(breakpoint: Breakpoint): boolean {
  return useMediaQuery(`(max-width: ${BREAKPOINTS[breakpoint] - 1}px)`)
}

/**
 * 检测是否在两个断点之间
 *
 * @param min - 最小断点 (包含)
 * @param max - 最大断点 (不包含)
 * @returns 是否在范围内
 *
 * @example
 * const isTabletOnly = useBreakpointBetween('md', 'lg')
 */
export function useBreakpointBetween(min: Breakpoint, max: Breakpoint): boolean {
  return useMediaQuery(
    `(min-width: ${BREAKPOINTS[min]}px) and (max-width: ${BREAKPOINTS[max] - 1}px)`
  )
}

// =============================================================================
// 窗口尺寸 Hook
// =============================================================================

interface WindowSize {
  width: number
  height: number
}

/**
 * 获取窗口尺寸
 *
 * @returns { width, height } 当前窗口尺寸
 *
 * @example
 * const { width, height } = useWindowSize()
 */
export function useWindowSize(): WindowSize {
  const [size, setSize] = useState<WindowSize>(() => {
    if (typeof window === 'undefined') {
      return { width: 0, height: 0 }
    }
    return {
      width: window.innerWidth,
      height: window.innerHeight,
    }
  })

  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleResize = () => {
      setSize({
        width: window.innerWidth,
        height: window.innerHeight,
      })
    }

    // 使用 ResizeObserver 更高效地监听
    const resizeObserver = new ResizeObserver(handleResize)
    resizeObserver.observe(document.documentElement)

    // Fallback 到 resize 事件
    window.addEventListener('resize', handleResize)

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  return size
}

// =============================================================================
// 设备特性检测
// =============================================================================

/**
 * 检测是否支持触摸
 */
export function useIsTouchDevice(): boolean {
  return useMediaQuery('(pointer: coarse)')
}

/**
 * 检测用户是否偏好减少动画
 */
export function usePrefersReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)')
}

/**
 * 检测是否为深色模式偏好
 */
export function usePrefersDarkMode(): boolean {
  return useMediaQuery('(prefers-color-scheme: dark)')
}

/**
 * 检测是否为横屏模式
 */
export function useIsLandscape(): boolean {
  return useMediaQuery('(orientation: landscape)')
}

// =============================================================================
// 导出
// =============================================================================

export default useMediaQuery
