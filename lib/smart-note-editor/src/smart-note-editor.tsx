/**
 * SmartNoteEditor — main component
 * ==================================
 * A complete, production-ready markdown editor for React Native
 * powered by @expensify/react-native-live-markdown.
 *
 * Features:
 *  - Live markdown rendering (formats as you type)
 *  - Formatting toolbar (bold, italic, headings, lists, checkboxes, etc.)
 *  - Undo/redo (history)
 *  - AI markdown streaming (insert AI-generated text)
 *  - Auto-save (AsyncStorage)
 *  - Debounced change
 *  - Keyboard accessory toolbar (iOS native + Android fallback)
 *  - Selection-aware formatting (wrap selected text)
 *  - Checkbox toggle
 *  - Word/char count + reading time
 *  - Dark/light theme
 *  - Imperative ref API
 *
 * @example
 *   const ref = useRef<SmartNoteEditorRef>(null)
 *
 *   <SmartNoteEditor
 *     ref={ref}
 *     defaultValue="# Ma note"
 *     placeholder="Commencez à écrire…"
 *     showToolbar
 *     toolbarPosition="keyboard"
 *     enableHistory
 *     onValueChange={(v) => console.log(v)}
 *     aiSource={async function* (prompt) {
 *       const res = await fetch('/api/ai', { method: 'POST', body: JSON.stringify({ prompt }) })
 *       const reader = res.body!.getReader()
 *       while (true) {
 *         const { done, value } = await reader.read()
 *         if (done) break
 *         yield { text: new TextDecoder().decode(value) }
 *       }
 *       yield { text: '', done: true }
 *     }}
 *   />
 */

import * as React from 'react'
import {
  View,
  StyleSheet,
  StyleProp,
  ViewStyle,
  TextStyle,
  Platform,
  Keyboard,
} from 'react-native'
import { MarkdownTextInput, parseExpensiMark } from '@expensify/react-native-live-markdown'
import type { MarkdownStyle } from '@expensify/react-native-live-markdown'

import { Toolbar } from './components/toolbar'
import { KeyboardAccessory } from './components/keyboard-accessory'
import { useNoteEditor } from './hooks/use-note-editor'
import { detectActiveBlockFormat, detectActiveInlineFormats } from './utils/parser'
import { LIGHT_THEME, DARK_THEME } from './types'
import type {
  SmartNoteEditorProps,
  SmartNoteEditorRef,
  EditorTheme,
  MarkdownFormat,
  MarkdownInlineFormat,
  MarkdownBlockFormat,
  Selection,
} from './types'

const ACCESSORY_ID = 'smart-note-editor-accessory'

export const SmartNoteEditor = React.forwardRef<SmartNoteEditorRef, SmartNoteEditorProps>(
  (props, ref) => {
    const {
      defaultValue = '',
      value: controlledValue,
      onValueChange,
      onDebouncedChange,
      debounceMs = 500,
      placeholder = 'Commencez à écrire…',
      editable = true,
      autoFocus = false,
      showToolbar = true,
      toolbarPosition = 'keyboard',
      toolbarButtons,
      maxLength,
      style,
      textStyle,
      markdownStyle,
      dark = false,
      theme: themeOverride,
      accessibilityLabel = 'Éditeur de note',
      testID,
      enableHistory = true,
      maxHistory = 100,
      autoSaveKey,
      autoSaveDebounce = 2000,
      children,
      renderToolbar,
      aiSource,
      enableAI = false,
      buildAIPrompt,
      onAIStart,
      onAIComplete,
    } = props

    const inputRef = React.useRef<any>(null)

    // Resolve theme
    const theme: EditorTheme = React.useMemo(
      () => ({ ...(dark ? DARK_THEME : LIGHT_THEME), ...themeOverride }),
      [dark, themeOverride]
    )

    // Markdown style (built from theme)
    const liveMarkdownStyle: MarkdownStyle = React.useMemo(
      () => buildMarkdownStyle(theme, markdownStyle),
      [theme, markdownStyle]
    )

    // Use the editor hook
    const editor = useNoteEditor({
      defaultValue,
      value: controlledValue,
      onValueChange,
      onDebouncedChange,
      debounceMs,
      enableHistory,
      maxHistory,
      autoSaveKey,
      autoSaveDebounce,
    })

    /* ---------------- Active formats (for toolbar state) ---------------- */
    const activeFormats = React.useMemo<MarkdownFormat[]>(() => {
      const block = detectActiveBlockFormat(editor.value, editor.selection)
      const inline = detectActiveInlineFormats(editor.value, editor.selection) as MarkdownFormat[]
      const result: MarkdownFormat[] = []
      if (block) result.push(block as MarkdownFormat)
      result.push(...inline)
      return result
    }, [editor.value, editor.selection])

    /* ---------------- AI handler ---------------- */
    const handleAI = React.useCallback(async () => {
      if (!aiSource || !buildAIPrompt || editor.isStreaming) return

      const prompt = buildAIPrompt(editor.value)
      onAIStart?.()

      try {
        await editor.insertAIMarkdown(aiSource(prompt), {
          mode: 'append',
          typingSpeed: 0,
        })
        onAIComplete?.()
      } catch (e) {
        console.error('[smart-note-editor] AI failed', e)
      }
    }, [aiSource, buildAIPrompt, editor, onAIStart, onAIComplete])

    /* ---------------- Imperative ref API ---------------- */
    React.useImperativeHandle(
      ref,
      (): SmartNoteEditorRef => ({
        focus: () => inputRef.current?.focus(),
        blur: () => {
          inputRef.current?.blur()
          Keyboard.dismiss()
        },
        insertText: (text: string) => editor.actions.insert(text),
        wrapSelection: (prefix: string, suffix?: string) =>
          editor.actions.wrapSelection(prefix, suffix ?? prefix),
        format: (format: MarkdownFormat) => editor.actions.format(format),
        getValue: () => editor.value,
        setValue: (v: string) => editor.setValue(v),
        getSelection: () => editor.selection,
        setSelection: (selection: Selection) => editor.handleSelectionChange({ nativeEvent: { selection } }),
        undo: editor.undo,
        redo: editor.redo,
        clear: editor.clear,
        insertAIMarkdown: editor.insertAIMarkdown,
        exportMarkdown: () => editor.value,
        exportPlainText: () => editor.exportPlainText(),
        getStats: () => editor.stats,
      }),
      [editor]
    )

    /* ---------------- Render ---------------- */
    return (
      <View style={[styles.container, { backgroundColor: theme.backgroundColor }, style]} testID={testID}>
        {/* Top toolbar */}
        {showToolbar && toolbarPosition === 'top' && (
          renderToolbar ? renderToolbar() : (
            <Toolbar
              buttons={toolbarButtons}
              activeFormats={activeFormats}
              canUndo={editor.canUndo}
              canRedo={editor.canRedo}
              onFormat={editor.actions.format}
              onUndo={editor.undo}
              onRedo={editor.redo}
              theme={theme}
            />
          )
        )}

        {/* Editor */}
        <MarkdownTextInput
          ref={inputRef}
          value={editor.value}
          onChangeText={editor.handleValueChange}
          onSelectionChange={editor.handleSelectionChange}
          onFocus={editor.onFocus}
          onBlur={editor.onBlur}
          placeholder={placeholder}
          placeholderTextColor={theme.placeholderColor}
          editable={editable && !editor.isStreaming}
          autoFocus={autoFocus}
          cursorColor={theme.cursorColor}
          maxLength={maxLength}
          multiline
          markdownStyle={liveMarkdownStyle}
          style={[
            styles.input,
            { color: theme.textColor },
            Platform.select({ ios: { paddingVertical: 12 }, android: { paddingVertical: 8 } }),
            textStyle,
          ]}
          accessibilityLabel={accessibilityLabel}
          inputAccessoryViewID={toolbarPosition === 'keyboard' ? ACCESSORY_ID : undefined}
          textBreakStrategy="highQuality"
          keyboardAppearance={dark ? 'dark' : 'light'}
          autoCorrect={false}
          parser={parseExpensiMark}
          autoCapitalize="sentences"
          spellCheck={false}
        />

        {/* Bottom toolbar */}
        {showToolbar && toolbarPosition === 'bottom' && (
          renderToolbar ? renderToolbar() : (
            <Toolbar
              buttons={toolbarButtons}
              activeFormats={activeFormats}
              canUndo={editor.canUndo}
              canRedo={editor.canRedo}
              onFormat={editor.actions.format}
              onUndo={editor.undo}
              onRedo={editor.redo}
              theme={theme}
            />
          )
        )}

        {/* Floating toolbar */}
        {showToolbar && toolbarPosition === 'floating' && (
          <View style={styles.floatingToolbar}>
            {renderToolbar ? renderToolbar() : (
              <Toolbar
                buttons={toolbarButtons}
                activeFormats={activeFormats}
                canUndo={editor.canUndo}
                canRedo={editor.canRedo}
                onFormat={editor.actions.format}
                onUndo={editor.undo}
                onRedo={editor.redo}
                theme={theme}
                style={styles.floatingToolbarInner}
              />
            )}
          </View>
        )}

        {/* Keyboard accessory (iOS native + Android fallback) */}
        {showToolbar && toolbarPosition === 'keyboard' && (
          <KeyboardAccessory
            nativeID={ACCESSORY_ID}
            buttons={toolbarButtons}
            activeFormats={activeFormats}
            canUndo={editor.canUndo}
            canRedo={editor.canRedo}
            onFormat={editor.actions.format}
            onUndo={editor.undo}
            onRedo={editor.redo}
            theme={theme}
            keyboardHeight={editor.keyboard.height}
            keyboardVisible={editor.keyboard.visible}
          />
        )}

        {/* AI button (optional) */}
        {enableAI && aiSource && (
          <View style={styles.aiButtonContainer}>
            <AIButton onPress={handleAI} streaming={editor.isStreaming} theme={theme} />
          </View>
        )}

        {/* Children (e.g. status bar, stats) */}
        {children}
      </View>
    )
  }
)

SmartNoteEditor.displayName = 'SmartNoteEditor'

/* ------------------------------------------------------------------ *
 * AI button
 * ------------------------------------------------------------------ */

const AIButton: React.FC<{
  onPress: () => void
  streaming: boolean
  theme: EditorTheme
}> = ({ onPress, streaming, theme }) => (
  <View
    style={[
      styles.aiButton,
      {
        backgroundColor: streaming ? theme.toolbarActiveButtonBg : theme.toolbarButtonBg,
      },
    ]}
  >
    <Text
      onPress={streaming ? undefined : onPress}
      style={[styles.aiButtonText, { color: theme.toolbarActiveButtonColor }]}
    >
      {streaming ? 'AI…' : '✨ AI'}
    </Text>
  </View>
)

import { Text } from 'react-native'

/* ------------------------------------------------------------------ *
 * Markdown style builder
 * ------------------------------------------------------------------ */

function buildMarkdownStyle(
  theme: EditorTheme,
  overrides?: Partial<MarkdownStyle>
): MarkdownStyle {
  return {
    h1: {
      fontSize: 28,
      fontWeight: '700',
      color: theme.h1Color,
    },
    h2: {
      fontSize: 24,
      fontWeight: '700',
      color: theme.h2Color,
    },
    h3: {
      fontSize: 20,
      fontWeight: '600',
      color: theme.h3Color,
    },
    h4: {
      fontSize: 18,
      fontWeight: '600',
    },
    h5: {
      fontSize: 16,
      fontWeight: '600',
    },
    h6: {
      fontSize: 14,
      fontWeight: '600',
    },
    strong: {
      fontWeight: '700',
      color: theme.boldColor,
    },
    em: {
      fontStyle: 'italic',
      color: theme.italicColor,
    },
    del: {
      textDecorationLine: 'line-through',
      color: theme.strikethroughColor,
    },
    code: {
      fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
      fontSize: 14,
      backgroundColor: theme.codeBgColor,
      color: theme.codeColor,
      paddingHorizontal: 4,
      paddingVertical: 2,
      borderRadius: 4,
    },
    pre: {
      fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
      backgroundColor: theme.codeBgColor,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
    },
    link: {
      color: theme.linkColor,
      textDecorationLine: 'underline',
    },
    blockquote: {
      borderLeftWidth: 3,
      borderLeftColor: theme.blockquoteBorderColor,
      paddingLeft: 12,
      color: theme.blockquoteColor,
    },
    bullet: {
      color: theme.listBulletColor,
      fontWeight: '600',
    },
    checkbox: {
      color: theme.checkboxColor,
    },
    ...overrides,
  } as MarkdownStyle
}

/* ------------------------------------------------------------------ *
 * Styles
 * ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  container: {
    flex: 1,
  } as ViewStyle,
  input: {
    flex: 1,
    paddingHorizontal: 16,
    fontSize: 16,
    lineHeight: 24,
    textAlignVertical: 'top',
  } as TextStyle,
  floatingToolbar: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  } as ViewStyle,
  floatingToolbarInner: {
    borderRadius: 12,
    borderTopWidth: 0,
  } as ViewStyle,
  aiButtonContainer: {
    position: 'absolute',
    bottom: 16,
    right: 16,
  } as ViewStyle,
  aiButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  } as ViewStyle,
  aiButtonText: {
    fontSize: 14,
    fontWeight: '600',
  } as TextStyle,
})