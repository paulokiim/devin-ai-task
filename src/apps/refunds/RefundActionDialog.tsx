import { useEffect, useState } from 'react'
import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Dropdown,
  Field,
  MessageBar,
  MessageBarBody,
  Option,
  Textarea,
  Text,
} from '@fluentui/react-components'
import type { Refund } from '../../core/types'
import { formatAmount } from './refundUtils'

export type RefundActionKind = 'approve' | 'reject' | 'retry' | 'cancel'

interface ActionCopy {
  title: string
  intro: string
  confirmLabel: string
  destructive: boolean
  reasonLabel: string
  reasonRequired: boolean
  presets: string[]
}

const COPY: Record<RefundActionKind, ActionCopy> = {
  approve: {
    title: 'Approve refund',
    intro:
      'Approving hands the payout to the mocked processor. The refund moves to Processing and reconciles automatically.',
    confirmLabel: 'Approve and release',
    destructive: false,
    reasonLabel: 'Approval note',
    reasonRequired: false,
    presets: [
      'Policy check complete',
      'Duplicate charge confirmed in ledger',
      'Approved after customer evidence review',
    ],
  },
  reject: {
    title: 'Reject refund',
    intro:
      'Rejecting closes the request. The reason is written to the audit trail and is visible to the requester.',
    confirmLabel: 'Reject refund',
    destructive: true,
    reasonLabel: 'Rejection reason',
    reasonRequired: true,
    presets: [
      'Outside contractual refund window',
      'No matching settled payment',
      'Chargeback already in progress',
      'Insufficient evidence from customer',
    ],
  },
  retry: {
    title: 'Retry refund',
    intro:
      'The original idempotency key is reused, so the customer cannot be paid twice.',
    confirmLabel: 'Retry payout',
    destructive: false,
    reasonLabel: 'Retry note',
    reasonRequired: false,
    presets: [
      'Processor incident resolved',
      'Retrying after transient timeout',
      'Bank details corrected',
    ],
  },
  cancel: {
    title: 'Cancel refund request',
    intro:
      'Cancelling stops the payout and closes the request. This cannot be undone in the prototype.',
    confirmLabel: 'Cancel refund',
    destructive: true,
    reasonLabel: 'Cancellation reason',
    reasonRequired: true,
    presets: [
      'Raised in error',
      'Customer withdrew the request',
      'Superseded by a corrected request',
    ],
  },
}

interface RefundActionDialogProps {
  action: RefundActionKind | null
  refund: Refund | null
  /** Extra context from the maker-checker gate, shown to the operator. */
  gateReason: string
  onDismiss: () => void
  onConfirm: (action: RefundActionKind, refund: Refund, reason: string) => void
}

export function RefundActionDialog({
  action,
  refund,
  gateReason,
  onDismiss,
  onConfirm,
}: RefundActionDialogProps) {
  const [reason, setReason] = useState('')
  const [touched, setTouched] = useState(false)

  useEffect(() => {
    setReason('')
    setTouched(false)
  }, [action, refund?.id])

  if (!action || !refund) return null
  const copy = COPY[action]
  const trimmed = reason.trim()
  const error =
    copy.reasonRequired && trimmed.length < 6
      ? 'Enter at least 6 characters so the audit trail is meaningful.'
      : undefined

  const confirm = () => {
    setTouched(true)
    if (error) return
    onConfirm(
      action,
      refund,
      trimmed || `${copy.title} by operator (no note provided)`,
    )
    onDismiss()
  }

  return (
    <Dialog
      open
      modalType="alert"
      onOpenChange={(_event, data) => {
        if (!data.open) onDismiss()
      }}
    >
      <DialogSurface>
        <DialogBody>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogContent>
            <div className="refunds-dialog-form">
              <Text size={200}>{copy.intro}</Text>
              <MessageBar intent={copy.destructive ? 'warning' : 'info'}>
                <MessageBarBody>
                  {refund.id} · {refund.customer} ·{' '}
                  {formatAmount(refund.amount)} · payment {refund.paymentId}
                  {gateReason ? ` — ${gateReason}` : ''}
                </MessageBarBody>
              </MessageBar>

              <Field label={`${copy.reasonLabel} preset`}>
                <Dropdown
                  placeholder="Pick a standard note"
                  value={copy.presets.includes(reason) ? reason : ''}
                  selectedOptions={
                    copy.presets.includes(reason) ? [reason] : []
                  }
                  onOptionSelect={(_event, data) => {
                    setReason(data.optionValue ?? '')
                    setTouched(true)
                  }}
                >
                  {copy.presets.map((preset) => (
                    <Option key={preset} value={preset}>
                      {preset}
                    </Option>
                  ))}
                </Dropdown>
              </Field>

              <Field
                label={copy.reasonLabel}
                required={copy.reasonRequired}
                validationState={touched && error ? 'error' : 'none'}
                validationMessage={touched ? error : undefined}
                hint={
                  copy.reasonRequired
                    ? 'Required — shared with the requester.'
                    : 'Optional — appended to the activity timeline.'
                }
              >
                <Textarea
                  value={reason}
                  resize="vertical"
                  onChange={(_event, data) => {
                    setReason(data.value)
                    setTouched(true)
                  }}
                />
              </Field>
            </div>
          </DialogContent>
          <DialogActions>
            <Button appearance="secondary" onClick={onDismiss}>
              Keep as is
            </Button>
            <Button
              appearance="primary"
              onClick={confirm}
              disabled={touched && Boolean(error)}
            >
              {copy.confirmLabel}
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  )
}
