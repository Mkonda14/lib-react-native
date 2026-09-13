/**
 * Charts — Type Definitions
 * =========================
 */

import type { ViewStyle, TextStyle } from 'react-native'
import type { SharedValue } from 'react-native-reanimated'

export interface ChartConfig {
  width?: number
  height?: number
  padding?: number
  showGrid?: boolean
  showLabels?: boolean
  animated?: boolean
  duration?: number
  responsive?: boolean
  aspectRatio?: number
  theme?: 'light' | 'dark' | 'auto'
}

export interface ChartDataPoint {
  label?: string
  x?: string | number
  y?: number
  value?: number
  color?: string
  [key: string]: any
}

export interface ChartSeries {
  key: string
  label: string
  color?: string
  data: ChartDataPoint[]
}

export interface AnimationConfig {
  entrance?: {
    duration?: number
    easing?: (t: number) => number
    stagger?: number
  }
  update?: {
    duration?: number
    easing?: (t: number) => number
  }
  hover?: {
    scale?: number
    duration?: number
  }
}

export interface ChartTheme {
  isDark: boolean
  colors: {
    primary: string
    secondary: string
    muted: string
    background: string
    grid: string
    text: string
    series: string[]
  }
  gradients: Record<string, { from: string; to: string }>
}

export interface BaseChartProps {
  data: any[]
  config?: ChartConfig
  style?: ViewStyle | ViewStyle[]
  theme?: 'light' | 'dark' | 'auto'
  animated?: boolean
  onLayout?: (layout: { width: number; height: number }) => void
  children?: React.ReactNode
}

export type EasingFunction = (t: number) => number