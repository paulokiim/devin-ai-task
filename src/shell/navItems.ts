import {
  Flag20Regular,
  Home20Regular,
  Money20Regular,
  Settings20Regular,
  ShieldTask20Regular,
  type FluentIcon,
} from '@fluentui/react-icons'

export type NavKey = 'home' | 'kyc' | 'refunds' | 'flags' | 'settings'

export interface NavItem {
  key: NavKey
  label: string
  path: string
  icon: FluentIcon
  description: string
}

export const navItems: NavItem[] = [
  {
    key: 'home',
    label: 'Home',
    path: '/',
    icon: Home20Regular,
    description: 'Workspace overview, tiles and role-aware work counts',
  },
  {
    key: 'kyc',
    label: 'KYC',
    path: '/kyc',
    icon: ShieldTask20Regular,
    description: 'Review onboarding cases, documents and escalations',
  },
  {
    key: 'refunds',
    label: 'Refunds',
    path: '/refunds',
    icon: Money20Regular,
    description: 'Request, approve and reconcile customer refunds',
  },
  {
    key: 'flags',
    label: 'Feature flags',
    path: '/flags',
    icon: Flag20Regular,
    description: 'Roll out platform changes across environments',
  },
  {
    key: 'settings',
    label: 'Settings',
    path: '/settings',
    icon: Settings20Regular,
    description: 'Persona, theme and demo data controls',
  },
]

export const isNavItemActive = (item: NavItem, pathname: string): boolean =>
  item.path === '/'
    ? pathname === '/'
    : pathname === item.path || pathname.startsWith(`${item.path}/`)
