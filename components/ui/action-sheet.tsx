import { cn } from '@/lib/utils';
import { Platform } from 'react-native';
import { ActionSheetIOS } from 'react-native';
import { Pressable, View, ScrollView, Modal, Dimensions, StyleSheet } from 'react-native';
import { forwardRef, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  runOnJS,
  interpolate,
} from 'react-native-reanimated';

import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import { Text } from './text';

export interface ActionSheetOption {
  title: string;
  onPress: () => void;
  destructive?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
}

interface ActionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  message?: string;
  options: ActionSheetOption[];
  cancelLabel?: string;
  className?: string;
}

function IOSActionSheet({ open, onOpenChange, title, message, options, cancelLabel = 'Annuler' }: ActionSheetProps) {
  useEffect(() => {
    if (!open) return;

    const optionTitles = options.map((option) => option.title);
    const destructiveButtonIndex = options.findIndex((option) => option.destructive);
    const disabledButtonIndices = options
      .map((option, index) => (option.disabled ? index : -1))
      .filter((index) => index !== -1);

    ActionSheetIOS.showActionSheetWithOptions(
      {
        title,
        message,
        options: [...optionTitles, cancelLabel],
        cancelButtonIndex: optionTitles.length,
        destructiveButtonIndex: destructiveButtonIndex !== -1 ? destructiveButtonIndex : undefined,
        disabledButtonIndices: disabledButtonIndices.length > 0 ? disabledButtonIndices : undefined,
      },
      (buttonIndex) => {
        if (buttonIndex < optionTitles.length) {
          const option = options[buttonIndex];
          impactAsync(option.destructive ? ImpactFeedbackStyle.Heavy : ImpactFeedbackStyle.Light);
          option.onPress();
        }
        onOpenChange(false);
      }
    );
  }, [open, title, message, options, cancelLabel, onOpenChange]);

  return null;
}

function AndroidActionSheet({
  open,
  onOpenChange,
  title,
  message,
  options,
  cancelLabel = 'Annuler',
  className,
}: ActionSheetProps) {
  const [isSheetVisible, setIsSheetVisible] = useState(open);
  const progress = useSharedValue(open ? 1 : 0);
  const screenHeight = Dimensions.get('window').height;
  const contentHeightRef = useRef(0);

  const haptic = (style: ImpactFeedbackStyle = ImpactFeedbackStyle.Light) => {
    impactAsync(style);
  };

  useEffect(() => {
    if (open) {
      progress.value = withTiming(1, { duration: 250, easing: Easing.out(Easing.quad) }, () => {
        setIsSheetVisible(true);
      });
    } else {
      progress.value = withTiming(0, { duration: 200, easing: Easing.in(Easing.quad) }, (finished) => {
        if (finished) {
          runOnJS(setIsSheetVisible)(false);
        }
      });
    }
  }, [open, progress]);

  const handleOptionPress = (option: ActionSheetOption) => {
    if (!option.disabled) {
      haptic(option.destructive ? ImpactFeedbackStyle.Heavy : ImpactFeedbackStyle.Light);
      option.onPress();
      onOpenChange(false);
    }
  };

  const handleCancel = () => {
    haptic();
    onOpenChange(false);
  };

  const backdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
  }));

  const sheetAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(progress.value, [0, 1], [screenHeight, 0]) }],
  }));

  if (!isSheetVisible) {
    return null;
  }

  return (
    <Modal transparent visible={isSheetVisible} animationType="none" onRequestClose={handleCancel}>
      <Pressable style={styles.backdrop} onPress={handleCancel}>
        <Animated.View style={[styles.backdrop, backdropAnimatedStyle]} />
      </Pressable>

      <Animated.View style={[styles.sheet, sheetAnimatedStyle]} className={className}>
        {(title || message) && (
          <View style={styles.header}>
            {title && <Text variant="title" className="text-center">{title}</Text>}
            {message && <Text variant="caption" className="text-muted-foreground text-center">{message}</Text>}
          </View>
        )}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.options}
          onContentSizeChange={(_, height) => { contentHeightRef.current = height; }}
        >
          {options.map((option, index) => (
            <Pressable
              key={index}
              onPress={() => handleOptionPress(option)}
              disabled={option.disabled}
              className={cn(
                'flex-row items-center px-5 py-4 border-b border-border',
                option.disabled && 'opacity-50',
                option.destructive && 'text-destructive'
              )}
              accessibilityRole="menuitem"
              accessibilityState={{ disabled: option.disabled }}
              accessibilityLabel={option.title}
            >
              {option.icon && <View className="mr-3">{option.icon}</View>}
              <Text variant="body" className="flex-1">{option.title}</Text>
            </Pressable>
          ))}
        </ScrollView>
        <Pressable onPress={handleCancel} className="px-5 py-4 border-t border-border">
          <Text variant="body" className="text-center font-semibold">{cancelLabel}</Text>
        </Pressable>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sheet: {
    backgroundColor: 'rgb(var(--card))',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '85%',
    paddingBottom: 0,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  options: {
    paddingBottom: 8,
  },
});

export const ActionSheet = forwardRef<View, ActionSheetProps>((props, ref) => {
  const { open, onOpenChange, ...rest } = props;

  if (Platform.OS === 'ios') {
    return <IOSActionSheet open={open} onOpenChange={onOpenChange} {...rest} />;
  }

  return <AndroidActionSheet open={open} onOpenChange={onOpenChange} {...rest} />;
});

ActionSheet.displayName = 'ActionSheet';

// Hook for easier ActionSheet usage
export function useActionSheet() {
  const [isVisible, setIsVisible] = useState(false);
  const [config, setConfig] = useState<Omit<ActionSheetProps, 'open' | 'onOpenChange'>>({
    options: [],
  });

  const show = useCallback(
    (actionSheetConfig: Omit<ActionSheetProps, 'open' | 'onOpenChange'>) => {
      setConfig(actionSheetConfig);
      setIsVisible(true);
    },
    []
  );

  const hide = useCallback(() => {
    setIsVisible(false);
  }, []);

  const ActionSheetComponent = useMemo(
    () => <ActionSheet open={isVisible} onOpenChange={setIsVisible} {...config} />,
    [isVisible, config]
  );

  return {
    show,
    hide,
    ActionSheet: ActionSheetComponent,
    isVisible,
  };
}