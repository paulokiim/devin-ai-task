import { useCallback, useMemo, useState } from 'react'
import {
  Badge,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Dropdown,
  Field,
  MessageBar,
  MessageBarActions,
  MessageBarBody,
  MessageBarTitle,
  Option,
  SearchBox,
  Tab,
  TabList,
} from '@fluentui/react-components'
import {
  AddRegular,
  ArrowClockwiseRegular,
  ArrowDownloadRegular,
  DismissRegular,
  FilterDismissRegular,
} from '@fluentui/react-icons'
import { usePrototype } from '../../core/PrototypeContext'
import type { EnvironmentName, FeatureFlag } from '../../core/types'
import {
  ENVIRONMENTS,
  ENVIRONMENT_LABELS,
  ROLE_EXPLANATIONS,
  STATUS_FILTERS,
  capabilitiesForRole,
  collectTags,
  filterFlags,
  flagsToCsv,
  formatTimestamp,
  type StatusFilter,
} from './flagUtils'
import { FlagTable } from './FlagTable'
import { FlagDetailPane } from './FlagDetailPane'
import { NewFlagDialog, type NewFlagValues } from './NewFlagDialog'
import { KillSwitchDialog, type KillSwitchMode } from './KillSwitchDialog'
import './flags.css'

const isEnvironmentName = (value: string): value is EnvironmentName =>
  ENVIRONMENTS.includes(value as EnvironmentName)

const isStatusFilter = (value: string): value is StatusFilter =>
  STATUS_FILTERS.some((item) => item.key === value)

export function FeatureFlagsPage() {
  const {
    flags,
    persona,
    notices,
    lastUpdated,
    notify,
    dismissNotice,
    refresh,
    createFlag,
    toggleFlag,
    approveFlagChange,
    updateFlagRollout,
    killFlag,
    archiveFlag,
  } = usePrototype()

  const capabilities = useMemo(
    () => capabilitiesForRole(persona.role),
    [persona.role],
  )

  const [environment, setEnvironment] = useState<EnvironmentName>('production')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [tags, setTags] = useState<string[]>([])
  const [includeArchived, setIncludeArchived] = useState(false)
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [newFlagOpen, setNewFlagOpen] = useState(false)
  const [killTarget, setKillTarget] = useState<{
    key: string
    mode: KillSwitchMode
  } | null>(null)
  const [productionTarget, setProductionTarget] = useState<string | null>(null)

  const availableTags = useMemo(() => collectTags(flags), [flags])

  const visibleFlags = useMemo(
    () =>
      filterFlags(flags, {
        environment,
        search,
        status,
        tags,
        includeArchived,
      }),
    [flags, environment, search, status, tags, includeArchived],
  )

  const selectedFlag = useMemo(
    () => flags.find((flag) => flag.key === selectedKey) ?? null,
    [flags, selectedKey],
  )

  const killFlagTarget = useMemo(
    () => flags.find((flag) => flag.key === killTarget?.key) ?? null,
    [flags, killTarget],
  )

  const productionFlag = useMemo(
    () => flags.find((flag) => flag.key === productionTarget) ?? null,
    [flags, productionTarget],
  )

  const stats = useMemo(() => {
    const active = flags.filter((flag) => !flag.archived)
    return {
      total: active.length,
      enabled: active.filter((flag) => flag.environments[environment].enabled)
        .length,
      partial: active.filter(
        (flag) =>
          flag.environments[environment].enabled &&
          flag.environments[environment].rollout < 100,
      ).length,
      pending: flags.filter((flag) => flag.pendingChange !== null).length,
      killed: flags.filter((flag) => flag.killed).length,
      archived: flags.filter((flag) => flag.archived).length,
    }
  }, [flags, environment])

  const latestNotice = notices.length > 0 ? notices[notices.length - 1] : null

  const copyKey = useCallback(
    (flag: FeatureFlag) => {
      const write = navigator.clipboard?.writeText(flag.key)
      if (write) {
        write
          .then(() =>
            notify('Flag key copied', `${flag.key} is on your clipboard.`),
          )
          .catch(() =>
            notify(
              'Copy blocked by the browser',
              `Select and copy manually: ${flag.key}`,
              'warning',
            ),
          )
        return
      }
      notify('Clipboard unavailable', `Copy manually: ${flag.key}`, 'warning')
    },
    [notify],
  )

  const exportCsv = useCallback(() => {
    const csv = flagsToCsv(visibleFlags)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `feature-flags-${environment}.csv`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
    notify(
      'Export ready',
      `${visibleFlags.length} flag${visibleFlags.length === 1 ? '' : 's'} exported as feature-flags-${environment}.csv.`,
      'info',
    )
  }, [environment, notify, visibleFlags])

  const handleCreate = useCallback(
    (values: NewFlagValues) => {
      createFlag(values)
      setSelectedKey(values.key)
      setSearch('')
      setStatus('all')
      setTags([])
    },
    [createFlag],
  )

  const handleToggleEnvironment = useCallback(
    (flag: FeatureFlag, target: EnvironmentName) => {
      if (target === 'production' && flag.protected) {
        setProductionTarget(flag.key)
        return
      }
      toggleFlag(flag.key, target)
    },
    [toggleFlag],
  )

  const confirmProductionRequest = useCallback(
    (approveImmediately: boolean) => {
      if (!productionFlag) return
      toggleFlag(productionFlag.key, 'production')
      if (approveImmediately && capabilities.canApprove) {
        approveFlagChange(productionFlag.key)
      }
      setProductionTarget(null)
    },
    [approveFlagChange, capabilities.canApprove, productionFlag, toggleFlag],
  )

  const resetFilters = useCallback(() => {
    setSearch('')
    setStatus('all')
    setTags([])
    setIncludeArchived(false)
    notify('Filters cleared', 'Showing all active flags again.', 'info')
  }, [notify])

  const filtersActive =
    search.trim() !== '' ||
    status !== 'all' ||
    tags.length > 0 ||
    includeArchived

  return (
    <div className="flags-page">
      <header className="flags-header">
        <div>
          <h1>Feature flags</h1>
          <p className="flags-subtitle">
            Environment-aware rollout control with protected production changes.
            Mocked data only · last updated {formatTimestamp(lastUpdated)}.
          </p>
        </div>
        <div className="flags-header-actions">
          <Badge appearance="tint" color="brand">
            {capabilities.roleLabel}
          </Badge>
          <Button
            appearance="secondary"
            icon={<ArrowClockwiseRegular />}
            onClick={refresh}
          >
            Refresh
          </Button>
          <Button
            appearance="secondary"
            icon={<ArrowDownloadRegular />}
            onClick={exportCsv}
            disabled={visibleFlags.length === 0}
          >
            Export CSV
          </Button>
          <Button
            appearance="primary"
            icon={<AddRegular />}
            disabled={!capabilities.canCreate}
            title={
              capabilities.canCreate ? undefined : ROLE_EXPLANATIONS.viewer
            }
            onClick={() => setNewFlagOpen(true)}
          >
            New flag
          </Button>
        </div>
      </header>

      {capabilities.role === 'viewer' ? (
        <MessageBar intent="info">
          <MessageBarBody>
            <MessageBarTitle>Read-only for {persona.role}</MessageBarTitle>
            {` ${ROLE_EXPLANATIONS.viewer}`}
          </MessageBarBody>
        </MessageBar>
      ) : null}

      {latestNotice ? (
        <MessageBar intent={latestNotice.tone} aria-live="polite">
          <MessageBarBody>
            <MessageBarTitle>{latestNotice.title}</MessageBarTitle>
            {latestNotice.message ? ` ${latestNotice.message}` : null}
          </MessageBarBody>
          <MessageBarActions
            containerAction={
              <Button
                appearance="transparent"
                icon={<DismissRegular />}
                aria-label="Dismiss message"
                onClick={() => dismissNotice(latestNotice.id)}
              />
            }
          />
        </MessageBar>
      ) : null}

      <TabList
        selectedValue={environment}
        onTabSelect={(_, data) => {
          const value = String(data.value)
          if (isEnvironmentName(value)) setEnvironment(value)
        }}
        aria-label="Environment"
      >
        {ENVIRONMENTS.map((name) => (
          <Tab key={name} value={name}>
            {ENVIRONMENT_LABELS[name]}
          </Tab>
        ))}
      </TabList>

      <section className="flags-stats" aria-label="Flag summary">
        <article>
          <span className="flags-stat-value">{stats.total}</span>
          <span className="flags-stat-label">Active flags</span>
        </article>
        <article>
          <span className="flags-stat-value">{stats.enabled}</span>
          <span className="flags-stat-label">
            Enabled in {ENVIRONMENT_LABELS[environment].toLowerCase()}
          </span>
        </article>
        <article>
          <span className="flags-stat-value">{stats.partial}</span>
          <span className="flags-stat-label">Partial rollouts</span>
        </article>
        <article>
          <span className="flags-stat-value">{stats.pending}</span>
          <span className="flags-stat-label">Awaiting approval</span>
        </article>
        <article>
          <span className="flags-stat-value">{stats.killed}</span>
          <span className="flags-stat-label">Kill switches active</span>
        </article>
        <article>
          <span className="flags-stat-value">{stats.archived}</span>
          <span className="flags-stat-label">Archived</span>
        </article>
      </section>

      <section className="flags-toolbar" aria-label="Filters">
        <Field label="Search">
          <SearchBox
            value={search}
            placeholder="Key, name, owner or tag"
            onChange={(_, data) => setSearch(data.value)}
          />
        </Field>
        <Field label="Status">
          <Dropdown
            selectedOptions={[status]}
            value={
              STATUS_FILTERS.find((item) => item.key === status)?.label ?? ''
            }
            onOptionSelect={(_, data) => {
              const value = data.optionValue ?? 'all'
              if (isStatusFilter(value)) setStatus(value)
            }}
          >
            {STATUS_FILTERS.map((item) => (
              <Option key={item.key} value={item.key}>
                {item.label}
              </Option>
            ))}
          </Dropdown>
        </Field>
        <Field label="Tags">
          <Dropdown
            multiselect
            selectedOptions={tags}
            placeholder="All tags"
            value={tags.join(', ')}
            onOptionSelect={(_, data) => setTags(data.selectedOptions)}
          >
            {availableTags.map((tag) => (
              <Option key={tag} value={tag}>
                {tag}
              </Option>
            ))}
          </Dropdown>
        </Field>
        <Checkbox
          checked={includeArchived}
          label="Include archived"
          onChange={(_, data) => setIncludeArchived(data.checked === true)}
        />
        <Button
          appearance="subtle"
          icon={<FilterDismissRegular />}
          disabled={!filtersActive}
          onClick={resetFilters}
        >
          Clear filters
        </Button>
        <span className="flags-result-count" aria-live="polite">
          {visibleFlags.length} of {flags.length} flags
        </span>
      </section>

      <div
        className={selectedFlag ? 'flags-layout has-detail' : 'flags-layout'}
      >
        <div className="flags-table-wrapper">
          {visibleFlags.length === 0 ? (
            <div className="flags-empty">
              <h2>No flags match these filters</h2>
              <p>
                Try clearing filters or include archived flags to widen the
                search.
              </p>
              <div className="flags-actions-row">
                <Button appearance="primary" onClick={resetFilters}>
                  Clear filters
                </Button>
                <Button
                  appearance="secondary"
                  onClick={() => setIncludeArchived(true)}
                  disabled={includeArchived}
                >
                  Include archived
                </Button>
              </div>
            </div>
          ) : (
            <FlagTable
              flags={visibleFlags}
              environment={environment}
              capabilities={capabilities}
              selectedKey={selectedKey}
              onSelect={setSelectedKey}
              onCopyKey={copyKey}
              onToggleEnvironment={handleToggleEnvironment}
              onRequestProduction={(flag) => setProductionTarget(flag.key)}
              onApprove={(flag) => approveFlagChange(flag.key)}
              onArchive={(flag) => archiveFlag(flag.key)}
              onKillSwitch={(flag) =>
                setKillTarget({ key: flag.key, mode: 'kill' })
              }
              onRearm={(flag) =>
                setKillTarget({ key: flag.key, mode: 'rearm' })
              }
            />
          )}
        </div>

        {selectedFlag ? (
          <FlagDetailPane
            flag={selectedFlag}
            environment={environment}
            capabilities={capabilities}
            onClose={() => setSelectedKey(null)}
            onSelectEnvironment={setEnvironment}
            onToggleEnvironment={(target) =>
              handleToggleEnvironment(selectedFlag, target)
            }
            onRequestProduction={() => setProductionTarget(selectedFlag.key)}
            onApprove={() => approveFlagChange(selectedFlag.key)}
            onSaveRollout={(target, value) =>
              updateFlagRollout(selectedFlag.key, target, value)
            }
            onCopyKey={() => copyKey(selectedFlag)}
            onArchive={() => archiveFlag(selectedFlag.key)}
            onKillSwitch={() =>
              setKillTarget({ key: selectedFlag.key, mode: 'kill' })
            }
            onRearm={() =>
              setKillTarget({ key: selectedFlag.key, mode: 'rearm' })
            }
          />
        ) : (
          <aside className="flags-detail flags-detail-empty">
            <h2>Select a flag</h2>
            <p>
              Choose a flag name to inspect environment state, adjust rollout,
              review history, and manage safety controls.
            </p>
          </aside>
        )}
      </div>

      <NewFlagDialog
        open={newFlagOpen}
        existingKeys={flags.map((flag) => flag.key)}
        defaultOwner={persona.team === 'Platform' ? 'Platform Engineering' : ''}
        onOpenChange={setNewFlagOpen}
        onCreate={handleCreate}
      />

      <KillSwitchDialog
        flag={killFlagTarget}
        mode={killTarget?.mode ?? 'kill'}
        onDismiss={() => setKillTarget(null)}
        onConfirm={(reason) => {
          if (killTarget) killFlag(killTarget.key, reason)
        }}
      />

      <Dialog
        open={productionFlag !== null}
        onOpenChange={(_, data) => {
          if (!data.open) setProductionTarget(null)
        }}
      >
        <DialogSurface>
          <DialogBody>
            <DialogTitle>Request a production change</DialogTitle>
            <DialogContent className="flags-form">
              {productionFlag ? (
                <>
                  <MessageBar intent="warning">
                    <MessageBarBody>
                      <MessageBarTitle>Protected flag</MessageBarTitle>
                      {` ${ROLE_EXPLANATIONS.protectedProduction}`}
                    </MessageBarBody>
                  </MessageBar>
                  <dl className="flags-summary-list">
                    <div>
                      <dt>Flag</dt>
                      <dd>
                        {productionFlag.name} ({productionFlag.key})
                      </dd>
                    </div>
                    <div>
                      <dt>Requested change</dt>
                      <dd>
                        {productionFlag.environments.production.enabled
                          ? 'Disable in production'
                          : 'Enable in production'}
                      </dd>
                    </div>
                    <div>
                      <dt>Requested by</dt>
                      <dd>
                        {persona.name} · {persona.role}
                      </dd>
                    </div>
                    <div>
                      <dt>Approver</dt>
                      <dd>
                        {capabilities.canApprove
                          ? 'You can approve as Release Manager'
                          : 'Release Manager (Aisha Khan)'}
                      </dd>
                    </div>
                  </dl>
                </>
              ) : null}
            </DialogContent>
            <DialogActions>
              <Button
                appearance="secondary"
                onClick={() => setProductionTarget(null)}
              >
                Cancel
              </Button>
              {capabilities.canApprove ? (
                <Button
                  appearance="secondary"
                  onClick={() => confirmProductionRequest(true)}
                >
                  Request and approve now
                </Button>
              ) : null}
              <Button
                appearance="primary"
                onClick={() => confirmProductionRequest(false)}
              >
                Submit change request
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </div>
  )
}

export default FeatureFlagsPage
