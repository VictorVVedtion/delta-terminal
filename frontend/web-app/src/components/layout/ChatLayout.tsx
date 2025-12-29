'use client'

import React from 'react'

import { useBreakpointDown } from '@/hooks/useMediaQuery'
import { cn } from '@/lib/utils'

// =============================================================================
// ChatLayout - ChatGPT-style layout with sliding Canvas
// =============================================================================

interface ChatLayoutProps {
  children: React.ReactNode
  /** Canvas content to display in the side panel */
  canvas?: React.ReactNode | undefined
  /** Whether the canvas panel is open */
  canvasOpen?: boolean | undefined
  /** Called when canvas should close */
  onCanvasClose?: (() => void) | undefined
  /** Additional className for the main content area */
  className?: string | undefined
}

/**
 * ChatLayout - A ChatGPT-style layout with:
 * - Full-width chat interface by default
 * - Sliding canvas panel from the right when needed
 * - Responsive: sidebar on desktop, overlay on mobile
 */
export function ChatLayout({
  children,
  canvas,
  canvasOpen = false,
  onCanvasClose,
  className,
}: ChatLayoutProps) {
  // 响应式检测: lg 断点以下为移动端/平板
  const isMobileOrTablet = useBreakpointDown('lg')

  // Close canvas on escape key
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && canvasOpen) {
        onCanvasClose?.()
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => { window.removeEventListener('keydown', handleEscape); }
  }, [canvasOpen, onCanvasClose])

  // Prevent body scroll when canvas is open on mobile/tablet
  React.useEffect(() => {
    if (canvasOpen && isMobileOrTablet) {
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [canvasOpen, isMobileOrTablet])

  return (
    <div className="chat-layout">
      {/* Main Content Area */}
      <main
        className={cn(
          'chat-main',
          canvasOpen && 'lg:canvas-open',
          className,
        )}
      >
        {children}
      </main>

      {/* Canvas Backdrop (mobile only) */}
      <div
        className={cn(
          'canvas-backdrop lg:hidden',
          canvasOpen && 'open',
        )}
        onClick={onCanvasClose}
        aria-hidden="true"
      />

      {/* Canvas Panel */}
      <aside
        className={cn(
          'canvas-panel',
          canvasOpen && 'open',
        )}
        aria-label="Canvas panel"
        aria-hidden={!canvasOpen}
      >
        {canvas}
      </aside>
    </div>
  )
}

// =============================================================================
// ChatHeader - Header for the chat layout
// =============================================================================

interface ChatHeaderProps {
  title?: string | undefined
  subtitle?: string | undefined
  actions?: React.ReactNode | undefined
  className?: string | undefined
}

export function ChatHeader({
  title,
  subtitle,
  actions,
  className,
}: ChatHeaderProps) {
  return (
    <header
      className={cn(
        'sticky top-0 z-20 flex items-center justify-between',
        'px-4 py-3 bg-background/80 backdrop-blur-xl border-b border-border',
        className,
      )}
    >
      <div className="flex-1 min-w-0">
        {title && (
          <h1 className="text-lg font-semibold truncate">{title}</h1>
        )}
        {subtitle && (
          <p className="text-sm text-muted-foreground truncate">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 ml-4">
          {actions}
        </div>
      )}
    </header>
  )
}

// =============================================================================
// CanvasHeader - Header for the canvas panel
// =============================================================================

interface CanvasHeaderProps {
  title?: string | undefined
  onClose?: (() => void) | undefined
  actions?: React.ReactNode | undefined
  className?: string | undefined
}

export function CanvasHeader({
  title = 'Canvas',
  onClose,
  actions,
  className,
}: CanvasHeaderProps) {
  return (
    <header
      className={cn(
        'sticky top-0 z-10 flex items-center justify-between',
        'px-4 py-3 bg-card border-b border-border',
        className,
      )}
    >
      <h2 className="text-base font-semibold">{title}</h2>
      <div className="flex items-center gap-2">
        {actions}
        <button
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-muted transition-colors"
          aria-label="Close canvas"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </header>
  )
}

// =============================================================================
// CanvasBody - Scrollable content area for canvas
// =============================================================================

interface CanvasBodyProps {
  children: React.ReactNode
  className?: string | undefined
}

export function CanvasBody({ children, className }: CanvasBodyProps) {
  return (
    <div
      className={cn(
        'flex-1 overflow-y-auto p-4 scrollbar-thin',
        className,
      )}
    >
      {children}
    </div>
  )
}

// =============================================================================
// CanvasFooter - Fixed footer for canvas actions
// =============================================================================

interface CanvasFooterProps {
  children: React.ReactNode
  className?: string | undefined
}

export function CanvasFooter({ children, className }: CanvasFooterProps) {
  return (
    <footer
      className={cn(
        'sticky bottom-0 px-4 py-3 bg-card border-t border-border',
        className,
      )}
    >
      {children}
    </footer>
  )
}

// =============================================================================
// Exports
// =============================================================================

export default ChatLayout
