/**
 * Shared presentational building blocks for the prototype pages.
 * Import styles once at the app root: `import './shared/shared.css'`
 */
export { PageHeader } from './PageHeader'
export type {
  PageHeaderProps,
  PageHeaderCrumb,
  PageHeaderMetaItem,
} from './PageHeader'

export { StatusBadge } from './StatusBadge'
export type {
  StatusBadgeProps,
  StatusBadgeKind,
  StatusBadgeValue,
} from './StatusBadge'

export { ConfirmDialog } from './ConfirmDialog'
export type { ConfirmDialogProps } from './ConfirmDialog'

export { ActivityTimeline } from './ActivityTimeline'
export type { ActivityTimelineProps, TimelineEvent } from './ActivityTimeline'

export { MetricCard } from './MetricCard'
export type { MetricCardProps, MetricTone } from './MetricCard'

export { EmptyState } from './EmptyState'
export type { EmptyStateProps, EmptyStateAction } from './EmptyState'

export {
  exportStamp,
  formatDate,
  formatDateTime,
  formatDurationHours,
  formatMoney,
  formatMoneyCompact,
  formatNumber,
  formatPercent,
  formatRelativeTime,
  formatTime,
  initialsOf,
  truncateMiddle,
} from './format'

export { copyText, downloadFile, toCsv } from './clipboard'
export type { CsvColumn } from './clipboard'
