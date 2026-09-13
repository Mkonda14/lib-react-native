/**
 * Responsive Container — Automatic width & height measuring component
 * ====================================================================
 */

import * as React from 'react'
import { forwardRef } from 'react'
import {
  View,
  ViewStyle,
  StyleSheet,
  useWindowDimensions,
  LayoutChangeEvent,
} from 'react-native'

export interface ResponsiveContainerProps {
  children: (dimensions: { width: number; height: number }) => React.ReactNode
  width?: number
  height?: number
  aspectRatio?: number
  minWidth?: number
  maxWidth?: number
  minHeight?: number
  maxHeight?: number
  style?: ViewStyle | ViewStyle[]
  className?: string
}

export const ResponsiveContainer = forwardRef<View, ResponsiveContainerProps>(
  (
    {
      children,
      width: fixedWidth,
      height: fixedHeight,
      aspectRatio = 1.6,
      minWidth = 200,
      maxWidth,
      minHeight = 160,
      maxHeight,
      style,
    },
    ref
  ) => {
    const [layout, setLayout] = React.useState({ width: 0, height: 0 })

    const handleLayout = (event: LayoutChangeEvent) => {
      const { width: w, height: h } = event.nativeEvent.layout
      if (w > 0 && h > 0) {
        setLayout({ width: w, height: h })
      }
    }

    const calculatedWidth = fixedWidth ?? (layout.width > 0 ? layout.width : 320)
    const calculatedHeight =
      fixedHeight ??
      (aspectRatio && calculatedWidth > 0 ? calculatedWidth / aspectRatio : layout.height > 0 ? layout.height : 200)

    const finalWidth = maxWidth ? Math.min(calculatedWidth, maxWidth) : Math.max(calculatedWidth, minWidth)
    const finalHeight = maxHeight ? Math.min(calculatedHeight, maxHeight) : Math.max(calculatedHeight, minHeight)

    return (
      <View
        ref={ref}
        onLayout={handleLayout}
        style={[styles.container, style]}
      >
        {typeof children === 'function'
          ? children({ width: finalWidth, height: finalHeight })
          : children}
      </View>
    )
  }
)

ResponsiveContainer.displayName = 'ResponsiveContainer'

export const useResponsiveChart = (config?: {
  width?: number
  height?: number
  aspectRatio?: number
}) => {
  const [layout, setLayout] = React.useState({ width: 0, height: 0 })

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width: w, height: h } = event.nativeEvent.layout
    if (w > 0 && h > 0) {
      setLayout({ width: w, height: h })
    }
  }

  const chartWidth = config?.width ?? (layout.width > 0 ? layout.width : 320)
  const chartHeight =
    config?.height ??
    (config?.aspectRatio ? chartWidth / config.aspectRatio : layout.height > 0 ? layout.height : 200)

  return {
    width: chartWidth,
    height: chartHeight,
    handleLayout,
    layout,
    setLayout,
  }
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    minHeight: 180,
  },
})