/**
 * Bottom Tabs — Type definitions
 * =================================
 * A complete, dynamic, multi-preset bottom tab bar system for
 * React Native + Expo Router + NativeWind.
 */

import type { ReactNode } from 'react'
import type {
  ViewStyle,
  ImageSourcePropType,
  ImageResizeMode,
} from 'react-native'
import type { SharedValue } from 'react-native-reanimated'

/* ------------------------------------------------------------------ *
 * Visual presets
 * ------------------------------------------------------------------ */

export type TabPreset =
  | 'ios'        // Classic iOS: icon top, label bottom, blur glass
  | 'material'   // Material You: pill indicator behind active item
  | 'pill'       // Active tab morphs into capsule pill (icon + label)
  | 'minimal'    // Clean minimal: icons with animated dot indicator
  | 'glass'      // Glassmorphism translucent surface & glowing indicator
  | 'dock'       // macOS dock style with spring bouncing icons

export type TabOrientation = 'horizontal' | 'vertical'

export type TabIconPosition = 'top' | 'leading' | 'none'

export type TabBadgeVariant = 'dot' | 'count' | 'custom'

export type TabAnimationType =
  | 'none'
  | 'scale'        // Active icon scales up
  | 'spring'       // Bouncy spring transition
  | 'slide'        // Indicator slides smoothly between tabs
  | 'morph'        // Capsule pill morphs width dynamically

/* ------------------------------------------------------------------ *
 * Icon
 * ------------------------------------------------------------------ */

export interface TabIconProps {
  /** Icon node (lucide-react-native, @expo/vector-icons, custom SVG…). */
  children?: ReactNode
  /** Pre-bundled icon name when using a registered icon set. */
  name?: string
  /** Size in px. */
  size?: number
  /** Color override. */
  color?: string
  /** Source for an image-based icon. */
  source?: ImageSourcePropType
  /** Image resize mode. */
  resizeMode?: ImageResizeMode
}

export type IconRenderer = (props: TabIconProps & { active: boolean }) => ReactNode

/* ------------------------------------------------------------------ *
 * Badge
 * ------------------------------------------------------------------ */

export interface TabBadgeProps {
  variant?: TabBadgeVariant
  /** Count to display (only when variant === 'count'). */
  count?: number
  /** Max display value (e.g. 99+). Default 99. */
  max?: number
  /** Custom node. */
  children?: ReactNode
  /** Position relative to the icon. */
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
  /** Background color override. */
  color?: string
  /** Text color override. */
  textColor?: string
  /** Size in px. */
  size?: number
  /** Offset tweaks. */
  offsetX?: number
  offsetY?: number
  /** Show only when active. */
  showWhenActive?: boolean
  /** Animated appear/disappear. */
  animated?: boolean
}

/* ------------------------------------------------------------------ *
 * Indicator
 * ------------------------------------------------------------------ */

export interface TabIndicatorProps {
  /** Position [0..count-1] of the active tab. */
  position: SharedValue<number>
  /** Total number of visible tabs. */
  count: number
  /** Width of the indicator (px or % or 'auto'). */
  width?: number | string
  /** Height of the indicator. */
  height?: number
  /** Border radius. */
  borderRadius?: number
  /** Color. */
  color?: string
  /** Border color. */
  borderColor?: string
  /** Border width. */
  borderWidth?: number
  /** Whether to render the indicator above (true) or behind (false) the icons. */
  overlay?: boolean
}

/* ------------------------------------------------------------------ *
 * Tab item
 * ------------------------------------------------------------------ */

export interface TabItemProps {
  /** Unique id for the tab. */
  id: string
  /** Display label. */
  label?: string
  /** Icon (default / inactive variant). Can be a ReactNode, TabIconProps, or a render function. */
  icon?: ReactNode | TabIconProps | ((iconProps: TabIconProps & { resolvedColor?: string }) => ReactNode)
  /** Icon (active variant) — falls back to `icon` if not provided. */
  iconActive?: ReactNode | TabIconProps | ((iconProps: TabIconProps & { resolvedColor?: string }) => ReactNode)
  /** Badge configuration. */
  badge?: TabBadgeProps
  /** Disable this tab. */
  disabled?: boolean
  /** Hide this tab completely. */
  hidden?: boolean
  /** Custom color for this tab when active. */
  activeColor?: string
  /** Custom color for this tab when inactive. */
  inactiveColor?: string
  /** Haptic feedback intensity on press. */
  haptic?: 'light' | 'medium' | 'heavy' | 'selection' | 'none'
  /** Accessibility label override. */
  accessibilityLabel?: string
  /** Render a custom node instead of default item UI. */
  render?: (params: TabItemRenderParams) => ReactNode
  /** Optional long-press handler. */
  onLongPress?: () => void
  /** Style override on item container. */
  style?: ViewStyle | ViewStyle[]
  /** Class name override (NativeWind). */
  className?: string
}

export interface TabItemRenderParams {
  active: boolean
  focused: boolean
  pressed: boolean
  preset: TabPreset
  index: number
  progress: SharedValue<number>
}

/* ------------------------------------------------------------------ *
 * Tab bar
 * ------------------------------------------------------------------ */

export interface TabBarProps {
  /** Tab items array. */
  tabs: TabItemProps[]
  /** Controlled active index. */
  activeIndex?: number
  /** Initial active index (uncontrolled). Default 0. */
  defaultActiveIndex?: number
  /** Called when the active tab changes. */
  onTabChange?: (index: number, tab: TabItemProps) => void
  /** Called when a tab is long-pressed. */
  onTabLongPress?: (index: number, tab: TabItemProps) => void
  /** Visual preset choice. */
  preset?: TabPreset
  /** Orientation (horizontal bar or vertical sidebar). */
  orientation?: TabOrientation
  /** Show labels. */
  showLabels?: boolean
  /** Icon position relative to label. */
  iconPosition?: TabIconPosition
  /** Active tab color override. */
  activeColor?: string
  /** Inactive tab color override. */
  inactiveColor?: string
  /** Bar height (horizontal) or width (vertical). */
  barHeight?: number
  /** Bar background color override. */
  backgroundColor?: string
  /** Apply safe area insets automatically ('bottom', 'top', true, false). */
  safeArea?: boolean | 'top' | 'bottom' | ('top' | 'bottom')[]
  /** Slide bar up above keyboard when opened. */
  keyboardAvoiding?: boolean
  /** Hide the bar completely when keyboard opens. */
  hideOnKeyboard?: boolean
  /** Floating bar (detached capsule from edges). */
  floating?: boolean
  /** Floating border radius. */
  floatingRadius?: number
  /** Floating bottom margin override. */
  floatingMargin?: number
  /** Animation type for tab switch. */
  animation?: TabAnimationType
  /** Spring physics config for indicator sliding. */
  springConfig?: { damping?: number; stiffness?: number; mass?: number }
  /** Duration for timing animations. */
  animationDuration?: number
  /** Haptic feedback style on tab change. */
  haptic?: 'light' | 'medium' | 'heavy' | 'selection' | 'none'
  /** Sound trigger callback or true/false. */
  sound?: boolean | string
  /** Show top border/divider. */
  showTopBorder?: boolean
  /** Bar container style override. */
  style?: ViewStyle | ViewStyle[]
  /** Bar container className (NativeWind). */
  className?: string
  /** Custom indicator renderer. */
  renderIndicator?: (props: TabIndicatorProps) => ReactNode
  /** Custom item renderer. */
  renderItem?: (item: TabItemProps, params: TabItemRenderParams) => ReactNode
  /** Test ID for testing. */
  testID?: string
  /** Children node (alternative to `tabs` prop). */
  children?: ReactNode
}

/* ------------------------------------------------------------------ *
 * Context
 * ------------------------------------------------------------------ */

export interface TabContextValue {
  activeIndex: number
  setActiveIndex: (index: number) => void
  preset: TabPreset
  orientation: TabOrientation
  showLabels: boolean
  iconPosition: TabIconPosition
  activeColor: string
  inactiveColor: string
  animation: TabAnimationType
  animationDuration: number
  springConfig: { damping?: number; stiffness?: number; mass?: number }
  tabsCount: number
  indicatorPosition: SharedValue<number>
  /** Register layout bounds of each item for indicator math. */
  registerItem: (index: number, layout: { x: number; y: number; w: number; h: number }) => void
}

/* ------------------------------------------------------------------ *
 * Preset definition
 * ------------------------------------------------------------------ */

export interface TabPresetConfig {
  barHeight: number
  iconSize: number
  labelSize: number
  iconLabelGap: number
  activeColor: string
  inactiveColor: string
  backgroundColor: string
  borderColor: string
  indicatorColor: string
  indicatorBorderColor: string
  indicatorBorderWidth: number
  indicatorWidth: number | string
  indicatorHeight: number
  indicatorRadius: number
  showTopBorder: boolean
  itemPaddingX: number
  blur: boolean
  blurIntensity: number
  blurTint: 'light' | 'dark' | 'default'
  showLabels: boolean
  iconPosition: TabIconPosition
  animation: TabAnimationType
  activeScale: number
  floating: boolean
  floatingRadius: number
  floatingMargin: number
  shadow: ViewStyle
}