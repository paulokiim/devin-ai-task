import { Button, Caption1, Text, Tooltip } from '@fluentui/react-components'
import {
  ArrowDown16Regular,
  ArrowUp16Regular,
  Subtract16Regular,
} from '@fluentui/react-icons'
import type { ReactNode } from 'react'
import type { Tone } from '../core/types'

export type MetricTone = Tone | 'neutral'

export interface MetricCardProps {
  label: string
  value: ReactNode
  /** Small caption under the value, e.g. `4 breach SLA in 2h`. */
  hint?: ReactNode
  /** Colours the accent bar and value. */
  tone?: MetricTone
  /** Leading icon, typically a 20px Fluent icon. */
  icon?: ReactNode
  /** Signed delta versus the previous period, e.g. `-12%`. */
  delta?: { direction: 'up' | 'down' | 'flat'; label: string; good?: boolean }
  /**
   * Makes the whole card an accessible button (used for drill-down filtering).
   * Always pair with a real handler - the card is inert without one.
   */
  onClick?: () => void
  /** Aria label used when the card is interactive. */
  actionHint?: string
  /** Secondary inline action rendered in the card footer. */
  action?: { label: string; onClick: () => void }
  /** Marks the card as the currently applied filter. */
  selected?: boolean
}

const deltaIcon = {
  up: <ArrowUp16Regular />,
  down: <ArrowDown16Regular />,
  flat: <Subtract16Regular />,
} as const

export function MetricCard({
  label,
  value,
  hint,
  tone = 'neutral',
  icon,
  delta,
  onClick,
  actionHint,
  action,
  selected = false,
}: MetricCardProps) {
  const deltaClass = delta
    ? delta.good === undefined
      ? 'app-metric__delta'
      : `app-metric__delta app-metric__delta--${delta.good ? 'good' : 'bad'}`
    : undefined

  const body = (
    <>
      <div className="app-metric__top">
        {icon ? <span className="app-metric__icon">{icon}</span> : null}
        <Caption1 className="app-metric__label">{label}</Caption1>
      </div>
      <div className="app-metric__value-row">
        <Text
          as="span"
          size={700}
          weight="semibold"
          className="app-metric__value"
        >
          {value}
        </Text>
        {delta ? (
          <span className={deltaClass}>
            {deltaIcon[delta.direction]}
            <Caption1>{delta.label}</Caption1>
          </span>
        ) : null}
      </div>
      {hint ? <Caption1 className="app-metric__hint">{hint}</Caption1> : null}
    </>
  )

  const className = [
    'app-metric',
    `app-metric--${tone}`,
    selected ? 'app-metric--selected' : '',
    onClick ? 'app-metric--interactive' : '',
  ]
    .filter(Boolean)
    .join(' ')

  if (onClick) {
    const card = (
      <button
        type="button"
        className={className}
        onClick={onClick}
        aria-pressed={selected}
      >
        {body}
      </button>
    )
    return actionHint ? (
      <Tooltip relationship="description" content={actionHint} withArrow>
        {card}
      </Tooltip>
    ) : (
      card
    )
  }

  return (
    <div className={className}>
      {body}
      {action ? (
        <div className="app-metric__footer">
          <Button
            appearance="transparent"
            size="small"
            onClick={action.onClick}
          >
            {action.label}
          </Button>
        </div>
      ) : null}
    </div>
  )
}

export default MetricCard
