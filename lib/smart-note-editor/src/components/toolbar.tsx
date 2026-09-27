/**
 * Toolbar — formatting buttons
 * =============================
 * A horizontal scrollable toolbar with all formatting actions.
 *
 * Default buttons:
 *  - Headings (H1, H2, H3)
 *  - Bold, Italic, Strikethrough, Code
 *  - Bullet list, Numbered list, Checkbox
 *  - Blockquote, Code block, Horizontal rule
 *  - Link, Image, Table
 *  - Undo, Redo
 */

import * as React from 'react'
import {
  View,
  Pressable,
  Text,
  StyleSheet,
  ScrollView,
  ViewStyle,
  TextStyle,
  Platform,
} from 'react-native'
import type { ToolbarProps, ToolbarButton, MarkdownFormat, EditorTheme } from '../types'
import { LIGHT_THEME } from '../types'

const DEFAULT_BUTTONS: MarkdownFormat[] = [
  'h1',
  'h2',
  'h3',
  'bold',
  'italic',
  'strikethrough',
  'code',
  'unordered-list',
  'ordered-list',
  'todo',
  'blockquote',
  'code-block',
  'horizontal-rule',
  'link',
]

const BUTTON_LABELS: Record<MarkdownFormat, { icon: string; label: string }> = {
  h1: { icon: 'H1', label: 'Titre 1' },
  h2: { icon: 'H2', label: 'Titre 2' },
  h3: { icon: 'H3', label: 'Titre 3' },
  h4: { icon: 'H4', label: 'Titre 4' },
  h5: { icon: 'H5', label: 'Titre 5' },
  h6: { icon: 'H6', label: 'Titre 6' },
  bold: { icon: 'B', label: 'Gras' },
  italic: { icon: 'I', label: 'Italique' },
  strikethrough: { icon: 'S', label: 'Barré' },
  code: { icon: '</>', label: 'Code en ligne' },
  link: { icon: '🔗', label: 'Lien' },
  underline: { icon: 'U', label: 'Souligné' },
  'unordered-list': { icon: '•', label: 'Liste à puces' },
  'ordered-list': { icon: '1.', label: 'Liste numérotée' },
  todo: { icon: '☑', label: 'Case à cocher' },
  blockquote: { icon: '"', label: 'Citation' },
  'code-block': { icon: '{}', label: 'Bloc de code' },
  'horizontal-rule': { icon: '—', label: 'Ligne horizontale' },
}

interface ToolbarComponentProps extends ToolbarProps {
  /** Active formats (from editor). */
  activeFormats?: MarkdownFormat[]
  /** Whether undo is available. */
  canUndo?: boolean
  /** Whether redo is available. */
  canRedo?: boolean
  /** Called when a button is pressed. */
  onFormat: (format: MarkdownFormat) => void
  /** Undo handler. */
  onUndo?: () => void
  /** Redo handler. */
  onRedo?: () => void
  /** Theme. */
  theme?: EditorTheme
}

export const Toolbar = React.memo<ToolbarComponentProps>(({
  buttons = DEFAULT_BUTTONS,
  activeFormats = [],
  canUndo = false,
  canRedo = false,
  onFormat,
  onUndo,
  onRedo,
  theme = LIGHT_THEME,
  style,
  renderButton,
  onButtonPress,
}) => {
  const handlePress = React.useCallback((format: MarkdownFormat) => {
    if (onButtonPress) {
      onButtonPress(format)
    } else {
      onFormat(format)
    }
  }, [onButtonPress, onFormat])

  const renderButtonItem = (format: MarkdownFormat) => {
    const meta = BUTTON_LABELS[format]
    const isActive = activeFormats.includes(format)

    const button: ToolbarButton = {
      format,
      icon: meta.icon,
      label: meta.label,
      active: isActive,
    }

    if (renderButton) {
      return (
        <View key={format}>
          {renderButton(button, () => handlePress(format))}
        </View>
      )
    }

    return (
      <Pressable
        key={format}
        onPress={() => handlePress(format)}
        style={[
          styles.button,
          {
            backgroundColor: isActive ? theme.toolbarActiveButtonBg : theme.toolbarButtonBg,
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel={meta.label}
        accessibilityState={{ selected: isActive }}
        hitSlop={4}
      >
        <Text
          style={[
            styles.buttonText,
            {
              color: isActive ? theme.toolbarActiveButtonColor : theme.toolbarButtonColor,
              fontWeight: isHeading(format) ? '700' : '500',
              fontStyle: format === 'italic' ? 'italic' : 'normal',
              textDecorationLine:
                format === 'strikethrough' ? 'line-through' : 'none',
            },
          ]}
        >
          {meta.icon}
        </Text>
      </Pressable>
    )
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.toolbarBackgroundColor, borderColor: theme.dividerColor }, style]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Undo / Redo */}
        {onUndo && (
          <Pressable
            onPress={onUndo}
            disabled={!canUndo}
            style={[styles.button, { opacity: canUndo ? 1 : 0.4 }]}
            accessibilityLabel="Annuler"
          >
            <Text style={[styles.buttonText, { color: theme.toolbarButtonColor }]}>
              ↶
            </Text>
          </Pressable>
        )}
        {onRedo && (
          <Pressable
            onPress={onRedo}
            disabled={!canRedo}
            style={[styles.button, { opacity: canRedo ? 1 : 0.4 }]}
            accessibilityLabel="Refaire"
          >
            <Text style={[styles.buttonText, { color: theme.toolbarButtonColor }]}>
              ↷
            </Text>
          </Pressable>
        )}

        {/* Divider */}
        {(onUndo || onRedo) && (
          <View style={[styles.divider, { backgroundColor: theme.dividerColor }]} />
        )}

        {/* Format buttons */}
        {buttons.map((format) => renderButtonItem(format))}
      </ScrollView>
    </View>
  )
})

Toolbar.displayName = 'Toolbar'

function isHeading(format: MarkdownFormat): boolean {
  return ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(format)
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 4,
    minHeight: 44,
  } as ViewStyle,
  scrollContent: {
    alignItems: 'center',
    paddingHorizontal: 8,
    gap: 2,
  } as ViewStyle,
  button: {
    minWidth: 36,
    minHeight: 32,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 2,
  } as ViewStyle,
  buttonText: {
    fontSize: 16,
    fontWeight: '500',
  } as TextStyle,
  divider: {
    width: 1,
    height: 24,
    marginHorizontal: 6,
  } as ViewStyle,
})
