import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { Slot } from '@rn-primitives/slot'
import {
  TextInput,
  TextInputProps,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native'
import { forwardRef } from 'react'
import { Text } from './text'

const inputVariants = cva(
  'flex w-full rounded-md border bg-transparent px-3 py-2 text-base placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'border-input bg-background',
        outline: 'border-input bg-transparent',
        filled: 'border-input bg-muted',
      },
      size: {
        default: 'h-12 px-4 text-base',
        sm: 'h-10 px-3 text-sm',
        lg: 'h-14 px-6 text-lg',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface InputProps
  extends Omit<TextInputProps, 'style'>,
    VariantProps<typeof inputVariants> {
  asChild?: boolean
  label?: string
  error?: string
  helperText?: string
  className?: string
  style?: ViewStyle | ViewStyle[]
  inputStyle?: TextStyle
  containerStyle?: ViewStyle
}

export const Input = forwardRef<any, InputProps>(
  (
    {
      className,
      asChild = false,
      variant,
      size,
      label,
      error,
      helperText,
      style,
      inputStyle,
      containerStyle,
      onFocus,
      onBlur,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : TextInput
    const inputId = props.id || `input-${Math.random().toString(36).slice(2)}`
    const errorId = error ? `${inputId}-error` : undefined
    const helperId = helperText ? `${inputId}-helper` : undefined

    return (
      <View style={containerStyle} data-slot="input-container">
        {label && (
          <Text
            variant="caption"
            className="mb-2 block"
            data-slot="input-label"
          >
            {label}
          </Text>
        )}
        <Comp
          ref={ref}
          id={inputId}
          className={cn(inputVariants({ variant, size, className }), error && 'border-destructive focus-visible:ring-destructive')}
          style={inputStyle}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={cn(errorId, helperId)}
          onFocus={onFocus}
          onBlur={onBlur}
          {...props}
        />
        {error && (
          <Text
            id={errorId}
            variant="caption"
            className="mt-2 text-destructive"
            data-slot="input-error"
          >
            {error}
          </Text>
        )}
        {helperText && !error && (
          <Text
            id={helperId}
            variant="caption"
            className="mt-2 text-muted-foreground"
            data-slot="input-helper"
          >
            {helperText}
          </Text>
        )}
      </View>
    )
  }
)
Input.displayName = 'Input'

export interface TextareaProps
  extends Omit<TextInputProps, 'style'>,
    VariantProps<typeof inputVariants> {
  asChild?: boolean
  label?: string
  error?: string
  helperText?: string
  className?: string
  style?: ViewStyle | ViewStyle[]
  inputStyle?: TextStyle
  containerStyle?: ViewStyle
  rows?: number
}

export const Textarea = forwardRef<any, TextareaProps>(
  (
    {
      className,
      asChild = false,
      variant,
      size,
      label,
      error,
      helperText,
      style,
      inputStyle,
      containerStyle,
      onFocus,
      onBlur,
      rows = 4,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : TextInput
    const inputId = props.id || `textarea-${Math.random().toString(36).slice(2)}`
    const errorId = error ? `${inputId}-error` : undefined
    const helperId = helperText ? `${inputId}-helper` : undefined

    return (
      <View style={containerStyle} data-slot="textarea-container">
        {label && (
          <Text
            variant="caption"
            className="mb-2 block"
            data-slot="textarea-label"
          >
            {label}
          </Text>
        )}
        <Comp
          ref={ref}
          id={inputId}
          multiline
          rows={rows}
          className={cn(inputVariants({ variant, size: 'default', className }), 'min-h-[100px] resize-none', error && 'border-destructive focus-visible:ring-destructive')}
          style={inputStyle}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={cn(errorId, helperId)}
          onFocus={onFocus}
          onBlur={onBlur}
          {...props}
        />
        {error && (
          <Text
            id={errorId}
            variant="caption"
            className="mt-2 text-destructive"
            data-slot="textarea-error"
          >
            {error}
          </Text>
        )}
        {helperText && !error && (
          <Text
            id={helperId}
            variant="caption"
            className="mt-2 text-muted-foreground"
            data-slot="textarea-helper"
          >
            {helperText}
          </Text>
        )}
      </View>
    )
  }
)
Textarea.displayName = 'Textarea'