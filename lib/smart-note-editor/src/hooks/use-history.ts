/**
 * useHistory — undo/redo state management
 * ========================================
 * Tracks text snapshots for undo/redo. Batches rapid changes
 * (typing) into a single history entry (debounced).
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import type { Selection, EditorSnapshot } from '../types'

interface UseHistoryOptions {
  /** Max history entries (default 100). */
  maxHistory?: number
  /** Debounce delay in ms (default 500). */
  debounceMs?: number
  /** Initial value. */
  initialValue?: string
  /** Initial selection. */
  initialSelection?: Selection
}

export function useHistory(options: UseHistoryOptions = {}) {
  const {
    maxHistory = 100,
    debounceMs = 500,
    initialValue = '',
    initialSelection = { start: 0, end: 0 },
  } = options

  const [past, setPast] = useState<EditorSnapshot[]>([])
  const [future, setFuture] = useState<EditorSnapshot[]>([])
  const [current, setCurrent] = useState<EditorSnapshot>(() => ({
    value: initialValue,
    selection: initialSelection,
    timestamp: Date.now(),
  }))

  // Debounce timer
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingRef = useRef<EditorSnapshot | null>(null)

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  /**
   * Push a new snapshot. If called rapidly (within debounceMs), only the
   * last snapshot is kept (typing is batched).
   */
  const push = useCallback(
    (value: string, selection: Selection) => {
      const snapshot: EditorSnapshot = { value, selection, timestamp: Date.now() }

      if (debounceMs > 0) {
        pendingRef.current = snapshot
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => {
          if (pendingRef.current) {
            setPast((prev) => {
              const next = [...prev, current]
              if (next.length > maxHistory) next.shift()
              return next
            })
            setCurrent(pendingRef.current)
            pendingRef.current = null
            setFuture([])
          }
        }, debounceMs)
      } else {
        setPast((prev) => {
          const next = [...prev, current]
          if (next.length > maxHistory) next.shift()
          return next
        })
        setCurrent(snapshot)
        setFuture([])
      }
    },
    [current, debounceMs, maxHistory]
  )

  const undo = useCallback(() => {
    if (past.length === 0) return null

    const previous = past[past.length - 1]
    setPast((prev) => prev.slice(0, -1))
    setFuture((prev) => [...prev, current])
    setCurrent(previous)
    return previous
  }, [past, current])

  const redo = useCallback(() => {
    if (future.length === 0) return null

    const next = future[future.length - 1]
    setFuture((prev) => prev.slice(0, -1))
    setPast((prev) => [...prev, current])
    setCurrent(next)
    return next
  }, [future, current])

  const reset = useCallback((value: string, selection: Selection) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    pendingRef.current = null
    setPast([])
    setFuture([])
    setCurrent({ value, selection, timestamp: Date.now() })
  }, [debounceMs])

  return {
    value: current.value,
    selection: current.selection,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
    push,
    undo,
    redo,
    reset,
  }
}
