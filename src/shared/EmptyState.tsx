import { Button, Caption1, Text } from '@fluentui/react-components'
import { DocumentSearch24Regular } from '@fluentui/react-icons'
import type { ReactElement, ReactNode } from 'react'

export interface EmptyStateAction {
  label: string
  onClick: () => void
  /** Fluent icon element, e.g. `<Add16Regular />`. */
  icon?: ReactElement
}

export interface EmptyStateProps {
  title: string
  description?: ReactNode
  /** Defaults to a document-search glyph. */
  icon?: ReactNode
  /** Primary recovery action, e.g. `Clear filters`. */
  primaryAction?: EmptyStateAction
  secondaryAction?: EmptyStateAction
  /** `inline` fits inside a table body; `panel` is used for full pages. */
  variant?: 'inline' | 'panel'
  /** Extra content such as a list of active filters. */
  children?: ReactNode
}

export function EmptyState({
  title,
  description,
  icon,
  primaryAction,
  secondaryAction,
  variant = 'panel',
  children,
}: EmptyStateProps) {
  return (
    <div
      className={`app-empty app-empty--${variant}`}
      role="status"
      aria-live="polite"
    >
      <span className="app-empty__icon" aria-hidden="true">
        {icon ?? <DocumentSearch24Regular />}
      </span>
      <Text as="p" size={400} weight="semibold" className="app-empty__title">
        {title}
      </Text>
      {description ? (
        <Caption1 className="app-empty__description">{description}</Caption1>
      ) : null}
      {children ? <div className="app-empty__extra">{children}</div> : null}
      {primaryAction || secondaryAction ? (
        <div className="app-empty__actions">
          {primaryAction ? (
            <Button
              appearance="primary"
              size="small"
              icon={primaryAction.icon}
              onClick={primaryAction.onClick}
            >
              {primaryAction.label}
            </Button>
          ) : null}
          {secondaryAction ? (
            <Button
              appearance="secondary"
              size="small"
              icon={secondaryAction.icon}
              onClick={secondaryAction.onClick}
            >
              {secondaryAction.label}
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

export default EmptyState
