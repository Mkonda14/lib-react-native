/**
 * useSelection — track TextInput selection
 * ==========================================
 * Keeps the cursor position in sync, used by markdown actions.
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import type { Selection } from '../types'

export function useSelection(initial: Selection = { start: 0, end: 0 }) {
  const [selection, setSelection] = useState<Selection>(initial)
  const ref = useRef<Selection>(initial)

  // Keep ref in sync (used in async callbacks)
  useEffect(() => {
    ref.current = selection
  }, [selection])

  const update = useCallback((newSelection: Selection) => {
    ref.current = newSelection
    setSelection(newSelection)
  }, [])

  const get = useCallback(() => ref.current, [])

  return {
    selection,
    selectionRef: ref,
    setSelection: update,
    getSelection: get,
  }
}
