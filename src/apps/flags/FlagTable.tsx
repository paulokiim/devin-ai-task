import {
  Badge,
  Button,
  Menu,
  MenuItem,
  MenuList,
  MenuPopover,
  MenuTrigger,
  Table,
  TableBody,
  TableCell,
  TableCellLayout,
  TableHeader,
  TableHeaderCell,
  TableRow,
  Tooltip,
} from '@fluentui/react-components'
import {
  ArchiveRegular,
  ArrowUndoRegular,
  CheckmarkCircleRegular,
  CopyRegular,
  MoreHorizontalRegular,
  PlugDisconnectedRegular,
  ShieldCheckmarkRegular,
  ToggleLeftRegular,
} from '@fluentui/react-icons'
import type { EnvironmentName, FeatureFlag } from '../../core/types'
import {
  ENVIRONMENTS,
  ENVIRONMENT_LABELS,
  environmentPill,
  relativeTime,
  type RoleCapabilities,
} from './flagUtils'
import { FlagPill } from './FlagPill'

interface FlagTableProps {
  flags: FeatureFlag[]
  environment: EnvironmentName
  capabilities: RoleCapabilities
  selectedKey: string | null
  onSelect: (key: string) => void
  onCopyKey: (flag: FeatureFlag) => void
  onToggleEnvironment: (flag: FeatureFlag, environment: EnvironmentName) => void
  onRequestProduction: (flag: FeatureFlag) => void
  onApprove: (flag: FeatureFlag) => void
  onArchive: (flag: FeatureFlag) => void
  onKillSwitch: (flag: FeatureFlag) => void
  onRearm: (flag: FeatureFlag) => void
}

export function FlagTable({
  flags,
  environment,
  capabilities,
  selectedKey,
  onSelect,
  onCopyKey,
  onToggleEnvironment,
  onRequestProduction,
  onApprove,
  onArchive,
  onKillSwitch,
  onRearm,
}: FlagTableProps) {
  return (
    <Table
      size="small"
      className="flags-table"
      aria-label={`Feature flags for ${ENVIRONMENT_LABELS[environment]}`}
    >
      <TableHeader>
        <TableRow>
          <TableHeaderCell>Flag</TableHeaderCell>
          <TableHeaderCell>Owner</TableHeaderCell>
          <TableHeaderCell>Environments</TableHeaderCell>
          <TableHeaderCell>
            {ENVIRONMENT_LABELS[environment]} rollout
          </TableHeaderCell>
          <TableHeaderCell>Last change</TableHeaderCell>
          <TableHeaderCell>Actions</TableHeaderCell>
        </TableRow>
      </TableHeader>
      <TableBody>
        {flags.map((flag) => {
          const state = flag.environments[environment]
          const isSelected = flag.key === selectedKey
          const lastActivity = flag.activity[0]
          const productionProtected = flag.protected
          const canToggleHere =
            capabilities.canToggleNonProduction &&
            !flag.archived &&
            !(
              environment === 'production' &&
              (productionProtected || flag.killed)
            )

          return (
            <TableRow
              key={flag.key}
              className={isSelected ? 'flags-row is-selected' : 'flags-row'}
              aria-selected={isSelected}
            >
              <TableCell>
                <TableCellLayout>
                  <button
                    type="button"
                    className="flags-row-select"
                    onClick={() => onSelect(flag.key)}
                    aria-pressed={isSelected}
                  >
                    <span className="flags-row-name">
                      {flag.name}
                      {flag.protected ? (
                        <Tooltip
                          content="Production changes require Release Manager approval"
                          relationship="description"
                          withArrow
                        >
                          <ShieldCheckmarkRegular
                            className="flags-row-shield"
                            aria-label="Production protected"
                          />
                        </Tooltip>
                      ) : null}
                    </span>
                    <span className="flags-row-key">{flag.key}</span>
                    <span className="flags-row-tags">
                      {flag.tags.map((tag) => (
                        <Badge
                          key={tag}
                          size="small"
                          appearance="outline"
                          color="subtle"
                        >
                          #{tag}
                        </Badge>
                      ))}
                    </span>
                  </button>
                </TableCellLayout>
              </TableCell>
              <TableCell>{flag.owner}</TableCell>
              <TableCell>
                <span className="flags-pill-group">
                  {ENVIRONMENTS.map((name) => (
                    <FlagPill key={name} pill={environmentPill(flag, name)} />
                  ))}
                </span>
              </TableCell>
              <TableCell>
                <span className="flags-rollout-cell">
                  <span className="flags-rollout-track" aria-hidden>
                    <span
                      className="flags-rollout-fill"
                      style={{ width: `${state.enabled ? state.rollout : 0}%` }}
                    />
                  </span>
                  <span className="flags-rollout-label">
                    {state.enabled ? `${state.rollout}%` : 'off'}
                  </span>
                </span>
              </TableCell>
              <TableCell>
                {lastActivity ? (
                  <span className="flags-last-change">
                    <strong>{lastActivity.action}</strong>
                    <span>
                      {lastActivity.actor} · {relativeTime(lastActivity.at)}
                    </span>
                  </span>
                ) : (
                  <span className="flags-last-change">
                    <span>No recorded changes</span>
                  </span>
                )}
              </TableCell>
              <TableCell>
                <div className="flags-row-actions">
                  <Tooltip
                    content={`Copy ${flag.key} to the clipboard`}
                    relationship="label"
                    withArrow
                  >
                    <Button
                      size="small"
                      appearance="subtle"
                      icon={<CopyRegular />}
                      aria-label={`Copy key ${flag.key}`}
                      onClick={() => onCopyKey(flag)}
                    />
                  </Tooltip>
                  <Menu>
                    <MenuTrigger disableButtonEnhancement>
                      <Button
                        size="small"
                        appearance="subtle"
                        icon={<MoreHorizontalRegular />}
                        aria-label={`More actions for ${flag.name}`}
                      />
                    </MenuTrigger>
                    <MenuPopover>
                      <MenuList>
                        <MenuItem onClick={() => onSelect(flag.key)}>
                          Open details
                        </MenuItem>
                        {environment === 'production' && productionProtected ? (
                          <MenuItem
                            icon={<ShieldCheckmarkRegular />}
                            disabled={
                              !capabilities.canRequestProduction ||
                              flag.archived ||
                              flag.killed ||
                              flag.pendingChange !== null
                            }
                            onClick={() => onRequestProduction(flag)}
                          >
                            {flag.pendingChange
                              ? 'Change request already open'
                              : state.enabled
                                ? 'Request production disable'
                                : 'Request production enable'}
                          </MenuItem>
                        ) : (
                          <MenuItem
                            icon={<ToggleLeftRegular />}
                            disabled={!canToggleHere}
                            onClick={() =>
                              onToggleEnvironment(flag, environment)
                            }
                          >
                            {state.enabled ? 'Disable' : 'Enable'} in{' '}
                            {ENVIRONMENT_LABELS[environment].toLowerCase()}
                          </MenuItem>
                        )}
                        {flag.pendingChange ? (
                          <MenuItem
                            icon={<CheckmarkCircleRegular />}
                            disabled={!capabilities.canApprove}
                            onClick={() => onApprove(flag)}
                          >
                            {capabilities.canApprove
                              ? 'Approve change request'
                              : 'Approval needs a Release Manager'}
                          </MenuItem>
                        ) : null}
                        {flag.killed ? (
                          <MenuItem
                            icon={<ArrowUndoRegular />}
                            disabled={!capabilities.canRearm}
                            onClick={() => onRearm(flag)}
                          >
                            {capabilities.canRearm
                              ? 'Re-arm flag'
                              : 'Re-arm needs a Release Manager'}
                          </MenuItem>
                        ) : (
                          <MenuItem
                            icon={<PlugDisconnectedRegular />}
                            disabled={!capabilities.canKill || flag.archived}
                            onClick={() => onKillSwitch(flag)}
                          >
                            Activate kill switch
                          </MenuItem>
                        )}
                        <MenuItem
                          icon={
                            flag.archived ? (
                              <ArrowUndoRegular />
                            ) : (
                              <ArchiveRegular />
                            )
                          }
                          disabled={!capabilities.canArchive}
                          onClick={() => onArchive(flag)}
                        >
                          {flag.archived ? 'Restore flag' : 'Archive flag'}
                        </MenuItem>
                      </MenuList>
                    </MenuPopover>
                  </Menu>
                </div>
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
