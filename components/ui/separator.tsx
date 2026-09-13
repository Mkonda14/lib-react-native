import { cn } from '@/lib/utils'
import { Slot } from '@rn-primitives/slot'
import { View, ViewStyle } from 'react-native'
import { forwardRef } from 'react'

interface SeparatorProps
  extends Omit<ViewStyle, 'style'> {
  asChild?: boolean
  orientation?: 'horizontal' | 'vertical'
  decorative?: boolean
  className?: string
  style?: ViewStyle | ViewStyle[]
}

export const Separator = forwardRef<View, SeparatorProps>(
  (
    {
      asChild = false,
      orientation = 'horizontal',
      decorative = true,
      className,
      style,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : View

    return (
      <Comp
        ref={ref}
        className={cn(
          'shrink-0 bg-border',
          orientation === 'horizontal' ? 'h-[1px] w-full' : 'h-full w-[1px]',
          className
        )}
        style={style}
        data-slot="separator"
        role={decorative ? 'none' : 'separator'}
        aria-orientation={decorative ? undefined : orientation}
        {...props}
      />
    )
  }
)
Separator.displayName = 'Separator'