/**
 * BottomTabBar — Main container component
 * ========================================
 * Responsibilities:
 *  - Controlled / Uncontrolled tab active state
 *  - Safe Area Insets (bottom / top)
 *  - Keyboard avoidance via SharedValues (worklet-safe)
 *  - Indicator math & context registration
 *  - Reanimated animations
 *
 * Worklet safety:
 *  - shouldHide and keyboardOffset are stored as SharedValues so that
 *    useAnimatedStyle worklets react to them correctly via .value reads.
 *  - barWidth is a React state (not SharedValue) since it is only read
 *    during JS-side render to pass to CenteredIndicator.
 */

import { cn } from "@/lib/utils";
import * as React from "react";
import {
  LayoutChangeEvent,
  Platform,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { TabContext } from "./context";
import { useBlurView, useKeyboardVisible, useSafeAreaInsets } from "./hooks";
import {
  BottomTabIndicator,
  CenteredIndicator,
  DotIndicator,
  ItemLayout,
} from "./indicator";
import { BottomTabItem } from "./item";
import { resolvePreset } from "./presets";
import type { TabBarProps, TabContextValue, TabPresetConfig } from "./types";

const DEFAULT_SPRING = { damping: 22, stiffness: 280, mass: 1 };

function getLinearGradient(): React.ComponentType<any> | null {
  try {
    return require("expo-linear-gradient").LinearGradient;
  } catch {
    return null;
  }
}

export const BottomTabBar = React.memo(function BottomTabBar(
  props: TabBarProps,
) {
  const {
    tabs = [],
    activeIndex: controlled,
    defaultActiveIndex = 0,
    onTabChange,
    onTabLongPress,
    preset: presetName = "minimal",
    orientation = "horizontal",
    showLabels,
    iconPosition,
    activeColor,
    inactiveColor,
    barHeight,
    backgroundColor,
    safeArea = ["bottom"],
    keyboardAvoiding = false,
    hideOnKeyboard = false,
    floating,
    floatingRadius,
    floatingMargin,
    animation = undefined,
    springConfig,
    animationDuration = 220,
    haptic: _haptic = "light",
    sound: _sound = false,
    showTopBorder,
    style,
    className,
    renderIndicator,
    renderItem,
    testID,
    children,
  } = props;

  const resolvedSpringConfig = React.useMemo(
    () => ({
      damping: springConfig?.damping ?? DEFAULT_SPRING.damping,
      stiffness: springConfig?.stiffness ?? DEFAULT_SPRING.stiffness,
      mass: springConfig?.mass ?? DEFAULT_SPRING.mass,
    }),
    [springConfig],
  );

  const isHorizontal = orientation === "horizontal";
  const safe = useSafeAreaInsets();
  const keyboard = useKeyboardVisible();
  const BlurView = useBlurView();

  /* ── Preset ─────────────────────────────────────────────────────── */
  const preset = React.useMemo<TabPresetConfig>(
    () =>
      resolvePreset(presetName, {
        ...(activeColor ? { activeColor } : {}),
        ...(inactiveColor ? { inactiveColor } : {}),
        ...(backgroundColor ? { backgroundColor } : {}),
        ...(barHeight ? { barHeight } : {}),
        ...(floating !== undefined ? { floating } : {}),
        ...(floatingRadius !== undefined ? { floatingRadius } : {}),
        ...(floatingMargin !== undefined ? { floatingMargin } : {}),
        ...(showLabels !== undefined ? { showLabels } : {}),
        ...(iconPosition ? { iconPosition } : {}),
        ...(animation ? { animation } : {}),
        ...(showTopBorder !== undefined ? { showTopBorder } : {}),
      }),
    [
      presetName,
      activeColor,
      inactiveColor,
      backgroundColor,
      barHeight,
      floating,
      floatingRadius,
      floatingMargin,
      showLabels,
      iconPosition,
      animation,
      showTopBorder,
    ],
  );

  /* ── Active state ─────────────────────────────────────────────────── */
  const [internalActive, setInternalActive] =
    React.useState(defaultActiveIndex);
  const isControlled = controlled !== undefined;
  const activeIndex = isControlled ? controlled! : internalActive;

  /* ── Tabs ─────────────────────────────────────────────────────────── */
  const visibleTabs = React.useMemo(
    () => tabs.filter((t) => !t.hidden),
    [tabs],
  );
  const tabsCount = visibleTabs.length;

  /* ── Indicator position ───────────────────────────────────────────── */
  const indicatorPosition = useSharedValue(defaultActiveIndex);
  React.useEffect(() => {
    const { withSpring } = require("react-native-reanimated");
    indicatorPosition.value = withSpring(activeIndex, resolvedSpringConfig);
  }, [activeIndex, indicatorPosition, resolvedSpringConfig]);

  /* ── Item layout registration (for CenteredIndicator) ─────────────── */
  const [barWidth, setBarWidth] = React.useState(0);
  const [tabLayouts, setTabLayouts] = React.useState<ItemLayout[]>([]);

  const registerItem = React.useCallback(
    (index: number, layout: ItemLayout) => {
      setTabLayouts((prev) => {
        const next = [...prev];
        next[index] = layout;
        return next;
      });
    },
    [],
  );

  /* ── Tab change ──────────────────────────────────────────────────── */
  const handleActivate = React.useCallback(
    (index: number) => {
      if (!isControlled) setInternalActive(index);
      const selectedTab = visibleTabs[index];
      onTabChange?.(index, selectedTab);
    },
    [isControlled, onTabChange, visibleTabs],
  );

  /* ── Bar layout ──────────────────────────────────────────────────── */
  const onBarLayout = React.useCallback((e: LayoutChangeEvent) => {
    setBarWidth(e.nativeEvent.layout.width);
  }, []);

  /* ── Safe area ───────────────────────────────────────────────────── */
  const isSafeBottomNeeded = Array.isArray(safeArea)
    ? safeArea.includes("bottom")
    : safeArea === true || safeArea === "bottom";
  const safeBottomInset = isSafeBottomNeeded ? safe.bottom : 0;

  /* ── Keyboard avoidance — SharedValues for worklet safety ─────────── */
  const shouldHideShared = useSharedValue(0);
  const keyboardOffsetShared = useSharedValue(0);

  React.useEffect(() => {
    const willHide = hideOnKeyboard && keyboard.visible;
    const offset = keyboardAvoiding && keyboard.visible ? keyboard.height : 0;
    shouldHideShared.value = withTiming(willHide ? 1 : 0, { duration: 180 });
    keyboardOffsetShared.value = withTiming(offset, {
      duration: 220,
      easing: Easing.out(Easing.ease),
    });
  }, [
    keyboard.visible,
    keyboard.height,
    hideOnKeyboard,
    keyboardAvoiding,
    shouldHideShared,
    keyboardOffsetShared,
  ]);

  const containerAnimStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY:
          shouldHideShared.value > 0.5 ? 200 : -keyboardOffsetShared.value,
      },
    ],
    opacity: withTiming(shouldHideShared.value > 0.5 ? 0 : 1, {
      duration: 160,
    }),
  }));

  /* ── Context ─────────────────────────────────────────────────────── */
  const ctxValue = React.useMemo<TabContextValue>(
    () => ({
      activeIndex,
      setActiveIndex: handleActivate,
      preset: presetName,
      orientation,
      showLabels: preset.showLabels,
      iconPosition: preset.iconPosition,
      activeColor: preset.activeColor,
      inactiveColor: preset.inactiveColor,
      animation: preset.animation,
      animationDuration,
      springConfig: resolvedSpringConfig,
      tabsCount,
      indicatorPosition,
      registerItem,
    }),
    [
      activeIndex,
      handleActivate,
      presetName,
      orientation,
      preset,
      animationDuration,
      resolvedSpringConfig,
      tabsCount,
      indicatorPosition,
      registerItem,
    ],
  );

  /* ── Indicator renderer ──────────────────────────────────────────── */
  const renderIndicatorEl = () => {
    const needsIndicator =
      presetName === "pill" ||
      presetName === "glass" ||
      presetName === "minimal" ||
      presetName === "dock" ||
      presetName === "material" ||
      preset.indicatorWidth !== 0;

    if (!needsIndicator) return null;

    const indicatorProps = {
      position: indicatorPosition,
      count: tabsCount,
      width: preset.indicatorWidth,
      height: preset.indicatorHeight,
      borderRadius: preset.indicatorRadius,
      color: preset.indicatorColor,
      borderColor: preset.indicatorBorderColor,
      borderWidth: preset.indicatorBorderWidth,
      overlay: false,
    };

    if (renderIndicator) {
      return renderIndicator(indicatorProps);
    }

    // Dot indicator for minimal + dock
    if (presetName === "minimal" || presetName === "dock") {
      return (
        <DotIndicator
          {...indicatorProps}
          dotSize={
            typeof preset.indicatorWidth === "number"
              ? preset.indicatorWidth
              : 4
          }
          bottomOffset={8}
        />
      );
    }

    // Morphing pill for pill + glass
    if (presetName === "pill" || presetName === "glass") {
      return (
        <CenteredIndicator
          {...indicatorProps}
          tabLayouts={tabLayouts}
          barWidth={barWidth}
        />
      );
    }

    // Material pill (fixed width, centered behind icon)
    if (presetName === "material") {
      return <BottomTabIndicator {...indicatorProps} />;
    }

    return null;
  };

  /* ── Dynamic styles ──────────────────────────────────────────────── */
  const isFloating = preset.floating;

  const outerContainerStyle: ViewStyle = isHorizontal
    ? isFloating
      ? {
          position: "absolute",
          left: 12,
          right: 12,
          bottom: Math.max(safeBottomInset, 2) + (preset.floatingMargin || 0),
          alignItems: "stretch",
        }
      : {
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
        }
    : {
        position: "absolute",
        left: 0,
        top: 0,
        bottom: 0,
      };

  const computedHeight = isFloating
    ? preset.barHeight
    : preset.barHeight + safeBottomInset;

  const barStyle: ViewStyle = {
    height: isHorizontal ? computedHeight : undefined,
    width: !isHorizontal
      ? preset.barHeight + (isSafeBottomNeeded ? safe.top : 0)
      : undefined,
    paddingBottom: isHorizontal && !isFloating ? safeBottomInset : 0,
    backgroundColor: preset.blur ? "transparent" : preset.backgroundColor,
    ...(preset.showTopBorder && isHorizontal && !isFloating
      ? {
          borderTopWidth: StyleSheet.hairlineWidth * 2,
          borderTopColor: preset.borderColor,
        }
      : {}),
    ...(isFloating
      ? {
          borderRadius: preset.floatingRadius,
          overflow: "hidden",
          borderWidth:
            preset.borderColor !== "transparent" ? StyleSheet.hairlineWidth : 0,
          borderColor: preset.borderColor,
          ...preset.shadow,
        }
      : {
          // Apply elevation even for non-floating bars (material, ios)
          ...(Platform.OS === "android"
            ? { elevation: preset.shadow?.elevation ?? 0 }
            : {}),
        }),
  };

  const renderBarBackground = () => {
    const LinearGradientComp = getLinearGradient();
    const isGlass = presetName === "glass";

    return (
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {/* 1. Blur view layer */}
        {preset.blur && BlurView ? (
          <BlurView
            intensity={preset.blurIntensity}
            tint={preset.blurTint}
            style={StyleSheet.absoluteFill}
          />
        ) : null}

        {/* 2. Glass translucent background overlay */}
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: preset.backgroundColor },
          ]}
        />

        {/* 3. True Glassmorphism & Specular highlights for pill & glass */}
        {(isGlass || presetName === "pill") && (
          <>
            {LinearGradientComp ? (
              <>
                {/* Top highlight line (::before gradient) */}
                <LinearGradientComp
                  colors={[
                    "transparent",
                    isGlass
                      ? "rgba(255, 255, 255, 0.85)"
                      : "rgba(255, 255, 255, 0.25)",
                    "transparent",
                  ]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.glassTopHighlight}
                />

                {/* Left highlight line (::after gradient: rgba(255,255,255,0.8) -> transparent -> rgba(255,255,255,0.3)) */}
                <LinearGradientComp
                  colors={[
                    "rgba(255, 255, 255, 0.85)",
                    "transparent",
                    "rgba(255, 255, 255, 0.3)",
                  ]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={styles.glassLeftHighlight}
                />

                {/* Inset specular glow (inset 0 1px 0 rgba(255,255,255,0.5)) */}
                <LinearGradientComp
                  colors={[
                    "rgba(255, 255, 255, 0.40)",
                    "rgba(255, 255, 255, 0.08)",
                    "transparent",
                  ]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={[
                    styles.glassInnerShine,
                    { borderRadius: preset.floatingRadius },
                  ]}
                />
              </>
            ) : (
              <View
                style={[
                  styles.glassTopHighlight,
                  { backgroundColor: "rgba(255, 255, 255, 0.6)" },
                ]}
              />
            )}
          </>
        )}
      </View>
    );
  };

  const renderItems = () => {
    if (children) return children;
    return visibleTabs.map((tab, index) => (
      <BottomTabItem
        key={tab.id}
        {...tab}
        index={index}
        isControlled={isControlled}
        onActivate={handleActivate}
        onLongPressExternal={(i) => onTabLongPress?.(i, visibleTabs[i])}
        preset={preset}
        animationDuration={animationDuration}
        renderItem={renderItem}
      />
    ));
  };

  return (
    <Animated.View
      style={[outerContainerStyle, containerAnimStyle]}
      pointerEvents={keyboard.visible && hideOnKeyboard ? "none" : "box-none"}
      testID={testID}
    >
      <TabContext.Provider value={ctxValue}>
        <View
          onLayout={onBarLayout}
          style={[
            styles.bar,
            isHorizontal
              ? { flexDirection: "row", alignItems: "stretch" }
              : { flexDirection: "column", alignItems: "stretch" },
            barStyle,
            style,
          ]}
          className={cn(className)}
          accessibilityRole="tablist"
        >
          {renderBarBackground()}
          {renderIndicatorEl()}
          {renderItems()}
        </View>
      </TabContext.Provider>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  bar: {
    position: "relative",
    overflow: "visible",
  } as ViewStyle,
  glassTopHighlight: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1.5,
    zIndex: 10,
  } as ViewStyle,
  glassLeftHighlight: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    width: 1.5,
    zIndex: 10,
  } as ViewStyle,
  glassInnerShine: {
    position: "absolute",
    top: 1,
    left: 1,
    right: 1,
    height: 22,
    zIndex: 5,
  } as ViewStyle,
});

BottomTabBar.displayName = "BottomTabBar";
