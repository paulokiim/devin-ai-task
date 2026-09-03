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
  Input,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  Textarea,
} from '@fluentui/react-components'
import type { FeatureFlag } from '../../core/types'

export type KillSwitchMode = 'kill' | 'rearm'

interface KillSwitchDialogProps {
  flag: FeatureFlag | null
  mode: KillSwitchMode
  onDismiss: () => void
  onConfirm: (reason: string) => void
}

export function KillSwitchDialog({
  flag,
  mode,
  onDismiss,
  onConfirm,
}: KillSwitchDialogProps) {
  const [typed, setTyped] = useState('')
  const [reason, setReason] = useState('')
  const [showErrors, setShowErrors] = useState(false)

  useEffect(() => {
    setTyped('')
    setReason('')
    setShowErrors(false)
  }, [flag?.key, mode])

  if (!flag) return null

  const isKill = mode === 'kill'
  const confirmPhrase = isKill ? flag.key : `re-arm ${flag.key}`
  const typedMatches = typed.trim() === confirmPhrase
  const reasonValid = reason.trim().length >= 5

  const handleConfirm = () => {
    if (!typedMatches || !reasonValid) {
      setShowErrors(true)
      return
    }
    onConfirm(reason.trim())
    onDismiss()
  }

  return (
    <Dialog
      open
      onOpenChange={(_, data) => {
        if (!data.open) onDismiss()
      }}
    >
      <DialogSurface>
        <DialogBody>
          <DialogTitle>
            {isKill
              ? `Activate kill switch for ${flag.name}`
              : `Re-arm ${flag.name}`}
          </DialogTitle>
          <DialogContent className="flags-form">
            <MessageBar intent={isKill ? 'error' : 'warning'}>
              <MessageBarBody>
                <MessageBarTitle>
                  {isKill
                    ? 'Production traffic stops using this code path'
                    : 'Production traffic can flow to this code path again'}
                </MessageBarTitle>
                {isKill
                  ? ' Production is forced off immediately and the rollout drops to 0%. Development and staging are untouched.'
                  : ' Production returns to 100% for this flag. Confirm the incident is resolved first.'}
              </MessageBarBody>
            </MessageBar>
            <Field
              label={`Type "${confirmPhrase}" to confirm`}
              required
              validationState={showErrors && !typedMatches ? 'error' : 'none'}
              validationMessage={
                showErrors && !typedMatches
                  ? `The confirmation text must match "${confirmPhrase}" exactly.`
                  : undefined
              }
            >
              <Input
                value={typed}
                autoComplete="off"
                placeholder={confirmPhrase}
                onChange={(_, data) => setTyped(data.value)}
              />
            </Field>
            <Field
              label="Reason (recorded in flag history)"
              required
              validationState={showErrors && !reasonValid ? 'error' : 'none'}
              validationMessage={
                showErrors && !reasonValid
                  ? 'Add at least 5 characters so the audit trail is useful.'
                  : undefined
              }
            >
              <Textarea
                value={reason}
                resize="vertical"
                placeholder={
                  isKill
                    ? 'Elevated error rate on checkout submit'
                    : 'Root cause fixed in release 2026.4.2'
                }
                onChange={(_, data) => setReason(data.value)}
              />
            </Field>
          </DialogContent>
          <DialogActions>
            <Button appearance="secondary" onClick={onDismiss}>
              Cancel
            </Button>
            <Button
              appearance="primary"
              onClick={handleConfirm}
              disabled={!typedMatches || !reasonValid}
            >
              {isKill ? 'Activate kill switch' : 'Re-arm flag'}
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  )
}
