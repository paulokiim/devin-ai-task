import { useEffect, useState, type ReactElement } from 'react'
import {
  Badge,
  Button,
  Divider,
  Field,
  Spinner,
  Textarea,
  Tooltip,
  Caption1,
  Body1,
  Body1Strong,
  Subtitle2,
} from '@fluentui/react-components'
import {
  ArrowSyncRegular,
  CheckmarkCircleRegular,
  CopyRegular,
  DismissCircleRegular,
  DismissRegular,
  ProhibitedRegular,
  TableSimpleRegular,
} from '@fluentui/react-icons'
import type { Persona, Refund } from '../../core/types'
import type { RefundActionKind } from './RefundActionDialog'
import {
  approveGate,
  cancelGate,
  formatAmount,
  formatDateTime,
  formatRelative,
  reconciliationTone,
  rejectGate,
  retryGate,
  statusTone,
  type ActionGate,
} from './refundUtils'

interface RefundDetailPaneProps {
  refund: Refund
  persona: Persona
  processing: boolean
  onAction: (action: RefundActionKind, gateReason: string) => void
  onAddNote: (note: string) => void
  onCopySummary: () => void
  onExportRefund: () => void
  onClose: () => void
}

interface GatedButtonProps {
  gate: ActionGate
  label: string
  icon: ReactElement
  appearance?: 'primary' | 'secondary' | 'outline' | 'subtle'
  onRun: () => void
}

function GatedButton({
  gate,
  label,
  icon,
  appearance = 'secondary',
  onRun,
}: GatedButtonProps) {
  return (
    <Tooltip content={gate.reason} relationship="description" withArrow>
      <Button
        size="small"
        appearance={appearance}
        icon={icon}
        disabledFocusable={!gate.allowed}
        onClick={onRun}
      >
        {label}
      </Button>
    </Tooltip>
  )
}

export function RefundDetailPane({
  refund,
  persona,
  processing,
  onAction,
  onAddNote,
  onCopySummary,
  onExportRefund,
  onClose,
}: RefundDetailPaneProps) {
  const [note, setNote] = useState('')

  useEffect(() => {
    setNote('')
  }, [refund.id])

  const approve = approveGate(refund, persona)
  const reject = rejectGate(refund, persona)
  const retry = retryGate(refund, persona)
  const cancel = cancelGate(refund, persona)

  return (
    <aside
      className="refunds-pane"
      aria-label={`Refund ${refund.id} details`}
      tabIndex={-1}
    >
      <div className="refunds-pane__header">
        <div className="refunds-pane__titles">
          <Subtitle2>{refund.id}</Subtitle2>
          <Caption1 className="refunds-inline-note">
            {refund.customer} · {formatAmount(refund.amount)} {refund.currency}
          </Caption1>
          <div className="refunds-pane__badges">
            <Badge appearance="filled" color={statusTone(refund.status)}>
              {refund.status}
            </Badge>
            <Badge
              appearance="outline"
              color={reconciliationTone(refund.reconciliation)}
            >
              {refund.reconciliation}
            </Badge>
            <Badge appearance="tint" color="informative">
              {refund.attempts} attempt{refund.attempts === 1 ? '' : 's'}
            </Badge>
          </div>
        </div>
        <Button
          appearance="subtle"
          icon={<DismissRegular />}
          aria-label="Close refund detail pane"
          onClick={onClose}
        />
      </div>

      {processing ? (
        <div className="refunds-processing" role="status">
          <Spinner size="tiny" />
          <Caption1>Sending to the payment processor…</Caption1>
        </div>
      ) : null}

      <div className="refunds-pane__actions">
        <GatedButton
          gate={approve}
          label="Approve"
          appearance="primary"
          icon={<CheckmarkCircleRegular />}
          onRun={() => onAction('approve', approve.reason)}
        />
        <GatedButton
          gate={reject}
          label="Reject"
          icon={<DismissCircleRegular />}
          onRun={() => onAction('reject', reject.reason)}
        />
        <GatedButton
          gate={retry}
          label="Retry"
          icon={<ArrowSyncRegular />}
          onRun={() => onAction('retry', retry.reason)}
        />
        <GatedButton
          gate={cancel}
          label="Cancel"
          icon={<ProhibitedRegular />}
          onRun={() => onAction('cancel', cancel.reason)}
        />
        <Tooltip
          content="Copy a plain-text summary to the clipboard"
          relationship="description"
          withArrow
        >
          <Button
            size="small"
            appearance="subtle"
            icon={<CopyRegular />}
            onClick={onCopySummary}
          >
            Copy
          </Button>
        </Tooltip>
        <Tooltip
          content="Download this refund as a single-row CSV"
          relationship="description"
          withArrow
        >
          <Button
            size="small"
            appearance="subtle"
            icon={<TableSimpleRegular />}
            onClick={onExportRefund}
          >
            Export
          </Button>
        </Tooltip>
      </div>

      <Divider />

      <section className="refunds-pane__section" aria-label="Payment">
        <Caption1 className="refunds-pane__section-title">Payment</Caption1>
        <dl className="refunds-facts">
          <dt>
            <Caption1>Payment ID</Caption1>
          </dt>
          <dd>
            <Body1 className="refunds-table__mono">{refund.paymentId}</Body1>
          </dd>
          <dt>
            <Caption1>Amount</Caption1>
          </dt>
          <dd>
            <Body1Strong>{formatAmount(refund.amount)}</Body1Strong>{' '}
            <Caption1 className="refunds-inline-note">
              {refund.currency}
            </Caption1>
          </dd>
          <dt>
            <Caption1>Reason</Caption1>
          </dt>
          <dd>
            <Body1>{refund.reason}</Body1>
          </dd>
        </dl>
      </section>

      <section className="refunds-pane__section" aria-label="Customer">
        <Caption1 className="refunds-pane__section-title">Customer</Caption1>
        <dl className="refunds-facts">
          <dt>
            <Caption1>Name</Caption1>
          </dt>
          <dd>
            <Body1>{refund.customer}</Body1>
          </dd>
          <dt>
            <Caption1>Email</Caption1>
          </dt>
          <dd>
            <Body1>{refund.email}</Body1>
          </dd>
        </dl>
      </section>

      <section
        className="refunds-pane__section"
        aria-label="Processing and reconciliation"
      >
        <Caption1 className="refunds-pane__section-title">
          Processing &amp; reconciliation
        </Caption1>
        <dl className="refunds-facts">
          <dt>
            <Caption1>Status</Caption1>
          </dt>
          <dd>
            <Body1>{refund.status}</Body1>
          </dd>
          <dt>
            <Caption1>Reconciliation</Caption1>
          </dt>
          <dd>
            <Body1>{refund.reconciliation}</Body1>
          </dd>
          <dt>
            <Caption1>Attempts</Caption1>
          </dt>
          <dd>
            <Body1>{refund.attempts} of 3</Body1>
          </dd>
          <dt>
            <Caption1>Requested by</Caption1>
          </dt>
          <dd>
            <Body1>{refund.requestedBy}</Body1>
          </dd>
          <dt>
            <Caption1>Created</Caption1>
          </dt>
          <dd>
            <Body1>
              {formatDateTime(refund.createdAt)} ·{' '}
              {formatRelative(refund.createdAt)}
            </Body1>
          </dd>
        </dl>
      </section>

      <section className="refunds-pane__section" aria-label="Notes">
        <Caption1 className="refunds-pane__section-title">
          Notes ({refund.notes.length})
        </Caption1>
        {refund.notes.length ? (
          <ul className="refunds-notes">
            {refund.notes.map((entry) => (
              <li key={entry}>
                <Caption1>{entry}</Caption1>
              </li>
            ))}
          </ul>
        ) : (
          <Caption1 className="refunds-inline-note">
            No notes yet. Anything you log below is appended to the audit trail.
          </Caption1>
        )}
        <form
          className="refunds-note-form"
          onSubmit={(event) => {
            event.preventDefault()
            if (note.trim().length < 3) return
            onAddNote(note.trim())
            setNote('')
          }}
        >
          <Field
            label="Log a note"
            hint="Written to the activity timeline as an operator note."
          >
            <Textarea
              value={note}
              resize="vertical"
              placeholder="e.g. Confirmed the duplicate charge with the ledger team."
              onChange={(_event, data) => setNote(data.value)}
            />
          </Field>
          <div className="refunds-note-form__row">
            <Button
              size="small"
              appearance="secondary"
              type="submit"
              disabled={note.trim().length < 3}
            >
              Add to timeline
            </Button>
          </div>
        </form>
      </section>

      <section className="refunds-pane__section" aria-label="Activity">
        <Caption1 className="refunds-pane__section-title">
          Activity ({refund.activity.length})
        </Caption1>
        <ul className="refunds-activity">
          {refund.activity.map((entry) => (
            <li key={entry.id}>
              <Body1Strong>{entry.action}</Body1Strong>
              <Caption1>{entry.detail}</Caption1>
              <Caption1 className="refunds-activity__meta">
                {entry.actor} · {formatDateTime(entry.at)} ·{' '}
                {formatRelative(entry.at)}
              </Caption1>
            </li>
          ))}
        </ul>
      </section>
    </aside>
  )
}
