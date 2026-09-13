/**
 * Chart Base — Base Chart Wrapper Component
 * =========================================
 */

import * as React from 'react'
import { forwardRef } from 'react'
import {
  View,
  ViewStyle,
  LayoutChangeEvent,
  StyleSheet,
  useWindowDimensions,
} from 'react-native'
import { useColorScheme } from '@/hooks/use-color-scheme'
import { cn } from '@/lib/utils'
import type { BaseChartProps, ChartConfig } from './types'

export type { BaseChartProps }

export const BaseChart = forwardRef<View, BaseChartProps>(
  (
    {
      data,
      config = {},
      style,
      theme: themeProp,
      animated = true,
      onLayout,
      children,
      ...props
    },
    ref
  ) => {
    const { width: windowWidth } = useWindowDimensions()
    const scheme = useColorScheme()
    const theme = themeProp === 'auto' ? scheme ?? 'light' : themeProp ?? 'light'
    const isDark = theme === 'dark'

    const [layout, setLayout] = React.useState({ width: 0, height: 0 })

    const handleLayout = (event: LayoutChangeEvent) => {
      const { width: measuredWidth, height: measuredHeight } = event.nativeEvent.layout
      if (measuredWidth > 0 && measuredHeight > 0) {
        setLayout({ width: measuredWidth, height: measuredHeight })
      }
      onLayout?.(event.nativeEvent.layout)
    }

    const {
      width = config.width || layout.width || 300,
      height = config.height || layout.height || 200,
      padding = 20,
      showGrid = true,
      showLabels = true,
      duration = 800,
    } = config

    return (
      <View
        ref={ref}
        onLayout={handleLayout}
        style={[{ width: '100%', minHeight: 180 }, style]}
        {...props}
      >
        {children}
      </View>
    )
  }
)

BaseChart.displayName = 'BaseChart'