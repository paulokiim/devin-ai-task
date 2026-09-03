import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.localStorage.clear())
})

test('navigates across the three internal tools', async ({ page }) => {
  await page.goto('/')
  await expect(
    page.getByRole('heading', { name: /Welcome back/i }),
  ).toBeVisible()

  const navigation = page.getByRole('navigation', { name: 'Primary' })
  await navigation.getByRole('button', { name: /^KYC —/ }).click()
  await expect(
    page.getByRole('heading', { name: 'KYC review queue' }),
  ).toBeVisible()

  await navigation.getByRole('button', { name: /^Refunds —/ }).click()
  await expect(
    page.getByText('Refund operations', { exact: true }),
  ).toBeVisible()

  await navigation.getByRole('button', { name: /^Feature flags —/ }).click()
  await expect(
    page.getByRole('heading', { name: 'Feature flags' }),
  ).toBeVisible()
})

test('supports persona switching and refund creation entry', async ({
  page,
}) => {
  await page.goto('/refunds')
  const personaMenu = page.getByRole('button', { name: /Priya Shah/ })
  await personaMenu.focus()
  await personaMenu.press('Enter')
  const dana = page.getByRole('menuitemradio', { name: /Dana Brooks/ })
  await dana.focus()
  await dana.press('Enter')

  const newRefund = page.getByRole('button', { name: 'New refund' })
  await expect(newRefund).toBeEnabled()
  await newRefund.click()
  await expect(
    page.getByRole('heading', { name: 'New refund request' }),
  ).toBeVisible()
})

test('home has no automatic WCAG A or AA violations', async ({ page }) => {
  await page.goto('/')
  await expect(
    page.getByRole('heading', { name: /Welcome back/i }),
  ).toBeVisible()
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .disableRules(['aria-hidden-focus'])
    .analyze()
  expect(results.violations).toEqual([])
})
