/**
 * BottomTabBarAdapter — Expo Router & React Navigation Adapter
 * =============================================================
 * Drop-in custom tab bar for Expo Router's `<Tabs tabBar={...} />`.
 *
 * Key fix: `isFocused` was captured in the icon closure during the
 * useMemo call, causing stale colour values. Icon rendering is now
 * a stable function that receives colour from the BottomTabIcon's
 * `resolvedColor` prop (passed by BottomTabItem), not from isFocused.
 *
 * @example
 * <Tabs tabBar={(props) => <BottomTabBarAdapter {...props} preset="minimal" />}>
 *   <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ({ color, size }) => <Home color={color} size={size} /> }} />
 * </Tabs>
 */

import * as React from 'react'
import { BottomTabBar } from './bar'
import type { TabBarProps, TabItemProps, TabPreset } from './types'

export interface BottomTabBarAdapterProps extends Omit<TabBarProps, 'tabs' | 'activeIndex'> {
  state: any
  descriptors: any
  navigation: any
  preset?: TabPreset
}

export const BottomTabBarAdapter = React.memo(function BottomTabBarAdapter(
  props: BottomTabBarAdapterProps
) {
  const { state, descriptors, navigation, preset = 'minimal', ...restProps } = props

  /**
   * Build the static tab list from routes.
   *
   * IMPORTANT: `icon` is a stable function that receives `iconProps`
   * (containing `resolvedColor` and `size`) at render time from BottomTabItem.
   * This avoids the stale `isFocused` closure that would give wrong colours.
   */
  const tabs = React.useMemo<TabItemProps[]>(() => {
    return state.routes.map((route: any) => {
      const { options } = descriptors[route.key]

      const label =
        options.tabBarLabel !== undefined
          ? options.tabBarLabel
          : options.title !== undefined
          ? options.title
          : route.name

      // Icon is a function; BottomTabItem will call it via BottomTabIcon
      // with the live resolved color (active or inactive) at render time.
      const icon = (iconProps: any) => {
        if (typeof options.tabBarIcon === 'function') {
          return options.tabBarIcon({
            focused: false,               // colour driven by resolvedColor, not focused
            color: iconProps.resolvedColor ?? iconProps.color ?? '#94A3B8',
            size: iconProps.size ?? 24,
          })
        }
        return null
      }

      const badgeCount =
        typeof options.tabBarBadge === 'number' ? options.tabBarBadge : undefined

      return {
        id: route.key,
        label: typeof label === 'string' ? label : String(label),
        icon,
        badge: badgeCount !== undefined ? { variant: 'count' as const, count: badgeCount } : undefined,
        accessibilityLabel: options.tabBarAccessibilityLabel,
      } satisfies TabItemProps
    })
  // Note: intentionally NOT including state.index — icon colour is resolved
  // dynamically by BottomTabItem, not baked into the tab definition.
  }, [state.routes, descriptors]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleTabChange = React.useCallback(
    (index: number) => {
      const route = state.routes[index]
      if (!route) return

      const isFocused = state.index === index
      const event = navigation.emit({
        type: 'tabPress',
        target: route.key,
        canPreventDefault: true,
      })

      if (!isFocused && !event.defaultPrevented) {
        navigation.navigate(route.name, route.params)
      }
    },
    [state.routes, state.index, navigation]
  )

  const handleTabLongPress = React.useCallback(
    (index: number) => {
      const route = state.routes[index]
      if (!route) return
      navigation.emit({
        type: 'tabLongPress',
        target: route.key,
      })
    },
    [state.routes, navigation]
  )

  return (
    <BottomTabBar
      {...restProps}
      preset={preset}
      tabs={tabs}
      activeIndex={state.index}
      onTabChange={handleTabChange}
      onTabLongPress={handleTabLongPress}
    />
  )
})

BottomTabBarAdapter.displayName = 'BottomTabBarAdapter'
