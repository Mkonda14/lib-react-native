import { cn } from '@/lib/utils'
import { Slot } from '@rn-primitives/slot'
import {
  Pressable,
  PressableProps,
  View,
  ViewStyle,
  TextStyle,
  StyleSheet,
  Text as RNText,
} from 'react-native'
import { forwardRef, useState } from 'react'
import { Text } from './text'

interface DropdownMenuProps {
  children: React.ReactNode
  className?: string
  style?: ViewStyle | ViewStyle[]
}

export const DropdownMenu = ({ children, className, style }: DropdownMenuProps) => {
  return (
    <View
      className={cn('relative inline-flex', className)}
      style={style}
      data-slot="dropdown-menu"
    >
      {children}
    </View>
  )
}
DropdownMenu.displayName = 'DropdownMenu'

interface DropdownMenuTriggerProps
  extends Omit<PressableProps, 'style' | 'children' | 'onPress'> {
  asChild?: boolean
  children: React.ReactNode
  className?: string
  style?: ViewStyle | ViewStyle[]
}

export const DropdownMenuTrigger = forwardRef<View, DropdownMenuTriggerProps>(
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
        data-slot="dropdown-menu-trigger"
        {...props}
      >
        {children}
      </Comp>
    )
  }
)
DropdownMenuTrigger.displayName = 'DropdownMenuTrigger'

interface DropdownMenuContentProps
  extends Omit<ViewStyle, 'style'> {
  children: React.ReactNode
  className?: string
  style?: ViewStyle | ViewStyle[]
  sideOffset?: number
  align?: 'start' | 'center' | 'end'
}

export const DropdownMenuContent = forwardRef<View, DropdownMenuContentProps>(
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
        data-slot="dropdown-menu-content"
        {...props}
      >
        {children}
      </View>
    )
  }
)
DropdownMenuContent.displayName = 'DropdownMenuContent'

interface DropdownMenuItemProps
  extends Omit<PressableProps, 'style' | 'children' | 'onPress'> {
  asChild?: boolean
  disabled?: boolean
  className?: string
  style?: ViewStyle | ViewStyle[]
  textStyle?: TextStyle
  children: React.ReactNode
}

export const DropdownMenuItem = forwardRef<View, DropdownMenuItemProps>(
  (
    {
      asChild = false,
      disabled = false,
      className,
      style,
      textStyle,
      children,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : Pressable

    return (
      <Comp
        ref={ref}
        className={cn(
          'relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
          className
        )}
        style={style}
        data-slot="dropdown-menu-item"
        {...props}
      >
        <Text
          variant="body"
          style={textStyle}
          className="truncate"
          data-slot="dropdown-menu-item-text"
        >
          {children}
        </Text>
      </Comp>
    )
  }
)
DropdownMenuItem.displayName = 'DropdownMenuItem'

interface DropdownMenuCheckboxItemProps
  extends Omit<PressableProps, 'style' | 'children' | 'onPress'> {
  asChild?: boolean
  checked?: boolean
  disabled?: boolean
  className?: string
  style?: ViewStyle | ViewStyle[]
  textStyle?: TextStyle
  children: React.ReactNode
}

export const DropdownMenuCheckboxItem = forwardRef<View, DropdownMenuCheckboxItemProps>(
  (
    {
      asChild = false,
      checked,
      disabled = false,
      className,
      style,
      textStyle,
      children,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : Pressable

    return (
      <Comp
        ref={ref}
        className={cn(
          'relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
          className
        )}
        style={style}
        data-slot="dropdown-menu-checkbox-item"
        {...props}
      >
        <View
          style={[
            styles.checkIcon,
            checked && { opacity: 1 },
          ]}
          data-slot="dropdown-menu-checkbox-item-indicator"
        >
          <Text variant="caption" style={styles.checkIconText}>✓</Text>
        </View>
        <Text
          variant="body"
          style={textStyle}
          className="truncate"
          data-slot="dropdown-menu-checkbox-item-text"
        >
          {children}
        </Text>
      </Comp>
    )
  }
)
DropdownMenuCheckboxItem.displayName = 'DropdownMenuCheckboxItem'

interface DropdownMenuRadioItemProps
  extends Omit<PressableProps, 'style' | 'children' | 'onPress'> {
  asChild?: boolean
  checked?: boolean
  disabled?: boolean
  className?: string
  style?: ViewStyle | ViewStyle[]
  textStyle?: TextStyle
  children: React.ReactNode
}

export const DropdownMenuRadioItem = forwardRef<View, DropdownMenuRadioItemProps>(
  (
    {
      asChild = false,
      checked,
      disabled = false,
      className,
      style,
      textStyle,
      children,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : Pressable

    return (
      <Comp
        ref={ref}
        className={cn(
          'relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
          className
        )}
        style={style}
        data-slot="dropdown-menu-radio-item"
        {...props}
      >
        <View
          style={[
            styles.radioIcon,
            checked && { opacity: 1 },
          ]}
          data-slot="dropdown-menu-radio-item-indicator"
        >
          <View style={styles.radioDot} />
        </View>
        <Text
          variant="body"
          style={textStyle}
          className="truncate"
          data-slot="dropdown-menu-radio-item-text"
        >
          {children}
        </Text>
      </Comp>
    )
  }
)
DropdownMenuRadioItem.displayName = 'DropdownMenuRadioItem'

interface DropdownMenuLabelProps
  extends Omit<ViewStyle, 'style'> {
  className?: string
  style?: TextStyle | TextStyle[]
  children: React.ReactNode
}

export const DropdownMenuLabel = forwardRef<RNText, DropdownMenuLabelProps>(
  (
    {
      className,
      style,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <Text
        ref={ref}
        variant="caption"
        className={cn('px-2 py-1.5 text-sm font-semibold', className)}
        style={style}
        data-slot="dropdown-menu-label"
        {...props}
      >
        {children}
      </Text>
    )
  }
)
DropdownMenuLabel.displayName = 'DropdownMenuLabel'

interface DropdownMenuSeparatorProps {
  className?: string
  style?: ViewStyle | ViewStyle[]
}

export const DropdownMenuSeparator = forwardRef<View, DropdownMenuSeparatorProps>(
  ({ className, style, ...props }, ref) => (
    <View
      ref={ref}
      className={cn('-mx-1 my-1 h-px bg-border', className)}
      style={style}
      data-slot="dropdown-menu-separator"
      {...props}
    />
  )
)
DropdownMenuSeparator.displayName = 'DropdownMenuSeparator'

interface DropdownMenuShortcutProps
  extends Omit<ViewStyle, 'style'> {
  className?: string
  style?: TextStyle | TextStyle[]
  children: React.ReactNode
}

export const DropdownMenuShortcut = forwardRef<RNText, DropdownMenuShortcutProps>(
  (
    {
      className,
      style,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <Text
        ref={ref}
        variant="caption"
        className={cn('ml-auto text-xs tracking-widest opacity-60', className)}
        style={style}
        data-slot="dropdown-menu-shortcut"
        {...props}
      >
        {children}
      </Text>
    )
  }
)
DropdownMenuShortcut.displayName = 'DropdownMenuShortcut'

const styles = StyleSheet.create({
  checkIcon: {
    position: 'absolute' as const,
    left: 8,
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0,
  },
  checkIconText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  radioIcon: {
    position: 'absolute' as const,
    left: 8,
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0,
  },
  radioDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: 'currentColor',
  },
})