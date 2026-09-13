/**
 * Tab presets — Visual styles and layout configurations
 * ======================================================
 * Each preset defines complete visual attributes including bar height,
 * colors, blur intensity, indicator geometries, and animation dynamics.
 */

import type { TabPreset, TabPresetConfig } from "./types";

export const TAB_PRESETS: Record<TabPreset, TabPresetConfig> = {
  /* ---------------------------------------------------------------- *
   * 1. iOS — Classic Apple tab bar with glass blur & top border
   * ---------------------------------------------------------------- */
  ios: {
    barHeight: 56,
    iconSize: 22,
    labelSize: 11,
    iconLabelGap: 3,
    activeColor: "#0EA5E9", // Electric Sky Blue
    inactiveColor: "#64748B", // Slate-500
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    borderColor: "rgba(226, 232, 240, 0.8)",
    indicatorColor: "transparent",
    indicatorBorderColor: "transparent",
    indicatorBorderWidth: 0,
    indicatorWidth: 0,
    indicatorHeight: 0,
    indicatorRadius: 0,
    showTopBorder: true,
    itemPaddingX: 8,
    blur: true,
    blurIntensity: 80,
    blurTint: "light",
    showLabels: true,
    iconPosition: "top",
    animation: "scale",
    activeScale: 1.1,
    floating: false,
    floatingRadius: 0,
    floatingMargin: 0,
    shadow: {
      elevation: 4,
      shadowColor: "#000000",
      shadowOpacity: 0.05,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: -2 },
    },
  },

  /* ---------------------------------------------------------------- *
   * 2. Material — Material 3 pill indicator behind active tab
   * ---------------------------------------------------------------- */
  material: {
    barHeight: 64,
    iconSize: 24,
    labelSize: 12,
    iconLabelGap: 4,
    activeColor: "#0284C7", // Sky-600
    inactiveColor: "#475569", // Slate-600
    backgroundColor: "#F8FAFC", // Slate-50
    borderColor: "rgba(226, 232, 240, 0.6)",
    indicatorColor: "#E0F2FE", // Sky-100 pill
    indicatorBorderColor: "transparent",
    indicatorBorderWidth: 0,
    indicatorWidth: 64,
    indicatorHeight: 32,
    indicatorRadius: 16,
    showTopBorder: true,
    itemPaddingX: 12,
    blur: false,
    blurIntensity: 0,
    blurTint: "default",
    showLabels: true,
    iconPosition: "top",
    animation: "slide",
    activeScale: 1.05,
    floating: false,
    floatingRadius: 0,
    floatingMargin: 0,
    shadow: {
      elevation: 2,
      shadowColor: "#000000",
      shadowOpacity: 0.04,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: -1 },
    },
  },

  /* ---------------------------------------------------------------- *
   * 3. Pill — Floating Dark Obsidian Capsule with Active Sky Blue Pill
   * ---------------------------------------------------------------- */
  pill: {
    barHeight: 62,
    iconSize: 22,
    labelSize: 11,
    iconLabelGap: 3,
    activeColor: "#FFFFFF", // Crisp Pure White for active tab
    inactiveColor: "#94A3B8", // Slate-400 for high-contrast legible inactive tabs
    backgroundColor: "#0F172A", // Slate-900 Dark Obsidian capsule
    borderColor: "rgba(255, 255, 255, 0.15)",
    indicatorColor: "#0EA5E9", // Electric Sky-500 Pill
    indicatorBorderColor: "rgba(255, 255, 255, 0.35)", // Top specular shine border
    indicatorBorderWidth: 1,
    indicatorWidth: "auto",
    indicatorHeight: 44,
    indicatorRadius: 12, // Stadium rounded capsule
    showTopBorder: false,
    itemPaddingX: 12,
    blur: false,
    blurIntensity: 0,
    blurTint: "default",
    showLabels: true,
    iconPosition: "top",
    animation: "slide",
    activeScale: 1.08,
    floating: true,
    floatingRadius: 20, // Stadium capsule half-height
    floatingMargin: 16,
    shadow: {
      elevation: 20,
      shadowColor: "#0EA5E9",
      shadowOpacity: 0.35, // Vibrant ambient cyan/sky glow
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 8 },
    },
  },

  /* ---------------------------------------------------------------- *
   * 4. Minimal — Clean minimal bar with active blue dot indicator
   * ---------------------------------------------------------------- */
  minimal: {
    barHeight: 56,
    iconSize: 24,
    labelSize: 0,
    iconLabelGap: 2,
    activeColor: "#0EA5E9", // Sky-500
    inactiveColor: "#64748B", // Slate-500
    backgroundColor: "#FFFFFF",
    borderColor: "rgba(226, 232, 240, 0.8)",
    indicatorColor: "#0EA5E9", // Sky-500 Dot
    indicatorBorderColor: "transparent",
    indicatorBorderWidth: 0,
    indicatorWidth: 5,
    indicatorHeight: 5,
    indicatorRadius: 2.5,
    showTopBorder: true,
    itemPaddingX: 16,
    blur: false,
    blurIntensity: 0,
    blurTint: "default",
    showLabels: false,
    iconPosition: "none",
    animation: "scale",
    activeScale: 1.15,
    floating: false,
    floatingRadius: 0,
    floatingMargin: 0,
    shadow: {
      elevation: 2,
      shadowColor: "#000000",
      shadowOpacity: 0.04,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: -1 },
    },
  },

  /* ---------------------------------------------------------------- *
   * 5. Glass — Pure CSS-spec Glassmorphism (Frosted Glass Card)       *
   * ---------------------------------------------------------------- */
  glass: {
    barHeight: 64,
    iconSize: 22,
    labelSize: 11,
    iconLabelGap: 3,
    activeColor: "#0EA5E9", // Electric Sky Blue active
    inactiveColor: "#475569", // Slate-600 clear inactive
    backgroundColor: "rgba(255, 255, 255, 0.24)", // Exact background: rgba(255, 255, 255, 0.24) from CSS
    borderColor: "rgba(255, 255, 255, 0.35)", // Border 1px solid rgba(255, 255, 255, 0.3)
    indicatorColor: "rgba(255, 255, 255, 0.45)", // Translucent frosted glass active capsule
    indicatorBorderColor: "rgba(255, 255, 255, 0.85)", // Specular white glow border
    indicatorBorderWidth: 1,
    indicatorWidth: "auto",
    indicatorHeight: 46,
    indicatorRadius: 20,
    showTopBorder: false,
    itemPaddingX: 10,
    blur: true,
    blurIntensity: 80,
    blurTint: "light",
    showLabels: true,
    iconPosition: "top",
    animation: "spring",
    activeScale: 1.1,
    floating: true,
    floatingRadius: 24, // border-radius: 20px / 24px
    floatingMargin: 16,
    shadow: {
      elevation: 25,
      shadowColor: "#555",
      shadowOpacity: 0.15, // Soft cyan/sky ambient shadow
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 8 },
    },
  },

  /* ---------------------------------------------------------------- *
   * 6. Dock — macOS Dock style floating bar with bounce & clear labels
   * ---------------------------------------------------------------- */
  dock: {
    barHeight: 64,
    iconSize: 24,
    labelSize: 10,
    iconLabelGap: 2,
    activeColor: "#0EA5E9", // Sky-500
    inactiveColor: "#64748B", // Slate-500
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderColor: "rgba(226, 232, 240, 0.8)",
    indicatorColor: "#0EA5E9", // Sky-500 Dot
    indicatorBorderColor: "transparent",
    indicatorBorderWidth: 0,
    indicatorWidth: 6,
    indicatorHeight: 6,
    indicatorRadius: 3,
    showTopBorder: false,
    itemPaddingX: 12,
    blur: true,
    blurIntensity: 95,
    blurTint: "light",
    showLabels: true,
    iconPosition: "top",
    animation: "spring",
    activeScale: 1.25, // Bouncy macOS dock bounce
    floating: true,
    floatingRadius: 28,
    floatingMargin: 16,
    shadow: {
      elevation: 16,
      shadowColor: "#000000",
      shadowOpacity: 0.12,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 6 },
    },
  },
};

/**
 * Merge a preset with custom props/overrides with full type safety.
 */
export function resolvePreset(
  preset: TabPreset,
  overrides?: Partial<TabPresetConfig>,
): TabPresetConfig {
  const base = TAB_PRESETS[preset] ?? TAB_PRESETS.ios;
  return { ...base, ...overrides };
}
