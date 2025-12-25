'use client'

import React, { useEffect } from 'react'
import { useUIStore } from '@/store'

// =============================================================================
// ThemeProvider Component
// =============================================================================

interface ThemeProviderProps {
  children: React.ReactNode
}

/**
 * Theme provider that syncs theme state with document class
 * Applies 'dark' class to html element when dark theme is active
 */
export function ThemeProvider({ children }: ThemeProviderProps) {
  const { theme } = useUIStore()

  useEffect(() => {
    const root = window.document.documentElement

    // Remove old theme class
    root.classList.remove('light', 'dark')

    // Add current theme class
    root.classList.add(theme)

    // Update meta theme-color for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]')
    if (metaThemeColor) {
      metaThemeColor.setAttribute(
        'content',
        theme === 'dark' ? '#070E12' : '#ffffff'
      )
    }
  }, [theme])

  return <>{children}</>
}
