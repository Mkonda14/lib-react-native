import { cn } from '@/lib/utils';
import { View, ViewStyle, Image, ImageStyle } from 'react-native';
import { forwardRef, useMemo } from 'react';
import { Text } from './text';

type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';
const sizeClasses: Record<AvatarSize, string> = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-16 w-16 text-lg',
};

interface AvatarProps {
  src?: string;
  alt?: string;
  fallback?: React.ReactNode;
  fallbackName?: string;
  size?: AvatarSize;
  className?: string;
  style?: ViewStyle | ViewStyle[];
}

export const Avatar = forwardRef<View, AvatarProps>(
  (
    {
      src,
      alt,
      fallback,
      fallbackName,
      size = 'md',
      className,
      style,
    },
    ref
  ) => {
    const fallbackContent = fallback ?? (
      fallbackName
        ? <Text variant="body" className="font-semibold">{fallbackName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}</Text>
        : null
    );

    return (
      <View
        ref={ref}
        className={cn(
          'relative inline-flex shrink-0 overflow-hidden rounded-full bg-muted',
          sizeClasses[size],
          className
        )}
        style={style}
        data-slot="avatar"
      >
        {src ? (
          <Image
            source={{ uri: src }}
            alt={alt}
            className={cn('h-full w-full object-cover', className)}
            style={style as ImageStyle}
            data-slot="avatar-image"
          />
        ) : (
          <View
            className={cn('flex h-full w-full items-center justify-center', className)}
            data-slot="avatar-fallback"
          >
            {fallbackContent}
          </View>
        )}
      </View>
    )
  }
);
Avatar.displayName = 'Avatar';

interface AvatarGroupProps {
  children: React.ReactNode;
  max?: number;
  overlap?: number;
  className?: string;
  style?: ViewStyle | ViewStyle[];
}

export const AvatarGroup = forwardRef<View, AvatarGroupProps>(
  (
    {
      children,
      max,
      overlap = 8,
      className,
      style,
    },
    ref
  ) => {
    const childrenArray = useMemo(() => React.Children.toArray(children), [children]);
    const visibleChildren = max ? childrenArray.slice(0, max) : childrenArray;
    const remaining = max && childrenArray.length > max ? childrenArray.length - max : 0;

    return (
      <View
        ref={ref}
        className={cn('flex flex-row -space-x-2', className)}
        style={[{ marginLeft: -overlap }, style]}
        data-slot="avatar-group"
      >
        {visibleChildren.map((child, index) => {
          if (!React.isValidElement(child)) return child;
          const childKey = child.key ?? String(index);
          const childStyle = (child.props as React.HTMLAttributes<any> & { style?: ViewStyle | ViewStyle[] }).style;
          return React.cloneElement(child as React.ReactElement<any>, {
            key: childKey,
            style: [{ zIndex: visibleChildren.length - index }, childStyle],
          });
        })}
        {remaining > 0 && (
          <View
            className={cn(
              'flex items-center justify-center rounded-full bg-primary/10 text-primary font-medium',
              sizeClasses.md
            )}
            data-slot="avatar-group-remaining"
          >
            <Text variant="caption">+{remaining}</Text>
          </View>
        )}
      </View>
    )
  }
);
AvatarGroup.displayName = 'AvatarGroup';

import React from 'react';

export { Avatar as AvatarImage, AvatarGroup as AvatarGroupRoot };