// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { FluentProvider, webLightTheme } from '@fluentui/react-components'
import { PrototypeProvider } from '../../core/PrototypeContext'
import { RefundsPage } from './RefundsPage'
import { validateDraft, filterRefunds, emptyDraft } from './refundUtils'

afterEach(async () => {
  cleanup()
  window.localStorage.clear()
  await new Promise((resolve) => window.setTimeout(resolve, 0))
})

const renderPage = () =>
  render(
    <FluentProvider theme={webLightTheme}>
      <PrototypeProvider>
        <RefundsPage />
      </PrototypeProvider>
    </FluentProvider>,
  )

describe('RefundsPage', () => {
  it('renders the refund queue with KPI cards and the detail pane', () => {
    renderPage()
    expect(screen.getByText('Refund operations')).toBeTruthy()
    expect(screen.getByRole('table', { name: 'Refund requests' })).toBeTruthy()
    expect(screen.getAllByText('RF-1042').length).toBeGreaterThan(0)
    expect(
      screen.getByRole('button', { name: /Awaiting approval/i }),
    ).toBeTruthy()
  })
})

describe('refundUtils', () => {
  it('reports validation errors for an empty draft', () => {
    const errors = validateDraft(emptyDraft, [])
    expect(Object.keys(errors).sort()).toEqual([
      'amount',
      'customer',
      'email',
      'paymentId',
      'reason',
    ])
  })

  it('filters by search term', () => {
    const rows = filterRefunds(
      [
        {
          id: 'RF-1',
          customer: 'Ada',
          email: 'ada@example.com',
          paymentId: 'PAY-000001',
          amount: 10,
          currency: 'USD',
          reason: 'Duplicate charge',
          status: 'Pending approval',
          requestedBy: 'Dana Brooks',
          createdAt: new Date().toISOString(),
          reconciliation: 'Pending',
          attempts: 0,
          notes: [],
          activity: [],
        },
      ],
      { search: 'ada', status: 'All', reconciliation: 'All', onlyMine: false },
      'Dana Brooks',
    )
    expect(rows).toHaveLength(1)
  })
})
