import { cn } from '@/lib/utils'
import { Slot } from '@rn-primitives/slot'
import {
  Pressable,
  PressableProps,
  View,
  ViewStyle,
  TextStyle,
  Modal,
  ModalProps,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native'
import { forwardRef, useEffect, useRef } from 'react'
import { Text } from './text'

interface SheetProps
  extends Omit<ModalProps, 'visible' | 'children' | 'onRequestClose'> {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
  className?: string
  style?: ViewStyle | ViewStyle[]
  contentStyle?: ViewStyle
}

export const Sheet = forwardRef<Modal, SheetProps>(
  (
    {
      open = false,
      onOpenChange,
      children,
      className,
      style,
      contentStyle,
      ...props
    },
    ref
  ) => {
    const handleRequestClose = () => {
      onOpenChange?.(false)
    }

    return (
      <Modal
        ref={ref}
        visible={open}
        onRequestClose={handleRequestClose}
        transparent={true}
        className={className}
        style={style}
        data-slot="sheet"
        {...props}
      >
        <Pressable
          style={styles.underlay}
          onPress={handleRequestClose}
          data-slot="sheet-underlay"
        />
        <SheetContent
          style={contentStyle}
          data-slot="sheet-content"
        >
          {children}
        </SheetContent>
      </Modal>
    )
  }
)
Sheet.displayName = 'Sheet'

interface SheetTriggerProps
  extends Omit<PressableProps, 'style' | 'children' | 'onPress'> {
  asChild?: boolean
  children: React.ReactNode
  className?: string
  style?: ViewStyle | ViewStyle[]
}

export const SheetTrigger = forwardRef<typeof Pressable, SheetTriggerProps>(
  (
    {
      asChild = false,
      children,
      className,
      style,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : Pressable
    return (
      <Comp
        ref={ref}
        className={className}
        style={style}
        data-slot="sheet-trigger"
        {...props}
      >
        {children}
      </Comp>
    )
  }
)
SheetTrigger.displayName = 'SheetTrigger'

interface SheetContentProps
  extends Omit<ViewStyle, 'style'> {
  children: React.ReactNode
  className?: string
  style?: ViewStyle | ViewStyle[]
}

export const SheetContent = forwardRef<View, SheetContentProps>(
  (
    {
      children,
      className,
      style,
      ...props
    },
    ref
  ) => {
    const translateY = useRef(new Animated.Value(0)).current

    useEffect(() => {
      Animated.timing(translateY, {
        toValue: 0,
        duration: 250,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start()
    }, [translateY])

    const animatedStyle = {
      transform: [{ translateY }],
    }

    return (
      <Animated.View
        ref={ref}
        className={cn(
          'fixed bottom-0 left-0 right-0 z-50 rounded-t-[10px] bg-background p-6 shadow-lg',
          'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom',
          className
        )}
        style={[
          style,
          animatedStyle,
        ]}
        data-slot="sheet-content"
        {...props}
      >
        {children}
      </Animated.View>
    )
  }
)
SheetContent.displayName = 'SheetContent'

interface SheetHeaderProps
  extends Omit<ViewStyle, 'style'> {
  children: React.ReactNode
  className?: string
  style?: ViewStyle | ViewStyle[]
}

export const SheetHeader = forwardRef<View, SheetHeaderProps>(
  (
    {
      children,
      className,
      style,
      ...props
    },
    ref
  ) => {
    return (
      <View
        ref={ref}
        className={cn(
          'flex flex-col space-y-1.5 text-center sm:text-left',
          className
        )}
        style={style}
        data-slot="sheet-header"
        {...props}
      >
        {children}
      </View>
    )
  }
)
SheetHeader.displayName = 'SheetHeader'

interface SheetTitleProps
  extends Omit<ViewStyle, 'style'> {
  children: React.ReactNode
  className?: string
  style?: TextStyle | TextStyle[]
}

export const SheetTitle = forwardRef<any, SheetTitleProps>(
  (
    {
      children,
      className,
      style,
      ...props
    },
    ref
  ) => {
    return (
      <Text
        ref={ref}
        variant="title"
        className={cn(
          'text-lg font-semibold leading-none tracking-tight',
          className
        )}
        style={style}
        data-slot="sheet-title"
        {...props}
      >
        {children}
      </Text>
    )
  }
)
SheetTitle.displayName = 'SheetTitle'

interface SheetDescriptionProps
  extends Omit<ViewStyle, 'style'> {
  children: React.ReactNode
  className?: string
  style?: TextStyle | TextStyle[]
}

export const SheetDescription = forwardRef<any, SheetDescriptionProps>(
  (
    {
      children,
      className,
      style,
      ...props
    },
    ref
  ) => {
    return (
      <Text
        ref={ref}
        variant="caption"
        className={cn('text-muted-foreground', className)}
        style={style}
        data-slot="sheet-description"
        {...props}
      >
        {children}
      </Text>
    )
  }
)
SheetDescription.displayName = 'SheetDescription'

interface SheetFooterProps
  extends Omit<ViewStyle, 'style'> {
  children: React.ReactNode
  className?: string
  style?: ViewStyle | ViewStyle[]
}

export const SheetFooter = forwardRef<View, SheetFooterProps>(
  (
    {
      children,
      className,
      style,
      ...props
    },
    ref
  ) => {
    return (
      <View
        ref={ref}
        className={cn(
          'flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 mt-4',
          className
        )}
        style={style}
        data-slot="sheet-footer"
        {...props}
      >
        {children}
      </View>
    )
  }
)
SheetFooter.displayName = 'SheetFooter'

interface SheetCloseProps
  extends Omit<PressableProps, 'style' | 'children' | 'onPress'> {
  asChild?: boolean
  children?: React.ReactNode
  className?: string
  style?: ViewStyle | ViewStyle[]
}

export const SheetClose = forwardRef<typeof Pressable, SheetCloseProps>(
  (
    {
      asChild = false,
      children,
      className,
      style,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : Pressable
    return (
      <Comp
        ref={ref}
        className={cn(
          'absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none',
          className
        )}
        style={style}
        data-slot="sheet-close"
        {...props}
      >
        {children || (
          <View style={styles.closeIcon} data-slot="sheet-close-icon">
            <Text variant="caption" style={styles.closeIconText}>✕</Text>
          </View>
        )}
      </Comp>
    )
  }
)
SheetClose.displayName = 'SheetClose'

const styles = StyleSheet.create({
  underlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  closeIcon: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIconText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
})