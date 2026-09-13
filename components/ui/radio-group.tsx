import { cn } from '@/lib/utils'
import { Slot } from '@rn-primitives/slot'
import { Pressable, PressableProps, View, ViewStyle, TextStyle } from 'react-native'
import { forwardRef, useState, useCallback } from 'react'
import React from 'react'
import { Text } from './text'

interface RadioGroupProps
  extends Omit<PressableProps, 'style' | 'onPress'> {
  asChild?: boolean
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  label?: string
  description?: string
  disabled?: boolean
  orientation?: 'horizontal' | 'vertical'
  className?: string
  style?: ViewStyle | ViewStyle[]
  labelStyle?: TextStyle
  descriptionStyle?: TextStyle
  children?: React.ReactNode
}

export const RadioGroup = forwardRef<any, RadioGroupProps>(
  (
    {
      asChild = false,
      value,
      defaultValue,
      onValueChange,
      label,
      description,
      disabled = false,
      orientation = 'vertical',
      className,
      style,
      labelStyle,
      descriptionStyle,
      children,
      ...props
    },
    ref
  ) => {
    const [internalValue, setInternalValue] = useState(value || defaultValue || '')

    const handleValueChange = useCallback((newValue: string) => {
      setInternalValue(newValue)
      onValueChange?.(newValue)
    }, [onValueChange])

    const Comp = asChild ? Slot : Pressable

    return (
      <Comp
        {...props}
        className={cn(
          'flex',
          orientation === 'horizontal' ? 'flex-row items-center gap-4' : 'flex-col gap-3',
          className
        )}
        style={style}
        data-slot="radio-group"
      >
        {(label || description) && (
          <View style={{ marginBottom: 8 }}>
            {label && (
              <Text
                variant="caption"
                style={labelStyle}
                className={cn('font-medium', disabled && 'opacity-50')}
                data-slot="radio-group-label"
              >
                {label}
              </Text>
            )}
            {description && (
              <Text
                variant="caption"
                style={descriptionStyle}
                className="text-muted-foreground"
                data-slot="radio-group-description"
              >
                {description}
              </Text>
            )}
          </View>
        )}
        {React.Children.map(children, (child) =>
          React.isValidElement<RadioGroupItemProps>(child) ? React.cloneElement(child, {
            value: child.props.value,
            disabled: disabled || child.props.disabled,
            onValueChange: handleValueChange,
            checked: internalValue === child.props.value,
          }) : child
        )}
      </Comp>
    )
  }
)
RadioGroup.displayName = 'RadioGroup'

interface RadioGroupItemProps
  extends Omit<PressableProps, 'style' | 'children' | 'onPress'> {
  asChild?: boolean
  value: string
  label?: string
  description?: string
  disabled?: boolean
  className?: string
  style?: ViewStyle | ViewStyle[]
  labelStyle?: TextStyle
  descriptionStyle?: TextStyle
  checked?: boolean
  onValueChange?: (value: string) => void
}

export const RadioGroupItem = forwardRef<any, RadioGroupItemProps>(
  (
    {
      asChild = false,
      value,
      label,
      description,
      disabled = false,
      className,
      style,
      labelStyle,
      descriptionStyle,
      checked,
      onValueChange,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : Pressable

    const handlePress = useCallback(() => {
      if (!disabled && onValueChange) {
        onValueChange(value)
      }
    }, [disabled, onValueChange, value])

    return (
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: 8,
        }}
        data-slot="radio-group-item-container"
      >
        <Comp
          ref={ref}
          onPress={handlePress}
          disabled={disabled}
          className={cn(
            'relative h-5 w-5 shrink-0 rounded-full border-2 border-input',
            'bg-background',
            'data-[state=checked]:border-primary data-[state=checked]:bg-primary',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'transition-colors',
            className
          )}
          style={style}
          data-slot="radio-group-item"
          data-state={checked ? 'checked' : 'unchecked'}
          data-disabled={disabled}
          aria-checked={checked}
          aria-disabled={disabled}
          {...props}
        >
          {checked && (
            <View
              style={[
                styles.dot,
                { backgroundColor: 'white' },
              ]}
              data-slot="radio-group-item-indicator"
            />
          )}
        </Comp>
        {(label || description) && (
          <View style={{ flex: 1, marginTop: 2 }}>
            {label && (
              <Text
                variant="body"
                style={labelStyle}
                className={cn('cursor-pointer', disabled && 'opacity-50')}
                data-slot="radio-group-item-label"
              >
                {label}
              </Text>
            )}
            {description && (
              <Text
                variant="caption"
                style={descriptionStyle}
                className="text-muted-foreground"
                data-slot="radio-group-item-description"
              >
                {description}
              </Text>
            )}
          </View>
        )}
      </View>
    )
  }
)
RadioGroupItem.displayName = 'RadioGroupItem'

const styles = {
  dot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    position: 'absolute' as const,
    top: 50,
    left: 50,
    transform: [{ translateX: -4 }, { translateY: -4 }],
  },
}