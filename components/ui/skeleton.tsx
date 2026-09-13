import { cn } from '@/lib/utils';
import { View, ViewStyle, StyleSheet } from 'react-native';
import { forwardRef } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';

type SkeletonVariant = 'text' | 'circular' | 'rectangular';
type SkeletonSize = 'sm' | 'md' | 'lg' | 'xl' | number;

interface SkeletonProps {
  variant?: SkeletonVariant;
  width?: SkeletonSize;
  height?: SkeletonSize;
  className?: string;
  style?: ViewStyle | ViewStyle[];
  animated?: boolean;
  animationDuration?: number;
}

export const Skeleton = forwardRef<View, SkeletonProps>(
  (
    {
      variant = 'text',
      width = '100%',
      height,
      className,
      style,
      animated = true,
      animationDuration = 1500,
    },
    ref
  ) => {
    const pulse = useSharedValue(0.5);

    useEffect(() => {
      if (animated) {
        pulse.value = withTiming(1, { duration: animationDuration, easing: Easing.inOut(Easing.quad) }, () => {
          pulse.value = withTiming(0.5, { duration: animationDuration, easing: Easing.inOut(Easing.quad) });
        });
      }
    }, [animated, animationDuration]);

    const animatedStyle = useAnimatedStyle(() => ({
      opacity: pulse.value,
    }));

    const baseStyles = {
      text: { borderRadius: 4, height: height ?? 16 } as ViewStyle,
      circular: { borderRadius: 9999, width: width, height: height ?? width } as ViewStyle,
      rectangular: { borderRadius: 8, width: width, height: height ?? 120 } as ViewStyle,
    } as const;

    return (
      <View
        ref={ref}
        className={cn('overflow-hidden bg-muted', className)}
        style={[
          baseStyles[variant],
          { width: typeof width === 'number' ? width : undefined },
          style,
        ]}
        data-slot="skeleton"
      >
        {animated && <Animated.View style={[StyleSheet.absoluteFill, animatedStyle]} />}
      </View>
    )
  }
);
Skeleton.displayName = 'Skeleton';

import { useEffect } from 'react';