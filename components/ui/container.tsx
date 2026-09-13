import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { Slot } from '@rn-primitives/slot'
import { SafeAreaView, type SafeAreaViewProps } from 'react-native-safe-area-context'
import { forwardRef } from 'react'
import { ViewStyle } from 'react-native'

const containerVariants = cva('', {
  variants: {
    variant: {
      default: 'flex-1',
      centered: 'flex-1 items-center justify-center',
      padded: 'flex-1 p-4',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
})

export interface ContainerProps
  extends Omit<SafeAreaViewProps, 'style'>,
    VariantProps<typeof containerVariants> {
  asChild?: boolean
  children: React.ReactNode
  className?: string
  style?: ViewStyle | ViewStyle[]
}

export const Container = forwardRef<typeof SafeAreaView, ContainerProps>(
  (
    {
      className,
      asChild = false,
      variant,
      children,
      style,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : SafeAreaView
    return (
      <Comp
        ref={ref}
        className={cn(containerVariants({ variant, className }))}
        data-slot="container"
        style={style}
        {...props}
      >
        {children}
      </Comp>
    )
  }
)
Container.displayName = 'Container'