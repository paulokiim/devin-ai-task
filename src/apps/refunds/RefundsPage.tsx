import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
} from 'react'
import {
  Badge,
  Button,
  Checkbox,
  Dropdown,
  Option,
  SearchBox,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableCellLayout,
  TableHeader,
  TableHeaderCell,
  TableRow,
  Tooltip,
  Body1,
  Body1Strong,
  Caption1,
  Subtitle1,
} from '@fluentui/react-components'
import {
  AddRegular,
  ArrowClockwiseRegular,
  ArrowSyncRegular,
  CheckmarkCircleRegular,
  ClockRegular,
  DocumentTableRegular,
  ErrorCircleRegular,
  FilterDismissRegular,
  MoneyHandRegular,
  OpenRegular,
  ScalesRegular,
} from '@fluentui/react-icons'
import { usePrototype } from '../../core/PrototypeContext'
import type { Refund } from '../../core/types'
import { NewRefundDialog, type NewRefundSubmit } from './NewRefundDialog'
import { RefundDetailPane } from './RefundDetailPane'
import { RefundActionDialog, type RefundActionKind } from './RefundActionDialog'
import {
  REFUND_STATUSES,
  approveGate,
  computeMetrics,
  downloadCsv,
  filterRefunds,
  formatAmount,
  formatCompactAmount,
  formatRelative,
  permissionsFor,
  reconciliationTone,
  refundSummaryText,
  retryGate,
  statusTone,
  toCsv,
  type ReconciliationFilter,
  type RefundFilters,
  type StatusFilter,
} from './refundUtils'
import './refunds.css'

const RECONCILIATION_OPTIONS: ReconciliationFilter[] = [
  'All',
  'Matched',
  'Pending',
  'Discrepancy',
]

const PROCESSING_DELAY_MS = 1200

interface KpiDefinition {
  id: string
  label: string
  value: string
  hint: string
  icon: ReactElement
  filters: Partial<RefundFilters>
  isActive: (filters: RefundFilters) => boolean
}

export function RefundsPage() {
  const {
    refunds,
    persona,
    lastUpdated,
    createRefund,
    setRefundStatus,
    retryRefund,
    refresh,
    notify,
  } = usePrototype()

  const [filters, setFilters] = useState<RefundFilters>({
    search: '',
    status: 'All',
    reconciliation: 'All',
    onlyMine: false,
  })
  const [selectedId, setSelectedId] = useState<string | null>(
    refunds[0]?.id ?? null,
  )
  const [newRefundOpen, setNewRefundOpen] = useState(false)
  const [pendingAction, setPendingAction] = useState<{
    action: RefundActionKind
    refundId: string
    gateReason: string
  } | null>(null)
  const [processingIds, setProcessingIds] = useState<string[]>([])

  const timers = useRef<number[]>([])
  useEffect(
    () => () => {
      timers.current.forEach((timer) => window.clearTimeout(timer))
      timers.current = []
    },
    [],
  )

  const permissions = permissionsFor(persona)
  const metrics = useMemo(() => computeMetrics(refunds), [refunds])
  const visibleRefunds = useMemo(
    () => filterRefunds(refunds, filters, persona.name),
    [refunds, filters, persona.name],
  )

  const selected = useMemo(
    () => refunds.find((refund) => refund.id === selectedId) ?? null,
    [refunds, selectedId],
  )
  const pendingRefund = useMemo(
    () =>
      pendingAction
        ? (refunds.find((refund) => refund.id === pendingAction.refundId) ??
          null)
        : null,
    [pendingAction, refunds],
  )

  const filtersActive =
    filters.search.trim() !== '' ||
    filters.status !== 'All' ||
    filters.reconciliation !== 'All' ||
    filters.onlyMine

  const applyFilters = useCallback((patch: Partial<RefundFilters>) => {
    setFilters((current) => ({ ...current, ...patch }))
  }, [])

  const markProcessing = useCallback((id: string, durationMs: number) => {
    setProcessingIds((current) =>
      current.includes(id) ? current : [...current, id],
    )
    const timer = window.setTimeout(() => {
      setProcessingIds((current) => current.filter((item) => item !== id))
    }, durationMs)
    timers.current.push(timer)
  }, [])

  const runAction = useCallback(
    (action: RefundActionKind, refund: Refund, reason: string) => {
      switch (action) {
        case 'approve': {
          setRefundStatus(
            refund.id,
            'Processing',
            `Approved by ${persona.name} — ${reason}`,
          )
          markProcessing(refund.id, PROCESSING_DELAY_MS)
          const timer = window.setTimeout(() => {
            setRefundStatus(
              refund.id,
              'Succeeded',
              `Processor reference MOCK-${refund.paymentId.slice(-4)} returned`,
            )
          }, PROCESSING_DELAY_MS)
          timers.current.push(timer)
          break
        }
        case 'reject':
          setRefundStatus(refund.id, 'Rejected', reason)
          break
        case 'retry':
          retryRefund(refund.id)
          markProcessing(refund.id, 1100)
          notify('Retry note recorded', `${refund.id}: ${reason}`, 'info')
          break
        case 'cancel':
          setRefundStatus(refund.id, 'Cancelled', reason)
          break
        default:
          break
      }
      setSelectedId(refund.id)
    },
    [markProcessing, notify, persona.name, retryRefund, setRefundStatus],
  )

  const openAction = useCallback(
    (action: RefundActionKind, refund: Refund, gateReason: string) => {
      setSelectedId(refund.id)
      setPendingAction({ action, refundId: refund.id, gateReason })
    },
    [],
  )

  const handleCreate = useCallback(
    (input: NewRefundSubmit) => {
      const id = createRefund(input)
      setSelectedId(id)
      applyFilters({ status: 'Pending approval', search: '', onlyMine: false })
    },
    [applyFilters, createRefund],
  )

  const handleAddNote = useCallback(
    (refund: Refund, note: string) => {
      setRefundStatus(refund.id, refund.status, `Operator note — ${note}`)
      notify('Note added to timeline', `${refund.id}: ${note}`)
    },
    [notify, setRefundStatus],
  )

  const exportRows = useCallback(
    (rows: Refund[], filename: string, label: string) => {
      if (!rows.length) {
        notify(
          'Nothing to export',
          'No refunds match the current filters.',
          'warning',
        )
        return
      }
      downloadCsv(filename, toCsv(rows))
      notify(
        'CSV exported',
        `${rows.length} ${label} downloaded as ${filename}.`,
        'info',
      )
    },
    [notify],
  )

  const copySummary = useCallback(
    (refund: Refund) => {
      const text = refundSummaryText(refund)
      void navigator.clipboard
        ?.writeText(text)
        .then(() => {
          notify('Summary copied', `${refund.id} is on your clipboard.`)
        })
        .catch(() => {
          notify(
            'Copy blocked by the browser',
            'Select the details in the pane and copy manually.',
            'error',
          )
        })
    },
    [notify],
  )

  const kpis: KpiDefinition[] = [
    {
      id: 'pending',
      label: 'Awaiting approval',
      value: String(metrics.pendingCount),
      hint: `${formatCompactAmount(metrics.pendingValue)} queued for checkers`,
      icon: <ClockRegular />,
      filters: { status: 'Pending approval', reconciliation: 'All' },
      isActive: (current) => current.status === 'Pending approval',
    },
    {
      id: 'processing',
      label: 'Processing',
      value: String(metrics.processingCount),
      hint: 'Sent to the mocked processor',
      icon: <ArrowSyncRegular />,
      filters: { status: 'Processing', reconciliation: 'All' },
      isActive: (current) => current.status === 'Processing',
    },
    {
      id: 'failed',
      label: 'Failed',
      value: String(metrics.failedCount),
      hint: 'Eligible for retry',
      icon: <ErrorCircleRegular />,
      filters: { status: 'Failed', reconciliation: 'All' },
      isActive: (current) => current.status === 'Failed',
    },
    {
      id: 'discrepancy',
      label: 'Reconciliation gaps',
      value: String(metrics.discrepancyCount),
      hint: 'Ledger and processor disagree',
      icon: <ScalesRegular />,
      filters: { reconciliation: 'Discrepancy', status: 'All' },
      isActive: (current) => current.reconciliation === 'Discrepancy',
    },
    {
      id: 'succeeded',
      label: 'Refunded',
      value: formatCompactAmount(metrics.succeededValue),
      hint: `${metrics.succeededCount} settled refunds`,
      icon: <CheckmarkCircleRegular />,
      filters: { status: 'Succeeded', reconciliation: 'All' },
      isActive: (current) => current.status === 'Succeeded',
    },
  ]

  return (
    <div className="refunds-page">
      <header className="refunds-header">
        <div className="refunds-header__titles">
          <Subtitle1>Refund operations</Subtitle1>
          <Caption1 className="refunds-inline-note">
            {refunds.length} requests · {formatAmount(metrics.totalValue)} total
            value · {metrics.highValueCount} high value · updated{' '}
            {formatRelative(lastUpdated)}
          </Caption1>
          <Caption1 className="refunds-inline-note">
            Signed in as {persona.name} ({persona.role}) ·{' '}
            {permissions.canApprove
              ? 'checker rights: approve, reject, retry'
              : permissions.canRequest
                ? 'maker rights: request and cancel your own refunds'
                : 'read-only for payouts'}
          </Caption1>
        </div>
        <div className="refunds-header__actions">
          <Tooltip
            content={
              permissions.canRequest
                ? 'Raise a refund request for a customer payment'
                : `${persona.role} cannot raise refunds. Switch to Support Operations or Finance.`
            }
            relationship="description"
            withArrow
          >
            <Button
              appearance="primary"
              icon={<AddRegular />}
              disabledFocusable={!permissions.canRequest}
              onClick={() => setNewRefundOpen(true)}
            >
              New refund
            </Button>
          </Tooltip>
          <Tooltip
            content="Download the filtered rows as CSV"
            relationship="description"
            withArrow
          >
            <Button
              icon={<DocumentTableRegular />}
              onClick={() =>
                exportRows(
                  visibleRefunds,
                  `refunds-${new Date().toISOString().slice(0, 10)}.csv`,
                  'filtered refunds',
                )
              }
            >
              Export CSV
            </Button>
          </Tooltip>
          <Tooltip
            content="Re-read the mocked records"
            relationship="description"
            withArrow
          >
            <Button
              appearance="subtle"
              icon={<ArrowClockwiseRegular />}
              onClick={refresh}
            >
              Refresh
            </Button>
          </Tooltip>
        </div>
      </header>

      <section className="refunds-kpis" aria-label="Refund metrics">
        {kpis.map((kpi) => {
          const active = kpi.isActive(filters)
          return (
            <button
              key={kpi.id}
              type="button"
              className="refunds-kpi"
              aria-pressed={active}
              onClick={() =>
                applyFilters(
                  active
                    ? { status: 'All', reconciliation: 'All' }
                    : kpi.filters,
                )
              }
            >
              <span className="refunds-kpi__label">
                {kpi.icon}
                <Caption1>{kpi.label}</Caption1>
              </span>
              <span className="refunds-kpi__value">{kpi.value}</span>
              <Caption1 className="refunds-kpi__hint">
                {active ? `Filtering · ${kpi.hint}` : kpi.hint}
              </Caption1>
            </button>
          )
        })}
      </section>

      <section className="refunds-toolbar" aria-label="Refund filters">
        <div className="refunds-toolbar__search">
          <SearchBox
            aria-label="Search refunds by id, customer, payment or reason"
            placeholder="Search id, customer, payment, reason"
            value={filters.search}
            onChange={(_event, data) =>
              applyFilters({ search: data.value ?? '' })
            }
          />
        </div>
        <Dropdown
          className="refunds-toolbar__select"
          aria-label="Filter by status"
          value={filters.status}
          selectedOptions={[filters.status]}
          onOptionSelect={(_event, data) =>
            applyFilters({
              status: (data.optionValue as StatusFilter | undefined) ?? 'All',
            })
          }
        >
          <Option value="All">All statuses</Option>
          {REFUND_STATUSES.map((status) => (
            <Option key={status} value={status}>
              {status}
            </Option>
          ))}
        </Dropdown>
        <Dropdown
          className="refunds-toolbar__select"
          aria-label="Filter by reconciliation"
          value={filters.reconciliation}
          selectedOptions={[filters.reconciliation]}
          onOptionSelect={(_event, data) =>
            applyFilters({
              reconciliation:
                (data.optionValue as ReconciliationFilter | undefined) ?? 'All',
            })
          }
        >
          {RECONCILIATION_OPTIONS.map((value) => (
            <Option key={value} value={value}>
              {value === 'All' ? 'All reconciliation' : value}
            </Option>
          ))}
        </Dropdown>
        <Checkbox
          label="Only my requests"
          checked={filters.onlyMine}
          onChange={(_event, data) =>
            applyFilters({ onlyMine: data.checked === true })
          }
        />
        <Tooltip
          content={
            filtersActive
              ? 'Clear search, status, reconciliation and ownership filters'
              : 'No filters are applied'
          }
          relationship="description"
          withArrow
        >
          <Button
            appearance="subtle"
            icon={<FilterDismissRegular />}
            disabledFocusable={!filtersActive}
            onClick={() => {
              applyFilters({
                search: '',
                status: 'All',
                reconciliation: 'All',
                onlyMine: false,
              })
              notify('Filters cleared', 'Showing every refund request.', 'info')
            }}
          >
            Clear
          </Button>
        </Tooltip>
        <span className="refunds-toolbar__spacer" />
        <Caption1 className="refunds-toolbar__count" aria-live="polite">
          {visibleRefunds.length} of {refunds.length} shown
        </Caption1>
      </section>

      <div
        className={`refunds-layout${selected ? '' : ' refunds-layout--collapsed'}`}
      >
        <div className="refunds-table-card">
          {visibleRefunds.length === 0 ? (
            <div className="refunds-empty">
              <Body1Strong>No refunds match these filters</Body1Strong>
              <Caption1 className="refunds-inline-note">
                Adjust the search or status filters to widen the queue.
              </Caption1>
              <Button
                appearance="secondary"
                icon={<FilterDismissRegular />}
                onClick={() =>
                  applyFilters({
                    search: '',
                    status: 'All',
                    reconciliation: 'All',
                    onlyMine: false,
                  })
                }
              >
                Show all refunds
              </Button>
            </div>
          ) : (
            <div className="refunds-table-scroll">
              <Table
                className="refunds-table"
                size="extra-small"
                aria-label="Refund requests"
              >
                <TableHeader>
                  <TableRow>
                    <TableHeaderCell>Refund</TableHeaderCell>
                    <TableHeaderCell>Customer</TableHeaderCell>
                    <TableHeaderCell>Payment</TableHeaderCell>
                    <TableHeaderCell className="refunds-table__cell--numeric">
                      Amount
                    </TableHeaderCell>
                    <TableHeaderCell>Status</TableHeaderCell>
                    <TableHeaderCell>Reconciliation</TableHeaderCell>
                    <TableHeaderCell>Requested</TableHeaderCell>
                    <TableHeaderCell aria-label="Row actions" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleRefunds.map((refund) => {
                    const isSelected = refund.id === selectedId
                    const approve = approveGate(refund, persona)
                    const retry = retryGate(refund, persona)
                    const busy = processingIds.includes(refund.id)
                    return (
                      <TableRow
                        key={refund.id}
                        className="refunds-table__row"
                        appearance={isSelected ? 'brand' : 'none'}
                        aria-selected={isSelected}
                        tabIndex={0}
                        onClick={() => setSelectedId(refund.id)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault()
                            setSelectedId(refund.id)
                          }
                        }}
                      >
                        <TableCell>
                          <TableCellLayout>
                            <span className="refunds-table__mono">
                              {refund.id}
                            </span>
                          </TableCellLayout>
                        </TableCell>
                        <TableCell>
                          <TableCellLayout description={refund.email} truncate>
                            {refund.customer}
                          </TableCellLayout>
                        </TableCell>
                        <TableCell>
                          <TableCellLayout description={refund.reason} truncate>
                            <span className="refunds-table__mono">
                              {refund.paymentId}
                            </span>
                          </TableCellLayout>
                        </TableCell>
                        <TableCell className="refunds-table__cell--numeric">
                          <Body1>{formatAmount(refund.amount)}</Body1>
                        </TableCell>
                        <TableCell>
                          <TableCellLayout
                            media={
                              busy ? <Spinner size="extra-tiny" /> : undefined
                            }
                          >
                            <Badge
                              appearance="filled"
                              color={statusTone(refund.status)}
                            >
                              {refund.status}
                            </Badge>
                          </TableCellLayout>
                        </TableCell>
                        <TableCell>
                          <Badge
                            appearance="outline"
                            color={reconciliationTone(refund.reconciliation)}
                          >
                            {refund.reconciliation}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <TableCellLayout
                            description={formatRelative(refund.createdAt)}
                            truncate
                          >
                            {refund.requestedBy}
                          </TableCellLayout>
                        </TableCell>
                        <TableCell>
                          <div
                            className="refunds-table__actions"
                            onClick={(event) => event.stopPropagation()}
                            onKeyDown={(event) => event.stopPropagation()}
                            role="presentation"
                          >
                            {approve.applicable ? (
                              <Tooltip
                                content={approve.reason}
                                relationship="label"
                                withArrow
                              >
                                <Button
                                  size="small"
                                  appearance="subtle"
                                  icon={<CheckmarkCircleRegular />}
                                  disabledFocusable={!approve.allowed}
                                  onClick={() =>
                                    openAction(
                                      'approve',
                                      refund,
                                      approve.reason,
                                    )
                                  }
                                />
                              </Tooltip>
                            ) : null}
                            {retry.applicable ? (
                              <Tooltip
                                content={retry.reason}
                                relationship="label"
                                withArrow
                              >
                                <Button
                                  size="small"
                                  appearance="subtle"
                                  icon={<ArrowSyncRegular />}
                                  disabledFocusable={!retry.allowed}
                                  onClick={() =>
                                    openAction('retry', refund, retry.reason)
                                  }
                                />
                              </Tooltip>
                            ) : null}
                            <Tooltip
                              content={`Open ${refund.id} in the detail pane`}
                              relationship="label"
                              withArrow
                            >
                              <Button
                                size="small"
                                appearance="subtle"
                                icon={<OpenRegular />}
                                onClick={() => setSelectedId(refund.id)}
                              />
                            </Tooltip>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {selected ? (
          <RefundDetailPane
            refund={selected}
            persona={persona}
            processing={processingIds.includes(selected.id)}
            onAction={(action, gateReason) =>
              openAction(action, selected, gateReason)
            }
            onAddNote={(note) => handleAddNote(selected, note)}
            onCopySummary={() => copySummary(selected)}
            onExportRefund={() =>
              exportRows(
                [selected],
                `${selected.id.toLowerCase()}.csv`,
                'refund record',
              )
            }
            onClose={() => setSelectedId(null)}
          />
        ) : null}
      </div>

      {!selected && visibleRefunds.length > 0 ? (
        <Caption1 className="refunds-inline-note">
          <MoneyHandRegular aria-hidden /> Select a row to review payment,
          customer, reconciliation, notes and activity.
        </Caption1>
      ) : null}

      <NewRefundDialog
        open={newRefundOpen}
        refunds={refunds}
        requestedBy={persona.name}
        onOpenChange={setNewRefundOpen}
        onSubmit={handleCreate}
      />

      <RefundActionDialog
        action={pendingAction?.action ?? null}
        refund={pendingRefund}
        gateReason={pendingAction?.gateReason ?? ''}
        onDismiss={() => setPendingAction(null)}
        onConfirm={runAction}
      />
    </div>
  )
}

export default RefundsPage
