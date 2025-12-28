'use client'

import * as React from 'react'

// =============================================================================
// Types
// =============================================================================

export type ToastVariant = 'default' | 'destructive' | 'success' | 'warning'

export interface Toast {
  id: string
  title?: string
  description?: string
  variant?: ToastVariant
  duration?: number
  action?: React.ReactNode
}

export interface ToastState {
  toasts: Toast[]
}

// =============================================================================
// Toast Context
// =============================================================================

type ToastAction =
  | { type: 'ADD_TOAST'; toast: Toast }
  | { type: 'REMOVE_TOAST'; id: string }
  | { type: 'DISMISS_TOAST'; id: string }

const TOAST_LIMIT = 5
const TOAST_REMOVE_DELAY = 5000

let count = 0

function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER
  return count.toString()
}

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>()

function _addToRemoveQueue(toastId: string, dispatch: React.Dispatch<ToastAction>) {
  if (toastTimeouts.has(toastId)) {
    return
  }

  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId)
    dispatch({ type: 'REMOVE_TOAST', id: toastId })
  }, TOAST_REMOVE_DELAY)

  toastTimeouts.set(toastId, timeout)
}

function reducer(state: ToastState, action: ToastAction): ToastState {
  switch (action.type) {
    case 'ADD_TOAST':
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      }
    case 'DISMISS_TOAST':
    case 'REMOVE_TOAST':
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.id),
      }
    default:
      return state
  }
}

// =============================================================================
// Toast Store (Simple global state)
// =============================================================================

const listeners: ((state: ToastState) => void)[] = []
let memoryState: ToastState = { toasts: [] }

function dispatch(action: ToastAction) {
  memoryState = reducer(memoryState, action)
  listeners.forEach((listener) => listener(memoryState))
}

// =============================================================================
// useToast Hook
// =============================================================================

export interface ToastOptions {
  title?: string
  description?: string
  variant?: ToastVariant
  duration?: number
  action?: React.ReactNode
}

export function useToast() {
  const [state, setState] = React.useState<ToastState>(memoryState)

  React.useEffect(() => {
    listeners.push(setState)
    return () => {
      const index = listeners.indexOf(setState)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }, [])

  const toast = React.useCallback((options: ToastOptions) => {
    const id = genId()
    const newToast: Toast = {
      id,
      ...options,
    }

    dispatch({ type: 'ADD_TOAST', toast: newToast })

    // Auto dismiss
    const duration = options.duration ?? TOAST_REMOVE_DELAY
    setTimeout(() => {
      dispatch({ type: 'REMOVE_TOAST', id })
    }, duration)

    return {
      id,
      dismiss: () => dispatch({ type: 'DISMISS_TOAST', id }),
    }
  }, [])

  const dismiss = React.useCallback((toastId: string) => {
    dispatch({ type: 'DISMISS_TOAST', id: toastId })
  }, [])

  return {
    toasts: state.toasts,
    toast,
    dismiss,
  }
}

// =============================================================================
// Standalone toast function (for use outside React components)
// =============================================================================

export function toast(options: ToastOptions) {
  const id = genId()
  const newToast: Toast = {
    id,
    ...options,
  }

  dispatch({ type: 'ADD_TOAST', toast: newToast })

  const duration = options.duration ?? TOAST_REMOVE_DELAY
  setTimeout(() => {
    dispatch({ type: 'REMOVE_TOAST', id })
  }, duration)

  return {
    id,
    dismiss: () => dispatch({ type: 'DISMISS_TOAST', id }),
  }
}

// Convenience functions - matches usage pattern: notify(type, title, options?)
export type NotifyType = 'success' | 'warning' | 'error' | 'info'

export interface NotifyOptions {
  description?: string
  source?: string
  duration?: number
}

const notifyTypeToVariant: Record<NotifyType, ToastVariant> = {
  success: 'success',
  warning: 'warning',
  error: 'destructive',
  info: 'default',
}

export function notify(type: NotifyType, title: string, options?: NotifyOptions) {
  return toast({
    title,
    description: options?.description,
    variant: notifyTypeToVariant[type],
    duration: options?.duration,
  })
}

export function notifyWarning(title: string, options?: NotifyOptions) {
  return notify('warning', title, options)
}

export function notifySuccess(title: string, options?: NotifyOptions) {
  return notify('success', title, options)
}

export function notifyError(title: string, options?: NotifyOptions) {
  return notify('error', title, options)
}

export function notifyInfo(title: string, options?: NotifyOptions) {
  return notify('info', title, options)
}
