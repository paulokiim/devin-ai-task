import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { createInitialState } from './mockData'
import type {
  DemoState,
  EnvironmentName,
  FeatureFlag,
  KycStatus,
  Notice,
  Persona,
  PersonaId,
  Refund,
  RefundStatus,
  Tone,
} from './types'

const STORAGE_KEY = 'internal-tools-hub:demo:v1'

type NewRefund = Pick<
  Refund,
  'customer' | 'email' | 'paymentId' | 'amount' | 'reason'
>

type NewFlag = Pick<FeatureFlag, 'key' | 'name' | 'description' | 'owner'> & {
  protected: boolean
}

interface PrototypeContextValue extends DemoState {
  persona: Persona
  setPersona: (id: PersonaId) => void
  toggleTheme: () => void
  dismissNotice: (id: number) => void
  notify: (title: string, message?: string, tone?: Tone) => void
  refresh: () => void
  resetDemo: () => void
  assignKyc: (id: string, assignee: string) => void
  addKycNote: (id: string, note: string) => void
  verifyKycDocument: (caseId: string, documentId: string) => void
  setKycStatus: (id: string, status: KycStatus, reason: string) => void
  createRefund: (refund: NewRefund) => string
  setRefundStatus: (id: string, status: RefundStatus, reason: string) => void
  retryRefund: (id: string) => void
  createFlag: (flag: NewFlag) => void
  toggleFlag: (key: string, environment: EnvironmentName) => void
  approveFlagChange: (key: string) => void
  updateFlagRollout: (
    key: string,
    environment: EnvironmentName,
    rollout: number,
  ) => void
  killFlag: (key: string, reason: string) => void
  archiveFlag: (key: string) => void
}

const PrototypeContext = createContext<PrototypeContextValue | null>(null)

const cloneInitialState = () => structuredClone(createInitialState())

const loadState = (): DemoState => {
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) return cloneInitialState()
  try {
    return JSON.parse(raw) as DemoState
  } catch {
    return cloneInitialState()
  }
}

const activity = (actor: string, action: string, detail: string) => ({
  id: crypto.randomUUID(),
  actor,
  action,
  detail,
  at: new Date().toISOString(),
})

export function PrototypeProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DemoState>(loadState)
  const persona =
    state.personas.find((item) => item.id === state.personaId) ??
    state.personas[0]

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  const notify = useCallback(
    (title: string, message?: string, tone: Tone = 'success') => {
      const notice: Notice = { id: Date.now(), title, message, tone }
      setState((current) => ({
        ...current,
        notices: [...current.notices, notice].slice(-4),
      }))
    },
    [],
  )

  const dismissNotice = useCallback((id: number) => {
    setState((current) => ({
      ...current,
      notices: current.notices.filter((notice) => notice.id !== id),
    }))
  }, [])

  const refresh = useCallback(() => {
    setState((current) => ({
      ...current,
      lastUpdated: new Date().toISOString(),
    }))
    notify(
      'Data refreshed',
      'The latest mocked records are now visible.',
      'info',
    )
  }, [notify])

  const resetDemo = useCallback(() => {
    const next = cloneInitialState()
    setState(next)
    notify('Demo data reset', 'All records were restored to the seeded state.')
  }, [notify])

  const assignKyc = useCallback(
    (id: string, assignee: string) => {
      setState((current) => ({
        ...current,
        kycCases: current.kycCases.map((item) =>
          item.id === id
            ? {
                ...item,
                assignee,
                status: item.status === 'New' ? 'In review' : item.status,
                activity: [
                  activity(
                    persona.name,
                    'Case assigned',
                    `Assigned to ${assignee}`,
                  ),
                  ...item.activity,
                ],
              }
            : item,
        ),
      }))
      notify('Case assigned', `${id} is now assigned to ${assignee}.`)
    },
    [notify, persona.name],
  )

  const addKycNote = useCallback(
    (id: string, note: string) => {
      setState((current) => ({
        ...current,
        kycCases: current.kycCases.map((item) =>
          item.id === id
            ? {
                ...item,
                notes: [note, ...item.notes],
                activity: [
                  activity(persona.name, 'Internal note added', note),
                  ...item.activity,
                ],
              }
            : item,
        ),
      }))
      notify('Note added', `The timeline for ${id} was updated.`)
    },
    [notify, persona.name],
  )

  const verifyKycDocument = useCallback(
    (caseId: string, documentId: string) => {
      setState((current) => ({
        ...current,
        kycCases: current.kycCases.map((item) =>
          item.id === caseId
            ? {
                ...item,
                documents: item.documents.map((document) =>
                  document.id === documentId
                    ? { ...document, status: 'Verified' }
                    : document,
                ),
                activity: [
                  activity(persona.name, 'Document verified', documentId),
                  ...item.activity,
                ],
              }
            : item,
        ),
      }))
      notify('Document verified', 'The case audit trail has been updated.')
    },
    [notify, persona.name],
  )

  const setKycStatus = useCallback(
    (id: string, status: KycStatus, reason: string) => {
      setState((current) => ({
        ...current,
        kycCases: current.kycCases.map((item) =>
          item.id === id
            ? {
                ...item,
                status,
                activity: [
                  activity(
                    persona.name,
                    `Case ${status.toLowerCase()}`,
                    reason,
                  ),
                  ...item.activity,
                ],
              }
            : item,
        ),
      }))
      notify(`Case ${status.toLowerCase()}`, `${id}: ${reason}`)
    },
    [notify, persona.name],
  )

  const createRefund = useCallback(
    (input: NewRefund) => {
      const id = `RF-${1042 + state.refunds.length + 1}`
      const refund: Refund = {
        ...input,
        id,
        currency: 'USD',
        status: 'Pending approval',
        requestedBy: persona.name,
        createdAt: new Date().toISOString(),
        reconciliation: 'Pending',
        attempts: 0,
        notes: [],
        activity: [
          activity(
            persona.name,
            'Refund submitted',
            'Awaiting checker approval',
          ),
        ],
      }
      setState((current) => ({
        ...current,
        refunds: [refund, ...current.refunds],
      }))
      notify('Refund submitted', `${id} is awaiting approval.`)
      return id
    },
    [notify, persona.name, state.refunds.length],
  )

  const setRefundStatus = useCallback(
    (id: string, status: RefundStatus, reason: string) => {
      setState((current) => ({
        ...current,
        refunds: current.refunds.map((item) =>
          item.id === id
            ? {
                ...item,
                status,
                reconciliation:
                  status === 'Succeeded' ? 'Matched' : item.reconciliation,
                activity: [
                  activity(
                    persona.name,
                    `Refund ${status.toLowerCase()}`,
                    reason,
                  ),
                  ...item.activity,
                ],
              }
            : item,
        ),
      }))
      notify(`Refund ${status.toLowerCase()}`, `${id}: ${reason}`)
    },
    [notify, persona.name],
  )

  const retryRefund = useCallback(
    (id: string) => {
      setState((current) => ({
        ...current,
        refunds: current.refunds.map((item) =>
          item.id === id
            ? {
                ...item,
                status: 'Processing',
                attempts: item.attempts + 1,
                activity: [
                  activity(
                    persona.name,
                    'Refund retried',
                    'Reused the original idempotency key',
                  ),
                  ...item.activity,
                ],
              }
            : item,
        ),
      }))
      notify('Retry started', `${id} is processing.`, 'info')
      window.setTimeout(() => {
        setState((current) => ({
          ...current,
          refunds: current.refunds.map((item) =>
            item.id === id
              ? {
                  ...item,
                  status: 'Succeeded',
                  reconciliation: 'Matched',
                  activity: [
                    activity(
                      'Payment processor',
                      'Refund succeeded',
                      'Mock processor reference returned',
                    ),
                    ...item.activity,
                  ],
                }
              : item,
          ),
        }))
        notify('Refund completed', `${id} succeeded and reconciled.`)
      }, 1100)
    },
    [notify, persona.name],
  )

  const createFlag = useCallback(
    (input: NewFlag) => {
      const flag: FeatureFlag = {
        ...input,
        tags: ['new'],
        archived: false,
        killed: false,
        pendingChange: null,
        environments: {
          development: { enabled: true, rollout: 100 },
          staging: { enabled: false, rollout: 0 },
          production: { enabled: false, rollout: 0 },
        },
        activity: [
          activity(persona.name, 'Flag created', 'Enabled in development'),
        ],
      }
      setState((current) => ({ ...current, flags: [flag, ...current.flags] }))
      notify('Feature flag created', `${input.key} is enabled in development.`)
    },
    [notify, persona.name],
  )

  const toggleFlag = useCallback(
    (key: string, environment: EnvironmentName) => {
      const flag = state.flags.find((item) => item.key === key)
      if (!flag) return
      const enabled = !flag.environments[environment].enabled
      const needsApproval = environment === 'production' && flag.protected
      setState((current) => ({
        ...current,
        flags: current.flags.map((item) =>
          item.key === key
            ? needsApproval
              ? {
                  ...item,
                  pendingChange: {
                    environment,
                    enabled,
                    requestedBy: persona.name,
                  },
                  activity: [
                    activity(
                      persona.name,
                      'Change requested',
                      `${enabled ? 'Enable' : 'Disable'} ${environment}`,
                    ),
                    ...item.activity,
                  ],
                }
              : {
                  ...item,
                  environments: {
                    ...item.environments,
                    [environment]: {
                      ...item.environments[environment],
                      enabled,
                      rollout: enabled
                        ? Math.max(item.environments[environment].rollout, 100)
                        : 0,
                    },
                  },
                  activity: [
                    activity(
                      persona.name,
                      'Environment updated',
                      `${environment} ${enabled ? 'enabled' : 'disabled'}`,
                    ),
                    ...item.activity,
                  ],
                }
            : item,
        ),
      }))
      notify(
        needsApproval ? 'Change request created' : 'Flag updated',
        needsApproval
          ? 'A Release Manager must approve this production change.'
          : `${key} was ${enabled ? 'enabled' : 'disabled'} in ${environment}.`,
        needsApproval ? 'info' : 'success',
      )
    },
    [notify, persona.name, state.flags],
  )

  const approveFlagChange = useCallback(
    (key: string) => {
      setState((current) => ({
        ...current,
        flags: current.flags.map((item) => {
          if (item.key !== key || !item.pendingChange) return item
          const pending = item.pendingChange
          return {
            ...item,
            environments: {
              ...item.environments,
              [pending.environment]: {
                ...item.environments[pending.environment],
                enabled: pending.enabled,
                rollout: pending.enabled
                  ? Math.max(
                      item.environments[pending.environment].rollout,
                      100,
                    )
                  : 0,
              },
            },
            pendingChange: null,
            activity: [
              activity(persona.name, 'Change approved', pending.environment),
              ...item.activity,
            ],
          }
        }),
      }))
      notify('Change approved', `${key} production settings were applied.`)
    },
    [notify, persona.name],
  )

  const updateFlagRollout = useCallback(
    (key: string, environment: EnvironmentName, rollout: number) => {
      setState((current) => ({
        ...current,
        flags: current.flags.map((item) =>
          item.key === key
            ? {
                ...item,
                environments: {
                  ...item.environments,
                  [environment]: { enabled: rollout > 0, rollout },
                },
                activity: [
                  activity(
                    persona.name,
                    'Rollout updated',
                    `${environment}: ${rollout}%`,
                  ),
                  ...item.activity,
                ],
              }
            : item,
        ),
      }))
      notify('Rollout saved', `${key} is now at ${rollout}% in ${environment}.`)
    },
    [notify, persona.name],
  )

  const killFlag = useCallback(
    (key: string, reason: string) => {
      setState((current) => ({
        ...current,
        flags: current.flags.map((item) =>
          item.key === key
            ? {
                ...item,
                killed: !item.killed,
                environments: {
                  ...item.environments,
                  production: {
                    ...item.environments.production,
                    enabled: item.killed,
                    rollout: item.killed
                      ? Math.max(item.environments.production.rollout, 100)
                      : 0,
                  },
                },
                activity: [
                  activity(
                    persona.name,
                    item.killed ? 'Flag re-armed' : 'Kill switch activated',
                    reason,
                  ),
                  ...item.activity,
                ],
              }
            : item,
        ),
      }))
      notify('Production state updated', `${key}: ${reason}`, 'warning')
    },
    [notify, persona.name],
  )

  const archiveFlag = useCallback(
    (key: string) => {
      setState((current) => ({
        ...current,
        flags: current.flags.map((item) =>
          item.key === key
            ? {
                ...item,
                archived: !item.archived,
                activity: [
                  activity(
                    persona.name,
                    item.archived ? 'Flag restored' : 'Flag archived',
                    'Updated from the admin panel',
                  ),
                  ...item.activity,
                ],
              }
            : item,
        ),
      }))
      notify('Flag status updated', `${key} was archived or restored.`)
    },
    [notify, persona.name],
  )

  const value = useMemo<PrototypeContextValue>(
    () => ({
      ...state,
      persona,
      setPersona: (id) =>
        setState((current) => ({ ...current, personaId: id })),
      toggleTheme: () =>
        setState((current) => ({
          ...current,
          theme: current.theme === 'light' ? 'dark' : 'light',
        })),
      dismissNotice,
      notify,
      refresh,
      resetDemo,
      assignKyc,
      addKycNote,
      verifyKycDocument,
      setKycStatus,
      createRefund,
      setRefundStatus,
      retryRefund,
      createFlag,
      toggleFlag,
      approveFlagChange,
      updateFlagRollout,
      killFlag,
      archiveFlag,
    }),
    [
      state,
      persona,
      dismissNotice,
      notify,
      refresh,
      resetDemo,
      assignKyc,
      addKycNote,
      verifyKycDocument,
      setKycStatus,
      createRefund,
      setRefundStatus,
      retryRefund,
      createFlag,
      toggleFlag,
      approveFlagChange,
      updateFlagRollout,
      killFlag,
      archiveFlag,
    ],
  )

  return (
    <PrototypeContext.Provider value={value}>
      {children}
    </PrototypeContext.Provider>
  )
}

export function usePrototype() {
  const context = useContext(PrototypeContext)
  if (!context) {
    throw new Error('usePrototype must be used inside PrototypeProvider')
  }
  return context
}
