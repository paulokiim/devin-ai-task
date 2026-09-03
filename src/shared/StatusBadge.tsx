import { Badge, Tooltip, type BadgeProps } from '@fluentui/react-components'
import {
  CheckmarkCircle16Regular,
  Clock16Regular,
  ErrorCircle16Regular,
  Info16Regular,
  ShieldCheckmark16Regular,
  Warning16Regular,
} from '@fluentui/react-icons'
import type { ReactElement } from 'react'
import type { KycStatus, RefundStatus, RiskLevel } from '../core/types'

export type StatusBadgeKind = 'kyc' | 'refund' | 'risk' | 'generic'

type BadgeColor = NonNullable<BadgeProps['color']>

/** KYC, refund, risk or any generic status string. */
export type StatusBadgeValue = KycStatus | RefundStatus | RiskLevel | string

interface StatusDescriptor {
  color: BadgeColor
  icon: ReactElement
  /** Short explanation surfaced through a tooltip for screen readers + hover. */
  hint: string
}

const iconFor = {
  ok: <CheckmarkCircle16Regular />,
  pending: <Clock16Regular />,
  error: <ErrorCircle16Regular />,
  warning: <Warning16Regular />,
  info: <Info16Regular />,
  shield: <ShieldCheckmark16Regular />,
} as const

const KYC_MAP: Record<KycStatus, StatusDescriptor> = {
  New: {
    color: 'informative',
    icon: iconFor.info,
    hint: 'Unassigned in queue',
  },
  'In review': {
    color: 'brand',
    icon: iconFor.pending,
    hint: 'An analyst is actively reviewing this case',
  },
  'Waiting for customer': {
    color: 'warning',
    icon: iconFor.pending,
    hint: 'Blocked on customer-supplied documents',
  },
  Escalated: {
    color: 'severe',
    icon: iconFor.warning,
    hint: 'Escalated for compliance lead review',
  },
  Approved: {
    color: 'success',
    icon: iconFor.ok,
    hint: 'Onboarding approved',
  },
  Rejected: {
    color: 'danger',
    icon: iconFor.error,
    hint: 'Application rejected with a recorded reason',
  },
}

const REFUND_MAP: Record<RefundStatus, StatusDescriptor> = {
  Draft: {
    color: 'informative',
    icon: iconFor.info,
    hint: 'Not submitted for approval yet',
  },
  'Pending approval': {
    color: 'warning',
    icon: iconFor.pending,
    hint: 'Awaiting a second approver (maker-checker)',
  },
  Processing: {
    color: 'brand',
    icon: iconFor.pending,
    hint: 'Sent to the payment processor',
  },
  Succeeded: {
    color: 'success',
    icon: iconFor.ok,
    hint: 'Refund settled with the processor',
  },
  Failed: {
    color: 'danger',
    icon: iconFor.error,
    hint: 'Processor declined the refund - retry is available',
  },
  Rejected: {
    color: 'danger',
    icon: iconFor.error,
    hint: 'Approver rejected the request with a reason',
  },
  Cancelled: {
    color: 'subtle',
    icon: iconFor.info,
    hint: 'Cancelled before processing',
  },
}

const RISK_MAP: Record<RiskLevel, StatusDescriptor> = {
  Low: { color: 'success', icon: iconFor.shield, hint: 'Low risk score' },
  Medium: {
    color: 'warning',
    icon: iconFor.shield,
    hint: 'Medium risk - standard due diligence',
  },
  High: {
    color: 'severe',
    icon: iconFor.warning,
    hint: 'High risk - enhanced due diligence required',
  },
  Critical: {
    color: 'danger',
    icon: iconFor.error,
    hint: 'Critical risk - lead approval required',
  },
}

/** Generic statuses used across reconciliation, documents, environments, etc. */
const GENERIC_MAP: Record<string, StatusDescriptor> = {
  matched: { color: 'success', icon: iconFor.ok, hint: 'Reconciled' },
  verified: { color: 'success', icon: iconFor.ok, hint: 'Verified' },
  enabled: { color: 'success', icon: iconFor.ok, hint: 'Enabled' },
  healthy: { color: 'success', icon: iconFor.ok, hint: 'Healthy' },
  active: { color: 'success', icon: iconFor.ok, hint: 'Active' },
  pending: { color: 'warning', icon: iconFor.pending, hint: 'Pending' },
  discrepancy: {
    color: 'severe',
    icon: iconFor.warning,
    hint: 'Amounts do not match the ledger',
  },
  disabled: { color: 'subtle', icon: iconFor.info, hint: 'Disabled' },
  archived: { color: 'subtle', icon: iconFor.info, hint: 'Archived' },
  killed: {
    color: 'danger',
    icon: iconFor.error,
    hint: 'Kill switch is active in production',
  },
  failed: { color: 'danger', icon: iconFor.error, hint: 'Failed' },
  rejected: { color: 'danger', icon: iconFor.error, hint: 'Rejected' },
  protected: {
    color: 'brand',
    icon: iconFor.shield,
    hint: 'Protected - production changes need approval',
  },
  development: {
    color: 'informative',
    icon: iconFor.info,
    hint: 'Development',
  },
  staging: { color: 'warning', icon: iconFor.info, hint: 'Staging' },
  production: { color: 'danger', icon: iconFor.warning, hint: 'Production' },
}

const FALLBACK: StatusDescriptor = {
  color: 'informative',
  icon: iconFor.info,
  hint: 'Status',
}

function describe(kind: StatusBadgeKind, status: string): StatusDescriptor {
  if (kind === 'kyc' && status in KYC_MAP) {
    return KYC_MAP[status as KycStatus]
  }
  if (kind === 'refund' && status in REFUND_MAP) {
    return REFUND_MAP[status as RefundStatus]
  }
  if (kind === 'risk' && status in RISK_MAP) {
    return RISK_MAP[status as RiskLevel]
  }
  return GENERIC_MAP[status.toLowerCase()] ?? FALLBACK
}

export interface StatusBadgeProps {
  /** Status text. Typed unions give autocomplete for KYC/refund/risk values. */
  status: StatusBadgeValue
  /** Which vocabulary to resolve colours from. Defaults to `generic`. */
  kind?: StatusBadgeKind
  /** Overrides the visible label while keeping the resolved colour. */
  label?: string
  size?: BadgeProps['size']
  appearance?: BadgeProps['appearance']
  /** Hide the leading glyph in very dense table cells. */
  hideIcon?: boolean
  /** Wrap in a tooltip explaining the status (default true). */
  withTooltip?: boolean
  /** Prefix announced to screen readers, e.g. `Risk`. */
  srPrefix?: string
}

export function StatusBadge({
  status,
  kind = 'generic',
  label,
  size = 'medium',
  appearance = 'filled',
  hideIcon = false,
  withTooltip = true,
  srPrefix,
}: StatusBadgeProps) {
  const descriptor = describe(kind, status)
  const text = label ?? status
  const ariaLabel = srPrefix ? `${srPrefix}: ${text}` : text

  const badge = (
    <Badge
      className="app-status-badge"
      appearance={appearance}
      color={descriptor.color}
      size={size}
      icon={hideIcon ? undefined : descriptor.icon}
      aria-label={ariaLabel}
    >
      {text}
    </Badge>
  )

  if (!withTooltip) return badge

  return (
    <Tooltip
      relationship="description"
      content={descriptor.hint}
      withArrow
      positioning="above"
    >
      {badge}
    </Tooltip>
  )
}

export default StatusBadge
