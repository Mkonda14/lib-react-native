/**
 * SmartNoteEditor — Type definitions
 * ===================================
 */

import type { ReactNode } from 'react'
import type { TextStyle, ViewStyle, StyleProp } from 'react-native'
import type { MarkdownStyle } from '@expensify/react-native-live-markdown'

/* ------------------------------------------------------------------ *
 * Markdown types
 * ------------------------------------------------------------------ */

export type MarkdownInlineFormat =
  | 'bold'
  | 'italic'
  | 'strikethrough'
  | 'code'
  | 'link'
  | 'underline'

export type MarkdownBlockFormat =
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'h5'
  | 'h6'
  | 'blockquote'
  | 'unordered-list'
  | 'ordered-list'
  | 'todo'
  | 'code-block'
  | 'horizontal-rule'

export type MarkdownFormat = MarkdownInlineFormat | MarkdownBlockFormat

export interface Selection {
  start: number
  end: number
}

export interface EditorSnapshot {
  value: string
  selection: Selection
  timestamp: number
}

/* ------------------------------------------------------------------ *
 * Editor state
 * ------------------------------------------------------------------ */

export interface NoteEditorState {
  /** Current text content. */
  value: string
  /** Current selection. */
  selection: Selection
  /** Whether editor is focused. */
  isFocused: boolean
  /** Whether editor is read-only. */
  isReadOnly: boolean
  /** Word count. */
  wordCount: number
  /** Character count. */
  charCount: number
  /** Whether undo is available. */
  canUndo: boolean
  /** Whether redo is available. */
  canRedo: boolean
  /** Whether AI markdown is being streamed. */
  isStreaming: boolean
}

/* ------------------------------------------------------------------ *
 * AI integration
 * ------------------------------------------------------------------ */

export interface AIMarkdownChunk {
  /** Chunk of markdown text. */
  text: string
  /** Whether this is the final chunk. */
  done?: boolean
}

export interface AIMarkdownOptions {
  /** Replace entire content (default: append at cursor). */
  mode?: 'replace' | 'append' | 'insert'
  /** Streaming speed (ms per chunk). */
  typingSpeed?: number
  /** Whether to scroll to the streaming position. */
  autoScroll?: boolean
  /** Called when streaming is complete. */
  onComplete?: () => void
}

/* ------------------------------------------------------------------ *
 * Toolbar
 * ------------------------------------------------------------------ */

export interface ToolbarButton {
  /** Format identifier. */
  format: MarkdownFormat
  /** Icon (emoji or ReactNode). */
  icon: ReactNode | string
  /** Tooltip/label for accessibility. */
  label: string
  /** Whether this button is active (selection is in this format). */
  active?: boolean
  /** Whether this button is disabled. */
  disabled?: boolean
}

export interface ToolbarProps {
  /** Visible format buttons. */
  buttons?: MarkdownFormat[]
  /** Custom button render. */
  renderButton?: (button: ToolbarButton, onPress: () => void) => ReactNode
  /** Style. */
  style?: StyleProp<ViewStyle>
  /** Dark theme. */
  dark?: boolean
  /** Called when a button is pressed (override default). */
  onButtonPress?: (format: MarkdownFormat) => void
}

/* ------------------------------------------------------------------ *
 * SmartNoteEditor props
 * ------------------------------------------------------------------ */

export interface SmartNoteEditorProps {
  /** Initial value. */
  defaultValue?: string
  /** Controlled value. */
  value?: string
  /** Called on every change. */
  onValueChange?: (value: string) => void
  /** Called when user stops typing (debounced). */
  onDebouncedChange?: (value: string) => void
  /** Debounce delay in ms (default 500). */
  debounceMs?: number
  /** Placeholder. */
  placeholder?: string
  /** Read-only. */
  editable?: boolean
  /** Auto-focus on mount. */
  autoFocus?: boolean
  /** Show toolbar. */
  showToolbar?: boolean
  /** Toolbar position. */
  toolbarPosition?: 'top' | 'bottom' | 'floating' | 'keyboard'
  /** Toolbar buttons (default: all). */
  toolbarButtons?: MarkdownFormat[]
  /** Max length. */
  maxLength?: number
  /** Style. */
  style?: StyleProp<ViewStyle>
  /** Text style. */
  textStyle?: StyleProp<TextStyle>
  /** Markdown style overrides. */
  markdownStyle?: Partial<MarkdownStyle>
  /** Dark theme. */
  dark?: boolean
  /** Custom theme. */
  theme?: Partial<EditorTheme>
  /** Accessibility label. */
  accessibilityLabel?: string
  /** Test ID. */
  testID?: string
  /** Enable undo/redo. */
  enableHistory?: boolean
  /** Max history entries. */
  maxHistory?: number
  /** Auto-save key (AsyncStorage). */
  autoSaveKey?: string
  /** Auto-save debounce in ms. */
  autoSaveDebounce?: number
  /** Children rendered below the editor. */
  children?: ReactNode
  /** Custom toolbar (replaces default). */
  renderToolbar?: () => ReactNode
  /** AI streaming source (returns an async iterator). */
  aiSource?: (prompt: string) => AsyncIterable<AIMarkdownChunk>
  /** Whether AI is enabled (shows AI button). */
  enableAI?: boolean
  /** AI prompt builder (called when user taps AI button). */
  buildAIPrompt?: (context: string) => string
  /** Called when AI streaming starts. */
  onAIStart?: () => void
  /** Called when AI streaming ends. */
  onAIComplete?: () => void
}

/* ------------------------------------------------------------------ *
 * Theme
 * ------------------------------------------------------------------ */

export interface EditorTheme {
  backgroundColor: string
  textColor: string
  placeholderColor: string
  cursorColor: string
  selectionColor: string
  toolbarBackgroundColor: string
  toolbarButtonColor: string
  toolbarActiveButtonColor: string
  toolbarButtonBg: string
  toolbarActiveButtonBg: string
  dividerColor: string
  // Markdown element styles
  h1Color: string
  h2Color: string
  h3Color: string
  boldColor: string
  italicColor: string
  strikethroughColor: string
  codeColor: string
  codeBgColor: string
  linkColor: string
  blockquoteColor: string
  blockquoteBorderColor: string
  listBulletColor: string
  checkboxColor: string
}

export const LIGHT_THEME: EditorTheme = {
  backgroundColor: '#FFFFFF',
  textColor: '#18181B',
  placeholderColor: '#A1A1AA',
  cursorColor: '#6366F1',
  selectionColor: 'rgba(99, 102, 241, 0.25)',
  toolbarBackgroundColor: '#F9FAFB',
  toolbarButtonColor: '#52525B',
  toolbarActiveButtonColor: '#6366F1',
  toolbarButtonBg: 'transparent',
  toolbarActiveButtonBg: 'rgba(99, 102, 241, 0.12)',
  dividerColor: '#E4E4E7',
  h1Color: '#18181B',
  h2Color: '#18181B',
  h3Color: '#27272A',
  boldColor: '#18181B',
  italicColor: '#52525B',
  strikethroughColor: '#A1A1AA',
  codeColor: '#BE185D',
  codeBgColor: '#F4F4F5',
  linkColor: '#6366F1',
  blockquoteColor: '#52525B',
  blockquoteBorderColor: '#D4D4D8',
  listBulletColor: '#6366F1',
  checkboxColor: '#6366F1',
}

export const DARK_THEME: EditorTheme = {
  backgroundColor: '#18181B',
  textColor: '#FAFAFA',
  placeholderColor: '#71717A',
  cursorColor: '#818CF8',
  selectionColor: 'rgba(129, 140, 248, 0.3)',
  toolbarBackgroundColor: '#27272A',
  toolbarButtonColor: '#A1A1AA',
  toolbarActiveButtonColor: '#818CF8',
  toolbarButtonBg: 'transparent',
  toolbarActiveButtonBg: 'rgba(129, 140, 248, 0.15)',
  dividerColor: '#3F3F46',
  h1Color: '#FAFAFA',
  h2Color: '#FAFAFA',
  h3Color: '#E4E4E7',
  boldColor: '#FAFAFA',
  italicColor: '#D4D4D8',
  strikethroughColor: '#71717A',
  codeColor: '#F472B6',
  codeBgColor: '#3F3F46',
  linkColor: '#818CF8',
  blockquoteColor: '#D4D4D8',
  blockquoteBorderColor: '#52525B',
  listBulletColor: '#818CF8',
  checkboxColor: '#818CF8',
}

/* ------------------------------------------------------------------ *
 * Ref API
 * ------------------------------------------------------------------ */

export interface SmartNoteEditorRef {
  /** Focus the editor. */
  focus: () => void
  /** Blur the editor. */
  blur: () => void
  /** Insert text at cursor position. */
  insertText: (text: string) => void
  /** Wrap selected text with prefix/suffix. */
  wrapSelection: (prefix: string, suffix?: string) => void
  /** Apply a markdown format. */
  format: (format: MarkdownFormat) => void
  /** Get the current value. */
  getValue: () => string
  /** Set the value. */
  setValue: (value: string) => void
  /** Get the current selection. */
  getSelection: () => Selection
  /** Set the selection. */
  setSelection: (selection: Selection) => void
  /** Undo. */
  undo: () => void
  /** Redo. */
  redo: () => void
  /** Clear all content. */
  clear: () => void
  /** Insert AI markdown (streamed). */
  insertAIMarkdown: (
    markdown: string | AsyncIterable<AIMarkdownChunk>,
    options?: AIMarkdownOptions
  ) => Promise<void>
  /** Export as markdown. */
  exportMarkdown: () => string
  /** Export as plain text. */
  exportPlainText: () => string
  /** Get stats (word count, char count, reading time). */
  getStats: () => EditorStats
}

export interface EditorStats {
  wordCount: number
  charCount: number
  lineCount: number
  readingTimeMinutes: number
}