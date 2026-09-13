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
import { Button } from './button'

interface AlertDialogProps
  extends Omit<ModalProps, 'visible' | 'children' | 'onRequestClose'> {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
  className?: string
  style?: ViewStyle | ViewStyle[]
  contentStyle?: ViewStyle
}

export const AlertDialog = forwardRef<Modal, AlertDialogProps>(
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
    return (
      <Modal
        ref={ref}
        visible={open}
        animationType="fade"
        transparent={true}
        onRequestClose={onOpenChange ? () => onOpenChange(false) : undefined}
        className={className}
        style={style}
        data-slot="alert-dialog"
        {...props}
      >
        <Pressable
          style={styles.underlay}
          onPress={onOpenChange ? () => onOpenChange(false) : undefined}
          data-slot="alert-dialog-underlay"
        />
        <View
          style={[
            styles.content,
            contentStyle,
          ]}
          data-slot="alert-dialog-content"
        >
          {children}
        </View>
      </Modal>
    )
  }
)
AlertDialog.displayName = 'AlertDialog'

interface AlertDialogTriggerProps
  extends Omit<PressableProps, 'style' | 'children' | 'onPress'> {
  asChild?: boolean
  children: React.ReactNode
  className?: string
  style?: ViewStyle | ViewStyle[]
}

export const AlertDialogTrigger = forwardRef<any, AlertDialogTriggerProps>(
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
        style={style as any}
        data-slot="alert-dialog-trigger"
        {...props}
      >
        {children}
      </Comp>
    )
  }
)
AlertDialogTrigger.displayName = 'AlertDialogTrigger'

interface AlertDialogContentProps
  extends Omit<ViewStyle, 'style'> {
  children: React.ReactNode
  className?: string
  style?: ViewStyle | ViewStyle[]
}

export const AlertDialogContent = forwardRef<any, AlertDialogContentProps>(
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
        style={style as any}
        data-slot="alert-dialog-content"
        {...props}
      >
        {children}
      </View>
    )
  }
)
AlertDialogContent.displayName = 'AlertDialogContent'

interface AlertDialogHeaderProps
  extends Omit<ViewStyle, 'style'> {
  children: React.ReactNode
  className?: string
  style?: ViewStyle | ViewStyle[]
}

export const AlertDialogHeader = forwardRef<any, AlertDialogHeaderProps>(
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
        style={style as any}
        data-slot="alert-dialog-header"
        {...props}
      >
        {children}
      </View>
    )
  }
)
AlertDialogHeader.displayName = 'AlertDialogHeader'

interface AlertDialogTitleProps
  extends Omit<ViewStyle, 'style'> {
  children: React.ReactNode
  className?: string
  style?: TextStyle | TextStyle[]
}

export function AlertDialogTitle({
  children,
  className,
  style,
  ...props
}: AlertDialogTitleProps) {
  return (
    <Text
      variant="title"
      className={cn(
        'text-lg font-semibold leading-none tracking-tight',
        className
      )}
      style={style}
      data-slot="alert-dialog-title"
      {...props}
    >
      {children}
    </Text>
  )
}
AlertDialogTitle.displayName = 'AlertDialogTitle'

interface AlertDialogDescriptionProps
  extends Omit<ViewStyle, 'style'> {
  children: React.ReactNode
  className?: string
  style?: TextStyle | TextStyle[]
}

export function AlertDialogDescription({
  children,
  className,
  style,
  ...props
}: AlertDialogDescriptionProps) {
  return (
    <Text
      variant="caption"
      className={cn('text-muted-foreground', className)}
      style={style}
      data-slot="alert-dialog-description"
      {...props}
    >
      {children}
    </Text>
  )
}
AlertDialogDescription.displayName = 'AlertDialogDescription'

interface AlertDialogFooterProps
  extends Omit<ViewStyle, 'style'> {
  children: React.ReactNode
  className?: string
  style?: ViewStyle | ViewStyle[]
}

export const AlertDialogFooter = forwardRef<any, AlertDialogFooterProps>(
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
        style={style as any}
        data-slot="alert-dialog-footer"
        {...props}
      >
        {children}
      </View>
    )
  }
)
AlertDialogFooter.displayName = 'AlertDialogFooter'

interface AlertDialogCancelProps
  extends Omit<PressableProps, 'style' | 'children' | 'onPress'> {
  asChild?: boolean
  children?: React.ReactNode
  className?: string
  style?: ViewStyle | ViewStyle[]
}

export const AlertDialogCancel = forwardRef<any, AlertDialogCancelProps>(
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
    const Comp = asChild ? Slot : Button
    return (
      <Comp
        ref={ref}
        variant="outline"
        className={cn('mt-2 sm:mt-0', className)}
        style={style as any}
        data-slot="alert-dialog-cancel"
        {...props}
      >
        {children || 'Cancel'}
      </Comp>
    )
  }
)
AlertDialogCancel.displayName = 'AlertDialogCancel'

interface AlertDialogActionProps
  extends Omit<PressableProps, 'style' | 'children' | 'onPress'> {
  asChild?: boolean
  children?: React.ReactNode
  className?: string
  style?: ViewStyle | ViewStyle[]
}

export const AlertDialogAction = forwardRef<any, AlertDialogActionProps>(
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
    const Comp = asChild ? Slot : Button
    return (
      <Comp
        ref={ref}
        variant="destructive"
        className={cn('mt-2 sm:mt-0', className)}
        style={style as any}
        data-slot="alert-dialog-action"
        {...props}
      >
        {children}
      </Comp>
    )
  }
)
AlertDialogAction.displayName = 'AlertDialogAction'

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
})