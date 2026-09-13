import { cn } from '@/lib/utils'
import { Slot } from '@rn-primitives/slot'
import {
  Pressable,
  PressableProps,
  View,
  ViewStyle,
  StyleSheet,
} from 'react-native'
import { forwardRef, useState, useCallback } from 'react'

interface TooltipProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
  className?: string
  style?: ViewStyle | ViewStyle[]
}

export const Tooltip = forwardRef<View, TooltipProps>(
  (
    {
      open: controlledOpen,
      onOpenChange,
      children,
      className,
      style,
      ...props
    },
    ref
  ) => {
    const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
    const open = controlledOpen ?? uncontrolledOpen
    const setOpen = useCallback((value: boolean) => {
      setUncontrolledOpen(value)
      onOpenChange?.(value)
    }, [onOpenChange])

    return (
      <View
        ref={ref}
        className={cn('relative inline-flex', className)}
        style={style}
        data-slot="tooltip"
        {...props}
      >
        {children}
      </View>
    )
  }
)
Tooltip.displayName = 'Tooltip'

interface TooltipTriggerProps
  extends Omit<PressableProps, 'style' | 'children' | 'onPress'> {
  asChild?: boolean
  children: React.ReactNode
  className?: string
  style?: ViewStyle | ViewStyle[]
}

export const TooltipTrigger = forwardRef<typeof Pressable, TooltipTriggerProps>(
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
        data-slot="tooltip-trigger"
        {...props}
      >
        {children}
      </Comp>
    )
  }
)
TooltipTrigger.displayName = 'TooltipTrigger'

interface TooltipContentProps
  extends Omit<ViewStyle, 'style'> {
  children: React.ReactNode
  className?: string
  style?: ViewStyle | ViewStyle[]
  sideOffset?: number
  align?: 'start' | 'center' | 'end'
}

export const TooltipContent = forwardRef<View, TooltipContentProps>(
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
          'z-50 overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-lg',
          'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
          className
        )}
        style={style}
        data-slot="tooltip-content"
        {...props}
      >
        {children}
      </View>
    )
  }
)
TooltipContent.displayName = 'TooltipContent'

const styles = StyleSheet.create({})