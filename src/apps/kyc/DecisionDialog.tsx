import { useEffect, useState } from 'react'
import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Field,
  MessageBar,
  MessageBarBody,
  Textarea,
} from '@fluentui/react-components'
import type { KycCase } from '../../core/types'

export type DecisionAction =
  | 'Approve'
  | 'Reject'
  | 'Escalate'
  | 'Request information'

interface DecisionConfig {
  title: string
  intro: string
  confirmLabel: string
  appearance: 'primary' | 'secondary'
  suggestions: string[]
  warning?: string
}

const CONFIG: Record<DecisionAction, DecisionConfig> = {
  Approve: {
    title: 'Approve case',
    intro:
      'Approving records a final compliance decision and unblocks onboarding for this customer.',
    confirmLabel: 'Approve case',
    appearance: 'primary',
    suggestions: [
      'All identity documents verified against the customer record.',
      'Sanctions screening cleared after manual review.',
      'Ownership structure confirmed with supporting evidence.',
    ],
    warning: 'This decision is final in the audit trail and cannot be undone.',
  },
  Reject: {
    title: 'Reject case',
    intro:
      'Rejecting closes the case and notifies onboarding that the customer cannot be verified.',
    confirmLabel: 'Reject case',
    appearance: 'primary',
    suggestions: [
      'Identity could not be verified with the evidence provided.',
      'Customer did not respond to the information request.',
      'Confirmed sanctions match after secondary review.',
    ],
    warning: 'This decision is final in the audit trail and cannot be undone.',
  },
  Escalate: {
    title: 'Escalate to compliance lead',
    intro:
      'Escalation routes the case to the KYC Compliance Lead queue for a second review.',
    confirmLabel: 'Escalate case',
    appearance: 'primary',
    suggestions: [
      'Potential sanctions match requires lead sign-off.',
      'Ownership structure is unclear after document review.',
      'Risk signals conflict with submitted documents.',
    ],
  },
  'Request information': {
    title: 'Request information from customer',
    intro:
      'The customer receives your message and the case moves to "Waiting for customer".',
    confirmLabel: 'Send request',
    appearance: 'primary',
    suggestions: [
      'Upload a clearer image of the passport photo page.',
      'Provide a proof of address issued in the last 3 months.',
      'Share the beneficial owner register for all owners above 25%.',
    ],
  },
}

interface DecisionDialogProps {
  action: DecisionAction | null
  kycCase: KycCase | null
  onDismiss: () => void
  onConfirm: (action: DecisionAction, reason: string) => void
}

export function DecisionDialog({
  action,
  kycCase,
  onDismiss,
  onConfirm,
}: DecisionDialogProps) {
  const [reason, setReason] = useState('')
  const [touched, setTouched] = useState(false)

  useEffect(() => {
    setReason('')
    setTouched(false)
  }, [action, kycCase?.id])

  if (!action || !kycCase) return null
  const config = CONFIG[action]
  const trimmed = reason.trim()
  const invalid = trimmed.length < 8

  const confirm = () => {
    if (invalid) {
      setTouched(true)
      return
    }
    onConfirm(action, trimmed)
  }

  return (
    <Dialog
      open
      onOpenChange={(_, data) => {
        if (!data.open) onDismiss()
      }}
    >
      <DialogSurface aria-describedby="kyc-decision-intro">
        <DialogBody>
          <DialogTitle>{config.title}</DialogTitle>
          <DialogContent className="kyc-dialog-content">
            <p id="kyc-decision-intro" className="kyc-dialog-intro">
              {config.intro}
            </p>
            <div className="kyc-dialog-summary">
              <span>
                <strong>{kycCase.id}</strong> · {kycCase.customer}
              </span>
              <span>
                {kycCase.risk} risk · {kycCase.status} · {kycCase.country}
              </span>
            </div>
            {config.warning ? (
              <MessageBar intent="warning">
                <MessageBarBody>{config.warning}</MessageBarBody>
              </MessageBar>
            ) : null}
            <Field
              label={
                action === 'Request information'
                  ? 'Message to the customer (required)'
                  : 'Reason for the audit trail (required)'
              }
              required
              validationState={touched && invalid ? 'error' : 'none'}
              validationMessage={
                touched && invalid
                  ? 'Enter at least 8 characters so the audit trail is meaningful.'
                  : undefined
              }
            >
              <Textarea
                value={reason}
                resize="vertical"
                onChange={(_, data) => setReason(data.value)}
                onBlur={() => setTouched(true)}
                placeholder="Describe what you checked and why."
              />
            </Field>
            <div className="kyc-suggestions">
              <span className="kyc-suggestions-label">Quick reasons</span>
              <div className="kyc-suggestion-row">
                {config.suggestions.map((suggestion) => (
                  <Button
                    key={suggestion}
                    size="small"
                    appearance="outline"
                    onClick={() => {
                      setReason(suggestion)
                      setTouched(true)
                    }}
                  >
                    {suggestion.length > 46
                      ? `${suggestion.slice(0, 46)}…`
                      : suggestion}
                  </Button>
                ))}
              </div>
            </div>
          </DialogContent>
          <DialogActions>
            <Button appearance="secondary" onClick={onDismiss}>
              Cancel
            </Button>
            <Button
              appearance={config.appearance}
              onClick={confirm}
              disabledFocusable={invalid}
            >
              {config.confirmLabel}
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  )
}
