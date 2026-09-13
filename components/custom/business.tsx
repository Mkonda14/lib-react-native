import { cn } from '@/lib/utils'
import { View, ViewStyle, Pressable, StyleSheet } from 'react-native'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../ui/card'
import { Text } from '../ui/text'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Separator } from '../ui/separator'

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline' | 'success'

interface WalletCardProps {
  title: string
  balance: number
  currency?: string
  description?: string
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
  actions?: React.ReactNode
  className?: string
  style?: ViewStyle | ViewStyle[]
}

export const WalletCard = ({
  title,
  balance,
  currency = 'FCFA',
  description,
  trend = 'neutral',
  trendValue,
  actions,
  className,
  style,
}: WalletCardProps) => {
  const trendColors: Record<'up' | 'down' | 'neutral', BadgeVariant> = {
    up: 'success',
    down: 'destructive',
    neutral: 'secondary',
  }

  const trendIcons = {
    up: '↑',
    down: '↓',
    neutral: '→',
  }

  return (
    <Card variant="outlined" className={cn('overflow-hidden', className)} style={style}>
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <View style={{ flex: 1 }}>
          <CardTitle className="text-base">{title}</CardTitle>
          {description && (
            <CardDescription className="text-xs">{description}</CardDescription>
          )}
        </View>
        <Badge variant={trendColors[trend]} className="whitespace-nowrap">
          <Text variant="caption" className="flex items-center gap-1">
            {trendIcons[trend]} {trendValue || ''}
          </Text>
        </Badge>
      </CardHeader>
      <Separator className="my-4" />
      <CardContent className="py-2">
        <Text variant="heading" className="font-mono tabular-nums">
          {balance.toLocaleString()} {currency}
        </Text>
      </CardContent>
      {actions && (
        <CardFooter className="pt-4 border-t">
          {actions}
        </CardFooter>
      )}
    </Card>
  )
}

WalletCard.displayName = 'WalletCard'

interface TransactionRowProps {
  id: string
  type: 'income' | 'expense' | 'transfer' | 'deposit' | 'withdrawal'
  amount: number
  currency?: string
  description: string
  category?: string
  status: 'pending' | 'completed' | 'failed' | 'cancelled'
  date: Date | string
  onPress?: () => void
  className?: string
  style?: ViewStyle | ViewStyle[]
}

export const TransactionRow = ({
  id,
  type,
  amount,
  currency = 'FCFA',
  description,
  category,
  status,
  date,
  onPress,
  className,
  style,
}: TransactionRowProps) => {
  const typeConfig = {
    income: { icon: '↗', color: 'success', label: 'Revenu' },
    expense: { icon: '↘', color: 'destructive', label: 'Dépense' },
    transfer: { icon: '↔', color: 'primary', label: 'Transfert' },
    deposit: { icon: '↓', color: 'success', label: 'Dépôt' },
    withdrawal: { icon: '↑', color: 'destructive', label: 'Retrait' },
  }

  const statusConfig: Record<'pending' | 'completed' | 'failed' | 'cancelled', { variant: BadgeVariant; label: string }> = {
    pending: { variant: 'secondary', label: 'En attente' },
    completed: { variant: 'success', label: 'Terminé' },
    failed: { variant: 'destructive', label: 'Échoué' },
    cancelled: { variant: 'outline', label: 'Annulé' },
  }

  const config = typeConfig[type]
  const statusCfg = statusConfig[status]

  const formatDate = (d: Date | string) => {
    const dateObj = typeof d === 'string' ? new Date(d) : d
    return dateObj.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <Pressable
      onPress={onPress}
      className={cn('flex flex-row items-center gap-3 p-4', onPress && 'bg-muted/50', className)}
      style={style}
      data-slot="transaction-row"
    >
      <View
        style={[
          styles.iconContainer,
          { backgroundColor: 'transparent' },
        ]}
        data-slot="transaction-row-icon"
      >
        <Text variant="body" className={cn('text-2xl', `text-${config.color}`)}>
          {config.icon}
        </Text>
      </View>
      <View style={{ flex: 1, minWidth: 0 }} data-slot="transaction-row-details">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Text variant="body" className="font-medium truncate" data-slot="transaction-row-description">
            {description}
          </Text>
          {category && (
            <Badge variant="outline" className="text-xs whitespace-nowrap">
              {category}
            </Badge>
          )}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 2 }}>
          <Text variant="caption" className="text-muted-foreground" data-slot="transaction-row-date">
            {formatDate(date)}
          </Text>
          <Text variant="caption" className="text-muted-foreground">·</Text>
          <Text variant="caption" className="text-muted-foreground" data-slot="transaction-row-type">
            {config.label}
          </Text>
        </View>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 4 }} data-slot="transaction-row-amount">
        <Text
          variant="body"
          className={cn('font-mono font-semibold tabular-nums', `text-${config.color}`)}
          data-slot="transaction-row-amount-value"
        >
          {type === 'income' || type === 'deposit' ? '+' : '-'}
          {amount.toLocaleString()} {currency}
        </Text>
        <Badge variant={statusCfg.variant} className="text-xs whitespace-nowrap">
          {statusCfg.label}
        </Badge>
      </View>
    </Pressable>
  )
}

TransactionRow.displayName = 'TransactionRow'

const styles = StyleSheet.create({
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgb(var(--muted))',
  },
})

interface ApprovalCardProps {
  id: string
  memberName: string
  memberAvatar?: string
  amount: number
  currency?: string
  category: string
  description: string
  date: Date | string
  onApprove: () => void
  onReject: () => void
  className?: string
  style?: ViewStyle | ViewStyle[]
}

export const ApprovalCard = ({
  id,
  memberName,
  memberAvatar,
  amount,
  currency = 'FCFA',
  category,
  description,
  date,
  onApprove,
  onReject,
  className,
  style,
}: ApprovalCardProps) => {
  const formatDate = (d: Date | string) => {
    const dateObj = typeof d === 'string' ? new Date(d) : d
    return dateObj.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <Card variant="outlined" className={cn('overflow-hidden', className)} style={style}>
      <CardHeader className="flex flex-row items-start justify-between pb-4">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
          {memberAvatar ? (
            <View style={avatarStyles.avatarFallback} data-slot="approval-card-avatar">
              <Text variant="title" className="font-bold">
                {memberName.charAt(0).toUpperCase()}
              </Text>
            </View>
          ) : null}
          <View>
            <CardTitle className="text-base">{memberName}</CardTitle>
            <CardDescription className="text-xs">{formatDate(date)}</CardDescription>
          </View>
        </View>
        <Badge variant="secondary" className="whitespace-nowrap">
          En attente
        </Badge>
      </CardHeader>
      <Separator className="my-4" />
      <CardContent className="py-2 space-y-3">
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text variant="caption" className="text-muted-foreground">Montant</Text>
            <Text variant="heading" className="font-mono tabular-nums text-destructive">
              {amount.toLocaleString()} {currency}
            </Text>
          </View>
        </View>
        <View style={{ gap: 2 }}>
          <Text variant="caption" className="text-muted-foreground">Catégorie</Text>
          <Badge variant="outline">{category}</Badge>
        </View>
        <View style={{ gap: 2 }}>
          <Text variant="caption" className="text-muted-foreground">Description</Text>
          <Text variant="body">{description}</Text>
        </View>
      </CardContent>
      <CardFooter className="pt-4 border-t flex flex-row justify-end gap-2">
        <Button variant="outline" onPress={onReject} className="flex-1">
          Rejeter
        </Button>
        <Button variant="default" onPress={onApprove} className="flex-1">
          Approuver
        </Button>
      </CardFooter>
    </Card>
  )
}
ApprovalCard.displayName = 'ApprovalCard'

interface MemberAvatarProps {
  name: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  status?: 'online' | 'offline' | 'busy' | 'away'
  src?: string
  className?: string
  style?: ViewStyle | ViewStyle[]
}

export const MemberAvatar = ({
  name,
  size = 'md',
  status,
  src,
  className,
  style,
}: MemberAvatarProps) => {
  const sizeConfig = {
    sm: { size: 32, fontSize: 12 },
    md: { size: 40, fontSize: 14 },
    lg: { size: 48, fontSize: 16 },
    xl: { size: 64, fontSize: 20 },
  }

  const config = sizeConfig[size]
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const statusColors: Record<'online' | 'offline' | 'busy' | 'away', string> = {
    online: 'success',
    offline: 'muted',
    busy: 'destructive',
    away: 'warning',
  }

  return (
    <View
      style={[
        avatarStyles.avatarContainer,
        { width: config.size, height: config.size },
        style,
      ]}
      className={className}
      data-slot="member-avatar"
    >
      {src ? (
        <View style={avatarStyles.avatarImage}>
          <Text variant="body">{src}</Text>
        </View>
      ) : (
        <View
          style={avatarStyles.avatarFallback}
          data-slot="member-avatar-fallback"
        >
          <Text variant="body" className="font-bold text-primary-foreground" style={{ fontSize: config.fontSize }}>
            {initials}
          </Text>
        </View>
      )}
      {status && (
        <View
          style={[
            avatarStyles.statusBadge,
            { bottom: size === 'sm' ? -2 : size === 'md' ? -2 : size === 'lg' ? -3 : -4 },
          ]}
          data-slot="member-avatar-status"
        >
          <View
            style={[
              avatarStyles.statusDot,
              { width: size === 'sm' ? 8 : 10, height: size === 'sm' ? 8 : 10 },
            ]}
          />
        </View>
      )}
    </View>
  )
}
MemberAvatar.displayName = 'MemberAvatar'

const avatarStyles = StyleSheet.create({
  avatarContainer: {
    position: 'relative',
    borderRadius: 9999,
    overflow: 'hidden',
    backgroundColor: 'rgb(var(--muted))',
  },
  avatarFallback: {
    width: '100%',
    height: '100%',
    borderRadius: 9999,
    backgroundColor: 'rgb(var(--primary))',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 9999,
  },
  statusBadge: {
    position: 'absolute' as const,
    right: 0,
    borderRadius: 9999,
    padding: 1,
  },
  statusDot: {
    borderRadius: 9999,
    borderWidth: 2,
    borderColor: 'rgb(var(--background))',
  },
})

interface BalanceDisplayProps {
  amount: number
  currency?: string
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
  label?: string
  className?: string
  style?: ViewStyle | ViewStyle[]
}

export const BalanceDisplay = ({
  amount,
  currency = 'FCFA',
  trend = 'neutral',
  trendValue,
  label = 'Solde total',
  className,
  style,
}: BalanceDisplayProps) => {
  const trendColors: Record<'up' | 'down' | 'neutral', BadgeVariant> = {
    up: 'success',
    down: 'destructive',
    neutral: 'secondary',
  }

  const trendIcons = {
    up: '↑',
    down: '↓',
    neutral: '→',
  }

  return (
    <View
      className={cn('flex flex-col gap-2', className)}
      style={style}
      data-slot="balance-display"
    >
      <Text variant="caption" className="text-muted-foreground" data-slot="balance-display-label">
        {label}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2, flexWrap: 'wrap' }}>
        <Text
          variant="heading"
          className="font-mono tabular-nums shrink-0"
          data-slot="balance-display-amount"
        >
          {amount.toLocaleString()}
        </Text>
        <Text variant="title" className="text-muted-foreground" data-slot="balance-display-currency">
          {currency}
        </Text>
        {trendValue && (
          <Badge variant={trendColors[trend]} className="self-center whitespace-nowrap">
            <Text variant="caption" className="flex items-center gap-1">
              {trendIcons[trend]} {trendValue}
            </Text>
          </Badge>
        )}
      </View>
    </View>
  )
}
BalanceDisplay.displayName = 'BalanceDisplay'

