import { cn } from '@/lib/utils';
import { View, ViewStyle, StyleSheet } from 'react-native';
import { forwardRef, useEffect } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';

interface ProgressProps {
  value: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'indeterminate';
  className?: string;
  style?: ViewStyle | ViewStyle[];
  animationDuration?: number;
}

const sizeClasses: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'h-1',
  md: 'h-2',
  lg: 'h-3',
};

export const Progress = forwardRef<View, ProgressProps>(
  (
    {
      value,
      max = 100,
      size = 'md',
      variant = 'default',
      className,
      style,
      animationDuration = 500,
    },
    ref
  ) => {
    const progress = useSharedValue(0);
    const clampedValue = Math.max(0, Math.min(100, (value / max) * 100));

    useEffect(() => {
      progress.value = withTiming(clampedValue / 100, {
        duration: animationDuration,
        easing: Easing.out(Easing.quad),
      });
    }, [clampedValue, animationDuration]);

    const animatedStyle = useAnimatedStyle(() => ({
      width: `${progress.value * 100}%`,
    }));

    return (
      <View
        ref={ref}
        className={cn(
          'relative overflow-hidden bg-muted rounded-full',
          sizeClasses[size],
          className
        )}
        style={style}
        data-slot="progress"
        role="progressbar"
        aria-valuenow={variant === 'indeterminate' ? undefined : Math.round(clampedValue)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <Animated.View
          style={[
            styles.bar,
            animatedStyle,
            variant === 'indeterminate' && styles.indeterminate,
          ]}
          className="bg-primary"
          data-slot="progress-indicator"
        />
      </View>
    )
  }
);
Progress.displayName = 'Progress';

const styles = StyleSheet.create({
  bar: {
    height: '100%',
    borderRadius: 9999,
  },
  indeterminate: {
    width: '30%',
  },
});