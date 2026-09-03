import type {
  KycCase,
  KycDocument,
  KycStatus,
  Persona,
  RiskLevel,
} from '../../core/types'

export type BadgeColor =
  | 'brand'
  | 'danger'
  | 'important'
  | 'informative'
  | 'severe'
  | 'subtle'
  | 'success'
  | 'warning'

export const statusColor = (status: KycStatus): BadgeColor => {
  switch (status) {
    case 'New':
      return 'brand'
    case 'In review':
      return 'informative'
    case 'Waiting for customer':
      return 'warning'
    case 'Escalated':
      return 'severe'
    case 'Approved':
      return 'success'
    case 'Rejected':
      return 'danger'
    default:
      return 'subtle'
  }
}

export const riskColor = (risk: RiskLevel): BadgeColor => {
  switch (risk) {
    case 'Low':
      return 'success'
    case 'Medium':
      return 'warning'
    case 'High':
      return 'severe'
    case 'Critical':
      return 'danger'
    default:
      return 'subtle'
  }
}

export const documentColor = (status: KycDocument['status']): BadgeColor => {
  switch (status) {
    case 'Verified':
      return 'success'
    case 'Rejected':
      return 'danger'
    default:
      return 'warning'
  }
}

export const OPEN_STATUSES: KycStatus[] = [
  'New',
  'In review',
  'Waiting for customer',
  'Escalated',
]

export const isOpen = (kycCase: KycCase): boolean =>
  OPEN_STATUSES.includes(kycCase.status)

export const isElevatedRisk = (kycCase: KycCase): boolean =>
  kycCase.risk === 'High' || kycCase.risk === 'Critical'

export interface KycPermissions {
  canTriage: boolean
  canDecide: boolean
  reason: string
}

/**
 * Compliance analysts can triage (assign, verify, note, request info, escalate).
 * Only the compliance lead can approve or reject a case (maker/checker split).
 */
export const permissionsFor = (persona: Persona): KycPermissions => {
  const canTriage = persona.team === 'Compliance'
  const canDecide = persona.role === 'KYC Compliance Lead'
  if (!canTriage) {
    return {
      canTriage,
      canDecide,
      reason: `${persona.role} is read-only in the KYC queue. Switch to a Compliance persona to take action.`,
    }
  }
  if (!canDecide) {
    return {
      canTriage,
      canDecide,
      reason:
        'Approve and reject are reserved for the KYC Compliance Lead. Escalate the case for a decision.',
    }
  }
  return { canTriage, canDecide, reason: '' }
}

export const formatDateTime = (iso: string): string => {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export const formatAge = (hours: number): string => {
  if (hours <= 0) return 'Closed'
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  const rest = hours % 24
  return rest === 0 ? `${days}d` : `${days}d ${rest}h`
}

const csvCell = (value: string | number): string => {
  const text = String(value)
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export const CSV_HEADERS = [
  'Case ID',
  'Customer',
  'Email',
  'Country',
  'Type',
  'Risk',
  'Status',
  'Assignee',
  'Age (hours)',
  'Created',
  'Risk reasons',
  'Documents pending',
] as const

export const buildCsv = (rows: KycCase[]): string => {
  const lines = [CSV_HEADERS.join(',')]
  for (const row of rows) {
    lines.push(
      [
        row.id,
        row.customer,
        row.email,
        row.country,
        row.type,
        row.risk,
        row.status,
        row.assignee,
        row.ageHours,
        row.createdAt,
        row.reasons.join(' | '),
        row.documents.filter((doc) => doc.status === 'Pending').length,
      ]
        .map(csvCell)
        .join(','),
    )
  }
  return lines.join('\n')
}

export const downloadCsv = (filename: string, csv: string): void => {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export const caseSummaryText = (kycCase: KycCase): string =>
  [
    `Case: ${kycCase.id}`,
    `Customer: ${kycCase.customer} (${kycCase.type})`,
    `Email: ${kycCase.email}`,
    `Country: ${kycCase.country}`,
    `Risk: ${kycCase.risk}`,
    `Status: ${kycCase.status}`,
    `Assignee: ${kycCase.assignee}`,
    `Age: ${formatAge(kycCase.ageHours)}`,
    `Risk reasons: ${kycCase.reasons.join(', ') || 'None recorded'}`,
  ].join('\n')
