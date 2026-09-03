import {
  Avatar,
  Button,
  Caption1,
  Text,
  Tooltip,
} from '@fluentui/react-components'
import { ChevronDown16Regular, ChevronUp16Regular } from '@fluentui/react-icons'
import { useState } from 'react'
import type { ReactNode } from 'react'
import EmptyState from './EmptyState'
import { formatDateTime, formatRelativeTime, initialsOf } from './format'

/** Structurally compatible with `ActivityEvent` from core/types. */
export interface TimelineEvent {
  id: string
  actor: string
  action: string
  detail: string
  at: string
}

export interface ActivityTimelineProps {
  events: TimelineEvent[]
  /** Number of events shown before the "Show all" toggle appears. */
  collapsedCount?: number
  /** Compact row spacing for side panes. */
  dense?: boolean
  emptyTitle?: string
  emptyDescription?: string
  /** Rendered to the right of each row, e.g. a copy button. */
  renderEventAction?: (event: TimelineEvent) => ReactNode
  /** Accessible label for the list. */
  ariaLabel?: string
}

export function ActivityTimeline({
  events,
  collapsedCount = 5,
  dense = false,
  emptyTitle = 'No activity yet',
  emptyDescription = 'Actions taken in this prototype are appended here with actor and timestamp.',
  renderEventAction,
  ariaLabel = 'Activity timeline',
}: ActivityTimelineProps) {
  const [expanded, setExpanded] = useState(false)

  if (events.length === 0) {
    return (
      <EmptyState
        variant="inline"
        title={emptyTitle}
        description={emptyDescription}
      />
    )
  }

  const hasOverflow = events.length > collapsedCount
  const visible = expanded ? events : events.slice(0, collapsedCount)

  return (
    <div className={`app-timeline${dense ? ' app-timeline--dense' : ''}`}>
      <ol className="app-timeline__list" aria-label={ariaLabel}>
        {visible.map((event) => (
          <li key={event.id} className="app-timeline__item">
            <div className="app-timeline__rail" aria-hidden="true">
              <Avatar
                size={dense ? 20 : 24}
                initials={initialsOf(event.actor)}
                color="colorful"
                name={event.actor}
              />
              <span className="app-timeline__line" />
            </div>
            <div className="app-timeline__body">
              <div className="app-timeline__head">
                <Text size={200} weight="semibold">
                  {event.action}
                </Text>
                <Tooltip
                  relationship="label"
                  withArrow
                  content={formatDateTime(event.at)}
                >
                  <Caption1 className="app-timeline__time" tabIndex={0}>
                    {formatRelativeTime(event.at)}
                  </Caption1>
                </Tooltip>
                {renderEventAction ? (
                  <span className="app-timeline__action">
                    {renderEventAction(event)}
                  </span>
                ) : null}
              </div>
              <Caption1 className="app-timeline__detail">
                {event.detail}
              </Caption1>
              <Caption1 className="app-timeline__actor">{event.actor}</Caption1>
            </div>
          </li>
        ))}
      </ol>
      {hasOverflow ? (
        <Button
          appearance="transparent"
          size="small"
          icon={expanded ? <ChevronUp16Regular /> : <ChevronDown16Regular />}
          onClick={() => setExpanded((current) => !current)}
        >
          {expanded ? 'Show fewer events' : `Show all ${events.length} events`}
        </Button>
      ) : null}
    </div>
  )
}

export default ActivityTimeline
