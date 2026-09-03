// @vitest-environment jsdom
import { afterEach, expect, test } from 'vitest'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { PrototypeProvider } from '../core/PrototypeContext'
import { AppShell } from './AppShell'
import { HomePage } from './HomePage'
import { SettingsPage } from './SettingsPage'

afterEach(async () => {
  cleanup()
  window.localStorage.clear()
  await new Promise((resolve) => window.setTimeout(resolve, 0))
})

const renderShell = (children: React.ReactNode, path = '/') =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <PrototypeProvider>
        <AppShell>{children}</AppShell>
      </PrototypeProvider>
    </MemoryRouter>,
  )

test('renders the top bar, navigation and demo warning', () => {
  renderShell(<HomePage />)
  const nav = screen.getByRole('navigation', { name: 'Primary' })
  for (const label of ['Home', 'KYC', 'Refunds', 'Feature flags', 'Settings']) {
    expect(within(nav).getByText(label)).toBeTruthy()
  }
  expect(screen.getByText(/Demo environment/)).toBeTruthy()
  expect(
    screen.getByRole('combobox', {
      name: 'Search cases, refunds and feature flags',
    }),
  ).toBeTruthy()
  expect(screen.getByRole('heading', { level: 1 })).toBeTruthy()
})

test('global search filters the command result panel', () => {
  renderShell(<HomePage />)
  const search = screen.getByRole('combobox', {
    name: 'Search cases, refunds and feature flags',
  })
  fireEvent.change(search, { target: { value: 'refund' } })
  const listbox = screen.getByRole('listbox', { name: 'Search results' })
  const options = within(listbox).getAllByRole('option')
  expect(options.length).toBeGreaterThan(0)
  expect(options[0].getAttribute('aria-selected')).toBe('true')
})

test('renders settings controls', () => {
  renderShell(<SettingsPage />, '/settings')
  expect(screen.getByRole('heading', { name: 'Settings' })).toBeTruthy()
  expect(screen.getByRole('switch', { name: 'Use dark theme' })).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Reset demo data' })).toBeTruthy()
})

test('recovers when saved demo state has an incompatible shape', () => {
  window.localStorage.setItem('internal-tools-hub:demo:v1', '{}')

  renderShell(<HomePage />)

  expect(screen.getByRole('heading', { level: 1 })).toBeTruthy()
  expect(screen.getByText(/Demo environment/)).toBeTruthy()
})
