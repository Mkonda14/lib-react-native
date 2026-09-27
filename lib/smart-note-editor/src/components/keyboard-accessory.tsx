/**
 * KeyboardAccessory — toolbar that floats above the keyboard
 * ===========================================================
 * Uses `InputAccessoryView` (iOS) and a custom animated view (Android)
 * for a toolbar that follows the keyboard.
 */

import * as React from 'react'
import {
  View,
  StyleSheet,
  Platform,
  InputAccessoryView,
  Animated,
  Keyboard,
  ViewStyle,
} from 'react-native'
import { Toolbar } from './toolbar'
import type { MarkdownFormat, EditorTheme } from '../types'
import { LIGHT_THEME } from '../types'

interface KeyboardAccessoryProps {
  /** Unique ID for InputAccessoryView (iOS). */
  nativeID: string
  /** Buttons to show. */
  buttons?: MarkdownFormat[]
  /** Active formats. */
  activeFormats?: MarkdownFormat[]
  /** Whether undo is available. */
  canUndo?: boolean
  /** Whether redo is available. */
  canRedo?: boolean
  /** Format handler. */
  onFormat: (format: MarkdownFormat) => void
  /** Undo. */
  onUndo?: () => void
  /** Redo. */
  onRedo?: () => void
  /** Theme. */
  theme?: EditorTheme
  /** Keyboard height (for Android). */
  keyboardHeight?: number
  /** Whether the keyboard is visible. */
  keyboardVisible?: boolean
}

export const KeyboardAccessory: React.FC<KeyboardAccessoryProps> = (props) => {
  const {
    nativeID,
    buttons,
    activeFormats,
    canUndo,
    canRedo,
    onFormat,
    onUndo,
    onRedo,
    theme = LIGHT_THEME,
    keyboardHeight = 0,
    keyboardVisible = false,
  } = props

  const slideAnim = React.useMemo(() => new Animated.Value(0), [])

  React.useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: keyboardVisible ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start()
  }, [keyboardVisible, slideAnim])

  const toolbarContent = (
    <Toolbar
      buttons={buttons}
      activeFormats={activeFormats}
      canUndo={canUndo}
      canRedo={canRedo}
      onFormat={onFormat}
      onUndo={onUndo}
      onRedo={onRedo}
      theme={theme}
      style={{ borderTopWidth: StyleSheet.hairlineWidth }}
    />
  )

  // iOS: use native InputAccessoryView (sticks to keyboard)
  if (Platform.OS === 'ios') {
    return (
      <InputAccessoryView nativeID={nativeID} style={styles.accessory}>
        {toolbarContent}
      </InputAccessoryView>
    )
  }

  // Android: custom animated view that mimics the behavior
  return (
    <Animated.View
      style={[
        styles.androidAccessory,
        {
          bottom: slideAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0, keyboardHeight],
          }),
          opacity: slideAnim,
        },
      ]}
      pointerEvents={keyboardVisible ? 'auto' : 'none'}
    >
      {toolbarContent}
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  accessory: {
    height: 44,
  } as ViewStyle,
  androidAccessory: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 44,
  } as ViewStyle,
})