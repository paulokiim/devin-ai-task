import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Badge,
  Button,
  Caption1,
  Divider,
  Text,
  Title3,
  Tooltip,
} from '@fluentui/react-components'
import {
  ArrowClockwise20Regular,
  ChevronRight16Regular,
  Copy20Regular,
  Flag20Regular,
  Money20Regular,
  Settings20Regular,
  ShieldTask20Regular,
  type FluentIcon,
} from '@fluentui/react-icons'
import { usePrototype } from '../core/PrototypeContext'
import type { ActivityEvent } from '../core/types'
import { useWorkCounts } from './useWorkCounts'

interface TileStat {
  label: string
  value: string
}

interface Tile {
  key: string
  name: string
  description: string
  path: string
  icon: FluentIcon
  stats: TileStat[]
  accent: 'kyc' | 'refunds' | 'flags' | 'settings'
}

interface TimelineRow extends ActivityEvent {
  source: string
  path: string
}

const relative = (iso: string): string => {
  const minutes = Math.max(
    0,
    Math.round((Date.now() - new Date(iso).getTime()) / 60_000),
  )
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.round(hours / 24)}d ago`
}

const money = (amount: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount)

/** Workspace landing page: live app tiles, role-aware work counts, activity. */
export function HomePage() {
  const navigate = useNavigate()
  const { persona, kycCases, refunds, flags, lastUpdated, refresh, notify } =
    usePrototype()
  const { counts, primaryWork } = useWorkCounts()

  const tiles = useMemo<Tile[]>(() => {
    const refundValue = refunds
      .filter((item) => item.status === 'Pending approval')
      .reduce((total, item) => total + item.amount, 0)
    return [
      {
        key: 'kyc',
        name: 'KYC review',
        description:
          'Work the onboarding queue, verify documents, decide cases.',
        path: '/kyc',
        icon: ShieldTask20Regular,
        accent: 'kyc',
        stats: [
          { label: 'Open cases', value: String(counts.kycOpen) },
          { label: 'Escalated', value: String(counts.kycEscalated) },
          { label: 'Total records', value: String(kycCases.length) },
        ],
      },
      {
        key: 'refunds',
        name: 'Refunds',
        description: 'Raise refunds, approve as checker, retry failures.',
        path: '/refunds',
        icon: Money20Regular,
        accent: 'refunds',
        stats: [
          {
            label: 'Awaiting approval',
            value: String(counts.refundsPendingApproval),
          },
          { label: 'Pending value', value: money(refundValue) },
          { label: 'Failed', value: String(counts.refundsFailed) },
        ],
      },
      {
        key: 'flags',
        name: 'Feature flags',
        description: 'Control rollouts per environment with approvals.',
        path: '/flags',
        icon: Flag20Regular,
        accent: 'flags',
        stats: [
          {
            label: 'Live in prod',
            value: String(counts.flagsLiveInProduction),
          },
          {
            label: 'Change requests',
            value: String(counts.flagsPendingApproval),
          },
          { label: 'Kill switches', value: String(counts.flagsKilled) },
        ],
      },
      {
        key: 'settings',
        name: 'Settings & demo data',
        description: 'Persona, theme, refresh and reset the mocked dataset.',
        path: '/settings',
        icon: Settings20Regular,
        accent: 'settings',
        stats: [
          { label: 'Persona', value: persona.name.split(' ')[0] },
          { label: 'Flags', value: String(flags.length) },
          { label: 'Refunds', value: String(refunds.length) },
        ],
      },
    ]
  }, [counts, flags.length, kycCases.length, persona.name, refunds])

  const timeline = useMemo<TimelineRow[]>(() => {
    const rows: TimelineRow[] = [
      ...kycCases.flatMap((item) =>
        item.activity.map((entry) => ({
          ...entry,
          source: item.id,
          path: `/kyc?case=${encodeURIComponent(item.id)}`,
        })),
      ),
      ...refunds.flatMap((item) =>
        item.activity.map((entry) => ({
          ...entry,
          source: item.id,
          path: `/refunds?refund=${encodeURIComponent(item.id)}`,
        })),
      ),
      ...flags.flatMap((item) =>
        item.activity.map((entry) => ({
          ...entry,
          source: item.key,
          path: `/flags?flag=${encodeURIComponent(item.key)}`,
        })),
      ),
    ]
    return rows
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
      .slice(0, 7)
  }, [flags, kycCases, refunds])

  const copySummary = () => {
    const lines = [
      `Internal Tools Hub — shift summary for ${persona.name} (${persona.role})`,
      `Open KYC cases: ${counts.kycOpen} (escalated ${counts.kycEscalated}, yours ${counts.kycMine})`,
      `Refunds awaiting approval: ${counts.refundsPendingApproval}, failed ${counts.refundsFailed}`,
      `Flag change requests: ${counts.flagsPendingApproval}, kill switches ${counts.flagsKilled}`,
      `Snapshot taken ${new Date().toLocaleString()} — mocked data only`,
    ].join('\n')
    void navigator.clipboard?.writeText(lines).then(
      () =>
        notify('Summary copied', 'Shift summary is on your clipboard.', 'info'),
      () =>
        notify(
          'Copy blocked',
          'The browser denied clipboard access.',
          'warning',
        ),
    )
  }

  return (
    <div className="shell-page">
      <div className="shell-page-head">
        <div>
          <Title3 as="h1">Welcome back, {persona.name.split(' ')[0]}</Title3>
          <Caption1 className="shell-muted">
            {persona.role} · {persona.team} team · data refreshed{' '}
            {relative(lastUpdated)}
          </Caption1>
        </div>
        <div className="shell-page-head-actions">
          <Button
            appearance="secondary"
            icon={<Copy20Regular />}
            onClick={copySummary}
          >
            Copy shift summary
          </Button>
          <Button
            appearance="primary"
            icon={<ArrowClockwise20Regular />}
            onClick={refresh}
          >
            Refresh data
          </Button>
        </div>
      </div>

      <section aria-labelledby="shell-work-heading" className="shell-section">
        <div className="shell-section-head">
          <Text id="shell-work-heading" as="h2" weight="semibold">
            Your work right now
          </Text>
          <Badge appearance="tint" color="informative" size="small">
            Tailored to {persona.team}
          </Badge>
        </div>
        <div className="shell-work-grid">
          {primaryWork.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`shell-work-card shell-work-${item.emphasis}`}
              onClick={() => navigate(item.path)}
            >
              <span className="shell-work-value">{item.value}</span>
              <span className="shell-work-label">{item.label}</span>
              <Caption1 className="shell-muted">{item.hint}</Caption1>
              <span className="shell-work-cta">
                Open <ChevronRight16Regular />
              </span>
            </button>
          ))}
        </div>
      </section>

      <section aria-labelledby="shell-apps-heading" className="shell-section">
        <div className="shell-section-head">
          <Text id="shell-apps-heading" as="h2" weight="semibold">
            Apps
          </Text>
          <Caption1 className="shell-muted">
            Tiles show live counts from the mocked dataset
          </Caption1>
        </div>
        <div className="shell-tile-grid">
          {tiles.map((tile) => {
            const Icon = tile.icon
            return (
              <article
                key={tile.key}
                className={`shell-tile shell-tile-${tile.accent}`}
              >
                <div className="shell-tile-head">
                  <span className="shell-tile-icon">
                    <Icon />
                  </span>
                  <span>
                    <Text weight="semibold">{tile.name}</Text>
                    <Caption1 className="shell-muted shell-tile-desc">
                      {tile.description}
                    </Caption1>
                  </span>
                </div>
                <dl className="shell-tile-stats">
                  {tile.stats.map((stat) => (
                    <div key={stat.label}>
                      <dt>{stat.label}</dt>
                      <dd>{stat.value}</dd>
                    </div>
                  ))}
                </dl>
                <Divider />
                <div className="shell-tile-actions">
                  <Button
                    appearance="primary"
                    size="small"
                    onClick={() => navigate(tile.path)}
                  >
                    Open {tile.name}
                  </Button>
                  <Tooltip
                    content={`Copy link to ${tile.name}`}
                    relationship="label"
                  >
                    <Button
                      appearance="subtle"
                      size="small"
                      icon={<Copy20Regular />}
                      aria-label={`Copy link to ${tile.name}`}
                      onClick={() => {
                        void navigator.clipboard
                          ?.writeText(`${window.location.origin}${tile.path}`)
                          .then(
                            () =>
                              notify(
                                'Link copied',
                                `${tile.name} deep link is on your clipboard.`,
                                'info',
                              ),
                            () =>
                              notify(
                                'Copy blocked',
                                'The browser denied clipboard access.',
                                'warning',
                              ),
                          )
                      }}
                    />
                  </Tooltip>
                </div>
              </article>
            )
          })}
        </div>
      </section>

      <section
        aria-labelledby="shell-activity-heading"
        className="shell-section"
      >
        <div className="shell-section-head">
          <Text id="shell-activity-heading" as="h2" weight="semibold">
            Latest activity
          </Text>
          <Caption1 className="shell-muted">
            {timeline.length} most recent events
          </Caption1>
        </div>
        <ul className="shell-activity-list">
          {timeline.map((row) => (
            <li key={`${row.source}-${row.id}`} className="shell-activity-row">
              <span className="shell-activity-main">
                <Text size={200} weight="semibold">
                  {row.action}
                </Text>
                <Caption1 className="shell-muted">
                  {row.source} · {row.actor} · {row.detail}
                </Caption1>
              </span>
              <Caption1 className="shell-muted shell-activity-time">
                {relative(row.at)}
              </Caption1>
              <Button
                size="small"
                appearance="subtle"
                onClick={() => navigate(row.path)}
              >
                Open record
              </Button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
