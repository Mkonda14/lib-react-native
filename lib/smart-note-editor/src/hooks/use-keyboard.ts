/**
 * useKeyboard — track keyboard visibility + height
 * =================================================
 * Used to position the toolbar above the keyboard.
 */

import { useState, useEffect } from 'react'
import { Keyboard, KeyboardEvent, Platform } from 'react-native'

export function useKeyboard() {
  const [visible, setVisible] = useState(false)
  const [height, setHeight] = useState(0)

  useEffect(() => {
    const showEvents = Platform.OS === 'ios' ? ['keyboardWillShow'] : ['keyboardDidShow']
    const hideEvents = Platform.OS === 'ios' ? ['keyboardWillHide'] : ['keyboardDidHide']

    const onShow = (e: KeyboardEvent) => {
      setVisible(true)
      setHeight(e.endCoordinates.height)
    }
    const onHide = () => {
      setVisible(false)
      setHeight(0)
    }

    const showSubs = showEvents.map((evt) => Keyboard.addListener(evt as any, onShow))
    const hideSubs = hideEvents.map((evt) => Keyboard.addListener(evt as any, onHide))

    return () => {
      showSubs.forEach((s) => s.remove())
      hideSubs.forEach((s) => s.remove())
    }
  }, [])

  return { visible, height }
}