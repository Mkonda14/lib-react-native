/**
 * Markdown parser — extract structure from markdown text
 * =======================================================
 * Used for:
 *  - Detecting active format at cursor (for toolbar state)
 *  - Listing all checkboxes
 *  - Generating table of contents
 */

import type { Selection, MarkdownFormat, MarkdownBlockFormat, MarkdownInlineFormat } from '../types'

/* ------------------------------------------------------------------ *
 * Line types
 * ------------------------------------------------------------------ */

export type LineType =
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'h5'
  | 'h6'
  | 'blockquote'
  | 'unordered-list'
  | 'ordered-list'
  | 'todo-checked'
  | 'todo-unchecked'
  | 'code-block-start'
  | 'code-block-end'
  | 'code-block-content'
  | 'horizontal-rule'
  | 'paragraph'
  | 'blank'

export interface ParsedLine {
  type: LineType
  content: string
  rawContent: string
  start: number
  end: number
  /** Indent level (number of leading spaces / 2). */
  indent: number
  /** For lists: the bullet/number prefix. */
  prefix?: string
  /** For ordered lists: the number. */
  number?: number
  /** For todo items: whether checked. */
  checked?: boolean
}

export interface ParsedDocument {
  lines: ParsedLine[]
  /** Whether we're inside a code block. */
  inCodeBlock: boolean
}

export function parseMarkdown(text: string): ParsedDocument {
  const lines = text.split('\n')
  const parsed: ParsedLine[] = []
  let offset = 0
  let inCodeBlock = false

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]
    const start = offset
    const end = offset + raw.length
    const indent = Math.floor((raw.match(/^\s*/) ?? [''])[0].length / 2)
    const trimmed = raw.trim()

    let type: LineType = 'paragraph'
    let prefix: string | undefined
    let number: number | undefined
    let checked: boolean | undefined

    if (inCodeBlock) {
      if (trimmed.startsWith('```')) {
        type = 'code-block-end'
        inCodeBlock = false
      } else {
        type = 'code-block-content'
      }
    } else if (trimmed === '') {
      type = 'blank'
    } else if (trimmed.startsWith('```')) {
      type = 'code-block-start'
      inCodeBlock = true
    } else if (/^#{1}\s/.test(trimmed)) {
      type = 'h1'
      prefix = trimmed.match(/^(#{1}\s)/)?.[1]
    } else if (/^#{2}\s/.test(trimmed)) {
      type = 'h2'
      prefix = trimmed.match(/^(#{2}\s)/)?.[1]
    } else if (/^#{3}\s/.test(trimmed)) {
      type = 'h3'
      prefix = trimmed.match(/^(#{3}\s)/)?.[1]
    } else if (/^#{4}\s/.test(trimmed)) {
      type = 'h4'
      prefix = trimmed.match(/^(#{4}\s)/)?.[1]
    } else if (/^#{5}\s/.test(trimmed)) {
      type = 'h5'
      prefix = trimmed.match(/^(#{5}\s)/)?.[1]
    } else if (/^#{6}\s/.test(trimmed)) {
      type = 'h6'
      prefix = trimmed.match(/^(#{6}\s)/)?.[1]
    } else if (/^>\s/.test(trimmed)) {
      type = 'blockquote'
      prefix = trimmed.match(/^(>\s)/)?.[1]
    } else if (/^[-*+]\s\[\s\]\s/.test(trimmed)) {
      type = 'todo-unchecked'
      checked = false
      prefix = trimmed.match(/^([-*+]\s\[\s\]\s)/)?.[1]
    } else if (/^[-*+]\s\[[xX]\]\s/.test(trimmed)) {
      type = 'todo-checked'
      checked = true
      prefix = trimmed.match(/^([-*+]\s\[[xX]\]\s)/)?.[1]
    } else if (/^[-*+]\s/.test(trimmed)) {
      type = 'unordered-list'
      prefix = trimmed.match(/^([-*+]\s)/)?.[1]
    } else if (/^\d+\.\s/.test(trimmed)) {
      type = 'ordered-list'
      const m = trimmed.match(/^(\d+)\.\s/)
      prefix = m?.[1] + '. '
      number = m ? parseInt(m[1], 10) : undefined
    } else if (/^-{3,}$/.test(trimmed) || /^\*{3,}$/.test(trimmed)) {
      type = 'horizontal-rule'
    }

    parsed.push({
      type,
      content: prefix ? trimmed.substring(prefix.length) : trimmed,
      rawContent: raw,
      start,
      end,
      indent,
      prefix,
      number,
      checked,
    })

    offset = end + 1 // +1 for the newline
  }

  return { lines: parsed, inCodeBlock }
}

/* ------------------------------------------------------------------ *
 * Active formats at cursor
 * ------------------------------------------------------------------ */

/**
 * Detect which block format is active at the current cursor position.
 * Returns the format, or null if the line is a paragraph.
 */
export function detectActiveBlockFormat(
  text: string,
  selection: Selection
): MarkdownBlockFormat | null {
  const pos = selection.start
  const doc = parseMarkdown(text)
  const line = doc.lines.find((l) => pos >= l.start && pos <= l.end + 1)

  if (!line) return null

  switch (line.type) {
    case 'h1': return 'h1'
    case 'h2': return 'h2'
    case 'h3': return 'h3'
    case 'h4': return 'h4'
    case 'h5': return 'h5'
    case 'h6': return 'h6'
    case 'blockquote': return 'blockquote'
    case 'unordered-list': return 'unordered-list'
    case 'ordered-list': return 'ordered-list'
    case 'todo-checked':
    case 'todo-unchecked': return 'todo'
    case 'code-block-start':
    case 'code-block-end':
    case 'code-block-content': return 'code-block'
    default: return null
  }
}

/**
 * Detect which inline formats are active at the current cursor position.
 * (e.g., cursor inside a **bold** text)
 */
export function detectActiveInlineFormats(
  text: string,
  selection: Selection
): MarkdownInlineFormat[] {
  const { start, end } = selection
  const pos = start === end ? start : start
  const formats: MarkdownInlineFormat[] = []

  // Check surrounding for bold (2 chars before/after)
  if (
    pos >= 2 &&
    text.substring(pos - 2, pos) === '**' &&
    isPaired(text, pos, '**', '**')
  ) {
    formats.push('bold')
  }

  // Italic (single underscore, not preceded by another underscore)
  if (
    pos >= 1 &&
    text[pos - 1] === '_' &&
    text[pos - 2] !== '_' &&
    isPaired(text, pos, '_', '_')
  ) {
    formats.push('italic')
  }

  // Strikethrough
  if (
    pos >= 2 &&
    text.substring(pos - 2, pos) === '~~' &&
    isPaired(text, pos, '~~', '~~')
  ) {
    formats.push('strikethrough')
  }

  // Inline code
  if (
    pos >= 1 &&
    text[pos - 1] === '`' &&
    text[pos - 2] !== '`' &&
    isPaired(text, pos, '`', '`')
  ) {
    formats.push('code')
  }

  return formats
}


/**
 * Check if the cursor at `pos` is inside a paired marker.
 * Walks backward to find the opening marker.
 */
function isPaired(
  text: string,
  pos: number,
  openMarker: string,
  closeMarker: string
): boolean {
  // Walk backward to find the opening marker
  let depth = 0
  let i = pos - openMarker.length
  while (i >= 0) {
    if (text.substring(i, i + openMarker.length) === openMarker) {
      depth++
      i -= openMarker.length
      continue
    }
    if (text.substring(i, i + closeMarker.length) === closeMarker) {
      depth--
      i -= closeMarker.length
      continue
    }
    i--
  }
  return depth > 0
}

/* ------------------------------------------------------------------ *
 * Table of contents
 * ------------------------------------------------------------------ */

export interface TOCEntry {
  level: number // 1-6 for headings
  text: string
  position: number // start offset in the document
}

export function extractTOC(text: string): TOCEntry[] {
  const doc = parseMarkdown(text)
  const toc: TOCEntry[] = []
  for (const line of doc.lines) {
    const levelMatch = line.type.match(/^h(\d)$/)
    if (levelMatch) {
      toc.push({
        level: parseInt(levelMatch[1], 10),
        text: line.content,
        position: line.start,
      })
    }
  }
  return toc
}

/* ------------------------------------------------------------------ *
 * Checkbox extraction
 * ------------------------------------------------------------------ */

export interface CheckboxEntry {
  position: number
  checked: boolean
  text: string
}

export function extractCheckboxes(text: string): CheckboxEntry[] {
  const doc = parseMarkdown(text)
  return doc.lines
    .filter((l) => l.type === 'todo-checked' || l.type === 'todo-unchecked')
    .map((l) => ({
      position: l.start,
      checked: l.checked ?? false,
      text: l.content,
    }))
}

/**
 * Get the progress of checkboxes (e.g. "3/5 done").
 */
export function getCheckboxProgress(text: string): { done: number; total: number; percentage: number } {
  const checkboxes = extractCheckboxes(text)
  const total = checkboxes.length
  const done = checkboxes.filter((c) => c.checked).length
  return {
    done,
    total,
    percentage: total === 0 ? 0 : Math.round((done / total) * 100),
  }
}