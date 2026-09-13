import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { Slot } from '@rn-primitives/slot'
import { Text, TextProps as RNTextProps, TextStyle } from 'react-native'
import { forwardRef } from 'react'

const labelVariants = cva(
  'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
  {
    variants: {
      variant: {
        default: '',
        required: 'after:content-["*"] after:ml-1 after:text-destructive',
        optional: 'after:content-["(optional)"] after:ml-1 after:text-muted-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface LabelProps
  extends Omit<RNTextProps, 'style' | 'children'>,
    VariantProps<typeof labelVariants> {
  asChild?: boolean
  htmlFor?: string
  children: React.ReactNode
  className?: string
  style?: TextStyle | TextStyle[]
}

export const Label = forwardRef<Text, LabelProps>(
  (
    {
      className,
      asChild = false,
      variant,
      htmlFor,
      children,
      style,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : Text
    return (
      <Comp
        ref={ref}
        as="label"
        htmlFor={htmlFor}
        variant="caption"
        className={cn(labelVariants({ variant, className }))}
        data-slot="label"
        style={style}
        {...props}
      >
        {children}
      </Comp>
    )
  }
)
Label.displayName = 'Label'