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
} from 'react-native'
import { forwardRef } from 'react'
import { Text } from './text'

interface DialogProps
  extends Omit<ModalProps, 'visible' | 'children' | 'onRequestClose'> {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
  className?: string
  style?: ViewStyle | ViewStyle[]
  contentStyle?: ViewStyle
}

export const Dialog = forwardRef<Modal, DialogProps>(
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
        data-slot="dialog"
        {...props}
      >
        <Pressable
          style={styles.underlay}
          onPress={handleRequestClose}
          data-slot="dialog-underlay"
        />
        <View
          style={[
            styles.content,
            contentStyle,
          ]}
          data-slot="dialog-content"
        >
          {children}
        </View>
      </Modal>
    )
  }
)
Dialog.displayName = 'Dialog'

interface DialogTriggerProps
  extends Omit<PressableProps, 'style' | 'children' | 'onPress'> {
  asChild?: boolean
  children: React.ReactNode
  className?: string
  style?: ViewStyle | ViewStyle[]
}

export const DialogTrigger = forwardRef<typeof Pressable, DialogTriggerProps>(
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
        data-slot="dialog-trigger"
        {...props}
      >
        {children}
      </Comp>
    )
  }
)
DialogTrigger.displayName = 'DialogTrigger'

interface DialogContentProps
  extends Omit<ViewStyle, 'style'> {
  children: React.ReactNode
  className?: string
  style?: ViewStyle | ViewStyle[]
}

export const DialogContent = forwardRef<View, DialogContentProps>(
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
          'fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg',
          className
        )}
        style={style}
        data-slot="dialog-content"
        {...props}
      >
        {children}
      </View>
    )
  }
)
DialogContent.displayName = 'DialogContent'

interface DialogHeaderProps
  extends Omit<ViewStyle, 'style'> {
  children: React.ReactNode
  className?: string
  style?: ViewStyle | ViewStyle[]
}

export const DialogHeader = forwardRef<View, DialogHeaderProps>(
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
        data-slot="dialog-header"
        {...props}
      >
        {children}
      </View>
    )
  }
)
DialogHeader.displayName = 'DialogHeader'

interface DialogTitleProps
  extends Omit<ViewStyle, 'style'> {
  children: React.ReactNode
  className?: string
  style?: TextStyle | TextStyle[]
}

export const DialogTitle = forwardRef<any, DialogTitleProps>(
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
        ref={ref as any}
        variant="title"
        className={cn('text-lg font-semibold leading-none tracking-tight', className)}
        style={style}
        data-slot="dialog-title"
        {...props}
      >
        {children}
      </Text>
    )
  }
)
DialogTitle.displayName = 'DialogTitle'

interface DialogDescriptionProps
  extends Omit<ViewStyle, 'style'> {
  children: React.ReactNode
  className?: string
  style?: TextStyle | TextStyle[]
}

export const DialogDescription = forwardRef<any, DialogDescriptionProps>(
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
        data-slot="dialog-description"
        {...props}
      >
        {children}
      </Text>
    )
  }
)
DialogDescription.displayName = 'DialogDescription'

interface DialogFooterProps
  extends Omit<ViewStyle, 'style'> {
  children: React.ReactNode
  className?: string
  style?: ViewStyle | ViewStyle[]
}

export const DialogFooter = forwardRef<View, DialogFooterProps>(
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
          'flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2',
          className
        )}
        style={style}
        data-slot="dialog-footer"
        {...props}
      >
        {children}
      </View>
    )
  }
)
DialogFooter.displayName = 'DialogFooter'

interface DialogCloseProps
  extends Omit<PressableProps, 'style' | 'children' | 'onPress'> {
  asChild?: boolean
  children?: React.ReactNode
  className?: string
  style?: ViewStyle | ViewStyle[]
}

export const DialogClose = forwardRef<any, DialogCloseProps>(
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
          'absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground',
          className
        )}
        style={style}
        data-slot="dialog-close"
        {...props}
      >
        {children || (
          <View style={styles.closeIcon} data-slot="dialog-close-icon">
            <Text variant="caption" style={styles.closeIconText}>✕</Text>
          </View>
        )}
      </Comp>
    )
  }
)
DialogClose.displayName = 'DialogClose'

const styles = StyleSheet.create({
  underlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  content: {
    borderRadius: 12,
    width: '90%',
    maxWidth: 400,
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