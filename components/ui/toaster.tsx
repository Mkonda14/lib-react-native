import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react'
import { View } from 'react-native'
import { Toast, type ToastProps } from './toast'

/* ====================================================================== *
 * Types
 * ====================================================================== */

type ToastVariant = 'default' | 'destructive' | 'success'

interface ToastItem {
  id: string
  variant?: ToastVariant
  title?: string
  description?: string
  duration?: number
}

/* ====================================================================== *
 * Context
 * ====================================================================== */

interface ToastContextValue {
  toasts: ToastItem[]
  addToast: (toast: Omit<ToastItem, 'id'>) => void
  removeToast: (id: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

/* ====================================================================== *
 * useToast — hook imperatif appelable depuis n'importe quel écran
 * ====================================================================== */

export type ToastActions = {
  (props: Omit<ToastItem, 'id'>): void
  success: (title: string, description?: string) => void
  destructive: (title: string, description?: string) => void
  default: (title: string, description?: string) => void
}

export const useToast = (): { toast: ToastActions } => {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast doit être utilisé à l\'intérieur d\'un <ToastProvider>')
  }

  const toast = useMemo<ToastActions>(() => {
    const base = (props: Omit<ToastItem, 'id'>) => {
      ctx.addToast(props)
    }

    const actions = {
      ...(base as any),
      success: (title: string, description?: string) => {
        ctx.addToast({ variant: 'success', title, description })
      },
      destructive: (title: string, description?: string) => {
        ctx.addToast({ variant: 'destructive', title, description })
      },
      default: (title: string, description?: string) => {
        ctx.addToast({ variant: 'default', title, description })
      },
    }
    return actions
  }, [ctx])

  return { toast }
}

/* ====================================================================== *
 * ToastProvider — wrapper à placer au niveau racine de l'app
 * ====================================================================== */

export interface ToastProviderProps {
  children: React.ReactNode
}

export const ToastProvider = ({ children }: ToastProviderProps) => {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const addToast = useCallback((toast: Omit<ToastItem, 'id'>) => {
    const id = Math.random().toString(36).slice(2)
    setToasts((prev) => [...prev, { ...toast, id }])
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const value = useMemo(
    () => ({ toasts, addToast, removeToast }),
    [toasts, addToast, removeToast]
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Toaster />
    </ToastContext.Provider>
  )
}
ToastProvider.displayName = 'ToastProvider'

/* ====================================================================== *
 * Toaster — rendu overlay en haut de l'écran (lit depuis le contexte)
 * ====================================================================== */

const Toaster = () => {
  const ctx = useContext(ToastContext)
  if (!ctx) return null

  return (
    <View
      style={{
        position: 'absolute',
        top: 48,
        left: 16,
        right: 16,
        zIndex: 9999,
        gap: 8,
        pointerEvents: 'box-none',
      }}
    >
      {ctx.toasts.map((item) => (
        <Toast
          key={item.id}
          variant={item.variant}
          title={item.title}
          description={item.description}
          duration={item.duration}
          onClose={() => ctx.removeToast(item.id)}
        />
      ))}
    </View>
  )
}
Toaster.displayName = 'Toaster'
