'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { AlertCircle, AlertTriangle,CheckCircle, Info, X } from 'lucide-react'
import * as React from 'react'

import { cn } from '@/lib/utils'

import { type Toast, type ToastVariant,useToast } from './use-toast'

// =============================================================================
// Toast Item Component
// =============================================================================

const variantStyles: Record<ToastVariant, string> = {
  default: 'bg-background border-border',
  destructive: 'bg-destructive/10 border-destructive/50 text-destructive',
  success: 'bg-green-500/10 border-green-500/50 text-green-500',
  warning: 'bg-yellow-500/10 border-yellow-500/50 text-yellow-500',
}

const variantIcons: Record<ToastVariant, React.ReactNode> = {
  default: <Info className="h-4 w-4 text-primary" />,
  destructive: <AlertCircle className="h-4 w-4" />,
  success: <CheckCircle className="h-4 w-4" />,
  warning: <AlertTriangle className="h-4 w-4" />,
}

interface ToastItemProps {
  toast: Toast
  onDismiss: (id: string) => void
}

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const variant = toast.variant || 'default'

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={cn(
        'pointer-events-auto relative flex w-full items-start gap-3 rounded-lg border p-4 shadow-lg backdrop-blur-sm',
        variantStyles[variant]
      )}
    >
      <div className="flex-shrink-0">{variantIcons[variant]}</div>
      <div className="flex-1 space-y-1">
        {toast.title && (
          <p className="text-sm font-semibold leading-none">{toast.title}</p>
        )}
        {toast.description && (
          <p className="text-sm text-muted-foreground">{toast.description}</p>
        )}
        {toast.action && <div className="mt-2">{toast.action}</div>}
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        className="flex-shrink-0 rounded-md p-1 opacity-50 transition-opacity hover:opacity-100"
      >
        <X className="h-4 w-4" />
      </button>
    </motion.div>
  )
}

// =============================================================================
// Toaster Component
// =============================================================================

export function Toaster() {
  const { toasts, dismiss } = useToast()

  return (
    <div className="pointer-events-none fixed bottom-0 right-0 z-[100] flex max-h-screen w-full flex-col-reverse gap-2 p-4 sm:max-w-[420px]">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />
        ))}
      </AnimatePresence>
    </div>
  )
}

export default Toaster
