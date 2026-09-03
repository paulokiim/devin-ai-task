import { useEffect, useMemo, useState } from 'react'
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
  Input,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  Option,
  Textarea,
  Text,
} from '@fluentui/react-components'
import { DismissRegular, MoneyRegular } from '@fluentui/react-icons'
import type { Refund } from '../../core/types'
import {
  HIGH_VALUE_THRESHOLD,
  MAX_REFUND_AMOUNT,
  emptyDraft,
  formatAmount,
  validateDraft,
  type RefundDraft,
  type RefundDraftErrors,
} from './refundUtils'

const REASON_PRESETS = [
  'Duplicate charge',
  'Service not received',
  'Billing adjustment',
  'Goodwill credit',
  'Subscription cancellation',
  'Fraudulent transaction',
] as const

export interface NewRefundSubmit {
  customer: string
  email: string
  paymentId: string
  amount: number
  reason: string
}

interface NewRefundDialogProps {
  open: boolean
  refunds: Refund[]
  requestedBy: string
  onOpenChange: (open: boolean) => void
  onSubmit: (refund: NewRefundSubmit) => void
}

export function NewRefundDialog({
  open,
  refunds,
  requestedBy,
  onOpenChange,
  onSubmit,
}: NewRefundDialogProps) {
  const [draft, setDraft] = useState<RefundDraft>(emptyDraft)
  const [touched, setTouched] = useState(false)

  useEffect(() => {
    if (open) {
      setDraft(emptyDraft)
      setTouched(false)
    }
  }, [open])

  const errors: RefundDraftErrors = useMemo(
    () => validateDraft(draft, refunds),
    [draft, refunds],
  )
  const errorCount = Object.keys(errors).length
  const showError = (field: keyof RefundDraft) =>
    touched ? errors[field] : undefined

  const knownCustomers = useMemo(() => {
    const map = new Map<string, string>()
    for (const refund of refunds) map.set(refund.customer, refund.email)
    return map
  }, [refunds])

  const update = (patch: Partial<RefundDraft>) =>
    setDraft((current) => ({ ...current, ...patch }))

  const amountValue = Number(draft.amount)
  const highValue =
    Number.isFinite(amountValue) && amountValue >= HIGH_VALUE_THRESHOLD

  const submit = () => {
    setTouched(true)
    if (errorCount > 0) return
    onSubmit({
      customer: draft.customer.trim(),
      email: draft.email.trim(),
      paymentId: draft.paymentId.trim().toUpperCase(),
      amount: Number(draft.amount),
      reason: draft.reason.trim(),
    })
    onOpenChange(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(_event, data) => onOpenChange(data.open)}
      modalType="modal"
    >
      <DialogSurface aria-describedby="new-refund-intro">
        <DialogBody>
          <DialogTitle
            action={
              <Button
                appearance="subtle"
                aria-label="Close new refund form"
                icon={<DismissRegular />}
                onClick={() => onOpenChange(false)}
              />
            }
          >
            New refund request
          </DialogTitle>
          <DialogContent>
            <form
              className="refunds-dialog-form"
              onSubmit={(event) => {
                event.preventDefault()
                submit()
              }}
            >
              <Text
                id="new-refund-intro"
                size={200}
                className="refunds-inline-note"
              >
                Submitted as {requestedBy}. Every request enters the queue as
                “Pending approval” and must be signed off by a Finance Approver.
              </Text>

              {touched && errorCount > 0 ? (
                <MessageBar intent="error" politeness="assertive">
                  <MessageBarBody>
                    <MessageBarTitle>
                      {errorCount} field{errorCount === 1 ? '' : 's'} need
                      attention
                    </MessageBarTitle>
                    Fix the highlighted fields before submitting.
                  </MessageBarBody>
                </MessageBar>
              ) : null}

              <div className="refunds-dialog-form__grid">
                <Field
                  label="Customer"
                  required
                  validationState={showError('customer') ? 'error' : 'none'}
                  validationMessage={showError('customer')}
                  hint="Full personal or business name on the payment."
                >
                  <Input
                    value={draft.customer}
                    list="refunds-known-customers"
                    onChange={(_event, data) => {
                      const email = knownCustomers.get(data.value)
                      update(
                        email && !draft.email
                          ? { customer: data.value, email }
                          : { customer: data.value },
                      )
                    }}
                  />
                </Field>
                <datalist id="refunds-known-customers">
                  {[...knownCustomers.keys()].map((name) => (
                    <option key={name} value={name} />
                  ))}
                </datalist>

                <Field
                  label="Customer email"
                  required
                  validationState={showError('email') ? 'error' : 'none'}
                  validationMessage={showError('email')}
                >
                  <Input
                    type="email"
                    value={draft.email}
                    onChange={(_event, data) => update({ email: data.value })}
                  />
                </Field>

                <Field
                  label="Payment ID"
                  required
                  validationState={showError('paymentId') ? 'error' : 'none'}
                  validationMessage={showError('paymentId')}
                  hint="Processor format PAY-000000."
                >
                  <Input
                    value={draft.paymentId}
                    placeholder="PAY-902184"
                    onChange={(_event, data) =>
                      update({ paymentId: data.value })
                    }
                  />
                </Field>

                <Field
                  label="Amount (USD)"
                  required
                  validationState={showError('amount') ? 'error' : 'none'}
                  validationMessage={showError('amount')}
                  hint={`Maximum ${formatAmount(MAX_REFUND_AMOUNT)} per request.`}
                >
                  <Input
                    value={draft.amount}
                    inputMode="decimal"
                    contentBefore={<MoneyRegular />}
                    placeholder="0.00"
                    onChange={(_event, data) => update({ amount: data.value })}
                  />
                </Field>

                <div className="refunds-dialog-form__full">
                  <Field label="Reason preset">
                    <Dropdown
                      placeholder="Pick a common reason"
                      value={
                        (REASON_PRESETS as readonly string[]).includes(
                          draft.reason,
                        )
                          ? draft.reason
                          : ''
                      }
                      selectedOptions={
                        (REASON_PRESETS as readonly string[]).includes(
                          draft.reason,
                        )
                          ? [draft.reason]
                          : []
                      }
                      onOptionSelect={(_event, data) =>
                        update({ reason: data.optionValue ?? '' })
                      }
                    >
                      {REASON_PRESETS.map((preset) => (
                        <Option key={preset} value={preset}>
                          {preset}
                        </Option>
                      ))}
                    </Dropdown>
                  </Field>
                </div>

                <div className="refunds-dialog-form__full">
                  <Field
                    label="Refund reason"
                    required
                    validationState={showError('reason') ? 'error' : 'none'}
                    validationMessage={showError('reason')}
                    hint="Stored on the audit trail and shared with finance."
                  >
                    <Textarea
                      value={draft.reason}
                      resize="vertical"
                      onChange={(_event, data) =>
                        update({ reason: data.value })
                      }
                    />
                  </Field>
                </div>
              </div>

              {highValue && !errors.amount ? (
                <MessageBar intent="warning">
                  <MessageBarBody>
                    <MessageBarTitle>High-value refund</MessageBarTitle>
                    {formatAmount(amountValue)} is at or above the{' '}
                    {formatAmount(HIGH_VALUE_THRESHOLD)} threshold, so Finance
                    review is mandatory before the payout is released.
                  </MessageBarBody>
                </MessageBar>
              ) : null}
            </form>
          </DialogContent>
          <DialogActions>
            <Button appearance="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button appearance="primary" onClick={submit}>
              Submit for approval
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  )
}
