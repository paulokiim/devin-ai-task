import { useEffect, useState, type ReactElement } from 'react'
import {
  Badge,
  Button,
  Divider,
  Label,
  MessageBar,
  MessageBarActions,
  MessageBarBody,
  MessageBarTitle,
  Slider,
  Switch,
  Tooltip,
} from '@fluentui/react-components'
import {
  ArchiveRegular,
  ArrowUndoRegular,
  CheckmarkCircleRegular,
  CopyRegular,
  DismissRegular,
  HistoryRegular,
  PlugDisconnectedRegular,
  SaveRegular,
  ShieldCheckmarkRegular,
} from '@fluentui/react-icons'
import type { EnvironmentName, FeatureFlag } from '../../core/types'
import {
  ENVIRONMENTS,
  ENVIRONMENT_LABELS,
  ROLE_EXPLANATIONS,
  environmentPill,
  formatTimestamp,
  relativeTime,
  type RoleCapabilities,
} from './flagUtils'
import { FlagPill } from './FlagPill'

interface FlagDetailPaneProps {
  flag: FeatureFlag
  environment: EnvironmentName
  capabilities: RoleCapabilities
  onClose: () => void
  onSelectEnvironment: (environment: EnvironmentName) => void
  onToggleEnvironment: (environment: EnvironmentName) => void
  onRequestProduction: () => void
  onApprove: () => void
  onSaveRollout: (environment: EnvironmentName, rollout: number) => void
  onCopyKey: () => void
  onArchive: () => void
  onKillSwitch: () => void
  onRearm: () => void
}

const gate = (allowed: boolean, explanation: string, node: ReactElement) =>
  allowed ? (
    node
  ) : (
    <Tooltip content={explanation} relationship="description" withArrow>
      <span className="flags-gated">{node}</span>
    </Tooltip>
  )

export function FlagDetailPane({
  flag,
  environment,
  capabilities,
  onClose,
  onSelectEnvironment,
  onToggleEnvironment,
  onRequestProduction,
  onApprove,
  onSaveRollout,
  onCopyKey,
  onArchive,
  onKillSwitch,
  onRearm,
}: FlagDetailPaneProps) {
  const currentRollout = flag.environments[environment].rollout
  const [rollout, setRollout] = useState(currentRollout)

  useEffect(() => {
    setRollout(flag.environments[environment].rollout)
  }, [flag.key, environment, flag.environments])

  const protectedProduction = flag.protected && environment === 'production'
  const canSaveThisRollout =
    capabilities.canSaveRollout &&
    !flag.archived &&
    !(protectedProduction && !capabilities.canApprove) &&
    !(environment === 'production' && flag.killed)
  const rolloutDirty = rollout !== currentRollout

  const rolloutBlockedReason = flag.archived
    ? 'Restore the flag before changing rollout percentages.'
    : environment === 'production' && flag.killed
      ? 'The kill switch is active. Re-arm the flag before changing the production rollout.'
      : protectedProduction && !capabilities.canApprove
        ? 'This flag is protected, so production rollout percentages are changed by a Release Manager.'
        : ROLE_EXPLANATIONS.viewer

  return (
    <aside className="flags-detail" aria-label={`Details for ${flag.name}`}>
      <header className="flags-detail-header">
        <div className="flags-detail-heading">
          <h2>{flag.name}</h2>
          <code className="flags-key">{flag.key}</code>
        </div>
        <div className="flags-detail-header-actions">
          <Button
            appearance="subtle"
            icon={<CopyRegular />}
            onClick={onCopyKey}
          >
            Copy key
          </Button>
          <Button
            appearance="subtle"
            icon={<DismissRegular />}
            aria-label="Close details"
            onClick={onClose}
          />
        </div>
      </header>

      <p className="flags-detail-description">{flag.description}</p>

      <div className="flags-badge-row">
        <Badge appearance="outline" color="informative">
          Owner: {flag.owner}
        </Badge>
        {flag.protected ? (
          <Badge
            appearance="tint"
            color="brand"
            icon={<ShieldCheckmarkRegular />}
          >
            Production protected
          </Badge>
        ) : (
          <Badge appearance="outline" color="subtle">
            Unprotected
          </Badge>
        )}
        {flag.tags.map((tag) => (
          <Badge key={tag} appearance="filled" color="subtle">
            #{tag}
          </Badge>
        ))}
      </div>

      <div className="flags-detail-alerts">
        {flag.pendingChange ? (
          <MessageBar intent="warning">
            <MessageBarBody>
              <MessageBarTitle>
                Change request awaiting approval
              </MessageBarTitle>
              {` ${flag.pendingChange.requestedBy} requested to ${
                flag.pendingChange.enabled ? 'enable' : 'disable'
              } ${ENVIRONMENT_LABELS[flag.pendingChange.environment].toLowerCase()}.`}
              {capabilities.canApprove
                ? ' Approving applies the change immediately.'
                : ` ${ROLE_EXPLANATIONS.approve}`}
            </MessageBarBody>
            <MessageBarActions>
              {gate(
                capabilities.canApprove,
                ROLE_EXPLANATIONS.approve,
                <Button
                  appearance="primary"
                  size="small"
                  icon={<CheckmarkCircleRegular />}
                  disabled={!capabilities.canApprove}
                  onClick={onApprove}
                >
                  Approve change
                </Button>,
              )}
            </MessageBarActions>
          </MessageBar>
        ) : null}

        {flag.killed ? (
          <MessageBar intent="error">
            <MessageBarBody>
              <MessageBarTitle>Kill switch active</MessageBarTitle>
              {' Production is forced off. '}
              {capabilities.canRearm
                ? 'Re-arm once the incident is resolved.'
                : ROLE_EXPLANATIONS.rearm}
            </MessageBarBody>
            <MessageBarActions>
              {gate(
                capabilities.canRearm,
                ROLE_EXPLANATIONS.rearm,
                <Button
                  size="small"
                  icon={<ArrowUndoRegular />}
                  disabled={!capabilities.canRearm}
                  onClick={onRearm}
                >
                  Re-arm flag
                </Button>,
              )}
            </MessageBarActions>
          </MessageBar>
        ) : null}

        {flag.archived ? (
          <MessageBar intent="info">
            <MessageBarBody>
              <MessageBarTitle>Archived</MessageBarTitle>
              {
                ' This flag is hidden from the default list and evaluates to off. Restore it to make changes.'
              }
            </MessageBarBody>
          </MessageBar>
        ) : null}
      </div>

      <Divider />

      <section className="flags-detail-section" aria-label="Environment state">
        <h3>Environments</h3>
        {ENVIRONMENTS.map((name) => {
          const pill = environmentPill(flag, name)
          const state = flag.environments[name]
          const isProduction = name === 'production'
          const needsRequest = isProduction && flag.protected
          const toggleAllowed =
            !flag.archived &&
            (isProduction
              ? flag.protected
                ? false
                : capabilities.canToggleNonProduction && !flag.killed
              : capabilities.canToggleNonProduction)
          const toggleReason = flag.archived
            ? 'Restore the flag before changing environments.'
            : isProduction && flag.killed
              ? 'The kill switch is active. Re-arm before enabling production.'
              : ROLE_EXPLANATIONS.viewer

          return (
            <div className="flags-env-row" key={name}>
              <div className="flags-env-meta">
                <button
                  type="button"
                  className={`flags-env-name${
                    name === environment ? ' is-active' : ''
                  }`}
                  onClick={() => onSelectEnvironment(name)}
                  aria-pressed={name === environment}
                >
                  {ENVIRONMENT_LABELS[name]}
                </button>
                <FlagPill pill={pill} />
                <span className="flags-env-detail">{pill.detail}</span>
              </div>
              <div className="flags-env-control">
                {needsRequest
                  ? gate(
                      capabilities.canRequestProduction &&
                        !flag.archived &&
                        !flag.killed,
                      flag.killed
                        ? 'The kill switch is active. Re-arm before requesting production changes.'
                        : flag.archived
                          ? 'Restore the flag before requesting production changes.'
                          : ROLE_EXPLANATIONS.viewer,
                      <Button
                        size="small"
                        appearance="outline"
                        disabled={
                          !capabilities.canRequestProduction ||
                          flag.archived ||
                          flag.killed ||
                          flag.pendingChange !== null
                        }
                        onClick={onRequestProduction}
                      >
                        {flag.pendingChange
                          ? 'Request pending'
                          : state.enabled
                            ? 'Request disable'
                            : 'Request enable'}
                      </Button>,
                    )
                  : gate(
                      toggleAllowed,
                      toggleReason,
                      <Switch
                        checked={state.enabled}
                        disabled={!toggleAllowed}
                        label={state.enabled ? 'Enabled' : 'Disabled'}
                        aria-label={`${ENVIRONMENT_LABELS[name]} enabled`}
                        onChange={() => onToggleEnvironment(name)}
                      />,
                    )}
              </div>
            </div>
          )
        })}
        {flag.protected ? (
          <p className="flags-hint">{ROLE_EXPLANATIONS.protectedProduction}</p>
        ) : null}
      </section>

      <Divider />

      <section className="flags-detail-section" aria-label="Rollout">
        <h3>Rollout · {ENVIRONMENT_LABELS[environment]}</h3>
        <div className="flags-rollout">
          <Label htmlFor={`rollout-${flag.key}`}>Percentage of traffic</Label>
          <div className="flags-rollout-row">
            <Slider
              id={`rollout-${flag.key}`}
              min={0}
              max={100}
              step={5}
              value={rollout}
              disabled={!canSaveThisRollout}
              onChange={(_, data) => setRollout(data.value)}
            />
            <output className="flags-rollout-value" aria-live="polite">
              {rollout}%
            </output>
          </div>
          <p className="flags-hint">
            {rolloutDirty
              ? `Unsaved: ${currentRollout}% → ${rollout}%. Nothing changes until you save.`
              : `Saved at ${currentRollout}%. Move the slider, then save.`}
          </p>
          <div className="flags-actions-row">
            {gate(
              canSaveThisRollout,
              rolloutBlockedReason,
              <Button
                appearance="primary"
                size="small"
                icon={<SaveRegular />}
                disabled={!canSaveThisRollout || !rolloutDirty}
                onClick={() => onSaveRollout(environment, rollout)}
              >
                Save rollout
              </Button>,
            )}
            <Button
              size="small"
              appearance="secondary"
              disabled={!rolloutDirty}
              onClick={() => setRollout(currentRollout)}
            >
              Discard change
            </Button>
          </div>
        </div>
      </section>

      <Divider />

      <section className="flags-detail-section" aria-label="Safety controls">
        <h3>Safety controls</h3>
        <div className="flags-actions-row">
          {gate(
            capabilities.canKill && !flag.archived,
            flag.archived
              ? 'Archived flags already evaluate to off.'
              : ROLE_EXPLANATIONS.viewer,
            <Button
              size="small"
              appearance="outline"
              icon={<PlugDisconnectedRegular />}
              disabled={!capabilities.canKill || flag.archived || flag.killed}
              onClick={onKillSwitch}
            >
              Kill switch
            </Button>,
          )}
          {gate(
            capabilities.canRearm,
            ROLE_EXPLANATIONS.rearm,
            <Button
              size="small"
              icon={<ArrowUndoRegular />}
              disabled={!capabilities.canRearm || !flag.killed}
              onClick={onRearm}
            >
              Re-arm
            </Button>,
          )}
          {gate(
            capabilities.canArchive,
            ROLE_EXPLANATIONS.viewer,
            <Button
              size="small"
              icon={flag.archived ? <ArrowUndoRegular /> : <ArchiveRegular />}
              disabled={!capabilities.canArchive}
              onClick={onArchive}
            >
              {flag.archived ? 'Restore flag' : 'Archive flag'}
            </Button>,
          )}
        </div>
        <p className="flags-hint">
          Signed in as {capabilities.roleLabel}. Kill switch requires a typed
          confirmation; re-arming is limited to Release Managers.
        </p>
      </section>

      <Divider />

      <section className="flags-detail-section" aria-label="Activity history">
        <h3>
          <HistoryRegular aria-hidden /> Activity
        </h3>
        <ol className="flags-activity">
          {flag.activity.map((item) => (
            <li key={item.id}>
              <div className="flags-activity-head">
                <span className="flags-activity-action">{item.action}</span>
                <span className="flags-activity-time">
                  {relativeTime(item.at)}
                </span>
              </div>
              <p className="flags-activity-detail">{item.detail}</p>
              <span className="flags-activity-meta">
                {item.actor} · {formatTimestamp(item.at)}
              </span>
            </li>
          ))}
        </ol>
      </section>
    </aside>
  )
}
