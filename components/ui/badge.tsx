import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { View, ViewProps as RNViewProps, ViewStyle, TextStyle } from 'react-native'
import { forwardRef } from 'react'
import { Text } from './text'

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground',
        secondary: 'bg-secondary text-secondary-foreground',
        destructive: 'bg-destructive text-destructive-foreground',
        outline: 'text-foreground border border-input',
        success: 'bg-green-500 text-white',
        muted: 'bg-muted text-muted-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface BadgeProps
  extends Omit<RNViewProps, 'style'>,
    VariantProps<typeof badgeVariants> {
  children: React.ReactNode
  className?: string
  style?: ViewStyle | ViewStyle[]
  textStyle?: TextStyle
}

export const Badge = forwardRef<View, BadgeProps>(
  (
    {
      className,
      variant,
      children,
      style,
      textStyle,
      ...props
    },
    ref
  ) => {
    return (
      <View
        ref={ref}
        className={cn(badgeVariants({ variant, className }))}
        data-slot="badge"
        style={style}
        {...props}
      >
        <Text
          variant="caption"
          style={textStyle}
          className="whitespace-nowrap"
        >
          {children}
        </Text>
      </View>
    )
  }
)
Badge.displayName = 'Badge'