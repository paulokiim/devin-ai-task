import { useState, type FormEvent } from 'react'
import {
  Button,
  Checkbox,
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
  Textarea,
} from '@fluentui/react-components'
import { isValidFlagKey, suggestKeyFromName } from './flagUtils'

export interface NewFlagValues {
  key: string
  name: string
  description: string
  owner: string
  protected: boolean
}

interface NewFlagDialogProps {
  open: boolean
  existingKeys: string[]
  defaultOwner: string
  onOpenChange: (open: boolean) => void
  onCreate: (values: NewFlagValues) => void
}

interface FormErrors {
  key?: string
  name?: string
  owner?: string
}

export function NewFlagDialog({
  open,
  existingKeys,
  defaultOwner,
  onOpenChange,
  onCreate,
}: NewFlagDialogProps) {
  const [name, setName] = useState('')
  const [key, setKey] = useState('')
  const [keyEdited, setKeyEdited] = useState(false)
  const [description, setDescription] = useState('')
  const [owner, setOwner] = useState(defaultOwner)
  const [isProtected, setIsProtected] = useState(true)
  const [errors, setErrors] = useState<FormErrors>({})

  const reset = () => {
    setName('')
    setKey('')
    setKeyEdited(false)
    setDescription('')
    setOwner(defaultOwner)
    setIsProtected(true)
    setErrors({})
  }

  const close = () => {
    reset()
    onOpenChange(false)
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextErrors: FormErrors = {}
    const trimmedKey = key.trim()
    if (!name.trim()) nextErrors.name = 'Give the flag a human-readable name.'
    if (!trimmedKey) {
      nextErrors.key = 'A flag key is required.'
    } else if (!isValidFlagKey(trimmedKey)) {
      nextErrors.key = 'Use lowercase words separated by single hyphens.'
    } else if (existingKeys.includes(trimmedKey)) {
      nextErrors.key = 'That key already exists. Keys must be unique.'
    }
    if (!owner.trim()) nextErrors.owner = 'Name the owning team.'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    onCreate({
      key: trimmedKey,
      name: name.trim(),
      description:
        description.trim() || 'No description provided yet by the owning team.',
      owner: owner.trim(),
      protected: isProtected,
    })
    reset()
    onOpenChange(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(_, data) => {
        if (!data.open) close()
        else onOpenChange(true)
      }}
    >
      <DialogSurface aria-describedby="new-flag-hint">
        <form onSubmit={handleSubmit}>
          <DialogBody>
            <DialogTitle>New feature flag</DialogTitle>
            <DialogContent className="flags-form">
              <MessageBar intent="info" id="new-flag-hint">
                <MessageBarBody>
                  New flags start enabled in development at 100% and off in
                  staging and production.
                </MessageBarBody>
              </MessageBar>
              <Field
                label="Display name"
                required
                validationState={errors.name ? 'error' : 'none'}
                validationMessage={errors.name}
              >
                <Input
                  value={name}
                  placeholder="Instant payouts"
                  onChange={(_, data) => {
                    setName(data.value)
                    if (!keyEdited) setKey(suggestKeyFromName(data.value))
                  }}
                />
              </Field>
              <Field
                label="Flag key"
                required
                hint="Lowercase, hyphen separated. Used by SDKs and cannot be changed later."
                validationState={errors.key ? 'error' : 'none'}
                validationMessage={errors.key}
              >
                <Input
                  value={key}
                  placeholder="instant-payouts"
                  onChange={(_, data) => {
                    setKeyEdited(true)
                    setKey(data.value)
                  }}
                />
              </Field>
              <Field
                label="Owning team"
                required
                validationState={errors.owner ? 'error' : 'none'}
                validationMessage={errors.owner}
              >
                <Input
                  value={owner}
                  placeholder="Money Movement"
                  onChange={(_, data) => setOwner(data.value)}
                />
              </Field>
              <Field label="Description">
                <Textarea
                  value={description}
                  resize="vertical"
                  placeholder="What does this flag control and who is affected?"
                  onChange={(_, data) => setDescription(data.value)}
                />
              </Field>
              <Checkbox
                checked={isProtected}
                label="Protect production (changes require Release Manager approval)"
                onChange={(_, data) => setIsProtected(data.checked === true)}
              />
            </DialogContent>
            <DialogActions>
              <Button appearance="secondary" type="button" onClick={close}>
                Cancel
              </Button>
              <Button appearance="primary" type="submit">
                Create flag
              </Button>
            </DialogActions>
          </DialogBody>
        </form>
      </DialogSurface>
    </Dialog>
  )
}
