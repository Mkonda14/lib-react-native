/**
 * Charts — Registry & Plugin System
 * ==================================
 */

import * as React from 'react'
import type { ChartConfig } from './types'

export interface ChartComponentProps {
  data: any[]
  config?: ChartConfig
  style?: any
  className?: string
}

export interface ChartPlugin {
  name: string
  version: string
  description?: string
  component: React.ComponentType<ChartComponentProps>
  defaultConfig?: Partial<ChartConfig>
  supportedDataTypes?: string[]
}

export interface ChartRegistry {
  register: (plugin: ChartPlugin) => void
  unregister: (name: string) => void
  get: (name: string) => ChartPlugin | undefined
  list: () => ChartPlugin[]
}

class ChartRegistryImpl implements ChartRegistry {
  private plugins = new Map<string, ChartPlugin>()

  register(plugin: ChartPlugin) {
    this.plugins.set(plugin.name, plugin)
  }

  unregister(name: string) {
    this.plugins.delete(name)
  }

  get(name: string) {
    return this.plugins.get(name)
  }

  list() {
    return Array.from(this.plugins.values())
  }
}

export const chartRegistry = new ChartRegistryImpl()

export function registerChart(plugin: ChartPlugin) {
  chartRegistry.register(plugin)
}

export function unregisterChart(name: string) {
  chartRegistry.unregister(name)
}

export function getChart(name: string) {
  return chartRegistry.get(name)
}

export function listCharts() {
  return chartRegistry.list()
}