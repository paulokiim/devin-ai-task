import type { Persona, Refund, RefundStatus } from '../../core/types'

export const REFUND_STATUSES: RefundStatus[] = [
  'Draft',
  'Pending approval',
  'Processing',
  'Succeeded',
  'Failed',
  'Rejected',
  'Cancelled',
]

export type StatusFilter = RefundStatus | 'All'

export type ReconciliationFilter = Refund['reconciliation'] | 'All'

export const HIGH_VALUE_THRESHOLD = 1000

export const MAX_REFUND_AMOUNT = 10_000

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
})

const compactCurrencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 1,
})

export const formatAmount = (amount: number): string =>
  currencyFormatter.format(amount)

export const formatCompactAmount = (amount: number): string =>
  compactCurrencyFormatter.format(amount)

export const formatDateTime = (iso: string): string => {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export const formatRelative = (iso: string): string => {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  const minutes = Math.round((Date.now() - date.getTime()) / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  return `${days}d ago`
}

/** Statuses that still consume operational attention. */
export const isOpen = (refund: Refund): boolean =>
  refund.status === 'Draft' ||
  refund.status === 'Pending approval' ||
  refund.status === 'Processing'

export const statusTone = (
  status: RefundStatus,
): 'brand' | 'success' | 'warning' | 'danger' | 'informative' | 'subtle' => {
  switch (status) {
    case 'Succeeded':
      return 'success'
    case 'Pending approval':
      return 'warning'
    case 'Processing':
      return 'brand'
    case 'Failed':
      return 'danger'
    case 'Rejected':
      return 'danger'
    case 'Cancelled':
      return 'subtle'
    case 'Draft':
      return 'informative'
    default:
      return 'informative'
  }
}

export const reconciliationTone = (
  reconciliation: Refund['reconciliation'],
): 'success' | 'warning' | 'danger' => {
  switch (reconciliation) {
    case 'Matched':
      return 'success'
    case 'Pending':
      return 'warning'
    case 'Discrepancy':
      return 'danger'
    default:
      return 'warning'
  }
}

/* ------------------------------------------------------------------ */
/* Maker-checker permissions                                           */
/* ------------------------------------------------------------------ */

export interface RefundPermissions {
  /** Can submit new refund requests (maker). */
  canRequest: boolean
  /** Can approve or reject refunds submitted by somebody else (checker). */
  canApprove: boolean
  /** Can push a failed refund back to the processor. */
  canRetry: boolean
  /** Job title used in gating messages. */
  roleLabel: string
}

export const permissionsFor = (persona: Persona): RefundPermissions => {
  const isChecker = persona.team === 'Finance'
  const isPlatform = persona.team === 'Platform'
  return {
    canRequest: persona.team === 'Support' || isChecker,
    canApprove: isChecker,
    canRetry: isChecker || isPlatform,
    roleLabel: persona.role,
  }
}

export interface ActionGate {
  /** Action is offered for this refund at all. */
  applicable: boolean
  allowed: boolean
  /** Why the action is blocked, or a short confirmation hint when allowed. */
  reason: string
}

export const approveGate = (refund: Refund, persona: Persona): ActionGate => {
  const permissions = permissionsFor(persona)
  const applicable = refund.status === 'Pending approval'
  if (!applicable) {
    return {
      applicable,
      allowed: false,
      reason: `Only refunds pending approval can be approved (this one is ${refund.status.toLowerCase()}).`,
    }
  }
  if (!permissions.canApprove) {
    return {
      applicable,
      allowed: false,
      reason: `${permissions.roleLabel} cannot approve payouts. A Finance Approver must review this request.`,
    }
  }
  if (refund.requestedBy === persona.name) {
    return {
      applicable,
      allowed: false,
      reason:
        'Maker-checker: you submitted this refund, so a different approver must sign it off.',
    }
  }
  return {
    applicable,
    allowed: true,
    reason:
      refund.amount >= HIGH_VALUE_THRESHOLD
        ? 'High-value refund — approval is recorded in the audit trail.'
        : 'Approving releases the payout to the processor.',
  }
}

export const rejectGate = (refund: Refund, persona: Persona): ActionGate => {
  const gate = approveGate(refund, persona)
  if (gate.allowed) {
    return {
      ...gate,
      reason: 'Rejecting requires a reason for the customer record.',
    }
  }
  if (!gate.applicable) {
    return {
      ...gate,
      reason: `Only refunds pending approval can be rejected (this one is ${refund.status.toLowerCase()}).`,
    }
  }
  return gate
}

export const retryGate = (refund: Refund, persona: Persona): ActionGate => {
  const permissions = permissionsFor(persona)
  const applicable = refund.status === 'Failed'
  if (!applicable) {
    return {
      applicable,
      allowed: false,
      reason: 'Retry is only available for failed refunds.',
    }
  }
  if (!permissions.canRetry) {
    return {
      applicable,
      allowed: false,
      reason: `${permissions.roleLabel} cannot resend payouts. Finance or Platform must retry.`,
    }
  }
  if (refund.attempts >= 3) {
    return {
      applicable,
      allowed: false,
      reason:
        'Three processor attempts already used — raise a payments incident instead.',
    }
  }
  return {
    applicable,
    allowed: true,
    reason: `Reuses the original idempotency key (attempt ${refund.attempts + 1} of 3).`,
  }
}

export const cancelGate = (refund: Refund, persona: Persona): ActionGate => {
  const permissions = permissionsFor(persona)
  const applicable =
    refund.status === 'Draft' ||
    refund.status === 'Pending approval' ||
    refund.status === 'Failed'
  if (!applicable) {
    return {
      applicable,
      allowed: false,
      reason: `A ${refund.status.toLowerCase()} refund can no longer be cancelled.`,
    }
  }
  const isOwner = refund.requestedBy === persona.name
  if (!isOwner && !permissions.canApprove) {
    return {
      applicable,
      allowed: false,
      reason: `${refund.requestedBy} raised this request. Only the requester or a Finance Approver can cancel it.`,
    }
  }
  return {
    applicable,
    allowed: true,
    reason: 'Cancelling stops the payout and closes the request.',
  }
}

/* ------------------------------------------------------------------ */
/* Filtering + export                                                  */
/* ------------------------------------------------------------------ */

export interface RefundFilters {
  search: string
  status: StatusFilter
  reconciliation: ReconciliationFilter
  onlyMine: boolean
}

export const filterRefunds = (
  refunds: Refund[],
  filters: RefundFilters,
  personaName: string,
): Refund[] => {
  const query = filters.search.trim().toLowerCase()
  return refunds.filter((refund) => {
    if (filters.status !== 'All' && refund.status !== filters.status)
      return false
    if (
      filters.reconciliation !== 'All' &&
      refund.reconciliation !== filters.reconciliation
    ) {
      return false
    }
    if (filters.onlyMine && refund.requestedBy !== personaName) return false
    if (!query) return true
    return [
      refund.id,
      refund.customer,
      refund.email,
      refund.paymentId,
      refund.reason,
      refund.requestedBy,
      refund.status,
    ]
      .join(' ')
      .toLowerCase()
      .includes(query)
  })
}

export interface RefundMetrics {
  pendingCount: number
  pendingValue: number
  processingCount: number
  failedCount: number
  discrepancyCount: number
  succeededCount: number
  succeededValue: number
  totalValue: number
  highValueCount: number
}

export const computeMetrics = (refunds: Refund[]): RefundMetrics => {
  const metrics: RefundMetrics = {
    pendingCount: 0,
    pendingValue: 0,
    processingCount: 0,
    failedCount: 0,
    discrepancyCount: 0,
    succeededCount: 0,
    succeededValue: 0,
    totalValue: 0,
    highValueCount: 0,
  }
  for (const refund of refunds) {
    metrics.totalValue += refund.amount
    if (refund.amount >= HIGH_VALUE_THRESHOLD) metrics.highValueCount += 1
    if (refund.reconciliation === 'Discrepancy') metrics.discrepancyCount += 1
    switch (refund.status) {
      case 'Pending approval':
        metrics.pendingCount += 1
        metrics.pendingValue += refund.amount
        break
      case 'Processing':
        metrics.processingCount += 1
        break
      case 'Failed':
        metrics.failedCount += 1
        break
      case 'Succeeded':
        metrics.succeededCount += 1
        metrics.succeededValue += refund.amount
        break
      default:
        break
    }
  }
  return metrics
}

const csvCell = (value: string | number): string => {
  const text = String(value)
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export const toCsv = (refunds: Refund[]): string => {
  const header = [
    'Refund ID',
    'Customer',
    'Email',
    'Payment ID',
    'Amount',
    'Currency',
    'Reason',
    'Status',
    'Requested by',
    'Created at',
    'Reconciliation',
    'Attempts',
    'Notes',
  ]
  const rows = refunds.map((refund) =>
    [
      refund.id,
      refund.customer,
      refund.email,
      refund.paymentId,
      refund.amount.toFixed(2),
      refund.currency,
      refund.reason,
      refund.status,
      refund.requestedBy,
      refund.createdAt,
      refund.reconciliation,
      refund.attempts,
      refund.notes.join(' | '),
    ]
      .map(csvCell)
      .join(','),
  )
  return [header.join(','), ...rows].join('\n')
}

export const downloadCsv = (filename: string, csv: string): void => {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export const refundSummaryText = (refund: Refund): string =>
  [
    `${refund.id} · ${refund.status}`,
    `Customer: ${refund.customer} <${refund.email}>`,
    `Payment: ${refund.paymentId}`,
    `Amount: ${formatAmount(refund.amount)} ${refund.currency}`,
    `Reason: ${refund.reason}`,
    `Requested by: ${refund.requestedBy} on ${formatDateTime(refund.createdAt)}`,
    `Reconciliation: ${refund.reconciliation} · Attempts: ${refund.attempts}`,
  ].join('\n')

/* ------------------------------------------------------------------ */
/* New refund validation                                               */
/* ------------------------------------------------------------------ */

export interface RefundDraft {
  customer: string
  email: string
  paymentId: string
  amount: string
  reason: string
}

export type RefundDraftErrors = Partial<Record<keyof RefundDraft, string>>

export const emptyDraft: RefundDraft = {
  customer: '',
  email: '',
  paymentId: '',
  amount: '',
  reason: '',
}

export const validateDraft = (
  draft: RefundDraft,
  existing: Refund[],
): RefundDraftErrors => {
  const errors: RefundDraftErrors = {}

  if (!draft.customer.trim()) {
    errors.customer = 'Customer name is required.'
  } else if (draft.customer.trim().length < 2) {
    errors.customer = 'Enter the full customer or business name.'
  }

  const email = draft.email.trim()
  if (!email) {
    errors.email = 'Customer email is required.'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    errors.email = 'Enter a valid email address, for example name@example.com.'
  }

  const paymentId = draft.paymentId.trim().toUpperCase()
  if (!paymentId) {
    errors.paymentId = 'Payment ID is required.'
  } else if (!/^PAY-\d{6}$/.test(paymentId)) {
    errors.paymentId = 'Use the processor format PAY-000000.'
  } else if (
    existing.some(
      (refund) =>
        refund.paymentId.toUpperCase() === paymentId &&
        (refund.status === 'Pending approval' ||
          refund.status === 'Processing' ||
          refund.status === 'Succeeded'),
    )
  ) {
    errors.paymentId = `${paymentId} already has an open or completed refund.`
  }

  const amountText = draft.amount.trim()
  const amount = Number(amountText)
  if (!amountText) {
    errors.amount = 'Amount is required.'
  } else if (!/^\d*\.?\d{0,2}$/.test(amountText) || Number.isNaN(amount)) {
    errors.amount = 'Enter an amount with up to two decimal places.'
  } else if (amount <= 0) {
    errors.amount = 'Amount must be greater than 0.00.'
  } else if (amount > MAX_REFUND_AMOUNT) {
    errors.amount = `Amounts above ${formatAmount(MAX_REFUND_AMOUNT)} need a manual treasury transfer.`
  }

  if (!draft.reason.trim()) {
    errors.reason = 'A refund reason is required for the audit trail.'
  } else if (draft.reason.trim().length < 6) {
    errors.reason = 'Add at least 6 characters of detail.'
  }

  return errors
}
