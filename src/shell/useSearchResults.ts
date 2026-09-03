import { useMemo } from 'react'
import { usePrototype } from '../core/PrototypeContext'
import { navItems } from './navItems'

export type SearchKind = 'Page' | 'KYC case' | 'Refund' | 'Feature flag'

export interface SearchResult {
  id: string
  kind: SearchKind
  title: string
  subtitle: string
  path: string
  haystack: string
}

const money = (amount: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(amount)

export const SEARCH_RESULT_LIMIT = 8

/**
 * Builds a flat search index from the mocked prototype state. Deep links use
 * query parameters so feature modules can select the matched record.
 */
export function useSearchResults(query: string): SearchResult[] {
  const { kycCases, refunds, flags } = usePrototype()

  const index = useMemo<SearchResult[]>(() => {
    const pages: SearchResult[] = navItems.map((item) => ({
      id: `page-${item.key}`,
      kind: 'Page',
      title: item.label,
      subtitle: item.description,
      path: item.path,
      haystack: `${item.label} ${item.description} ${item.path}`.toLowerCase(),
    }))

    const cases: SearchResult[] = kycCases.map((item) => ({
      id: `kyc-${item.id}`,
      kind: 'KYC case',
      title: `${item.id} · ${item.customer}`,
      subtitle: `${item.status} · ${item.risk} risk · ${item.assignee}`,
      path: `/kyc?case=${encodeURIComponent(item.id)}`,
      haystack: [
        item.id,
        item.customer,
        item.email,
        item.country,
        item.status,
        item.risk,
        item.assignee,
        item.type,
        ...item.reasons,
      ]
        .join(' ')
        .toLowerCase(),
    }))

    const refundResults: SearchResult[] = refunds.map((item) => ({
      id: `refund-${item.id}`,
      kind: 'Refund',
      title: `${item.id} · ${item.customer}`,
      subtitle: `${item.status} · ${money(item.amount)} · ${item.reason}`,
      path: `/refunds?refund=${encodeURIComponent(item.id)}`,
      haystack: [
        item.id,
        item.customer,
        item.email,
        item.paymentId,
        item.reason,
        item.status,
        item.requestedBy,
        item.reconciliation,
      ]
        .join(' ')
        .toLowerCase(),
    }))

    const flagResults: SearchResult[] = flags.map((item) => ({
      id: `flag-${item.key}`,
      kind: 'Feature flag',
      title: `${item.name}`,
      subtitle: `${item.key} · owner ${item.owner}${
        item.killed ? ' · kill switch active' : ''
      }`,
      path: `/flags?flag=${encodeURIComponent(item.key)}`,
      haystack: [
        item.key,
        item.name,
        item.description,
        item.owner,
        ...item.tags,
      ]
        .join(' ')
        .toLowerCase(),
    }))

    return [...pages, ...cases, ...refundResults, ...flagResults]
  }, [flags, kycCases, refunds])

  return useMemo(() => {
    const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
    if (terms.length === 0) return []
    return index
      .filter((entry) => terms.every((term) => entry.haystack.includes(term)))
      .slice(0, SEARCH_RESULT_LIMIT)
  }, [index, query])
}
