import { Button, Text, Title2 } from '@fluentui/react-components'
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { FeatureFlagsPage } from './apps/flags'
import { KycPage } from './apps/kyc'
import { RefundsPage } from './apps/refunds'
import './shared/shared.css'
import { AppShell, HomePage, SettingsPage } from './shell'

function NotFoundPage() {
  const navigate = useNavigate()
  return (
    <section className="shell-page">
      <Title2 as="h1">Page not found</Title2>
      <Text block>This prototype does not have a screen at this address.</Text>
      <Button appearance="primary" onClick={() => navigate('/')}>
        Return to the hub
      </Button>
    </section>
  )
}

function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/kyc" element={<KycPage />} />
        <Route path="/refunds" element={<RefundsPage />} />
        <Route path="/flags" element={<FeatureFlagsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/home" element={<Navigate to="/" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AppShell>
  )
}

export default App
