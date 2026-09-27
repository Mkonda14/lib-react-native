/**
 * useMarkdownActions — high-level actions bound to state
 * ======================================================
 * Wraps the markdown utilities to operate on React state.
 *
 * Returns action functions that take the current value + selection
 * and return the new value + selection (to be applied by the editor).
 */

import { useCallback } from 'react'
import type { MarkdownFormat, Selection, MarkdownInlineFormat, MarkdownBlockFormat } from '../types'
import {
  applyFormat,
  toggleCheckbox,
  continueList,
  indentLine,
  dedentLine,
  insertText,
  type EditResult,
} from '../utils/markdown'

interface UseMarkdownActionsArgs {
  value: string
  selection: Selection
  onChange: (result: EditResult) => void
}

export function useMarkdownActions(args: UseMarkdownActionsArgs) {
  const { value, selection, onChange } = args

  /**
   * Apply a format (inline or block) at the current selection.
   */
  const format = useCallback(
    (fmt: MarkdownFormat) => {
      const result = applyFormat(value, selection, fmt)
      onChange(result)
    },
    [value, selection, onChange]
  )

  /**
   * Wrap selection with custom prefix/suffix.
   */
  const wrapSelection = useCallback(
    (prefix: string, suffix: string = prefix) => {
      const { start, end } = selection
      const selectedText = value.substring(start, end)
      const newValue =
        value.substring(0, start) + prefix + selectedText + suffix + value.substring(end)
      onChange({
        value: newValue,
        selection: { start: start + prefix.length, end: end + prefix.length },
      })
    },
    [value, selection, onChange]
  )

  /**
   * Toggle the checkbox at the cursor position.
   */
  const toggleTodo = useCallback(() => {
    const result = toggleCheckbox(value, selection.start)
    onChange(result)
  }, [value, selection, onChange])

  /**
   * Insert text at cursor (replacing selection).
   */
  const insert = useCallback(
    (text: string) => {
      const result = insertText(value, selection, text)
      onChange(result)
    },
    [value, selection, onChange]
  )

  /**
   * Continue list / insert newline (smart Enter).
   */
  const enter = useCallback(() => {
    const result = continueList(value, selection.start)
    onChange(result)
  }, [value, selection, onChange])

  /**
   * Indent current line(s).
   */
  const indent = useCallback(() => {
    const result = indentLine(value, selection)
    onChange(result)
  }, [value, selection, onChange])

  /**
   * Dedent current line(s).
   */
  const dedent = useCallback(() => {
    const result = dedentLine(value, selection)
    onChange(result)
  }, [value, selection, onChange])

  /**
   * Insert a horizontal rule.
   */
  const insertDivider = useCallback(() => {
    const result = applyFormat(value, selection, 'horizontal-rule')
    onChange(result)
  }, [value, selection, onChange])

  /**
   * Insert a code block.
   */
  const insertCodeBlock = useCallback(() => {
    const result = applyFormat(value, selection, 'code-block')
    onChange(result)
  }, [value, selection, onChange])

  /**
   * Insert a table (markdown format).
   */
  const insertTable = useCallback(
    (rows = 3, cols = 3) => {
      const header = Array.from({ length: cols }, (_, i) => `Col ${i + 1}`).join(' | ')
      const separator = Array.from({ length: cols }, () => '---').join(' | ')
      const body = Array.from({ length: rows - 1 }, () =>
        Array.from({ length: cols }, () => ' ').join(' | ')
      ).join('\n')

      const table = `\n| ${header} |\n| ${separator} |\n| ${body} |\n`
      const result = insertText(value, selection, table)
      onChange(result)
    },
    [value, selection, onChange]
  )

  /**
   * Insert a link.
   */
  const insertLink = useCallback(
    (text?: string, url?: string) => {
      const linkText = text ?? 'texte'
      const linkUrl = url ?? 'https://'
      const markdown = `[${linkText}](${linkUrl})`
      const result = insertText(value, selection, markdown)
      onChange(result)
    },
    [value, selection, onChange]
  )

  /**
   * Insert an image.
   */
  const insertImage = useCallback(
    (altText?: string, url?: string) => {
      const alt = altText ?? 'image'
      const imageUrl = url ?? 'https://'
      const markdown = `![${alt}](${imageUrl})`
      const result = insertText(value, selection, markdown)
      onChange(result)
    },
    [value, selection, onChange]
  )

  /**
   * Select all text.
   */
  const selectAll = useCallback(() => {
    onChange({ value, selection: { start: 0, end: value.length } })
  }, [value, onChange])

  /**
   * Clear all content (with confirmation handled by caller).
   */
  const clear = useCallback(() => {
    onChange({ value: '', selection: { start: 0, end: 0 } })
  }, [onChange])

  return {
    format,
    wrapSelection,
    toggleTodo,
    insert,
    enter,
    indent,
    dedent,
    insertDivider,
    insertCodeBlock,
    insertTable,
    insertLink,
    insertImage,
    selectAll,
    clear,
  }
}
