import type { EnvironmentName, FeatureFlag } from '../../core/types'

export const ENVIRONMENTS: readonly EnvironmentName[] = [
  'development',
  'staging',
  'production',
] as const

export const ENVIRONMENT_LABELS: Record<EnvironmentName, string> = {
  development: 'Development',
  staging: 'Staging',
  production: 'Production',
}

export const ENVIRONMENT_SHORT: Record<EnvironmentName, string> = {
  development: 'Dev',
  staging: 'Stg',
  production: 'Prod',
}

export type StatusFilter =
  | 'all'
  | 'enabled'
  | 'disabled'
  | 'pending'
  | 'killed'
  | 'archived'

export const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'All statuses' },
  { key: 'enabled', label: 'Enabled in environment' },
  { key: 'disabled', label: 'Disabled in environment' },
  { key: 'pending', label: 'Awaiting approval' },
  { key: 'killed', label: 'Kill switch active' },
  { key: 'archived', label: 'Archived' },
]

export type FlagRole = 'platform-engineer' | 'release-manager' | 'viewer'

export interface RoleCapabilities {
  role: FlagRole
  roleLabel: string
  canCreate: boolean
  canToggleNonProduction: boolean
  canRequestProduction: boolean
  canApprove: boolean
  canSaveRollout: boolean
  canKill: boolean
  canRearm: boolean
  canArchive: boolean
}

export const resolveFlagRole = (personaRole: string): FlagRole => {
  if (personaRole === 'Release Manager') return 'release-manager'
  if (personaRole === 'Platform Engineer') return 'platform-engineer'
  return 'viewer'
}

export const capabilitiesForRole = (personaRole: string): RoleCapabilities => {
  const role = resolveFlagRole(personaRole)
  if (role === 'release-manager') {
    return {
      role,
      roleLabel: 'Release Manager',
      canCreate: true,
      canToggleNonProduction: true,
      canRequestProduction: true,
      canApprove: true,
      canSaveRollout: true,
      canKill: true,
      canRearm: true,
      canArchive: true,
    }
  }
  if (role === 'platform-engineer') {
    return {
      role,
      roleLabel: 'Platform Engineer',
      canCreate: true,
      canToggleNonProduction: true,
      canRequestProduction: true,
      canApprove: false,
      canSaveRollout: true,
      canKill: true,
      canRearm: false,
      canArchive: true,
    }
  }
  return {
    role,
    roleLabel: 'Read-only viewer',
    canCreate: false,
    canToggleNonProduction: false,
    canRequestProduction: false,
    canApprove: false,
    canSaveRollout: false,
    canKill: false,
    canRearm: false,
    canArchive: false,
  }
}

export const ROLE_EXPLANATIONS = {
  viewer:
    'Only Platform Engineers and Release Managers can change flags. Switch persona to Sam Chen (Platform Engineer) or Aisha Khan (Release Manager) to make changes.',
  approve:
    'Production changes on protected flags are approved by a Release Manager. Switch persona to Aisha Khan to approve.',
  rearm:
    'Re-arming a flag sends production traffic back through the new code path, so only a Release Manager can do it.',
  protectedProduction:
    'This flag is protected. Production toggles create a change request that a Release Manager must approve.',
} as const

export type PillTone =
  | 'success'
  | 'warning'
  | 'danger'
  | 'informative'
  | 'subtle'

export interface EnvironmentPill {
  environment: EnvironmentName
  label: string
  detail: string
  tone: PillTone
}

export const environmentPill = (
  flag: FeatureFlag,
  environment: EnvironmentName,
): EnvironmentPill => {
  const state = flag.environments[environment]
  if (flag.archived) {
    return {
      environment,
      label: `${ENVIRONMENT_SHORT[environment]} archived`,
      detail: 'Flag is archived and evaluates to off.',
      tone: 'subtle',
    }
  }
  if (environment === 'production' && flag.killed) {
    return {
      environment,
      label: `${ENVIRONMENT_SHORT[environment]} killed`,
      detail: 'Kill switch is active in production.',
      tone: 'danger',
    }
  }
  if (flag.pendingChange && flag.pendingChange.environment === environment) {
    return {
      environment,
      label: `${ENVIRONMENT_SHORT[environment]} pending`,
      detail: `${flag.pendingChange.requestedBy} requested ${
        flag.pendingChange.enabled ? 'enable' : 'disable'
      }.`,
      tone: 'warning',
    }
  }
  if (!state.enabled) {
    return {
      environment,
      label: `${ENVIRONMENT_SHORT[environment]} off`,
      detail: 'Disabled for all traffic.',
      tone: 'subtle',
    }
  }
  if (state.rollout < 100) {
    return {
      environment,
      label: `${ENVIRONMENT_SHORT[environment]} ${state.rollout}%`,
      detail: `Partial rollout at ${state.rollout}%.`,
      tone: 'informative',
    }
  }
  return {
    environment,
    label: `${ENVIRONMENT_SHORT[environment]} on`,
    detail: 'Enabled for all traffic.',
    tone: 'success',
  }
}

export const collectTags = (flags: FeatureFlag[]): string[] =>
  Array.from(new Set(flags.flatMap((flag) => flag.tags))).sort((a, b) =>
    a.localeCompare(b),
  )

export interface FlagFilters {
  environment: EnvironmentName
  search: string
  status: StatusFilter
  tags: string[]
  includeArchived: boolean
}

export const filterFlags = (
  flags: FeatureFlag[],
  filters: FlagFilters,
): FeatureFlag[] => {
  const search = filters.search.trim().toLowerCase()
  return flags.filter((flag) => {
    if (
      !filters.includeArchived &&
      filters.status !== 'archived' &&
      flag.archived
    ) {
      return false
    }
    if (search) {
      const haystack = [flag.key, flag.name, flag.description, flag.owner]
        .concat(flag.tags)
        .join(' ')
        .toLowerCase()
      if (!haystack.includes(search)) return false
    }
    if (filters.tags.length > 0) {
      const hasTag = filters.tags.some((tag) => flag.tags.includes(tag))
      if (!hasTag) return false
    }
    const state = flag.environments[filters.environment]
    switch (filters.status) {
      case 'enabled':
        return state.enabled && !flag.archived
      case 'disabled':
        return !state.enabled && !flag.archived
      case 'pending':
        return flag.pendingChange !== null
      case 'killed':
        return flag.killed
      case 'archived':
        return flag.archived
      case 'all':
      default:
        return true
    }
  })
}

export const formatTimestamp = (value: string): string => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export const relativeTime = (value: string): string => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const minutes = Math.round((Date.now() - date.getTime()) / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.round(hours / 24)}d ago`
}

const csvCell = (value: string): string => `"${value.replace(/"/g, '""')}"`

export const flagsToCsv = (flags: FeatureFlag[]): string => {
  const header = [
    'key',
    'name',
    'owner',
    'tags',
    'protected',
    'archived',
    'killed',
    'pending_change',
    'development',
    'staging',
    'production',
  ]
  const rows = flags.map((flag) =>
    [
      flag.key,
      flag.name,
      flag.owner,
      flag.tags.join(' '),
      String(flag.protected),
      String(flag.archived),
      String(flag.killed),
      flag.pendingChange
        ? `${flag.pendingChange.environment}:${
            flag.pendingChange.enabled ? 'enable' : 'disable'
          } by ${flag.pendingChange.requestedBy}`
        : '',
      ...ENVIRONMENTS.map((environment) => {
        const state = flag.environments[environment]
        return `${state.enabled ? 'on' : 'off'} ${state.rollout}%`
      }),
    ].map(csvCell),
  )
  return [header.map(csvCell), ...rows].map((row) => row.join(',')).join('\n')
}

export const isValidFlagKey = (key: string): boolean =>
  /^[a-z0-9]+(-[a-z0-9]+)*$/.test(key)

export const suggestKeyFromName = (name: string): string =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
