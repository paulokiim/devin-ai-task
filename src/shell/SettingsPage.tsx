import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Avatar,
  Badge,
  Button,
  Caption1,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Divider,
  Dropdown,
  Field,
  Option,
  Switch,
  Text,
  Title3,
} from '@fluentui/react-components'
import {
  ArrowClockwise20Regular,
  ArrowReset20Regular,
  Copy20Regular,
  WeatherMoon20Regular,
  WeatherSunny20Regular,
} from '@fluentui/react-icons'
import { usePrototype } from '../core/PrototypeContext'
import type { PersonaId } from '../core/types'
import { useWorkCounts } from './useWorkCounts'

/** Persona, theme and demo-data controls for the prototype. */
export function SettingsPage() {
  const {
    persona,
    personas,
    setPersona,
    theme,
    toggleTheme,
    lastUpdated,
    refresh,
    resetDemo,
    notify,
    kycCases,
    refunds,
    flags,
  } = usePrototype()
  const { counts } = useWorkCounts()
  const [resetOpen, setResetOpen] = useState(false)
  const navigate = useNavigate()

  const lastRefreshLabel = new Date(lastUpdated).toLocaleString()

  return (
    <div className="shell-page">
      <div className="shell-page-head">
        <div>
          <Title3 as="h1">Settings</Title3>
          <Caption1 className="shell-muted">
            Prototype preferences and mocked-data controls. Changes are stored
            in this browser only.
          </Caption1>
        </div>
        <div className="shell-page-head-actions">
          <Button appearance="secondary" onClick={() => navigate('/')}>
            Back to home
          </Button>
          <Button
            appearance="primary"
            icon={<ArrowClockwise20Regular />}
            onClick={refresh}
          >
            Refresh demo data
          </Button>
        </div>
      </div>

      <div className="shell-settings-grid">
        <section className="shell-card" aria-labelledby="shell-persona-heading">
          <Text id="shell-persona-heading" as="h2" weight="semibold">
            Persona
          </Text>
          <div className="shell-settings-persona">
            <Avatar
              name={persona.name}
              initials={persona.initials}
              size={40}
              color="colorful"
              aria-hidden
            />
            <span>
              <Text weight="semibold">{persona.name}</Text>
              <Caption1 className="shell-muted shell-block">
                {persona.role} · {persona.team} team
              </Caption1>
            </span>
            <Badge appearance="tint" color="brand" size="small">
              Signed in
            </Badge>
          </div>
          <Field
            label="Switch persona"
            hint="Queues and approval rights follow the persona."
          >
            <Dropdown
              value={`${persona.name} — ${persona.role}`}
              selectedOptions={[persona.id]}
              onOptionSelect={(_event, data) => {
                const nextId = data.optionValue as PersonaId | undefined
                if (!nextId || nextId === persona.id) return
                setPersona(nextId)
                const next = personas.find((item) => item.id === nextId)
                notify(
                  'Persona switched',
                  next ? `You are now ${next.name}, ${next.role}.` : undefined,
                  'info',
                )
              }}
            >
              {personas.map((item) => (
                <Option
                  key={item.id}
                  value={item.id}
                  text={`${item.name} — ${item.role}`}
                >
                  {item.name} — {item.role} ({item.team})
                </Option>
              ))}
            </Dropdown>
          </Field>
        </section>

        <section className="shell-card" aria-labelledby="shell-theme-heading">
          <Text id="shell-theme-heading" as="h2" weight="semibold">
            Appearance
          </Text>
          <div className="shell-settings-theme">
            {theme === 'dark' ? (
              <WeatherMoon20Regular />
            ) : (
              <WeatherSunny20Regular />
            )}
            <span>
              <Text weight="semibold">
                {theme === 'dark' ? 'Dark theme' : 'Light theme'}
              </Text>
              <Caption1 className="shell-muted shell-block">
                Applied through the Fluent web theme across every module.
              </Caption1>
            </span>
          </div>
          <Switch
            checked={theme === 'dark'}
            onChange={toggleTheme}
            label="Use dark theme"
          />
          <Divider />
          <Caption1 className="shell-muted">
            Tip: the same toggle lives in the top bar for quick switching during
            a demo.
          </Caption1>
        </section>

        <section className="shell-card" aria-labelledby="shell-data-heading">
          <Text id="shell-data-heading" as="h2" weight="semibold">
            Demo data
          </Text>
          <dl className="shell-settings-stats">
            <div>
              <dt>Last refresh</dt>
              <dd>{lastRefreshLabel}</dd>
            </div>
            <div>
              <dt>KYC cases</dt>
              <dd>
                {kycCases.length} ({counts.kycOpen} open)
              </dd>
            </div>
            <div>
              <dt>Refunds</dt>
              <dd>
                {refunds.length} ({counts.refundsPendingApproval} awaiting
                approval)
              </dd>
            </div>
            <div>
              <dt>Feature flags</dt>
              <dd>
                {flags.length} ({counts.flagsPendingApproval} change requests)
              </dd>
            </div>
          </dl>
          <div className="shell-settings-actions">
            <Button icon={<ArrowClockwise20Regular />} onClick={refresh}>
              Refresh
            </Button>
            <Button
              appearance="secondary"
              icon={<ArrowReset20Regular />}
              onClick={() => setResetOpen(true)}
            >
              Reset demo data
            </Button>
            <Button
              appearance="subtle"
              icon={<Copy20Regular />}
              onClick={() => {
                const snapshot = JSON.stringify(
                  {
                    persona: persona.name,
                    theme,
                    lastUpdated,
                    counts,
                  },
                  null,
                  2,
                )
                void navigator.clipboard?.writeText(snapshot).then(
                  () =>
                    notify(
                      'Snapshot copied',
                      'Current prototype state is on your clipboard.',
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
              Copy snapshot
            </Button>
          </div>
          <Caption1 className="shell-muted">
            Reset restores the seeded records for KYC, refunds and flags. It
            cannot be undone.
          </Caption1>
        </section>
      </div>

      <Dialog
        open={resetOpen}
        onOpenChange={(_event, data) => setResetOpen(data.open)}
      >
        <DialogSurface>
          <DialogBody>
            <DialogTitle>Reset demo data?</DialogTitle>
            <DialogContent>
              <Text as="p" block>
                This restores every KYC case, refund and feature flag to the
                seeded mocked state. Notes, approvals and toggles you created in
                this session will be lost.
              </Text>
              <Text as="p" block className="shell-muted">
                Your persona and theme preferences are part of the seeded state
                and will also reset.
              </Text>
            </DialogContent>
            <DialogActions>
              <Button
                appearance="secondary"
                onClick={() => setResetOpen(false)}
              >
                Keep my changes
              </Button>
              <Button
                appearance="primary"
                onClick={() => {
                  resetDemo()
                  setResetOpen(false)
                }}
              >
                Reset demo data
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </div>
  )
}
