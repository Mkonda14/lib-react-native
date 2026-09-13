/**
 * Charts — Theme Hook & Presets
 * =============================
 */

import { useMemo } from 'react'
import { useColorScheme } from '@/hooks/use-color-scheme'
import type { ChartTheme } from './types'

export type { ChartTheme } from './types'

export const defaultTheme: ChartTheme = {
  isDark: false,
  colors: {
    primary: '#3B82F6',
    secondary: '#64748B',
    muted: '#64748B',
    background: '#FFFFFF',
    grid: '#E2E8F0',
    text: '#1E293B',
    series: ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316'],
  },
  gradients: {
    primary: { from: '#3B82F6', to: '#1D4ED8' },
    success: { from: '#10B981', to: '#059669' },
    danger: { from: '#EF4444', to: '#DC2626' },
    warning: { from: '#F59E0B', to: '#D97706' },
  },
}

export const darkTheme: ChartTheme = {
  isDark: true,
  colors: {
    primary: '#60A5FA',
    secondary: '#94A3B8',
    muted: '#94A3B8',
    background: '#0F172A',
    grid: '#334155',
    text: '#F1F5F9',
    series: ['#60A5FA', '#F87171', '#34D399', '#FBBF24', '#A78BFA', '#F472B6', '#22D3EE', '#FB923C'],
  },
  gradients: {
    primary: { from: '#60A5FA', to: '#3B82F6' },
    success: { from: '#34D399', to: '#10B981' },
    danger: { from: '#F87171', to: '#EF4444' },
    warning: { from: '#FBBF24', to: '#F59E0B' },
  },
}

export const useChartTheme = (overrideTheme?: 'light' | 'dark' | 'auto'): ChartTheme => {
  const scheme = useColorScheme()
  const isDark = overrideTheme === 'dark' || (overrideTheme !== 'light' && scheme === 'dark')

  return useMemo(() => (isDark ? darkTheme : defaultTheme), [isDark])
}