import {
  Button,
  Caption1,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Field,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  Textarea,
} from '@fluentui/react-components'
import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { Tone } from '../core/types'

export interface ConfirmDialogProps {
  open: boolean
  title: string
  /** Main explanatory copy. */
  description?: ReactNode
  /** Extra fields or a record summary rendered above the reason box. */
  children?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  /** Uses the danger button styling and a warning message bar. */
  destructive?: boolean
  /** Optional callout above the form, e.g. "This affects production". */
  warning?: { tone?: Tone; title: string; message?: string }
  /** When true the confirm button stays disabled until a reason is typed. */
  requireReason?: boolean
  reasonLabel?: string
  reasonPlaceholder?: string
  /** Minimum characters for a valid reason (default 6). */
  minReasonLength?: number
  /** One-click reason presets that fill the textarea. */
  reasonPresets?: string[]
  /** Disables the confirm button while a mutation is in flight. */
  busy?: boolean
  /** Receives the trimmed reason (empty string when reasons are not required). */
  onConfirm: (reason: string) => void
  /** Called for cancel, Escape, and backdrop dismissal. */
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  description,
  children,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  warning,
  requireReason = false,
  reasonLabel = 'Reason (required)',
  reasonPlaceholder = 'Explain why you are taking this action. Stored on the audit trail.',
  minReasonLength = 6,
  reasonPresets,
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [reason, setReason] = useState('')
  const [showError, setShowError] = useState(false)
  const reasonRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (open) {
      setReason('')
      setShowError(false)
    }
  }, [open])

  const trimmed = reason.trim()
  const reasonInvalid = requireReason && trimmed.length < minReasonLength

  const handleConfirm = () => {
    if (reasonInvalid) {
      setShowError(true)
      reasonRef.current?.focus()
      return
    }
    onConfirm(trimmed)
  }

  return (
    <Dialog
      open={open}
      modalType="alert"
      onOpenChange={(_, data) => {
        if (!data.open) onCancel()
      }}
    >
      <DialogSurface className="app-confirm">
        <DialogBody>
          <DialogTitle>{title}</DialogTitle>
          <DialogContent className="app-confirm__content">
            {warning ? (
              <MessageBar intent={warning.tone ?? 'warning'}>
                <MessageBarBody>
                  <MessageBarTitle>{warning.title}</MessageBarTitle>
                  {warning.message}
                </MessageBarBody>
              </MessageBar>
            ) : null}
            {description ? (
              <p className="app-confirm__description">{description}</p>
            ) : null}
            {children}
            {requireReason ? (
              <Field
                label={reasonLabel}
                required
                validationState={showError && reasonInvalid ? 'error' : 'none'}
                validationMessage={
                  showError && reasonInvalid
                    ? `Enter at least ${minReasonLength} characters so reviewers understand the decision.`
                    : undefined
                }
                hint={
                  <Caption1>
                    Recorded on the audit trail with your persona and timestamp.
                  </Caption1>
                }
              >
                <Textarea
                  ref={reasonRef}
                  value={reason}
                  resize="vertical"
                  placeholder={reasonPlaceholder}
                  onChange={(_, data) => {
                    setReason(data.value)
                    if (showError) setShowError(false)
                  }}
                />
              </Field>
            ) : null}
            {requireReason && reasonPresets && reasonPresets.length > 0 ? (
              <div className="app-confirm__presets">
                <Caption1>Quick reasons</Caption1>
                <div className="app-confirm__preset-row">
                  {reasonPresets.map((preset) => (
                    <Button
                      key={preset}
                      size="small"
                      appearance="outline"
                      onClick={() => {
                        setReason(preset)
                        setShowError(false)
                        reasonRef.current?.focus()
                      }}
                    >
                      {preset}
                    </Button>
                  ))}
                </div>
              </div>
            ) : null}
          </DialogContent>
          <DialogActions>
            <Button appearance="secondary" onClick={onCancel} disabled={busy}>
              {cancelLabel}
            </Button>
            <Button
              appearance="primary"
              onClick={handleConfirm}
              disabled={busy || (requireReason && trimmed.length === 0)}
              className={destructive ? 'app-confirm__danger' : undefined}
            >
              {busy ? 'Working…' : confirmLabel}
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  )
}

export default ConfirmDialog
