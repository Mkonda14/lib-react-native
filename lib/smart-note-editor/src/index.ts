/**
 * @your-org/smart-note-editor — Public API
 * ==========================================
 *
 * Complete markdown editor for React Native with live rendering,
 * formatting toolbar, undo/redo, AI streaming, and auto-save.
 *
 * Quick usage:
 *
 *   import { SmartNoteEditor } from '@your-org/smart-note-editor'
 *
 *   <SmartNoteEditor
 *     defaultValue="# Ma note"
 *     placeholder="Écrivez ici…"
 *     showToolbar
 *     toolbarPosition="keyboard"
 *     enableHistory
 *     onValueChange={(v) => console.log(v)}
 *   />
 */

// Main component
export { SmartNoteEditor } from './smart-note-editor'

// Toolbar + accessory
export { Toolbar } from './components/toolbar'
export { KeyboardAccessory } from './components/keyboard-accessory'

// Hooks
export { useNoteEditor } from './hooks/use-note-editor'
export { useMarkdownActions } from './hooks/use-markdown-actions'
export { useHistory } from './hooks/use-history'
export { useSelection } from './hooks/use-selection'
export { useKeyboard } from './hooks/use-keyboard'

// Markdown utilities
export {
  applyFormat,
  applyInlineFormat,
  toggleInlineFormat,
  applyBlockFormat,
  toggleCheckbox,
  continueList,
  indentLine,
  dedentLine,
  insertText,
  insertAtCursor,
  insertWithCursorPlaceholder,
  findLineStart,
  findLineEnd,
  getCurrentLine,
  detectBlockPrefix,
  markdownToPlainText,
  countWords,
  countLines,
  readingTime,
  type EditResult,
} from './utils/markdown'

// Parser utilities
export {
  parseMarkdown,
  detectActiveBlockFormat,
  detectActiveInlineFormats,
  extractTOC,
  extractCheckboxes,
  getCheckboxProgress,
  type ParsedDocument,
  type ParsedLine,
  type LineType,
  type TOCEntry,
  type CheckboxEntry,
} from './utils/parser'

// Themes
export { LIGHT_THEME, DARK_THEME } from './types'

// Types
export type {
  SmartNoteEditorProps,
  SmartNoteEditorRef,
  EditorTheme,
  MarkdownFormat,
  MarkdownInlineFormat,
  MarkdownBlockFormat,
  Selection,
  EditorSnapshot,
  NoteEditorState,
  EditorStats,
  AIMarkdownChunk,
  AIMarkdownOptions,
  ToolbarProps,
  ToolbarButton,
} from './types'
