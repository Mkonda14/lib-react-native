/**
 * Markdown manipulation utilities
 * =================================
 * Pure functions for inserting, toggling, and wrapping markdown syntax.
 *
 * Selection-aware: if the user has selected text, the format wraps the
 * selection. Otherwise, it inserts placeholder text (e.g. **text**)
 * and selects the placeholder so the user can type to replace.
 */

import type { Selection, MarkdownFormat, MarkdownInlineFormat, MarkdownBlockFormat } from '../types'

export interface EditResult {
  value: string
  selection: Selection
}

/* ------------------------------------------------------------------ *
 * Inline formats (wrap with prefix/suffix)
 * ------------------------------------------------------------------ */

const INLINE_WRAP: Record<MarkdownInlineFormat, { prefix: string; suffix: string; placeholder: string }> = {
  bold: { prefix: '**', suffix: '**', placeholder: 'gras' },
  italic: { prefix: '_', suffix: '_', placeholder: 'italique' },
  strikethrough: { prefix: '~~', suffix: '~~', placeholder: 'barré' },
  code: { prefix: '`', suffix: '`', placeholder: 'code' },
  link: { prefix: '[', suffix: '](url)', placeholder: 'texte du lien' },
  underline: { prefix: '<u>', suffix: '</u>', placeholder: 'souligné' },
}

export function applyInlineFormat(
  value: string,
  selection: Selection,
  format: MarkdownInlineFormat
): EditResult {
  const { prefix, suffix, placeholder } = INLINE_WRAP[format]
  const { start, end } = selection
  const selectedText = value.substring(start, end)

  if (selectedText) {
    // Wrap the selected text
    const newValue =
      value.substring(0, start) + prefix + selectedText + suffix + value.substring(end)
    return {
      value: newValue,
      selection: { start: start + prefix.length, end: end + prefix.length },
    }
  }

  // No selection — insert placeholder and select it
  const insertion = prefix + placeholder + suffix
  const newValue = value.substring(0, start) + insertion + value.substring(end)
  return {
    value: newValue,
    selection: {
      start: start + prefix.length,
      end: start + prefix.length + placeholder.length,
    },
  }
}

/**
 * Toggle an inline format: if the selection is already wrapped, unwrap it.
 * Otherwise, wrap it. This mimics Notion / Bear behavior.
 */
export function toggleInlineFormat(
  value: string,
  selection: Selection,
  format: MarkdownInlineFormat
): EditResult {
  const { prefix, suffix } = INLINE_WRAP[format]
  const { start, end } = selection

  // Expand to check if surrounding text already has the format
  const before = value.substring(Math.max(0, start - prefix.length), start)
  const after = value.substring(end, end + suffix.length)

  if (before === prefix && after === suffix) {
    // Already wrapped → unwrap
    const newValue =
      value.substring(0, start - prefix.length) +
      value.substring(start, end) +
      value.substring(end + suffix.length)
    return {
      value: newValue,
      selection: { start: start - prefix.length, end: end - prefix.length },
    }
  }

  // Not wrapped → apply
  return applyInlineFormat(value, selection, format)
}

/* ------------------------------------------------------------------ *
 * Block formats (line-based: headings, lists, etc.)
 * ------------------------------------------------------------------ */

const BLOCK_PREFIX: Record<MarkdownBlockFormat, string> = {
  h1: '# ',
  h2: '## ',
  h3: '### ',
  h4: '#### ',
  h5: '##### ',
  h6: '###### ',
  blockquote: '> ',
  'unordered-list': '- ',
  'ordered-list': '1. ',
  todo: '- [ ] ',
  'code-block': '```',
  'horizontal-rule': '\n---\n',
}

export function applyBlockFormat(
  value: string,
  selection: Selection,
  format: MarkdownBlockFormat
): EditResult {
  const prefix = BLOCK_PREFIX[format]

  // Special case: code block (multi-line)
  if (format === 'code-block') {
    return applyCodeBlock(value, selection)
  }

  // Special case: horizontal rule (insert on its own line)
  if (format === 'horizontal-rule') {
    return applyHorizontalRule(value, selection)
  }

  const { start } = selection
  const lineStart = findLineStart(value, start)
  const lineEnd = findLineEnd(value, start)
  const lineText = value.substring(lineStart, lineEnd)

  // Check if line already has a block prefix → toggle it off
  const existingPrefix = detectBlockPrefix(lineText)
  if (existingPrefix) {
    // Remove existing prefix
    const newValue =
      value.substring(0, lineStart) +
      lineText.substring(existingPrefix.length) +
      value.substring(lineEnd)
    return {
      value: newValue,
      selection: { start: lineStart, end: lineStart + lineText.length - existingPrefix.length },
    }
  }

  // Apply prefix
  const newValue =
    value.substring(0, lineStart) + prefix + lineText + value.substring(lineEnd)
  return {
    value: newValue,
    selection: {
      start: lineStart + prefix.length,
      end: lineStart + prefix.length + lineText.length,
    },
  }
}

/* ------------------------------------------------------------------ *
 * Checkbox toggle (todo items)
 * ------------------------------------------------------------------ */

/**
 * Toggle the checkbox state at the given cursor position.
 * Returns the new value + selection.
 */
export function toggleCheckbox(
  value: string,
  position: number
): EditResult {
  const lineStart = findLineStart(value, position)
  const lineEnd = findLineEnd(value, position)
  const lineText = value.substring(lineStart, lineEnd)

  // Match: - [ ] or - [x] (with optional leading whitespace)
  const match = lineText.match(/^(\s*)([-*+])\s\[( |x|X)\]\s/)
  if (!match) {
    // Not a checkbox line → convert to todo
    return applyBlockFormat(value, { start: position, end: position }, 'todo')
  }

  const [full, indent, bullet, check] = match
  const isChecked = check !== ' '
  const newCheck = isChecked ? ' ' : 'x'
  const newLineText =
    indent + bullet + ' [' + newCheck + '] ' + lineText.substring(full.length)

  const newValue = value.substring(0, lineStart) + newLineText + value.substring(lineEnd)
  return {
    value: newValue,
    selection: { start: position, end: position },
  }
}

/* ------------------------------------------------------------------ *
 * Special blocks
 * ------------------------------------------------------------------ */

function applyCodeBlock(value: string, selection: Selection): EditResult {
  const { start, end } = selection
  const selectedText = value.substring(start, end)

  if (selectedText) {
    // Wrap the selected text in ```
    const insertion = '\n```\n' + selectedText + '\n```\n'
    const newValue = value.substring(0, start) + insertion + value.substring(end)
    return {
      value: newValue,
      selection: { start: start + 5, end: start + 5 + selectedText.length },
    }
  }

  // Empty code block
  const insertion = '\n```\n' + 'code ici' + '\n```\n'
  const newValue = value.substring(0, start) + insertion + value.substring(end)
  return {
    value: newValue,
    selection: { start: start + 6, end: start + 6 + 'code ici'.length },
  }
}

function applyHorizontalRule(value: string, selection: Selection): EditResult {
  const { start } = selection
  const lineStart = findLineStart(value, start)
  const lineEnd = findLineEnd(value, start)
  const lineText = value.substring(lineStart, lineEnd)

  // Insert on its own line, with blank lines around
  const needsNewlineBefore = lineStart > 0 && value[lineStart - 1] !== '\n'
  const needsNewlineAfter = lineEnd < value.length && value[lineEnd] !== '\n'

  const insertion =
    (needsNewlineBefore ? '\n' : '') +
    '---' +
    (needsNewlineAfter ? '\n' : '')

  const newValue = value.substring(0, lineStart) + insertion + value.substring(lineEnd)
  const cursorPos = lineStart + insertion.length
  return {
    value: newValue,
    selection: { start: cursorPos, end: cursorPos },
  }
}

/* ------------------------------------------------------------------ *
 * Selection helpers
 * ------------------------------------------------------------------ */

export function findLineStart(value: string, position: number): number {
  let i = position
  while (i > 0 && value[i - 1] !== '\n') i--
  return i
}

export function findLineEnd(value: string, position: number): number {
  let i = position
  while (i < value.length && value[i] !== '\n') i++
  return i
}

export function getCurrentLine(value: string, position: number): string {
  return value.substring(findLineStart(value, position), findLineEnd(value, position))
}

export function detectBlockPrefix(line: string): string | null {
  // Headings
  const h = line.match(/^(#{1,6}\s)/)
  if (h) return h[1]
  // Blockquote
  if (/^>\s/.test(line)) return '> '
  // Unordered list
  if (/^[-*+]\s/.test(line)) return '- '
  // Ordered list
  if (/^\d+\.\s/.test(line)) {
    const m = line.match(/^(\d+\.\s)/)
    return m ? m[1] : null
  }
  // Checkbox
  if (/^[-*+]\s\[( |x|X)\]\s/.test(line)) {
    const m = line.match(/^([-*+]\s\[( |x|X)\]\s)/)
    return m ? m[1] : null
  }
  return null
}

/* ------------------------------------------------------------------ *
 * List manipulation (continue lists, indent, dedent)
 * ------------------------------------------------------------------ */

/**
 * Continue a list: when the user presses Enter on a list item,
 * add a new list item on the next line.
 */
export function continueList(value: string, position: number): EditResult {
  const lineStart = findLineStart(value, position)
  const lineText = value.substring(lineStart, position)

  // Unordered list
  const ulMatch = lineText.match(/^(\s*)([-*+])\s/)
  if (ulMatch) {
    const [, indent, bullet] = ulMatch
    // If the line is empty (just the bullet), remove the bullet instead
    if (lineText.substring(ulMatch[0].length).trim() === '') {
      const newValue = value.substring(0, lineStart) + value.substring(position)
      return {
        value: newValue,
        selection: { start: lineStart, end: lineStart },
      }
    }
    // Continue with a new bullet
    const insertion = '\n' + indent + bullet + ' '
    const newValue = value.substring(0, position) + insertion + value.substring(position)
    const newPos = position + insertion.length
    return {
      value: newValue,
      selection: { start: newPos, end: newPos },
    }
  }

  // Ordered list
  const olMatch = lineText.match(/^(\s*)(\d+)\.\s/)
  if (olMatch) {
    const [, indent, num] = olMatch
    if (lineText.substring(olMatch[0].length).trim() === '') {
      const newValue = value.substring(0, lineStart) + value.substring(position)
      return {
        value: newValue,
        selection: { start: lineStart, end: lineStart },
      }
    }
    const nextNum = parseInt(num, 10) + 1
    const insertion = '\n' + indent + nextNum + '. '
    const newValue = value.substring(0, position) + insertion + value.substring(position)
    const newPos = position + insertion.length
    return {
      value: newValue,
      selection: { start: newPos, end: newPos },
    }
  }

  // Checkbox list
  const todoMatch = lineText.match(/^(\s*)([-*+])\s\[( |x|X)\]\s/)
  if (todoMatch) {
    const [, indent, bullet] = todoMatch
    if (lineText.substring(todoMatch[0].length).trim() === '') {
      const newValue = value.substring(0, lineStart) + value.substring(position)
      return {
        value: newValue,
        selection: { start: lineStart, end: lineStart },
      }
    }
    const insertion = '\n' + indent + bullet + ' [ ] '
    const newValue = value.substring(0, position) + insertion + value.substring(position)
    const newPos = position + insertion.length
    return {
      value: newValue,
      selection: { start: newPos, end: newPos },
    }
  }

  // Blockquote
  const bqMatch = lineText.match(/^(\s*)>\s/)
  if (bqMatch) {
    const [, indent] = bqMatch
    if (lineText.substring(bqMatch[0].length).trim() === '') {
      const newValue = value.substring(0, lineStart) + value.substring(position)
      return {
        value: newValue,
        selection: { start: lineStart, end: lineStart },
      }
    }
    const insertion = '\n' + indent + '> '
    const newValue = value.substring(0, position) + insertion + value.substring(position)
    const newPos = position + insertion.length
    return {
      value: newValue,
      selection: { start: newPos, end: newPos },
    }
  }

  // Default: just insert a newline
  const insertion = '\n'
  const newValue = value.substring(0, position) + insertion + value.substring(position)
  const newPos = position + insertion.length
  return {
    value: newValue,
    selection: { start: newPos, end: newPos },
  }
}

/**
 * Indent the current line(s) by 2 spaces (for nested lists).
 */
export function indentLine(value: string, selection: Selection): EditResult {
  const { start, end } = selection
  const firstLineStart = findLineStart(value, start)
  const lastLineEnd = findLineEnd(value, end)

  const lines = value.substring(firstLineStart, lastLineEnd).split('\n')
  const indented = lines.map((line) => '  ' + line).join('\n')

  const newValue =
    value.substring(0, firstLineStart) + indented + value.substring(lastLineEnd)

  return {
    value: newValue,
    selection: {
      start: start + 2,
      end: end + 2 * lines.length,
    },
  }
}

/**
 * Dedent the current line(s) by 2 spaces (for nested lists).
 */
export function dedentLine(value: string, selection: Selection): EditResult {
  const { start, end } = selection
  const firstLineStart = findLineStart(value, start)
  const lastLineEnd = findLineEnd(value, end)

  const lines = value.substring(firstLineStart, lastLineEnd).split('\n')
  let removedChars = 0
  let firstLineRemoved = 0
  const dedented = lines.map((line, i) => {
    if (line.startsWith('  ')) {
      const removed = 2
      if (i === 0) firstLineRemoved = removed
      removedChars += removed
      return line.substring(removed)
    } else if (line.startsWith(' ')) {
      const removed = 1
      if (i === 0) firstLineRemoved = removed
      removedChars += removed
      return line.substring(removed)
    }
    return line
  }).join('\n')

  const newValue =
    value.substring(0, firstLineStart) + dedented + value.substring(lastLineEnd)

  return {
    value: newValue,
    selection: {
      start: Math.max(firstLineStart, start - firstLineRemoved),
      end: Math.max(firstLineStart, end - removedChars),
    },
  }
}

/* ------------------------------------------------------------------ *
 * Insertion helpers
 * ------------------------------------------------------------------ */

export function insertText(
  value: string,
  selection: Selection,
  text: string
): EditResult {
  const { start, end } = selection
  const newValue = value.substring(0, start) + text + value.substring(end)
  const newPos = start + text.length
  return {
    value: newValue,
    selection: { start: newPos, end: newPos },
  }
}

export function insertAtCursor(
  value: string,
  position: number,
  text: string
): EditResult {
  const newValue = value.substring(0, position) + text + value.substring(position)
  const newPos = position + text.length
  return {
    value: newValue,
    selection: { start: newPos, end: newPos },
  }
}

/**
 * Insert text and preserve the cursor at a specific position within the
 * inserted text (marked by a placeholder {{cursor}}).
 */
export function insertWithCursorPlaceholder(
  value: string,
  position: number,
  template: string
): EditResult {
  const placeholder = '{{cursor}}'
  const cursorIdx = template.indexOf(placeholder)
  const cleanTemplate = template.replace(placeholder, '')

  const newValue = value.substring(0, position) + cleanTemplate + value.substring(position)
  const cursorPos = position + (cursorIdx >= 0 ? cursorIdx : cleanTemplate.length)

  return {
    value: newValue,
    selection: { start: cursorPos, end: cursorPos },
  }
}

/* ------------------------------------------------------------------ *
 * Format dispatch (single entry point)
 * ------------------------------------------------------------------ */

export function applyFormat(
  value: string,
  selection: Selection,
  format: MarkdownFormat
): EditResult {
  if (format in INLINE_WRAP) {
    return toggleInlineFormat(value, selection, format as MarkdownInlineFormat)
  }
  return applyBlockFormat(value, selection, format as MarkdownBlockFormat)
}

/* ------------------------------------------------------------------ *
 * Markdown export
 * ------------------------------------------------------------------ */

/**
 * Strip markdown syntax to get plain text.
 */
export function markdownToPlainText(markdown: string): string {
  return markdown
    // Remove headings
    .replace(/^#{1,6}\s+/gm, '')
    // Remove bold/italic
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    // Remove strikethrough
    .replace(/~~([^~]+)~~/g, '$1')
    // Remove inline code
    .replace(/`([^`]+)`/g, '$1')
    // Remove code blocks
    .replace(/```[\s\S]*?```/g, '[code]')
    // Remove links, keep text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove images
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    // Remove blockquotes
    .replace(/^>\s+/gm, '')
    // Remove list markers
    .replace(/^\s*[-*+]\s/gm, '')
    .replace(/^\s*\d+\.\s/gm, '')
    // Remove checkboxes
    .replace(/^\s*[-*+]\s\[[ xX]\]\s/gm, '')
    // Remove horizontal rules
    .replace(/^---+$/gm, '')
    // Collapse multiple newlines
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/* ------------------------------------------------------------------ *
 * Statistics
 * ------------------------------------------------------------------ */

export function countWords(text: string): number {
  const plain = markdownToPlainText(text)
  if (!plain.trim()) return 0
  return plain.split(/\s+/).filter(Boolean).length
}

export function countLines(text: string): number {
  if (!text) return 0
  return text.split('\n').length
}

export function readingTime(text: string, wordsPerMinute = 200): number {
  const words = countWords(text)
  return Math.max(1, Math.ceil(words / wordsPerMinute))
}