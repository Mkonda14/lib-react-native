import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { Slot } from '@rn-primitives/slot'
import { Text } from './text'
import { View, ViewProps as RNViewProps, ViewStyle, TextStyle } from 'react-native'
import { forwardRef } from 'react'

const cardVariants = cva(
  'rounded-lg border bg-card text-card-foreground shadow-sm',
  {
    variants: {
      variant: {
        default: '',
        outlined: 'border-border',
        elevated: 'shadow-md',
      },
      padding: {
        default: 'p-6',
        sm: 'p-4',
        lg: 'p-8',
        none: 'p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      padding: 'default',
    },
  }
)

export interface CardProps
  extends Omit<RNViewProps, 'style'>,
    VariantProps<typeof cardVariants> {
  asChild?: boolean
  children: React.ReactNode
  className?: string
  style?: ViewStyle | ViewStyle[]
}

export const Card = forwardRef<View, CardProps>(
  (
    {
      className,
      asChild = false,
      variant,
      padding,
      children,
      style,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : View
    return (
      <Comp
        ref={ref}
        className={cn(cardVariants({ variant, padding, className: `border-gray-300 ${className}` }))}
        data-slot="card"
        style={style}
        {...props}
      >
        {children}
      </Comp>
    )
  }
)
Card.displayName = 'Card'

export interface CardHeaderProps
  extends Omit<RNViewProps, 'style'> {
  asChild?: boolean
  children: React.ReactNode
  className?: string
  style?: ViewStyle | ViewStyle[]
}

export const CardHeader = forwardRef<View, CardHeaderProps>(
  (
    { className, asChild = false, children, style, ...props },
    ref
  ) => {
    const Comp = asChild ? Slot : View
    return (
      <Comp
        ref={ref}
        className={cn('flex flex-col space-y-1.5', className)}
        data-slot="card-header"
        style={style}
        {...props}
      >
        {children}
      </Comp>
    )
  }
)
CardHeader.displayName = 'CardHeader'

export interface CardTitleProps
  extends Omit<RNViewProps, 'style'> {
  asChild?: boolean
  children: React.ReactNode
  className?: string
  style?: TextStyle | TextStyle[]
}

export const CardTitle = forwardRef<View, CardTitleProps>(
  (
    { className, asChild = false, children, style, ...props },
    ref
  ) => {
    const Comp = asChild ? Slot : Text
    return (
      <Comp
        ref={ref}
        as="span"
        variant="title"
        className={cn('font-semibold leading-none tracking-tight', className)}
        data-slot="card-title"
        style={style}
        {...props}
      >
        {children}
      </Comp>
    )
  }
)
CardTitle.displayName = 'CardTitle'

export interface CardDescriptionProps
  extends Omit<RNViewProps, 'style'> {
  asChild?: boolean
  children: React.ReactNode
  className?: string
  style?: TextStyle | TextStyle[]
}

export const CardDescription = forwardRef<View, CardDescriptionProps>(
  (
    { className, asChild = false, children, style, ...props },
    ref
  ) => {
    const Comp = asChild ? Slot : Text
    return (
      <Comp
        ref={ref}
        as="span"
        variant="caption"
        className={cn('text-muted-foreground', className)}
        data-slot="card-description"
        style={style}
        {...props}
      >
        {children}
      </Comp>
    )
  }
)
CardDescription.displayName = 'CardDescription'

export interface CardContentProps
  extends Omit<RNViewProps, 'style'> {
  asChild?: boolean
  children: React.ReactNode
  className?: string
  style?: ViewStyle | ViewStyle[]
}

export const CardContent = forwardRef<View, CardContentProps>(
  (
    { className, asChild = false, children, style, ...props },
    ref
  ) => {
    const Comp = asChild ? Slot : View
    return (
      <Comp
        ref={ref}
        className={cn('', className)}
        data-slot="card-content"
        style={style}
        {...props}
      >
        {children}
      </Comp>
    )
  }
)
CardContent.displayName = 'CardContent'

export interface CardFooterProps
  extends Omit<RNViewProps, 'style'> {
  asChild?: boolean
  children: React.ReactNode
  className?: string
  style?: ViewStyle | ViewStyle[]
}

export const CardFooter = forwardRef<View, CardFooterProps>(
  (
    { className, asChild = false, children, style, ...props },
    ref
  ) => {
    const Comp = asChild ? Slot : View
    return (
      <Comp
        ref={ref}
        className={cn('flex items-center mt-4', className)}
        data-slot="card-footer"
        style={style}
        {...props}
      >
        {children}
      </Comp>
    )
  }
)
CardFooter.displayName = 'CardFooter'