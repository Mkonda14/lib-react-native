import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { Pressable, PressableProps, TextStyle, ViewStyle, Text as RNText } from 'react-native'
import { forwardRef } from 'react'
import { Spinner } from './spinner'

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground',
        destructive: 'bg-destructive text-destructive-foreground',
        outline: 'border border-input bg-transparent',
        secondary: 'bg-secondary text-secondary-foreground',
        ghost: 'bg-transparent',
        link: 'text-primary underline-offset-4',
      },
      size: {
        default: 'h-12 px-4 text-base',
        sm: 'h-10 px-3 text-sm',
        lg: 'h-14 px-6 text-lg',
        icon: 'h-12 w-12',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends Omit<PressableProps, 'style' | 'children'>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean
  children: React.ReactNode
  className?: string
  style?: ViewStyle | ViewStyle[]
  textStyle?: TextStyle
}

export const Button = forwardRef<any, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      loading,
      children,
      style,
      textStyle,
      ...props
    },
    ref
  ) => {
    return (
      <Pressable
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        data-slot="button"
        disabled={loading}
        style={style as any}
        {...props}
      >
        {loading ? (
          <Spinner size="sm" className="mr-2" />
        ) : null}
        {typeof children === 'string' ? (
          <RNText style={textStyle}>{children}</RNText>
        ) : (
          children
        )}
      </Pressable>
    )
  }
)
Button.displayName = 'Button'