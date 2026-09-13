import { cn } from '@/lib/utils'
import {
  Pressable,
  PressableProps,
  View,
  ViewStyle,
  TextStyle,
  FlatList,
  StyleSheet,
} from 'react-native'
import { forwardRef, useState } from 'react'
import { Text } from './text'

interface SelectProps
  extends Omit<PressableProps, 'style' | 'children' | 'onPress'> {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  placeholder?: string
  label?: string
  description?: string
  error?: string
  disabled?: boolean
  required?: boolean
  className?: string
  style?: ViewStyle | ViewStyle[]
  triggerStyle?: ViewStyle
  contentStyle?: ViewStyle
  itemStyle?: ViewStyle
  labelStyle?: TextStyle
  descriptionStyle?: TextStyle
  errorStyle?: TextStyle
  children: React.ReactNode
}

export const Select = forwardRef<any, SelectProps>(
  (
    {
      value,
      defaultValue,
      onValueChange,
      placeholder,
      label,
      description,
      error,
      disabled = false,
      required = false,
      className,
      style,
      triggerStyle,
      contentStyle,
      itemStyle,
      labelStyle,
      descriptionStyle,
      errorStyle,
      children,
      ...props
    },
    ref
  ) => {
    const [internalValue, setInternalValue] = useState(value || defaultValue || '')
    const [isOpen, setIsOpen] = useState(false)

    const handleValueChange = (newValue: string) => {
      setInternalValue(newValue)
      onValueChange?.(newValue)
      setIsOpen(false)
    }

    const triggerId = `select-trigger-${Math.random().toString(36).slice(2)}`
    const contentId = `select-content-${Math.random().toString(36).slice(2)}`
    const errorId = error ? `${triggerId}-error` : undefined
    const descriptionId = description ? `${triggerId}-description` : undefined

    const childrenArray = Array.isArray(children) ? children : [children]
    const selectedItem = childrenArray.find(
      (child: React.ReactElement<any>) => child.props?.value === internalValue
    )

    return (
      <View
        className={cn('w-full', className)}
        style={style}
        data-slot="select"
        {...props}
      >
        {label && (
          <Text
            htmlFor={triggerId}
            variant="caption"
            className={cn('mb-2 block', required && 'after:content-["*"] after:ml-1 after:text-destructive')}
            style={labelStyle}
            data-slot="select-label"
          >
            {label}
          </Text>
        )}
        <SelectTrigger
          id={triggerId}
          value={internalValue}
          placeholder={placeholder}
          disabled={disabled}
          error={error}
          triggerStyle={triggerStyle}
          isOpen={isOpen}
          onPress={() => !disabled && setIsOpen(!isOpen)}
          aria-describedby={cn(descriptionId, errorId)}
          aria-invalid={error ? 'true' : 'false'}
          data-slot="select-trigger"
        />
        {error && (
          <Text
            id={errorId}
            variant="caption"
            className="mt-2 text-destructive"
            style={errorStyle}
            data-slot="select-error"
          >
            {error}
          </Text>
        )}
        {description && !error && (
          <Text
            id={descriptionId}
            variant="caption"
            className="mt-2 text-muted-foreground"
            style={descriptionStyle}
            data-slot="select-description"
          >
            {description}
          </Text>
        )}
        {isOpen && (
          <SelectContent
            id={contentId}
            contentStyle={contentStyle}
            itemStyle={itemStyle}
            data-slot="select-content"
          >
            {children}
          </SelectContent>
        )}
      </View>
    )
  }
)
Select.displayName = 'Select'

interface SelectTriggerProps
  extends Omit<PressableProps, 'style' | 'children' | 'onPress'> {
  id?: string
  value?: string
  placeholder?: string
  disabled?: boolean
  error?: boolean | string
  triggerStyle?: ViewStyle
  style?: ViewStyle | ViewStyle[]
  isOpen?: boolean
  onPress?: () => void
  ariaDescribedBy?: string
  ariaInvalid?: boolean
}

export const SelectTrigger = forwardRef<any, SelectTriggerProps>(
  (
    {
      id,
      value,
      placeholder,
      disabled = false,
      error = false,
      triggerStyle,
      isOpen = false,
      onPress,
      ariaDescribedBy,
      ariaInvalid,
      className,
      style,
      ...props
    },
    ref
  ) => {
    return (
      <Pressable
        ref={ref}
        id={id}
        onPress={onPress}
        {...props}
        className={cn(
          'flex h-12 w-full items-center justify-between rounded-md border bg-background px-3 py-2 text-base',
          'placeholder:text-muted-foreground',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'transition-colors',
          error && 'border-destructive focus-visible:ring-destructive',
          className
        )}
        style={[triggerStyle, style]}
        data-slot="select-trigger"
        aria-describedby={ariaDescribedBy}
        aria-invalid={ariaInvalid}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <Text variant="body" className={cn('flex-1 truncate', value ? '' : 'text-muted-foreground')}>
          {value || placeholder}
        </Text>
        <Text variant="caption" className="ml-2 text-muted-foreground">
          {isOpen ? '▲' : '▼'}
        </Text>
      </Pressable>
    )
  }
)
SelectTrigger.displayName = 'SelectTrigger'

interface SelectContentProps
  extends Omit<ViewStyle, 'style'> {
  id?: string
  contentStyle?: ViewStyle
  itemStyle?: ViewStyle
  children: React.ReactNode
  className?: string
  style?: ViewStyle | ViewStyle[]
}

export const SelectContent = forwardRef<any, SelectContentProps>(
  (
    {
      id,
      contentStyle,
      itemStyle,
      children,
      className,
      style,
      ...props
    },
    ref
  ) => {
    return (
      <View
        ref={ref}
        className={cn(
          'relative z-50 max-h-80 overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-lg',
          className
        )}
        style={[contentStyle, style]}
        data-slot="select-content"
        {...props}
      >
        <View
          className="max-h-[300px]"
          data-slot="select-scroll-view"
        >
          <FlatList
            data={Array.isArray(children) ? children : [children]}
            keyExtractor={(item: any) => item.key || item.props?.value || Math.random().toString(36)}
            renderItem={({ item }) => item}
            contentContainerStyle={itemStyle}
          />
        </View>
      </View>
    )
  }
)
SelectContent.displayName = 'SelectContent'

interface SelectItemProps
  extends Omit<PressableProps, 'style' | 'children' | 'onPress'> {
  value: string
  label?: string
  disabled?: boolean
  className?: string
  style?: ViewStyle
  children?: React.ReactNode
}

export const SelectItem = forwardRef<any, SelectItemProps>(
  (
    {
      value,
      label,
      disabled = false,
      className,
      style,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <Pressable
        ref={ref}
        onPress={() => {}}
        {...props}
        className={cn(
          'relative flex w-full cursor-pointer select-none items-center rounded-sm py-2 pl-3 pr-9',
          'outline-none focus:bg-accent focus:text-accent-foreground',
          'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
          'data-[selected]:bg-accent data-[selected]:text-accent-foreground',
          className
        )}
        style={style}
        data-slot="select-item"
        data-value={value}
        data-disabled={disabled}
      >
        <Text variant="body" className="truncate">
          {label || children}
        </Text>
      </Pressable>
    )
  }
)
SelectItem.displayName = 'SelectItem'

interface SelectSeparatorProps {
  className?: string
  style?: ViewStyle | ViewStyle[]
}

export const SelectSeparator = forwardRef<any, SelectSeparatorProps>(
  ({ className, style, ...props }, ref) => (
    <View
      ref={ref}
      className={cn('-mx-1 my-1 h-px bg-border', className)}
      style={style}
      data-slot="select-separator"
      {...props}
    />
  )
)
SelectSeparator.displayName = 'SelectSeparator'

const styles = StyleSheet.create({})