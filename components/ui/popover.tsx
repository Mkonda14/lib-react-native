import { cn } from '@/lib/utils'
import { Slot } from '@rn-primitives/slot'
import {
  Pressable,
  PressableProps,
  View,
  ViewStyle,
  StyleSheet,
} from 'react-native'
import { forwardRef, useState } from 'react'

interface PopoverProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
  className?: string
  style?: ViewStyle | ViewStyle[]
}

export const Popover = forwardRef<View, PopoverProps>(
  (
    {
      open = false,
      onOpenChange,
      children,
      className,
      style,
      ...props
    },
    ref
  ) => {
    const [isOpen, setIsOpen] = useState(open)

    return (
      <View
        ref={ref}
        className={cn('relative inline-flex', className)}
        style={style}
        data-slot="popover"
        {...props}
      >
        {children}
      </View>
    )
  }
)
Popover.displayName = 'Popover'

interface PopoverTriggerProps
  extends Omit<PressableProps, 'style' | 'children' | 'onPress'> {
  asChild?: boolean
  children: React.ReactNode
  className?: string
  style?: ViewStyle | ViewStyle[]
}

export const PopoverTrigger = forwardRef<any, PopoverTriggerProps>(
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
    const [isOpen, setIsOpen] = useState(false)
    const Comp = asChild ? Slot : Pressable

    return (
      <Comp
        ref={ref}
        onPress={() => setIsOpen(!isOpen)}
        className={className}
        style={style}
        data-slot="popover-trigger"
        {...props}
      >
        {children}
      </Comp>
    )
  }
)
PopoverTrigger.displayName = 'PopoverTrigger'

interface PopoverContentProps
  extends Omit<ViewStyle, 'style'> {
  children: React.ReactNode
  className?: string
  style?: ViewStyle | ViewStyle[]
  sideOffset?: number
  align?: 'start' | 'center' | 'end'
}

export const PopoverContent = forwardRef<View, PopoverContentProps>(
  (
    {
      children,
      className,
      style,
      sideOffset = 4,
      align = 'start',
      ...props
    },
    ref
  ) => {
    return (
      <View
        ref={ref}
        className={cn(
          'relative z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-lg',
          'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
          className
        )}
        style={style}
        data-slot="popover-content"
        {...props}
      >
        {children}
      </View>
    )
  }
)
PopoverContent.displayName = 'PopoverContent'

const styles = StyleSheet.create({})