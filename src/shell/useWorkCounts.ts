import { useMemo } from 'react'
import { usePrototype } from '../core/PrototypeContext'
import type { NavKey } from './navItems'

export interface WorkCounts {
  kycOpen: number
  kycMine: number
  kycEscalated: number
  refundsPendingApproval: number
  refundsFailed: number
  refundsProcessing: number
  refundsMine: number
  flagsPendingApproval: number
  flagsKilled: number
  flagsLiveInProduction: number
}

export interface WorkItem {
  id: string
  label: string
  value: number
  hint: string
  path: string
  navKey: NavKey
  emphasis: 'critical' | 'attention' | 'neutral'
}

const closedKycStatuses = new Set(['Approved', 'Rejected'])

/**
 * Derived counts for the shell. All values come from usePrototype() state so
 * badges, tiles and the notification popover stay in sync with mutations.
 */
export function useWorkCounts(): {
  counts: WorkCounts
  primaryWork: WorkItem[]
  badgeFor: (key: NavKey) => number
} {
  const { kycCases, refunds, flags, persona } = usePrototype()

  return useMemo(() => {
    const openKyc = kycCases.filter(
      (item) => !closedKycStatuses.has(item.status),
    )
    const counts: WorkCounts = {
      kycOpen: openKyc.length,
      kycMine: openKyc.filter((item) => item.assignee === persona.name).length,
      kycEscalated: kycCases.filter((item) => item.status === 'Escalated')
        .length,
      refundsPendingApproval: refunds.filter(
        (item) => item.status === 'Pending approval',
      ).length,
      refundsFailed: refunds.filter((item) => item.status === 'Failed').length,
      refundsProcessing: refunds.filter((item) => item.status === 'Processing')
        .length,
      refundsMine: refunds.filter((item) => item.requestedBy === persona.name)
        .length,
      flagsPendingApproval: flags.filter((item) => item.pendingChange !== null)
        .length,
      flagsKilled: flags.filter((item) => item.killed).length,
      flagsLiveInProduction: flags.filter(
        (item) => !item.archived && item.environments.production.enabled,
      ).length,
    }

    const kycWork: WorkItem[] = [
      {
        id: 'kyc-mine',
        label: 'KYC cases assigned to you',
        value: counts.kycMine,
        hint: `${counts.kycOpen} open in the shared queue`,
        path: '/kyc',
        navKey: 'kyc',
        emphasis: counts.kycMine > 0 ? 'attention' : 'neutral',
      },
      {
        id: 'kyc-escalated',
        label: 'Escalated for lead review',
        value: counts.kycEscalated,
        hint: 'Needs a compliance decision today',
        path: '/kyc',
        navKey: 'kyc',
        emphasis: counts.kycEscalated > 0 ? 'critical' : 'neutral',
      },
    ]

    const refundWork: WorkItem[] = [
      {
        id: 'refunds-pending',
        label: 'Refunds awaiting approval',
        value: counts.refundsPendingApproval,
        hint: 'Maker-checker queue',
        path: '/refunds',
        navKey: 'refunds',
        emphasis: counts.refundsPendingApproval > 0 ? 'attention' : 'neutral',
      },
      {
        id: 'refunds-failed',
        label: 'Failed refunds to retry',
        value: counts.refundsFailed,
        hint: 'Retry reuses the idempotency key',
        path: '/refunds',
        navKey: 'refunds',
        emphasis: counts.refundsFailed > 0 ? 'critical' : 'neutral',
      },
    ]

    const flagWork: WorkItem[] = [
      {
        id: 'flags-pending',
        label: 'Flag changes awaiting approval',
        value: counts.flagsPendingApproval,
        hint: 'Protected production toggles',
        path: '/flags',
        navKey: 'flags',
        emphasis: counts.flagsPendingApproval > 0 ? 'attention' : 'neutral',
      },
      {
        id: 'flags-killed',
        label: 'Kill switches active',
        value: counts.flagsKilled,
        hint: `${counts.flagsLiveInProduction} flags live in production`,
        path: '/flags',
        navKey: 'flags',
        emphasis: counts.flagsKilled > 0 ? 'critical' : 'neutral',
      },
    ]

    const byTeam: Record<string, WorkItem[]> = {
      Compliance: [...kycWork, refundWork[0]],
      Support: [...refundWork, kycWork[0]],
      Finance: [...refundWork, flagWork[0]],
      Platform: [...flagWork, refundWork[1]],
    }

    const primaryWork = byTeam[persona.team] ?? [
      kycWork[0],
      refundWork[0],
      flagWork[0],
    ]

    const badgeFor = (key: NavKey): number => {
      switch (key) {
        case 'kyc':
          return counts.kycEscalated + counts.kycMine
        case 'refunds':
          return counts.refundsPendingApproval + counts.refundsFailed
        case 'flags':
          return counts.flagsPendingApproval
        default:
          return 0
      }
    }

    return { counts, primaryWork, badgeFor }
  }, [flags, kycCases, persona.name, persona.team, refunds])
}
