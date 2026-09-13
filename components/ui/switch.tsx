import { cn } from '@/lib/utils'
import { Slot } from '@rn-primitives/slot'
import { Pressable, PressableProps, View, ViewStyle, TextStyle } from 'react-native'
import { forwardRef, useState, useCallback } from 'react'
import { Text } from './text'

interface SwitchProps
  extends Omit<PressableProps, 'style' | 'children' | 'onPress'> {
  asChild?: boolean
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

export const Switch = forwardRef<typeof Pressable, SwitchProps>(
  (
    {
      asChild = false,
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

    const Comp = asChild ? Slot : Pressable

    return (
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
        }}
        data-slot="switch-container"
      >
        <Comp
          ref={ref}
          onPress={handlePress}
          disabled={disabled}
          className={cn(
            'relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full',
            'border-2 border-transparent',
            'transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'data-[state=checked]:bg-primary data-[state=checked]:border-primary',
            'data-[state=unchecked]:bg-input data-[state=unchecked]:border-input',
            className
          )}
          style={style}
          data-slot="switch"
          data-state={checkedValue ? 'checked' : 'unchecked'}
          aria-checked={checkedValue}
          aria-disabled={disabled}
          {...props}
        >
          <View
            style={[
              styles.thumb,
              {
                backgroundColor: checkedValue ? 'white' : 'gray',
                transform: [
                  { translateX: checkedValue ? 22 : 2 },
                ],
              },
            ]}
            data-slot="switch-thumb"
          />
        </Comp>
        {(label || description) && (
          <View style={{ flex: 1 }}>
            {label && (
              <Text
                variant="body"
                style={labelStyle}
                className={cn('cursor-pointer', disabled && 'opacity-50')}
                data-slot="switch-label"
              >
                {label}
              </Text>
            )}
            {description && (
              <Text
                variant="caption"
                style={descriptionStyle}
                className="text-muted-foreground"
                data-slot="switch-description"
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
Switch.displayName = 'Switch'

const styles = {
  thumb: {
    width: 22,
    height: 22,
    borderRadius: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
}