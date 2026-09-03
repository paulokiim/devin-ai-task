import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Badge,
  Button,
  Caption1,
  CounterBadge,
  Divider,
  Popover,
  PopoverSurface,
  PopoverTrigger,
  Text,
  Tooltip,
} from '@fluentui/react-components'
import { Alert20Regular } from '@fluentui/react-icons'
import { usePrototype } from '../core/PrototypeContext'
import { useWorkCounts } from './useWorkCounts'

interface Alert {
  id: string
  title: string
  detail: string
  path: string
  tone: 'danger' | 'warning' | 'informative'
}

/** Top-bar notification centre: derived alerts plus the live notice feed. */
export function NotificationsPopover() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const { notices, dismissNotice, notify } = usePrototype()
  const { counts } = useWorkCounts()

  const alerts: Alert[] = []
  if (counts.kycEscalated > 0) {
    alerts.push({
      id: 'kyc-escalated',
      title: `${counts.kycEscalated} escalated KYC case${counts.kycEscalated === 1 ? '' : 's'}`,
      detail: 'A compliance lead decision is required',
      path: '/kyc',
      tone: 'danger',
    })
  }
  if (counts.refundsFailed > 0) {
    alerts.push({
      id: 'refunds-failed',
      title: `${counts.refundsFailed} failed refund${counts.refundsFailed === 1 ? '' : 's'}`,
      detail: 'Retry with the original idempotency key',
      path: '/refunds',
      tone: 'danger',
    })
  }
  if (counts.refundsPendingApproval > 0) {
    alerts.push({
      id: 'refunds-pending',
      title: `${counts.refundsPendingApproval} refund${counts.refundsPendingApproval === 1 ? '' : 's'} awaiting approval`,
      detail: 'Maker-checker queue is waiting on a checker',
      path: '/refunds',
      tone: 'warning',
    })
  }
  if (counts.flagsPendingApproval > 0) {
    alerts.push({
      id: 'flags-pending',
      title: `${counts.flagsPendingApproval} flag change request${counts.flagsPendingApproval === 1 ? '' : 's'}`,
      detail: 'Protected production toggles need approval',
      path: '/flags',
      tone: 'warning',
    })
  }
  if (counts.flagsKilled > 0) {
    alerts.push({
      id: 'flags-killed',
      title: `${counts.flagsKilled} kill switch active`,
      detail: 'Production traffic is disabled for these flags',
      path: '/flags',
      tone: 'danger',
    })
  }

  const total = alerts.length + notices.length

  return (
    <Popover
      open={open}
      onOpenChange={(_event, data) => setOpen(data.open)}
      positioning="below-end"
      withArrow
    >
      <PopoverTrigger disableButtonEnhancement>
        <Tooltip content="Notifications" relationship="label">
          <Button
            appearance="subtle"
            className="shell-topbar-button"
            icon={
              <span className="shell-bell">
                <Alert20Regular />
                {total > 0 ? (
                  <CounterBadge
                    className="shell-bell-badge"
                    count={total}
                    size="small"
                    color="danger"
                  />
                ) : null}
              </span>
            }
            aria-label={`Notifications, ${total} item${total === 1 ? '' : 's'}`}
          />
        </Tooltip>
      </PopoverTrigger>
      <PopoverSurface className="shell-notify-surface">
        <div className="shell-notify-head">
          <Text weight="semibold">Notifications</Text>
          <Badge appearance="tint" color="informative" size="small">
            {total} open
          </Badge>
        </div>
        <Divider />
        <div className="shell-notify-section">
          <Caption1 className="shell-muted">Needs attention</Caption1>
          {alerts.length === 0 ? (
            <Text size={200} className="shell-muted">
              No outstanding approvals or escalations for the mocked data.
            </Text>
          ) : (
            alerts.map((alert) => (
              <div key={alert.id} className="shell-notify-row">
                <span className="shell-notify-row-main">
                  <Text size={200} weight="semibold">
                    {alert.title}
                  </Text>
                  <Caption1 className="shell-muted">{alert.detail}</Caption1>
                </span>
                <Badge appearance="tint" color={alert.tone} size="small">
                  {alert.tone === 'danger' ? 'Urgent' : 'Review'}
                </Badge>
                <Button
                  size="small"
                  appearance="primary"
                  onClick={() => {
                    navigate(alert.path)
                    setOpen(false)
                  }}
                >
                  View
                </Button>
              </div>
            ))
          )}
        </div>
        <Divider />
        <div className="shell-notify-section">
          <Caption1 className="shell-muted">Recent activity</Caption1>
          {notices.length === 0 ? (
            <Text size={200} className="shell-muted">
              Actions you take in this session appear here.
            </Text>
          ) : (
            notices
              .slice()
              .reverse()
              .map((notice) => (
                <div key={notice.id} className="shell-notify-row">
                  <span className="shell-notify-row-main">
                    <Text size={200} weight="semibold">
                      {notice.title}
                    </Text>
                    <Caption1 className="shell-muted">
                      {notice.message ?? notice.tone}
                    </Caption1>
                  </span>
                  <Button
                    size="small"
                    appearance="subtle"
                    onClick={() => dismissNotice(notice.id)}
                  >
                    Dismiss
                  </Button>
                </div>
              ))
          )}
        </div>
        <Divider />
        <div className="shell-notify-foot">
          <Button
            size="small"
            appearance="subtle"
            disabled={notices.length === 0}
            onClick={() =>
              notices.forEach((notice) => dismissNotice(notice.id))
            }
          >
            Clear activity
          </Button>
          <Button
            size="small"
            appearance="secondary"
            onClick={() => {
              navigate('/')
              setOpen(false)
              notify(
                'Workspace opened',
                'Home shows every queue for your persona.',
                'info',
              )
            }}
          >
            Open workspace
          </Button>
        </div>
      </PopoverSurface>
    </Popover>
  )
}
