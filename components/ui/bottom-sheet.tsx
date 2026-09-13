import { Text } from '@/components/ui/text';
import { useColor } from '@/hooks/use-color';
import { useHaptics } from '@/hooks/use-haptics';
import { useKeyboardHeight } from '@/hooks/use-keyboard-height';
import { BORDER_RADIUS } from '@/theme/globals';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableWithoutFeedback,
  useWindowDimensions,
  View,
  ViewStyle,
} from 'react-native';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export interface BottomSheetProps {
  isVisible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  snapPoints?: number[];
  initialSnapPoint?: number;
  enableBackdropDismiss?: boolean;
  title?: string;
  style?: ViewStyle;
  disablePanGesture?: boolean;
  keyboardBehavior?: 'resize' | 'pan' | 'extend' | 'none';
  onSnapChange?: (index: number) => void;
  backdropBlur?: boolean;
  hideHandle?: boolean;
  handleIndicatorStyle?: ViewStyle;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  trapFocus?: boolean;
  restoreFocus?: boolean;
}

const SPRING_CONFIG = {
  damping: 32,
  stiffness: 380,
  mass: 0.8,
};

type BottomSheetContentProps = {
  children: React.ReactNode;
  title?: string;
  style?: ViewStyle;
  rBottomSheetStyle: any;
  cardColor: string;
  mutedColor: string;
  screenHeight: number;
  hideHandle?: boolean;
  handleIndicatorStyle?: ViewStyle;
  onHandlePress?: () => void;
};

const BottomSheetContent = React.memo(function BottomSheetContent({
  children,
  title,
  style,
  rBottomSheetStyle,
  cardColor,
  mutedColor,
  screenHeight,
  hideHandle = false,
  handleIndicatorStyle,
  onHandlePress,
}: BottomSheetContentProps) {
  const insets = useSafeAreaInsets();

  return (
    <Animated.View
      style={[
        styles.sheetContainer,
        {
          height: screenHeight,
          top: screenHeight,
          backgroundColor: cardColor,
          borderTopLeftRadius: BORDER_RADIUS * 1.5,
          borderTopRightRadius: BORDER_RADIUS * 1.5,
        },
        rBottomSheetStyle,
        style,
      ]}
    >
      {/* Drag Handle */}
      {!hideHandle && (
        <TouchableWithoutFeedback onPress={onHandlePress}>
          <View styles-accessibility-role='button' style={styles.handleArea}>
            <View
              style={[
                styles.handleBar,
                { backgroundColor: mutedColor },
                handleIndicatorStyle,
              ]}
            />
          </View>
        </TouchableWithoutFeedback>
      )}

      {/* Sheet Title */}
      {!!title && (
        <View style={styles.headerArea}>
          <Text variant='title' style={styles.headerTitle}>
            {title}
          </Text>
        </View>
      )}

      {/* Scrollable Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom + 16, 24) },
        ]}
        keyboardShouldPersistTaps='handled'
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {children}
      </ScrollView>
    </Animated.View>
  );
});

export function BottomSheet({
  isVisible,
  onClose,
  children,
  snapPoints = [0.35, 0.65, 0.9],
  initialSnapPoint = 0,
  enableBackdropDismiss = true,
  title,
  style,
  disablePanGesture = false,
  onSnapChange,
  hideHandle = false,
  handleIndicatorStyle,
  accessibilityLabel = 'Bottom Sheet',
  accessibilityHint = 'Swipe down to dismiss',
}: BottomSheetProps) {
  const cardColor = useColor('card');
  const mutedColor = useColor('muted');
  const haptic = useHaptics();
  const { keyboardHeight, isKeyboardVisible } = useKeyboardHeight();
  const { height: screenHeight } = useWindowDimensions();

  const translateY = useSharedValue(0);
  const contextY = useSharedValue(0);
  const opacity = useSharedValue(0);
  const currentSnapIndex = useSharedValue(initialSnapPoint);
  const keyboardOffset = useSharedValue(0);

  const [modalVisible, setModalVisible] = React.useState(false);

  // Compute snap height values (negative offset from screen height)
  const snapHeights = useMemo(
    () => snapPoints.map((point) => -screenHeight * Math.min(Math.max(point, 0.1), 0.98)),
    [snapPoints, screenHeight]
  );
  const defaultHeight = snapHeights[Math.min(initialSnapPoint, snapHeights.length - 1)] ?? snapHeights[0];
  const maxTranslateY = snapHeights[snapHeights.length - 1] - 30;

  // React to keyboard height changes smoothly
  useEffect(() => {
    if (isKeyboardVisible && keyboardHeight > 0) {
      keyboardOffset.value = withSpring(keyboardHeight * 0.85, SPRING_CONFIG);
    } else {
      keyboardOffset.value = withSpring(0, SPRING_CONFIG);
    }
  }, [keyboardHeight, isKeyboardVisible, keyboardOffset]);

  const notifySnapChange = useCallback(
    (index: number) => {
      if (onSnapChange) {
        onSnapChange(index);
      }
      haptic('selection');
    },
    [onSnapChange, haptic]
  );

  // Animate open/close on visibility prop change
  useEffect(() => {
    if (isVisible) {
      setModalVisible(true);
      translateY.value = withSpring(defaultHeight, SPRING_CONFIG);
      opacity.value = withTiming(1, { duration: 250 });
      currentSnapIndex.value = initialSnapPoint;
    } else {
      translateY.value = withSpring(0, SPRING_CONFIG);
      opacity.value = withTiming(0, { duration: 200 }, (finished) => {
        if (finished) {
          runOnJS(setModalVisible)(false);
        }
      });
    }
  }, [isVisible, defaultHeight, initialSnapPoint, opacity, translateY]);

  const animateClose = useCallback(() => {
    'worklet';
    translateY.value = withSpring(0, SPRING_CONFIG);
    opacity.value = withTiming(0, { duration: 200 }, (finished) => {
      if (finished) {
        runOnJS(onClose)();
      }
    });
  }, [onClose, opacity, translateY]);

  const findClosestSnapPoint = useCallback(
    (currentY: number) => {
      'worklet';
      let closestIndex = 0;
      let minDistance = Math.abs(currentY - snapHeights[0]);

      for (let i = 1; i < snapHeights.length; i++) {
        const dist = Math.abs(currentY - snapHeights[i]);
        if (dist < minDistance) {
          minDistance = dist;
          closestIndex = i;
        }
      }
      return { snapHeight: snapHeights[closestIndex], index: closestIndex };
    },
    [snapHeights]
  );

  const handleHandlePress = useCallback(() => {
    const nextIndex = (currentSnapIndex.value + 1) % snapHeights.length;
    currentSnapIndex.value = nextIndex;
    translateY.value = withSpring(snapHeights[nextIndex], SPRING_CONFIG);
    if (onSnapChange) {
      runOnJS(notifySnapChange)(nextIndex);
    }
  }, [snapHeights, currentSnapIndex, notifySnapChange, onSnapChange, translateY]);

  const gesture = Gesture.Pan()
    .enabled(!disablePanGesture)
    .onStart(() => {
      contextY.value = translateY.value;
    })
    .onUpdate((event) => {
      const nextY = contextY.value + event.translationY;
      if (nextY <= 0 && nextY >= maxTranslateY) {
        translateY.value = nextY;
      }
    })
    .onEnd((event) => {
      const currentY = translateY.value;
      const velocity = event.velocityY;

      // Drag down fast or past 25% threshold -> dismiss
      if (velocity > 600 || currentY > -screenHeight * 0.15) {
        animateClose();
        return;
      }

      const { snapHeight, index } = findClosestSnapPoint(currentY);
      currentSnapIndex.value = index;
      translateY.value = withSpring(snapHeight, SPRING_CONFIG);
      if (onSnapChange) {
        runOnJS(notifySnapChange)(index);
      }
    });

  const rBottomSheetStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateY: translateY.value - keyboardOffset.value },
      ],
    };
  });

  const rBackdropStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
    };
  });

  const handleBackdropPress = useCallback(() => {
    if (enableBackdropDismiss) {
      animateClose();
    }
  }, [enableBackdropDismiss, animateClose]);

  if (!modalVisible) return null;

  return (
    <Modal
      visible={modalVisible}
      transparent
      statusBarTranslucent
      animationType='none'
      onRequestClose={enableBackdropDismiss ? onClose : undefined}
    >
      <GestureHandlerRootView style={styles.rootView}>
        <Animated.View
          style={[styles.backdrop, rBackdropStyle]}
          accessibilityViewIsModal
          accessibilityLabel={accessibilityLabel}
          accessibilityHint={accessibilityHint}
        >
          <Pressable style={styles.backdropPressable} onPress={handleBackdropPress} />

          {disablePanGesture ? (
            <BottomSheetContent
              title={title}
              style={style}
              rBottomSheetStyle={rBottomSheetStyle}
              cardColor={cardColor}
              mutedColor={mutedColor}
              screenHeight={screenHeight}
              hideHandle={hideHandle}
              handleIndicatorStyle={handleIndicatorStyle}
              onHandlePress={handleHandlePress}
            >
              {children}
            </BottomSheetContent>
          ) : (
            <GestureDetector gesture={gesture}>
              <BottomSheetContent
                title={title}
                style={style}
                rBottomSheetStyle={rBottomSheetStyle}
                cardColor={cardColor}
                mutedColor={mutedColor}
                screenHeight={screenHeight}
                hideHandle={hideHandle}
                handleIndicatorStyle={handleIndicatorStyle}
                onHandlePress={handleHandlePress}
              >
                {children}
              </BottomSheetContent>
            </GestureDetector>
          )}
        </Animated.View>
      </GestureHandlerRootView>
    </Modal>
  );
}

export function useBottomSheet() {
  const [isVisible, setIsVisible] = React.useState(false);

  const open = useCallback(() => {
    setIsVisible(true);
  }, []);

  const close = useCallback(() => {
    setIsVisible(false);
  }, []);

  const toggle = useCallback(() => {
    setIsVisible((prev) => !prev);
  }, []);

  return {
    isVisible,
    open,
    close,
    toggle,
  };
}

const styles = StyleSheet.create({
  rootView: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  backdropPressable: {
    flex: 1,
  },
  sheetContainer: {
    width: '100%',
    position: 'absolute',
    left: 0,
    right: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 20,
    overflow: 'hidden',
  },
  handleArea: {
    width: '100%',
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handleBar: {
    width: 48,
    height: 5,
    borderRadius: 999,
    opacity: 0.7,
  },
  headerArea: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    alignItems: 'center',
  },
  headerTitle: {
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
});