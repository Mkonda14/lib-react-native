import { Text } from '@/components/ui/text';
import { useColor } from '@/hooks/use-color';
import { useHaptics } from '@/hooks/use-haptics';
import { CORNERS, FONT_SIZE } from '@/theme/globals';
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  TextInput,
  TextInputKeyPressEventData,
  TextInputProps,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

export interface InputOTPProps
  extends Omit<TextInputProps, 'style' | 'value' | 'onChangeText'> {
  /** Number of OTP digits (default 6) */
  length?: number;
  /** Current OTP value */
  value?: string;
  /** Called when OTP value changes */
  onChangeText?: (value: string) => void;
  /** Called when OTP is complete */
  onComplete?: (value: string) => void;
  /** Error message to display */
  error?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Container style */
  containerStyle?: ViewStyle;
  /** Individual slot style */
  slotStyle?: ViewStyle;
  /** Error text style */
  errorStyle?: TextStyle;
  /** Whether to mask the input (show dots instead of numbers) */
  masked?: boolean;
  /** Custom mask character (default '•') */
  maskChar?: string;
  /** Separator component between slots */
  separator?: React.ReactNode;
  /** Whether to show cursor in active slot */
  showCursor?: boolean;
  /** Whether to trigger haptic feedback when the code is complete */
  haptic?: boolean;
}

export interface InputOTPRef {
  focus: () => void;
  blur: () => void;
  clear: () => void;
  getValue: () => string;
}

// Blinking Cursor Component using Reanimated
const AnimatedCursor = React.memo(function AnimatedCursor({ color }: { color: string }) {
  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.1, { duration: 500 }),
        withTiming(1, { duration: 500 })
      ),
      -1,
      true
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.cursorBar,
        { backgroundColor: color },
        animatedStyle,
      ]}
    />
  );
});

// Single OTP Slot (Memoized for peak rendering performance)
interface OTPSlotProps {
  index: number;
  length: number;
  digit: string;
  hasValue: boolean;
  isActive: boolean;
  disabled: boolean;
  masked: boolean;
  maskChar: string;
  showCursor: boolean;
  error?: string;
  slotStyle?: ViewStyle;
  cardColor: string;
  textColor: string;
  mutedColor: string;
  borderColor: string;
  primaryColor: string;
  dangerColor: string;
  onPress: () => void;
}

const OTPSlot = React.memo(function OTPSlot({
  index,
  length,
  digit,
  hasValue,
  isActive,
  disabled,
  masked,
  maskChar,
  showCursor,
  error,
  slotStyle,
  cardColor,
  textColor,
  mutedColor,
  borderColor,
  primaryColor,
  dangerColor,
  onPress,
}: OTPSlotProps) {
  const displayValue = hasValue ? (masked ? maskChar : digit) : '';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole='keyboardkey'
      accessibilityLabel={
        hasValue
          ? `Digit ${index + 1} of ${length}, ${masked ? 'filled' : digit}`
          : `Digit ${index + 1} of ${length}, empty`
      }
      accessibilityState={{ disabled, selected: isActive }}
      style={[
        styles.slotBase,
        {
          borderRadius: CORNERS,
          borderColor: error
            ? dangerColor
            : isActive
            ? primaryColor
            : borderColor,
          borderWidth: isActive ? 2 : 1,
          backgroundColor: disabled ? mutedColor + '20' : cardColor,
          opacity: disabled ? 0.6 : 1,
        },
        slotStyle,
      ]}
    >
      <Text
        style={[
          styles.slotText,
          {
            color: error ? dangerColor : hasValue ? textColor : mutedColor,
          },
        ]}
      >
        {displayValue}
      </Text>

      {/* Blinking Cursor for active empty slot */}
      {showCursor && isActive && !hasValue && (
        <AnimatedCursor color={primaryColor} />
      )}
    </Pressable>
  );
});

export const InputOTP = forwardRef<InputOTPRef, InputOTPProps>(
  (
    {
      length = 6,
      value = '',
      onChangeText,
      onComplete,
      error,
      disabled = false,
      containerStyle,
      slotStyle,
      errorStyle,
      masked = false,
      maskChar = '•',
      separator,
      showCursor = true,
      haptic = true,
      onFocus,
      onBlur,
      ...textInputProps
    },
    ref
  ) => {
    const [isFocused, setIsFocused] = useState(false);
    const inputRef = useRef<TextInput>(null);
    const triggerHaptic = useHaptics(haptic);

    // Theme colors
    const cardColor = useColor('card');
    const textColor = useColor('text');
    const mutedColor = useColor('textMuted');
    const borderColor = useColor('border');
    const primaryColor = useColor('primary');
    const dangerColor = useColor('red');

    // Clean and normalize value length
    const normalizedValue = useMemo(() => value.slice(0, length), [value, length]);

    // Active slot index
    const activeIndex = Math.min(normalizedValue.length, length - 1);

    // Expose ref actions
    useImperativeHandle(ref, () => ({
      focus: () => inputRef.current?.focus(),
      blur: () => inputRef.current?.blur(),
      clear: () => {
        onChangeText?.('');
      },
      getValue: () => normalizedValue,
    }));

    const handleChangeText = useCallback(
      (text: string) => {
        const cleanText = text.replace(/[^0-9]/g, '').slice(0, length);
        onChangeText?.(cleanText);

        if (cleanText.length === length) {
          triggerHaptic('success');
          onComplete?.(cleanText);
        }
      },
      [length, onChangeText, onComplete, triggerHaptic]
    );

    const handleKeyPress = useCallback(
      (e: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
        const { key } = e.nativeEvent;
        if (key === 'Backspace' && normalizedValue.length > 0) {
          const newValue = normalizedValue.slice(0, -1);
          onChangeText?.(newValue);
        }
      },
      [normalizedValue, onChangeText]
    );

    const handleFocus = useCallback(
      (e: any) => {
        setIsFocused(true);
        onFocus?.(e);
      },
      [onFocus]
    );

    const handleBlur = useCallback(
      (e: any) => {
        setIsFocused(false);
        onBlur?.(e);
      },
      [onBlur]
    );

    const handleSlotPress = useCallback(() => {
      if (!disabled) {
        inputRef.current?.focus();
      }
    }, [disabled]);

    return (
      <View style={[styles.container, containerStyle]}>
        {/* Hidden TextInput handling input & auto-fill */}
        <TextInput
          ref={inputRef}
          value={normalizedValue}
          onChangeText={handleChangeText}
          onKeyPress={handleKeyPress}
          onFocus={handleFocus}
          onBlur={handleBlur}
          keyboardType='number-pad'
          maxLength={length}
          editable={!disabled}
          selectionColor='transparent'
          textContentType='oneTimeCode'
          autoComplete='one-time-code'
          style={styles.hiddenInput}
          {...textInputProps}
        />

        {/* OTP Slots Grid */}
        <View style={[styles.slotsContainer, { gap: separator ? 0 : 8 }]}>
          {Array.from({ length }).map((_, index) => {
            const hasValue = index < normalizedValue.length;
            const isActive = isFocused && index === activeIndex;

            return (
              <React.Fragment key={index}>
                <OTPSlot
                  index={index}
                  length={length}
                  digit={normalizedValue[index] ?? ''}
                  hasValue={hasValue}
                  isActive={isActive}
                  disabled={disabled}
                  masked={masked}
                  maskChar={maskChar}
                  showCursor={showCursor}
                  error={error}
                  slotStyle={slotStyle}
                  cardColor={cardColor}
                  textColor={textColor}
                  mutedColor={mutedColor}
                  borderColor={borderColor}
                  primaryColor={primaryColor}
                  dangerColor={dangerColor}
                  onPress={handleSlotPress}
                />

                {separator && index < length - 1 && (
                  <View style={styles.separatorContainer}>{separator}</View>
                )}
              </React.Fragment>
            );
          })}
        </View>

        {/* Error Message */}
        {!!error && (
          <Text style={[styles.errorText, { color: dangerColor }, errorStyle]}>
            {error}
          </Text>
        )}
      </View>
    );
  }
);

InputOTP.displayName = 'InputOTP';

export const InputOTPWithSeparator = forwardRef<
  InputOTPRef,
  Omit<InputOTPProps, 'separator'>
>((props, ref) => {
  const mutedColor = useColor('textMuted');
  return (
    <InputOTP
      ref={ref}
      separator={<Text style={[styles.separatorText, { color: mutedColor }]}>-</Text>}
      {...props}
    />
  );
});

InputOTPWithSeparator.displayName = 'InputOTPWithSeparator';

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    width: '100%',
  },
  hiddenInput: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
    left: -9999,
  },
  slotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotBase: {
    width: 54,
    height: 58,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  slotText: {
    fontSize: FONT_SIZE + 4,
    fontWeight: '600',
  },
  cursorBar: {
    position: 'absolute',
    width: 2,
    height: 22,
    borderRadius: 1,
  },
  separatorContainer: {
    marginHorizontal: 4,
  },
  separatorText: {
    fontSize: 20,
    fontWeight: '500',
  },
  errorText: {
    textAlign: 'center',
    marginTop: 8,
    fontSize: 14,
    fontWeight: '500',
  },
});