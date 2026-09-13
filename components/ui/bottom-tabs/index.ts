/**
 * Bottom Tabs — Public API
 * =========================
 *
 * Standalone usage:
 *   import { BottomTabBar } from '@/components/ui/bottom-tabs'
 *
 * Expo Router / React Navigation usage:
 *   import { BottomTabBarAdapter } from '@/components/ui/bottom-tabs'
 */

export { BottomTabBar } from './bar'
export { BottomTabItem } from './item'
export { BottomTabIcon } from './icon'
export { BottomTabBadge } from './badge'
export {
  BottomTabIndicator,
  CenteredIndicator,
  DotIndicator,
} from './indicator'
export { BottomTabBarAdapter } from './adapter'

export { TabContext, useTabContext, useTabContextOrNull } from './context'

export {
  useHaptic,
  useKeyboardVisible,
  useSafeAreaInsets,
  registerBlurView,
  useBlurView,
} from './hooks'

export {
  TAB_PRESETS,
  resolvePreset,
} from './presets'

export type {
  TabBarProps,
  TabItemProps,
  TabItemRenderParams,
  TabIconProps,
  TabBadgeProps,
  TabIndicatorProps,
  TabPreset,
  TabPresetConfig,
  TabContextValue,
  TabOrientation,
  TabIconPosition,
  TabBadgeVariant,
  TabAnimationType,
  IconRenderer,
} from './types'

export type { BottomTabBarAdapterProps } from './adapter'
export type { HapticIntensity, SafeAreaInsets, BlurComponent } from './hooks'