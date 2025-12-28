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
 * Light theme is the default (no class needed) per CSS :root variables
 */
export function ThemeProvider({ children }: ThemeProviderProps) {
  const { theme } = useUIStore()

  useEffect(() => {
    const root = window.document.documentElement

    // Remove theme classes first
    root.classList.remove('light', 'dark')

    // Only add 'dark' class for dark theme
    // Light theme uses :root CSS variables (no class needed)
    if (theme === 'dark') {
      root.classList.add('dark')
    }

    // Update meta theme-color for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]')
    if (metaThemeColor) {
      metaThemeColor.setAttribute(
        'content',
        theme === 'dark' ? '#070E12' : '#ffffff'
      )
    }

    // Also update color-scheme for native elements
    root.style.colorScheme = theme
  }, [theme])

  return <>{children}</>
}
