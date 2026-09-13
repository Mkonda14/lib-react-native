/**
 * Tab context — shared state between the Bar and its Items
 * =========================================================
 */

import { createContext, useContext } from 'react'
import type { TabContextValue } from './types'

export const TabContext = createContext<TabContextValue | null>(null)

/**
 * Access the bottom-tabs context from any descendant.
 * Throws if used outside <BottomTabBar>.
 */
export function useTabContext(): TabContextValue {
  const ctx = useContext(TabContext)
  if (!ctx) {
    throw new Error(
      'useTabContext must be used within <BottomTabBar>. Wrap your tab items in a <BottomTabBar>.'
    )
  }
  return ctx
}

/**
 * Non-throwing variant — returns null when outside.
 */
export function useTabContextOrNull(): TabContextValue | null {
  return useContext(TabContext)
}
