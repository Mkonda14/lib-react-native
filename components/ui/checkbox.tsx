import { cn } from '@/lib/utils'
import { Pressable, PressableProps, View, ViewStyle, TextStyle } from 'react-native'
import { forwardRef, useState, useCallback } from 'react'
import { Text } from './text'

interface CheckboxProps
  extends Omit<PressableProps, 'style' | 'children' | 'onPress'> {
  checked?: boolean
  defaultChecked?: boolean
  onValueChange?: (checked: boolean) => void
  label?: string
  description?: string
  disabled?: boolean
  className?: string
  style?: ViewStyle | ViewStyle[]
  labelStyle?: TextStyle
  descriptionStyle?: TextStyle
}

export const Checkbox = forwardRef<View, CheckboxProps>(
  (
    {
      checked,
      defaultChecked = false,
      onValueChange,
      label,
      description,
      disabled = false,
      className,
      style,
      labelStyle,
      descriptionStyle,
      ...props
    },
    ref
  ) => {
    const [isChecked, setIsChecked] = useState(checked ?? defaultChecked)
    const isControlled = checked !== undefined

    const handlePress = useCallback(() => {
      if (disabled) return
      const newChecked = !isChecked
      setIsChecked(newChecked)
      onValueChange?.(newChecked)
    }, [isChecked, disabled, onValueChange])

    const checkedValue = isControlled ? checked : isChecked

    return (
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: 8,
        }}
        data-slot="checkbox-container"
      >
        <Pressable
          ref={ref}
          onPress={handlePress}
          disabled={disabled}
          className={cn(
            'relative h-5 w-5 shrink-0 rounded-md border border-input',
            'bg-background',
            'data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground',
            'data-[state=checked]:border-primary',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'transition-colors',
            className
          )}
          style={style}
          data-slot="checkbox"
          data-state={checkedValue ? 'checked' : 'unchecked'}
          data-disabled={disabled}
          aria-checked={checkedValue}
          aria-disabled={disabled}
          {...props}
        >
          {checkedValue && (
            <View
              style={[
                styles.checkmark,
                { backgroundColor: 'currentColor' },
              ]}
              data-slot="checkbox-indicator"
            >
              <Text
                variant="caption"
                style={styles.checkmarkText}
              >
                ✓
              </Text>
            </View>
          )}
        </Pressable>
        {(label || description) && (
          <View style={{ flex: 1, marginTop: 2 }}>
            {label && (
              <Text
                variant="body"
                style={labelStyle}
                className={cn('cursor-pointer', disabled && 'opacity-50')}
                data-slot="checkbox-label"
              >
                {label}
              </Text>
            )}
            {description && (
              <Text
                variant="caption"
                style={descriptionStyle}
                className="text-muted-foreground"
                data-slot="checkbox-description"
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
Checkbox.displayName = 'Checkbox'

const styles = {
  checkmark: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  checkmarkText: {
    fontSize: 10,
    fontWeight: '700' as const,
  },
}