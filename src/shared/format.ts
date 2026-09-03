/**
 * Formatting helpers shared by every page of the prototype.
 * Pure functions only - no React, no app state.
 */

const MONEY_FORMATTERS = new Map<string, Intl.NumberFormat>()

const moneyFormatter = (currency: string, compact: boolean) => {
  const cacheKey = `${currency}:${compact ? 'compact' : 'standard'}`
  const cached = MONEY_FORMATTERS.get(cacheKey)
  if (cached) return cached
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    notation: compact ? 'compact' : 'standard',
    maximumFractionDigits: compact ? 1 : 2,
    minimumFractionDigits: compact ? 0 : 2,
  })
  MONEY_FORMATTERS.set(cacheKey, formatter)
  return formatter
}

/** `1234.5` -> `$1,234.50` */
export function formatMoney(amount: number, currency = 'USD'): string {
  if (!Number.isFinite(amount)) return '--'
  return moneyFormatter(currency, false).format(amount)
}

/** `1234567` -> `$1.2M` - useful inside dense metric cards. */
export function formatMoneyCompact(amount: number, currency = 'USD'): string {
  if (!Number.isFinite(amount)) return '--'
  return moneyFormatter(currency, true).format(amount)
}

const numberFormatter = new Intl.NumberFormat('en-US')

export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return '--'
  return numberFormatter.format(value)
}

/** `0.42` or `42` -> `42%`. Pass `fractional` for 0-1 ratios. */
export function formatPercent(
  value: number,
  options: { fractional?: boolean; maximumFractionDigits?: number } = {},
): string {
  if (!Number.isFinite(value)) return '--'
  const { fractional = false, maximumFractionDigits = 0 } = options
  const ratio = fractional ? value : value / 100
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    maximumFractionDigits,
  }).format(ratio)
}

const toDate = (value: string | number | Date): Date | null => {
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

/** `2026-02-01T09:30:00Z` -> `Feb 1, 2026` */
export function formatDate(value: string | number | Date): string {
  const date = toDate(value)
  if (!date) return '--'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

/** `2026-02-01T09:30:00Z` -> `Feb 1, 2026, 9:30 AM` */
export function formatDateTime(value: string | number | Date): string {
  const date = toDate(value)
  if (!date) return '--'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

/** `9:30 AM` - handy for same-day audit rows. */
export function formatTime(value: string | number | Date): string {
  const date = toDate(value)
  if (!date) return '--'
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

const RELATIVE_UNITS: Array<{ unit: Intl.RelativeTimeFormatUnit; ms: number }> =
  [
    { unit: 'year', ms: 365 * 24 * 60 * 60 * 1000 },
    { unit: 'month', ms: 30 * 24 * 60 * 60 * 1000 },
    { unit: 'day', ms: 24 * 60 * 60 * 1000 },
    { unit: 'hour', ms: 60 * 60 * 1000 },
    { unit: 'minute', ms: 60 * 1000 },
  ]

const relativeFormatter = new Intl.RelativeTimeFormat('en-US', {
  numeric: 'auto',
})

/** `2 hours ago` / `in 3 days`. Falls back to `just now` under a minute. */
export function formatRelativeTime(
  value: string | number | Date,
  now: Date = new Date(),
): string {
  const date = toDate(value)
  if (!date) return '--'
  const diff = date.getTime() - now.getTime()
  const absolute = Math.abs(diff)
  if (absolute < 60 * 1000) return 'just now'
  for (const { unit, ms } of RELATIVE_UNITS) {
    if (absolute >= ms) {
      return relativeFormatter.format(Math.round(diff / ms), unit)
    }
  }
  return 'just now'
}

/** `31` -> `1d 7h`; used for queue age / SLA columns. */
export function formatDurationHours(hours: number): string {
  if (!Number.isFinite(hours) || hours < 0) return '--'
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))}m`
  const wholeDays = Math.floor(hours / 24)
  const remainingHours = Math.round(hours % 24)
  if (wholeDays === 0) return `${Math.round(hours)}h`
  if (remainingHours === 0) return `${wholeDays}d`
  return `${wholeDays}d ${remainingHours}h`
}

/** `Elena Vasquez` -> `EV`; safe for empty strings. */
export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '--'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

/** Truncates long mocked identifiers without breaking layout. */
export function truncateMiddle(value: string, maxLength = 24): string {
  if (value.length <= maxLength) return value
  const half = Math.floor((maxLength - 1) / 2)
  return `${value.slice(0, half)}…${value.slice(value.length - half)}`
}

/** Stable filename stamp for CSV/JSON exports, e.g. `2026-02-01-0930`. */
export function exportStamp(now: Date = new Date()): string {
  const pad = (input: number) => String(input).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(
    now.getDate(),
  )}-${pad(now.getHours())}${pad(now.getMinutes())}`
}
