/**
 * Tab Item — Individual tab button inside BottomTabBar
 * ====================================================
 * Key design decisions:
 *  - `isActiveShared` SharedValue drives all worklet animations to avoid
 *    stale JS closures inside useAnimatedStyle.
 *  - Press scale is a crisp spring, not a timing animation.
 *  - Label morphs from 0-width (hidden) to full-width for 'morph' animation,
 *    using overflow:hidden for clean clipping without layout jumps.
 *  - Active background is painted as a separate Animated.View behind the content
 *    to allow the indicator to sit at z=0 without fighting with item backgrounds.
 */

import * as React from "react";
import {
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { BottomTabBadge } from "./badge";
import { useTabContext } from "./context";
import { useHaptic } from "./hooks";
import { BottomTabIcon } from "./icon";
import type { TabItemProps, TabPresetConfig } from "./types";

const PRESS_SPRING = { damping: 18, stiffness: 350, mass: 0.7 };

interface BottomTabItemInternalProps extends TabItemProps {
  index: number;
  isControlled: boolean;
  onActivate: (index: number) => void;
  onLongPressExternal?: (index: number) => void;
  preset: TabPresetConfig;
  animationDuration: number;
  renderItem?: (item: TabItemProps, params: any) => React.ReactNode;
}

export const BottomTabItem = React.memo(function BottomTabItem(
  props: BottomTabItemInternalProps,
) {
  const {
    id: _id,
    label,
    icon,
    iconActive,
    badge,
    disabled = false,
    hidden = false,
    activeColor,
    inactiveColor,
    haptic = "light",
    accessibilityLabel,
    render,
    onLongPress,
    style,
    index,
    isControlled: _isControlled,
    onActivate,
    onLongPressExternal,
    preset,
    animationDuration,
    renderItem,
  } = props;

  const ctx = useTabContext();
  const fireHaptic = useHaptic();
  const isActive = ctx.activeIndex === index;

  // ─── Shared Values ────────────────────────────────────────────────
  // Using a SharedValue for isActive prevents stale closures in worklets
  const isActiveShared = useSharedValue(isActive ? 1 : 0);
  const pressScale = useSharedValue(1);

  React.useEffect(() => {
    isActiveShared.value = withTiming(isActive ? 1 : 0, {
      duration: animationDuration,
      easing: Easing.out(Easing.cubic),
    });
  }, [isActive, animationDuration, isActiveShared]);

  // ─── Layout measurement ───────────────────────────────────────────
  const handleLayout = React.useCallback(
    (e: LayoutChangeEvent) => {
      const { x, y, width: w, height: h } = e.nativeEvent.layout;
      ctx.registerItem(index, { x, y, w, h });
    },
    [ctx, index],
  );

  // ─── Press handlers ───────────────────────────────────────────────
  const handlePressIn = React.useCallback(() => {
    pressScale.value = withSpring(0.9, PRESS_SPRING);
  }, [pressScale]);

  const handlePressOut = React.useCallback(() => {
    pressScale.value = withSpring(1, PRESS_SPRING);
  }, [pressScale]);

  const handlePress = React.useCallback(() => {
    if (disabled) return;
    fireHaptic(haptic);
    onActivate(index);
  }, [disabled, fireHaptic, haptic, onActivate, index]);

  const handleLongPress = React.useCallback(() => {
    if (disabled) return;
    fireHaptic("medium");
    onLongPress?.();
    onLongPressExternal?.(index);
  }, [disabled, fireHaptic, onLongPress, onLongPressExternal, index]);

  // ─── Colour resolution ────────────────────────────────────────────
  const finalActiveColor = activeColor ?? ctx.activeColor;
  const finalInactiveColor = inactiveColor ?? ctx.inactiveColor;

  // ─── Animated styles ─────────────────────────────────────────────
  const containerAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }],
  }));

  const animatedTextStyle = useAnimatedStyle(() => ({
    color: interpolateColor(
      isActiveShared.value,
      [0, 1],
      [finalInactiveColor, finalActiveColor],
    ),
    fontWeight: isActiveShared.value > 0.5 ? ("700" as any) : ("500" as any),
  }));

  // Label: morph (expand from 0 width) or fade
  const labelAnimStyle = useAnimatedStyle(() => {
    if (preset.animation === "morph") {
      return {
        opacity: isActiveShared.value,
        maxWidth: interpolate(
          isActiveShared.value,
          [0, 1],
          [0, 96],
          Extrapolation.CLAMP,
        ),
        marginLeft: interpolate(
          isActiveShared.value,
          [0, 1],
          [0, 7],
          Extrapolation.CLAMP,
        ),
      };
    }
    return {
      opacity: interpolate(
        isActiveShared.value,
        [0, 1],
        [preset.showLabels ? 0.65 : 0, 1],
        Extrapolation.CLAMP,
      ),
    };
  });

  if (hidden) return null;

  // ─── Icon resolution ─────────────────────────────────────────────
  const getIconProps = (src: typeof icon) => {
    if (!src) return { children: undefined };
    if (React.isValidElement(src) || typeof src === "function")
      return { children: src };
    if (typeof src === "object") return src as any;
    return { children: src };
  };

  const iconProps = getIconProps(icon);
  const iconActiveProps = getIconProps(iconActive);
  const activeChildren =
    isActive && iconActiveProps.children
      ? iconActiveProps.children
      : iconProps.children;

  const renderIconEl = () => {
    const targetColor = isActive ? finalActiveColor : finalInactiveColor;
    return (
      <BottomTabIcon
        {...iconProps}
        size={iconProps.size ?? preset.iconSize}
        resolvedColor={targetColor}
        active={isActive}
        activeScale={preset.activeScale}
      >
        {activeChildren}
      </BottomTabIcon>
    );
  };

  const renderLabelEl = () => {
    if (!label) return null;
    if (!preset.showLabels && preset.animation !== "morph") return null;
    return (
      <Animated.Text
        style={[
          styles.label,
          animatedTextStyle,
          { fontSize: preset.labelSize || 12 },
        ]}
        numberOfLines={1}
      >
        {label}
      </Animated.Text>
    );
  };

  const renderBadgeEl = () => {
    if (!badge) return null;
    if (badge.showWhenActive && !isActive) return null;
    return <BottomTabBadge {...badge} />;
  };

  // ─── Layout styles ────────────────────────────────────────────────
  const itemContainerStyle: ViewStyle = {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: preset.itemPaddingX,
    opacity: disabled ? 0.38 : 1,
  };

  const innerStyle: ViewStyle =
    preset.iconPosition === "top"
      ? {
          flexDirection: "column",
          alignItems: "center",
          gap: preset.iconLabelGap,
        }
      : preset.iconPosition === "leading"
        ? {
            flexDirection: "row",
            alignItems: "center",
            gap: 0, // gap controlled by label margin in labelAnimStyle
            overflow: "hidden",
          }
        : { alignItems: "center", justifyContent: "center" };

  // Custom render prop overrides
  if (render) {
    return (
      <View onLayout={handleLayout} style={itemContainerStyle}>
        {render({
          active: isActive,
          focused: isActive,
          pressed: false,
          preset: ctx.preset,
          index,
          progress: isActiveShared,
        })}
      </View>
    );
  }

  if (renderItem) {
    return (
      <View onLayout={handleLayout} style={itemContainerStyle}>
        {renderItem(props, {
          active: isActive,
          focused: isActive,
          pressed: false,
          preset: ctx.preset,
          index,
          progress: isActiveShared,
        })}
      </View>
    );
  }

  return (
    <Pressable
      onLayout={handleLayout}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onLongPress={handleLongPress}
      disabled={disabled}
      delayLongPress={400}
      style={itemContainerStyle}
      accessibilityRole="tab"
      accessibilityState={{ selected: isActive, disabled }}
      accessibilityLabel={accessibilityLabel ?? label ?? `Tab ${index + 1}`}
    >
      <Animated.View
        style={[innerStyle, containerAnimStyle, style as ViewStyle]}
      >
        <View style={styles.iconWrap}>
          {renderIconEl()}
          {renderBadgeEl()}
        </View>
        <Animated.View style={[styles.labelContainer, labelAnimStyle]}>
          {renderLabelEl()}
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  iconWrap: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  labelContainer: {
    overflow: "hidden",
  },
  label: {
    fontWeight: "600",
    textAlign: "center",
    letterSpacing: 0.1,
  } as TextStyle,
});

BottomTabItem.displayName = "BottomTabItem";
