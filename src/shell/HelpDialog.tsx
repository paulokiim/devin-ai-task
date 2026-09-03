import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Divider,
  Text,
} from '@fluentui/react-components'
import { usePrototype } from '../core/PrototypeContext'
import { navItems } from './navItems'

interface HelpDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const shortcuts: Array<{ keys: string; action: string }> = [
  { keys: '/', action: 'Focus global search' },
  { keys: '↑ ↓', action: 'Move through search results' },
  { keys: 'Enter', action: 'Open the highlighted search result' },
  { keys: 'Esc', action: 'Close search, panes and dialogs' },
  { keys: 'Ctrl + \\', action: 'Collapse or expand the left navigation' },
]

/** Guided tour of the prototype: modules, personas and keyboard shortcuts. */
export function HelpDialog({ open, onOpenChange }: HelpDialogProps) {
  const { persona, notify } = usePrototype()

  return (
    <Dialog
      open={open}
      onOpenChange={(_event, data) => onOpenChange(data.open)}
    >
      <DialogSurface className="shell-help-surface">
        <DialogBody>
          <DialogTitle>Help &amp; prototype guide</DialogTitle>
          <DialogContent>
            <Text as="p" block className="shell-help-lead">
              Internal Tools Hub is a click-through prototype. Every record is
              mocked in the browser, stored in local storage, and can be reset
              at any time from Settings. Nothing here reaches a real payment,
              screening or flag service.
            </Text>
            <Divider className="shell-help-divider" />
            <Text
              as="h3"
              weight="semibold"
              block
              className="shell-help-heading"
            >
              Modules
            </Text>
            <ul className="shell-help-list">
              {navItems.map((item) => (
                <li key={item.key}>
                  <Text weight="semibold" size={200}>
                    {item.label}
                  </Text>
                  <Text size={200} className="shell-muted">
                    {' '}
                    — {item.description}
                  </Text>
                </li>
              ))}
            </ul>
            <Divider className="shell-help-divider" />
            <Text
              as="h3"
              weight="semibold"
              block
              className="shell-help-heading"
            >
              Keyboard shortcuts
            </Text>
            <ul className="shell-help-list">
              {shortcuts.map((shortcut) => (
                <li key={shortcut.keys}>
                  <kbd className="shell-kbd">{shortcut.keys}</kbd>
                  <Text size={200}> {shortcut.action}</Text>
                </li>
              ))}
            </ul>
            <Divider className="shell-help-divider" />
            <Text
              as="h3"
              weight="semibold"
              block
              className="shell-help-heading"
            >
              Your current persona
            </Text>
            <Text as="p" block size={200} className="shell-muted">
              {persona.name} · {persona.role} · {persona.team} team. Switch
              personas in the top bar to see how queues, approvals and
              permissions change.
            </Text>
          </DialogContent>
          <DialogActions>
            <Button
              appearance="secondary"
              onClick={() => {
                void navigator.clipboard
                  ?.writeText(
                    `Internal Tools Hub prototype — persona ${persona.name} (${persona.role}). Mocked data only.`,
                  )
                  .then(
                    () =>
                      notify(
                        'Summary copied',
                        'Prototype context is on your clipboard.',
                        'info',
                      ),
                    () =>
                      notify(
                        'Copy blocked',
                        'The browser denied clipboard access.',
                        'warning',
                      ),
                  )
              }}
            >
              Copy prototype summary
            </Button>
            <Button appearance="primary" onClick={() => onOpenChange(false)}>
              Got it
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  )
}
