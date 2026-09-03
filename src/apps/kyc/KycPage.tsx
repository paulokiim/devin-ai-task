import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Badge,
  Button,
  Dropdown,
  Option,
  SearchBox,
  Skeleton,
  SkeletonItem,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableCellLayout,
  TableHeader,
  TableHeaderCell,
  TableRow,
  Tooltip,
} from '@fluentui/react-components'
import {
  ArrowClockwiseRegular,
  ArrowDownloadRegular,
  ArrowSortDownRegular,
  ArrowSortUpRegular,
  FilterDismissRegular,
  PersonAddRegular,
  SearchRegular,
} from '@fluentui/react-icons'
import { usePrototype } from '../../core/PrototypeContext'
import type { KycCase, KycStatus, RiskLevel } from '../../core/types'
import { CaseDetailPane } from './CaseDetailPane'
import { DecisionDialog, type DecisionAction } from './DecisionDialog'
import {
  buildCsv,
  caseSummaryText,
  downloadCsv,
  formatAge,
  formatDateTime,
  isElevatedRisk,
  isOpen,
  permissionsFor,
  riskColor,
  statusColor,
} from './kycUtils'
import './kyc.css'

type ViewId =
  | 'all'
  | 'mine'
  | 'unassigned'
  | 'escalated'
  | 'waiting'
  | 'high-risk'
  | 'closed'

interface ViewDefinition {
  id: ViewId
  label: string
  description: string
  match: (kycCase: KycCase, currentUser: string) => boolean
}

const VIEWS: ViewDefinition[] = [
  {
    id: 'all',
    label: 'All open',
    description: 'Every case that still needs a compliance outcome.',
    match: (kycCase) => isOpen(kycCase),
  },
  {
    id: 'mine',
    label: 'My queue',
    description: 'Open cases assigned to the active persona.',
    match: (kycCase, user) => isOpen(kycCase) && kycCase.assignee === user,
  },
  {
    id: 'unassigned',
    label: 'Unassigned',
    description: 'Open cases waiting to be picked up.',
    match: (kycCase) => isOpen(kycCase) && kycCase.assignee === 'Unassigned',
  },
  {
    id: 'escalated',
    label: 'Escalated',
    description: 'Cases waiting for a compliance lead decision.',
    match: (kycCase) => kycCase.status === 'Escalated',
  },
  {
    id: 'waiting',
    label: 'Waiting on customer',
    description: 'Information has been requested from the customer.',
    match: (kycCase) => kycCase.status === 'Waiting for customer',
  },
  {
    id: 'high-risk',
    label: 'High risk',
    description: 'Open cases scored High or Critical.',
    match: (kycCase) => isOpen(kycCase) && isElevatedRisk(kycCase),
  },
  {
    id: 'closed',
    label: 'Decided',
    description: 'Approved and rejected cases for audit review.',
    match: (kycCase) => !isOpen(kycCase),
  },
]

type SortKey = 'id' | 'customer' | 'risk' | 'status' | 'assignee' | 'ageHours'
type SortDirection = 'asc' | 'desc'

const RISK_ORDER: Record<RiskLevel, number> = {
  Low: 0,
  Medium: 1,
  High: 2,
  Critical: 3,
}

const STATUS_ORDER: Record<KycStatus, number> = {
  Escalated: 0,
  New: 1,
  'In review': 2,
  'Waiting for customer': 3,
  Approved: 4,
  Rejected: 5,
}

const STATUS_OPTIONS: Array<KycStatus | 'All statuses'> = [
  'All statuses',
  'New',
  'In review',
  'Waiting for customer',
  'Escalated',
  'Approved',
  'Rejected',
]

const RISK_OPTIONS: Array<RiskLevel | 'All risk levels'> = [
  'All risk levels',
  'Low',
  'Medium',
  'High',
  'Critical',
]

const COLUMNS: Array<{ key: SortKey; label: string; className?: string }> = [
  { key: 'id', label: 'Case', className: 'kyc-col-id' },
  { key: 'customer', label: 'Customer' },
  { key: 'risk', label: 'Risk', className: 'kyc-col-narrow' },
  { key: 'status', label: 'Status', className: 'kyc-col-status' },
  { key: 'assignee', label: 'Assignee', className: 'kyc-col-assignee' },
  { key: 'ageHours', label: 'Age', className: 'kyc-col-narrow' },
]

export function KycPage() {
  const {
    kycCases,
    personas,
    persona,
    lastUpdated,
    notify,
    refresh,
    assignKyc,
    addKycNote,
    verifyKycDocument,
    setKycStatus,
  } = usePrototype()

  const [view, setView] = useState<ViewId>('all')
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<KycStatus | 'All statuses'>(
    'All statuses',
  )
  const [riskFilter, setRiskFilter] = useState<RiskLevel | 'All risk levels'>(
    'All risk levels',
  )
  const [sortKey, setSortKey] = useState<SortKey>('risk')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [pendingAction, setPendingAction] = useState<DecisionAction | null>(
    null,
  )
  const [loading, setLoading] = useState(true)

  const permissions = useMemo(() => permissionsFor(persona), [persona])

  useEffect(() => {
    const timer = window.setTimeout(() => setLoading(false), 420)
    return () => window.clearTimeout(timer)
  }, [])

  const activeView = VIEWS.find((item) => item.id === view) ?? VIEWS[0]

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const filtered = kycCases.filter((kycCase) => {
      if (!activeView.match(kycCase, persona.name)) return false
      if (statusFilter !== 'All statuses' && kycCase.status !== statusFilter) {
        return false
      }
      if (riskFilter !== 'All risk levels' && kycCase.risk !== riskFilter) {
        return false
      }
      if (!needle) return true
      return [
        kycCase.id,
        kycCase.customer,
        kycCase.email,
        kycCase.country,
        kycCase.assignee,
        kycCase.reasons.join(' '),
      ]
        .join(' ')
        .toLowerCase()
        .includes(needle)
    })

    const factor = sortDirection === 'asc' ? 1 : -1
    return [...filtered].sort((a, b) => {
      switch (sortKey) {
        case 'risk':
          return (RISK_ORDER[a.risk] - RISK_ORDER[b.risk]) * factor
        case 'status':
          return (STATUS_ORDER[a.status] - STATUS_ORDER[b.status]) * -factor
        case 'ageHours':
          return (a.ageHours - b.ageHours) * factor
        case 'customer':
          return a.customer.localeCompare(b.customer) * factor
        case 'assignee':
          return a.assignee.localeCompare(b.assignee) * factor
        case 'id':
        default:
          return a.id.localeCompare(b.id) * factor
      }
    })
  }, [
    activeView,
    kycCases,
    persona.name,
    query,
    riskFilter,
    sortDirection,
    sortKey,
    statusFilter,
  ])

  const selectedCase = useMemo(
    () => kycCases.find((item) => item.id === selectedId) ?? null,
    [kycCases, selectedId],
  )

  const metrics = useMemo(() => {
    const open = kycCases.filter(isOpen)
    const mine = open.filter((item) => item.assignee === persona.name)
    const escalated = kycCases.filter((item) => item.status === 'Escalated')
    const elevated = open.filter(isElevatedRisk)
    const pendingDocs = open.reduce(
      (total, item) =>
        total + item.documents.filter((doc) => doc.status === 'Pending').length,
      0,
    )
    const avgAge = open.length
      ? Math.round(
          open.reduce((total, item) => total + item.ageHours, 0) / open.length,
        )
      : 0
    return [
      {
        id: 'open',
        label: 'Open cases',
        value: String(open.length),
        hint: `${kycCases.length} total in the mock dataset`,
        view: 'all' as ViewId,
      },
      {
        id: 'mine',
        label: 'Assigned to me',
        value: String(mine.length),
        hint: persona.name,
        view: 'mine' as ViewId,
      },
      {
        id: 'escalated',
        label: 'Escalated',
        value: String(escalated.length),
        hint: 'Awaiting lead decision',
        view: 'escalated' as ViewId,
      },
      {
        id: 'risk',
        label: 'High / critical risk',
        value: String(elevated.length),
        hint: `${pendingDocs} documents pending`,
        view: 'high-risk' as ViewId,
      },
      {
        id: 'age',
        label: 'Average age',
        value: formatAge(avgAge),
        hint: 'Open cases only',
        view: 'all' as ViewId,
      },
    ]
  }, [kycCases, persona.name])

  const filtersActive =
    query.trim().length > 0 ||
    statusFilter !== 'All statuses' ||
    riskFilter !== 'All risk levels' ||
    view !== 'all'

  const clearFilters = useCallback(() => {
    setQuery('')
    setStatusFilter('All statuses')
    setRiskFilter('All risk levels')
    setView('all')
    notify('Filters cleared', 'Showing every open KYC case.', 'info')
  }, [notify])

  const toggleSort = useCallback(
    (key: SortKey) => {
      if (key === sortKey) {
        setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'))
        return
      }
      setSortKey(key)
      setSortDirection(
        key === 'customer' || key === 'assignee' ? 'asc' : 'desc',
      )
    },
    [sortKey],
  )

  const reload = useCallback(() => {
    setLoading(true)
    refresh()
    window.setTimeout(() => setLoading(false), 420)
  }, [refresh])

  const exportRows = useCallback(
    (exportedRows: KycCase[], filename: string) => {
      if (exportedRows.length === 0) {
        notify(
          'Nothing to export',
          'No cases match the current filters.',
          'warning',
        )
        return
      }
      downloadCsv(filename, buildCsv(exportedRows))
      notify(
        'CSV exported',
        `${exportedRows.length} case${exportedRows.length === 1 ? '' : 's'} written to ${filename}.`,
      )
    },
    [notify],
  )

  const copySummary = useCallback(
    async (kycCase: KycCase) => {
      const text = caseSummaryText(kycCase)
      try {
        await navigator.clipboard.writeText(text)
        notify('Case summary copied', `${kycCase.id} is on your clipboard.`)
      } catch {
        notify(
          'Clipboard unavailable',
          'Your browser blocked clipboard access, so the summary was not copied.',
          'error',
        )
      }
    },
    [notify],
  )

  const confirmAction = useCallback(
    (action: DecisionAction, reason: string) => {
      if (!selectedCase) return
      const nextStatus: KycStatus =
        action === 'Approve'
          ? 'Approved'
          : action === 'Reject'
            ? 'Rejected'
            : action === 'Escalate'
              ? 'Escalated'
              : 'Waiting for customer'
      setKycStatus(selectedCase.id, nextStatus, reason)
      setPendingAction(null)
    },
    [selectedCase, setKycStatus],
  )

  const assignableNames = useMemo(
    () => [
      'Unassigned',
      ...personas
        .filter((item) => item.team === 'Compliance')
        .map((item) => item.name),
    ],
    [personas],
  )

  const claimNext = useCallback(() => {
    const candidate = rows.find(
      (item) => isOpen(item) && item.assignee === 'Unassigned',
    )
    if (!candidate) {
      notify(
        'No unassigned cases',
        'Every case in the current view already has an owner.',
        'info',
      )
      return
    }
    assignKyc(candidate.id, persona.name)
    setSelectedId(candidate.id)
  }, [assignKyc, notify, persona.name, rows])

  const sortIcon = (key: SortKey) => {
    if (key !== sortKey) return undefined
    return sortDirection === 'asc' ? (
      <ArrowSortUpRegular aria-hidden />
    ) : (
      <ArrowSortDownRegular aria-hidden />
    )
  }

  return (
    <div className="kyc-page">
      <header className="kyc-header">
        <div>
          <h1 className="kyc-title">KYC review queue</h1>
          <p className="kyc-subtitle">
            {persona.name} · {persona.role} · data refreshed{' '}
            {formatDateTime(lastUpdated)}
          </p>
        </div>
        <div className="kyc-header-actions">
          <Tooltip
            content="Reload the mocked queue and update the timestamp"
            relationship="label"
            withArrow
          >
            <Button
              icon={<ArrowClockwiseRegular />}
              appearance="outline"
              onClick={reload}
            >
              Refresh
            </Button>
          </Tooltip>
          <Tooltip
            content={
              permissions.canTriage
                ? 'Assign the oldest unassigned case in this view to yourself'
                : permissions.reason
            }
            relationship="label"
            withArrow
          >
            <Button
              icon={<PersonAddRegular />}
              appearance="outline"
              disabledFocusable={!permissions.canTriage}
              onClick={claimNext}
            >
              Claim next
            </Button>
          </Tooltip>
          <Tooltip
            content="Download the rows currently shown as CSV"
            relationship="label"
            withArrow
          >
            <Button
              icon={<ArrowDownloadRegular />}
              appearance="primary"
              onClick={() => exportRows(rows, `kyc-queue-${activeView.id}.csv`)}
            >
              Export CSV ({rows.length})
            </Button>
          </Tooltip>
        </div>
      </header>

      <section className="kyc-metrics" aria-label="Queue summary metrics">
        {metrics.map((metric) => (
          <button
            key={metric.id}
            type="button"
            className="kyc-metric"
            aria-label={`${metric.label}: ${metric.value}. Show related view.`}
            onClick={() => {
              setView(metric.view)
              setStatusFilter('All statuses')
              setRiskFilter('All risk levels')
            }}
          >
            <span className="kyc-metric-label">{metric.label}</span>
            <span className="kyc-metric-value">{metric.value}</span>
            <span className="kyc-metric-hint">{metric.hint}</span>
          </button>
        ))}
      </section>

      <section className="kyc-toolbar" aria-label="Queue filters">
        <div className="kyc-chips" role="group" aria-label="Saved views">
          {VIEWS.map((item) => {
            const count = kycCases.filter((kycCase) =>
              item.match(kycCase, persona.name),
            ).length
            const selected = item.id === view
            return (
              <Tooltip
                key={item.id}
                content={item.description}
                relationship="label"
                withArrow
              >
                <button
                  type="button"
                  className={`kyc-chip${selected ? ' kyc-chip-selected' : ''}`}
                  aria-pressed={selected}
                  onClick={() => setView(item.id)}
                >
                  {item.label}
                  <span className="kyc-chip-count">{count}</span>
                </button>
              </Tooltip>
            )
          })}
        </div>
        <div className="kyc-filter-row">
          <SearchBox
            className="kyc-search"
            placeholder="Search case, customer, email, country, reason"
            value={query}
            contentBefore={<SearchRegular aria-hidden />}
            aria-label="Search KYC cases"
            onChange={(_, data) => setQuery(data.value)}
          />
          <Dropdown
            className="kyc-filter"
            aria-label="Filter by status"
            value={statusFilter}
            selectedOptions={[statusFilter]}
            onOptionSelect={(_, data) => {
              if (data.optionValue) {
                setStatusFilter(data.optionValue as KycStatus | 'All statuses')
              }
            }}
          >
            {STATUS_OPTIONS.map((option) => (
              <Option key={option} value={option}>
                {option}
              </Option>
            ))}
          </Dropdown>
          <Dropdown
            className="kyc-filter"
            aria-label="Filter by risk level"
            value={riskFilter}
            selectedOptions={[riskFilter]}
            onOptionSelect={(_, data) => {
              if (data.optionValue) {
                setRiskFilter(data.optionValue as RiskLevel | 'All risk levels')
              }
            }}
          >
            {RISK_OPTIONS.map((option) => (
              <Option key={option} value={option}>
                {option}
              </Option>
            ))}
          </Dropdown>
          <Button
            appearance="subtle"
            icon={<FilterDismissRegular />}
            disabled={!filtersActive}
            onClick={clearFilters}
          >
            Clear filters
          </Button>
        </div>
      </section>

      <div className="kyc-layout">
        <section
          className={`kyc-table-wrap${selectedCase ? ' kyc-table-wrap-split' : ''}`}
          aria-label="KYC case queue"
        >
          <div className="kyc-table-status" aria-live="polite">
            {loading ? (
              <span className="kyc-table-status-text">
                <Spinner size="tiny" label="Loading cases" />
              </span>
            ) : (
              <span className="kyc-table-status-text">
                {rows.length} of {kycCases.length} cases · {activeView.label} ·
                sorted by{' '}
                {COLUMNS.find((column) => column.key === sortKey)?.label} (
                {sortDirection === 'asc' ? 'ascending' : 'descending'})
              </span>
            )}
          </div>

          {loading ? (
            <Skeleton aria-label="Loading KYC queue" className="kyc-skeleton">
              {[0, 1, 2, 3, 4, 5].map((index) => (
                <SkeletonItem key={index} size={24} />
              ))}
            </Skeleton>
          ) : rows.length === 0 ? (
            <div className="kyc-empty">
              <h2>No cases match these filters</h2>
              <p>
                {activeView.label} currently has no results for the search and
                filter combination you selected.
              </p>
              <Button appearance="primary" onClick={clearFilters}>
                Reset to all open cases
              </Button>
            </div>
          ) : (
            <Table size="extra-small" className="kyc-table">
              <TableHeader>
                <TableRow>
                  {COLUMNS.map((column) => (
                    <TableHeaderCell
                      key={column.key}
                      className={column.className}
                      sortable
                      sortDirection={
                        sortKey === column.key
                          ? sortDirection === 'asc'
                            ? 'ascending'
                            : 'descending'
                          : undefined
                      }
                      onClick={() => toggleSort(column.key)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          toggleSort(column.key)
                        }
                      }}
                    >
                      <span className="kyc-th">
                        {column.label}
                        {sortIcon(column.key)}
                      </span>
                    </TableHeaderCell>
                  ))}
                  <TableHeaderCell className="kyc-col-actions">
                    Actions
                  </TableHeaderCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className={
                      row.id === selectedId
                        ? 'kyc-row kyc-row-active'
                        : 'kyc-row'
                    }
                    aria-selected={row.id === selectedId}
                    tabIndex={0}
                    onClick={() => setSelectedId(row.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        setSelectedId(row.id)
                      }
                    }}
                  >
                    <TableCell className="kyc-col-id">
                      <TableCellLayout>
                        <span className="kyc-cell-id">{row.id}</span>
                      </TableCellLayout>
                    </TableCell>
                    <TableCell>
                      <TableCellLayout
                        description={`${row.email} · ${row.country}`}
                      >
                        {row.customer}
                      </TableCellLayout>
                    </TableCell>
                    <TableCell className="kyc-col-narrow">
                      <Badge appearance="outline" color={riskColor(row.risk)}>
                        {row.risk}
                      </Badge>
                    </TableCell>
                    <TableCell className="kyc-col-status">
                      <Badge
                        appearance="filled"
                        color={statusColor(row.status)}
                      >
                        {row.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="kyc-col-assignee">
                      {row.assignee}
                    </TableCell>
                    <TableCell className="kyc-col-narrow">
                      {formatAge(row.ageHours)}
                    </TableCell>
                    <TableCell className="kyc-col-actions">
                      <div className="kyc-row-actions">
                        <Button
                          size="small"
                          appearance="outline"
                          onClick={(event) => {
                            event.stopPropagation()
                            setSelectedId(row.id)
                          }}
                        >
                          Review
                        </Button>
                        <Tooltip
                          content={
                            permissions.canTriage
                              ? `Assign ${row.id} to ${persona.name}`
                              : permissions.reason
                          }
                          relationship="label"
                          withArrow
                        >
                          <Button
                            size="small"
                            appearance="subtle"
                            icon={<PersonAddRegular />}
                            aria-label={`Assign ${row.id} to me`}
                            disabledFocusable={
                              !permissions.canTriage ||
                              row.assignee === persona.name
                            }
                            onClick={(event) => {
                              event.stopPropagation()
                              assignKyc(row.id, persona.name)
                            }}
                          />
                        </Tooltip>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </section>

        {selectedCase ? (
          <CaseDetailPane
            kycCase={selectedCase}
            assignees={assignableNames}
            currentUser={persona.name}
            permissions={permissions}
            onAssign={(assignee) => assignKyc(selectedCase.id, assignee)}
            onAddNote={(note) => addKycNote(selectedCase.id, note)}
            onVerifyDocument={(documentId) =>
              verifyKycDocument(selectedCase.id, documentId)
            }
            onRequestAction={setPendingAction}
            onCopySummary={() => void copySummary(selectedCase)}
            onExportCase={() =>
              exportRows([selectedCase], `${selectedCase.id}.csv`)
            }
            onClose={() => setSelectedId(null)}
          />
        ) : (
          <aside
            className="kyc-pane kyc-pane-empty"
            aria-label="Case detail pane"
          >
            <h2>Select a case</h2>
            <p>
              Choose a row to see the customer profile, risk reasons, documents,
              notes and full audit trail, then take action from this pane.
            </p>
            {rows.length > 0 ? (
              <Button
                appearance="primary"
                onClick={() => setSelectedId(rows[0].id)}
              >
                Open {rows[0].id}
              </Button>
            ) : null}
          </aside>
        )}
      </div>

      <DecisionDialog
        action={pendingAction}
        kycCase={selectedCase}
        onDismiss={() => setPendingAction(null)}
        onConfirm={confirmAction}
      />
    </div>
  )
}

export default KycPage
