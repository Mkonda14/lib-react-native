import { Text } from '@/components/ui/text';
import { useColor } from '@/hooks/use-color';
import { BORDER_RADIUS } from '@/theme/globals';
import { View, ViewStyle, StyleSheet } from 'react-native';
import { cn } from '@/lib/utils';

interface ChartContainerProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  style?: ViewStyle;
  className?: string;
  action?: React.ReactNode;
}

export const ChartContainer = ({
  title,
  description,
  children,
  style,
  className,
  action,
}: {
  title?: string;
  description?: string;
  children: React.ReactNode;
  style?: ViewStyle;
  className?: string;
  action?: React.ReactNode;
}) => {
  const cardColor = useColor('card');

  return (
    <View
      style={[
        {
          backgroundColor: 'rgb(var(--card))',
          borderRadius: 16,
          padding: 20,
          width: '100%',
        },
        style,
      ]}
      className={className}
    >
      {(title || description) && (
        <View style={[styles.header, { marginBottom: 16 }]}>
          {title && (
            <Text variant='subtitle' style={styles.title}>
              {title}
            </Text>
          )}
          {description && (
            <Text variant='caption' style={{ marginTop: 4, color: 'rgb(var(--muted-foreground))' }}>
              {description}
            </Text>
          )}
        </View>
      )}
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'column',
    justifyContent: 'flex-start',
    marginBottom: 16,
  },
  title: {
    fontWeight: '600',
  },
});