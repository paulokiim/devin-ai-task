export type Tone = 'success' | 'warning' | 'error' | 'info'

export type PersonaId = 'priya' | 'marcus' | 'dana' | 'luis' | 'sam' | 'aisha'

export interface Persona {
  id: PersonaId
  name: string
  initials: string
  role: string
  team: 'Compliance' | 'Support' | 'Finance' | 'Platform'
}

export type KycStatus =
  | 'New'
  | 'In review'
  | 'Waiting for customer'
  | 'Escalated'
  | 'Approved'
  | 'Rejected'

export type RiskLevel = 'Low' | 'Medium' | 'High' | 'Critical'

export interface KycDocument {
  id: string
  type: string
  number: string
  expires: string
  status: 'Pending' | 'Verified' | 'Rejected'
}

export interface ActivityEvent {
  id: string
  actor: string
  action: string
  detail: string
  at: string
}

export interface KycCase {
  id: string
  customer: string
  email: string
  country: string
  type: 'Individual' | 'Business'
  risk: RiskLevel
  status: KycStatus
  assignee: string
  ageHours: number
  createdAt: string
  reasons: string[]
  documents: KycDocument[]
  notes: string[]
  activity: ActivityEvent[]
}

export type RefundStatus =
  | 'Draft'
  | 'Pending approval'
  | 'Processing'
  | 'Succeeded'
  | 'Failed'
  | 'Rejected'
  | 'Cancelled'

export interface Refund {
  id: string
  customer: string
  email: string
  paymentId: string
  amount: number
  currency: 'USD'
  reason: string
  status: RefundStatus
  requestedBy: string
  createdAt: string
  reconciliation: 'Matched' | 'Pending' | 'Discrepancy'
  attempts: number
  notes: string[]
  activity: ActivityEvent[]
}

export type EnvironmentName = 'development' | 'staging' | 'production'

export interface FlagEnvironment {
  enabled: boolean
  rollout: number
}

export interface FeatureFlag {
  key: string
  name: string
  description: string
  owner: string
  tags: string[]
  protected: boolean
  archived: boolean
  killed: boolean
  pendingChange: null | {
    environment: EnvironmentName
    enabled: boolean
    requestedBy: string
  }
  environments: Record<EnvironmentName, FlagEnvironment>
  activity: ActivityEvent[]
}

export interface Notice {
  id: number
  tone: Tone
  title: string
  message?: string
}

export interface DemoState {
  personas: Persona[]
  personaId: PersonaId
  theme: 'light' | 'dark'
  kycCases: KycCase[]
  refunds: Refund[]
  flags: FeatureFlag[]
  notices: Notice[]
  lastUpdated: string
}
