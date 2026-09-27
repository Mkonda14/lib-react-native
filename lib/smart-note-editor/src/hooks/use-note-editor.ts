/**
 * useNoteEditor — main editor state hook
 * =======================================
 * Orchestrates: value state, history, selection, markdown actions,
 * AI streaming, auto-save, debounced change.
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import type {
  Selection,
  AIMarkdownChunk,
  AIMarkdownOptions,
  EditorStats,
  MarkdownFormat,
} from '../types'
import { useHistory } from './use-history'
import { useSelection } from './use-selection'
import { useKeyboard } from './use-keyboard'
import { useMarkdownActions } from './use-markdown-actions'
import { countWords, countLines, readingTime } from '../utils/markdown'
import type { EditResult } from '../utils/markdown'

interface UseNoteEditorOptions {
  defaultValue?: string
  value?: string // controlled
  onValueChange?: (value: string) => void
  onDebouncedChange?: (value: string) => void
  debounceMs?: number
  enableHistory?: boolean
  maxHistory?: number
  autoSaveKey?: string
  autoSaveDebounce?: number
}

export function useNoteEditor(options: UseNoteEditorOptions = {}) {
  const {
    defaultValue = '',
    value: controlledValue,
    onValueChange,
    onDebouncedChange,
    debounceMs = 500,
    enableHistory = true,
    maxHistory = 100,
    autoSaveKey,
    autoSaveDebounce = 2000,
  } = options

  const isControlled = controlledValue !== undefined

  /* ---------------- History (only if enabled) ---------------- */
  const history = useHistory({
    initialValue: defaultValue,
    maxHistory,
    debounceMs: enableHistory ? debounceMs : 0,
  })

  /* ---------------- State ---------------- */
  const [internalValue, setInternalValue] = useState(defaultValue)
  const value = isControlled ? controlledValue! : (enableHistory ? history.value : internalValue)

  const { selection, setSelection, getSelection } = useSelection({ start: 0, end: 0 })
  const [isFocused, setIsFocused] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)

  const keyboard = useKeyboard()

  /* ---------------- Apply edit result ---------------- */
  const applyEdit = useCallback(
    (result: EditResult) => {
      // Update selection first
      setSelection(result.selection)

      // Update value
      if (enableHistory) {
        history.push(result.value, result.selection)
      } else if (!isControlled) {
        setInternalValue(result.value)
      }
      onValueChange?.(result.value)
    },
    [enableHistory, history, isControlled, onValueChange, setSelection]
  )

  // When controlled value changes externally, update selection to end
  useEffect(() => {
    if (isControlled && controlledValue !== undefined) {
      // Don't reset selection on every change — only on external changes
      // (we detect this via a ref to skip when the change originated from us)
    }
  }, [controlledValue, isControlled])

  /* ---------------- Markdown actions ---------------- */
  const actions = useMarkdownActions({
    value,
    selection,
    onChange: applyEdit,
  })

  /* ---------------- Value change handler (from TextInput) ---------------- */
  const handleValueChange = useCallback(
    (newValue: string) => {
      // Track selection (cursor position)
      if (enableHistory) {
        history.push(newValue, selection)
      } else if (!isControlled) {
        setInternalValue(newValue)
      }
      onValueChange?.(newValue)
    },
    [enableHistory, history, isControlled, onValueChange, selection]
  )

  /* ---------------- Selection change handler ---------------- */
  const handleSelectionChange = useCallback(
    (event: any) => {
      const { start, end } = event.nativeEvent.selection
      setSelection({ start, end })
    },
    [setSelection]
  )

  /* ---------------- Undo / Redo ---------------- */
  const undo = useCallback(() => {
    if (!enableHistory) return
    const prev = history.undo()
    if (prev) {
      setSelection(prev.selection)
      onValueChange?.(prev.value)
    }
  }, [enableHistory, history, setSelection, onValueChange])

  const redo = useCallback(() => {
    if (!enableHistory) return
    const next = history.redo()
    if (next) {
      setSelection(next.selection)
      onValueChange?.(next.value)
    }
  }, [enableHistory, history, setSelection, onValueChange])

  /* ---------------- Debounced change ---------------- */
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (!onDebouncedChange) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      onDebouncedChange(value)
    }, debounceMs)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [value, debounceMs, onDebouncedChange])

  /* ---------------- Auto-save (AsyncStorage) ---------------- */
  const autoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (!autoSaveKey) return
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current)
    autoSaveRef.current = setTimeout(async () => {
      try {
        // Dynamic import to keep AsyncStorage optional
        const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default
        await AsyncStorage.setItem(autoSaveKey, value)
      } catch (e) {
        console.warn('[smart-note-editor] auto-save failed', e)
      }
    }, autoSaveDebounce)
    return () => {
      if (autoSaveRef.current) clearTimeout(autoSaveRef.current)
    }
  }, [value, autoSaveKey, autoSaveDebounce])

  /* ---------------- Restore from auto-save on mount ---------------- */
  useEffect(() => {
    if (!autoSaveKey) return
    ;(async () => {
      try {
        const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default
        const saved = await AsyncStorage.getItem(autoSaveKey)
        if (saved !== null && saved !== defaultValue) {
          if (enableHistory) {
            history.reset(saved, { start: saved.length, end: saved.length })
          } else if (!isControlled) {
            setInternalValue(saved)
          }
          onValueChange?.(saved)
        }
      } catch {
        // ignore
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSaveKey])

  /* ---------------- AI streaming ---------------- */
  const streamRef = useRef<boolean>(false)

  const insertAIMarkdown = useCallback(
    async (
      source: string | AsyncIterable<AIMarkdownChunk>,
      options: AIMarkdownOptions = {}
    ) => {
      const { mode = 'append', typingSpeed = 0, autoScroll = true, onComplete } = options

      if (streamRef.current) return
      streamRef.current = true
      setIsStreaming(true)

      let currentValue = value
      let insertPosition: number

      // Determine insertion mode
      if (mode === 'replace') {
        currentValue = ''
        insertPosition = 0
      } else if (mode === 'insert') {
        insertPosition = selection.start
      } else {
        // append
        insertPosition = currentValue.length
        if (currentValue && !currentValue.endsWith('\n')) {
          currentValue += '\n\n'
          insertPosition = currentValue.length
        }
      }

      try {
        if (typeof source === 'string') {
          // Direct insertion (no streaming)
          const newValue = currentValue + source
          applyEdit({
            value: newValue,
            selection: { start: newValue.length, end: newValue.length },
          })
        } else {
          // Async iterable (streaming)
          let accumulated = ''
          let lastUpdate = 0

          for await (const chunk of source) {
            accumulated += chunk.text
            const now = Date.now()

            // Throttle updates to 30fps for performance
            if (now - lastUpdate >= 33 || chunk.done) {
              const newValue =
                mode === 'replace'
                  ? accumulated
                  : currentValue.substring(0, insertPosition) +
                    accumulated +
                    currentValue.substring(insertPosition)

              applyEdit({
                value: newValue,
                selection: {
                  start: insertPosition + accumulated.length,
                  end: insertPosition + accumulated.length,
                },
              })
              lastUpdate = now

              if (typingSpeed > 0) {
                await new Promise((r) => setTimeout(r, typingSpeed))
              }
            }

            if (chunk.done) break
          }
        }
      } finally {
        streamRef.current = false
        setIsStreaming(false)
        onComplete?.()
      }
    },
    [value, selection, applyEdit]
  )

  /* ---------------- Stats ---------------- */
  const [stats, setStats] = useState<EditorStats>(() => ({
    wordCount: countWords(value),
    charCount: value.length,
    lineCount: countLines(value),
    readingTimeMinutes: readingTime(value),
  }))

  useEffect(() => {
    const timer = setTimeout(() => {
      setStats({
        wordCount: countWords(value),
        charCount: value.length,
        lineCount: countLines(value),
        readingTimeMinutes: readingTime(value),
      })
    }, 500)
    return () => clearTimeout(timer)
  }, [value])

  /* ---------------- Public API ---------------- */
  return {
    // State
    value,
    selection,
    isFocused,
    isStreaming,
    keyboard,
    stats,
    canUndo: enableHistory && history.canUndo,
    canRedo: enableHistory && history.canRedo,

    // Refs
    selectionRef: { current: selection },

    // Actions
    actions,
    handleValueChange,
    handleSelectionChange,
    undo,
    redo,

    // Focus
    onFocus: () => setIsFocused(true),
    onBlur: () => setIsFocused(false),

    // AI
    insertAIMarkdown,

    // Imperative
    setValue: (v: string) => {
      if (enableHistory) history.push(v, getSelection())
      else if (!isControlled) setInternalValue(v)
      onValueChange?.(v)
    },
    clear: () => actions.clear(),
    insert: actions.insert,
    format: actions.format,
    exportMarkdown: () => value,
    exportPlainText: () => {
      // Lazy import to avoid circular dep
      const { markdownToPlainText } = require('../utils/markdown')
      return markdownToPlainText(value)
    },
  }
}