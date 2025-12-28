'use client'

import { Moon, Sun } from 'lucide-react'
import React from 'react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/store'

// =============================================================================
// ThemeSwitcher Component
// =============================================================================

interface ThemeSwitcherProps {
  variant?: 'icon' | 'dropdown' | undefined
  className?: string | undefined
}

/**
 * Theme switcher toggle button
 * Toggles between light and dark themes
 */
export function ThemeSwitcher({ variant = 'icon', className }: ThemeSwitcherProps) {
  const { theme, setTheme } = useUIStore()
  const [mounted, setMounted] = React.useState(false)

  // Avoid hydration mismatch
  React.useEffect(() => {
    setMounted(true)
  }, [])

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  // Prevent hydration mismatch by rendering placeholder during SSR
  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className={cn('h-9 w-9', className)}
        disabled
      >
        <div className="h-5 w-5" />
      </Button>
    )
  }

  if (variant === 'dropdown') {
    return <ThemeDropdown className={className} />
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className={cn('h-9 w-9 transition-colors', className)}
      title={theme === 'dark' ? '切换至浅色模式' : '切换至深色模式'}
    >
      {theme === 'dark' ? (
        <Sun className="h-5 w-5 text-yellow-500" />
      ) : (
        <Moon className="h-5 w-5 text-slate-700" />
      )}
      <span className="sr-only">切换主题</span>
    </Button>
  )
}

// =============================================================================
// ThemeDropdown Component
// =============================================================================

interface ThemeDropdownProps {
  className?: string | undefined
}

function ThemeDropdown({ className }: ThemeDropdownProps) {
  const { theme, setTheme } = useUIStore()
  const [isOpen, setIsOpen] = React.useState(false)

  const themes = [
    { value: 'light' as const, label: '浅色', icon: Sun },
    { value: 'dark' as const, label: '深色', icon: Moon },
  ]

  const currentTheme = themes.find((t) => t.value === theme) ?? themes[1]
  const CurrentIcon = currentTheme.icon ?? Moon

  return (
    <div className={cn('relative', className)}>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => { setIsOpen(!isOpen); }}
        className="h-9 w-9"
      >
        <CurrentIcon className="h-5 w-5" />
      </Button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => { setIsOpen(false); }}
          />
          {/* Dropdown */}
          <div className="absolute right-0 top-full mt-1 z-50 bg-popover border border-border rounded-md shadow-lg py-1 min-w-[120px]">
            {themes.map((t) => (
              <button
                key={t.value}
                onClick={() => {
                  setTheme(t.value)
                  setIsOpen(false)
                }}
                className={cn(
                  'w-full px-3 py-2 text-sm text-left hover:bg-muted flex items-center gap-2',
                  theme === t.value && 'text-primary'
                )}
              >
                <t.icon className="h-4 w-4" />
                {t.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// =============================================================================
// useTheme Hook
// =============================================================================

/**
 * Custom hook for theme management
 * Returns current theme and setter function
 */
export function useTheme() {
  const { theme, setTheme } = useUIStore()

  const toggleTheme = React.useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }, [theme, setTheme])

  const isDark = theme === 'dark'
  const isLight = theme === 'light'

  return {
    theme,
    setTheme,
    toggleTheme,
    isDark,
    isLight,
  }
}
