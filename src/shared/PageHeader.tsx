import {
  Breadcrumb,
  BreadcrumbButton,
  BreadcrumbDivider,
  BreadcrumbItem,
  Caption1,
  Text,
} from '@fluentui/react-components'
import { Fragment } from 'react'
import type { ReactNode } from 'react'

export interface PageHeaderCrumb {
  key: string
  label: string
  /** Omit for the current (last) crumb so it renders as plain text. */
  onClick?: () => void
}

export interface PageHeaderMetaItem {
  key: string
  label: string
  value: ReactNode
}

export interface PageHeaderProps {
  title: string
  subtitle?: ReactNode
  /** Right-aligned action slot: buttons, menus, toolbars. */
  actions?: ReactNode
  /** Rendered next to the title, e.g. a StatusBadge or count badge. */
  titleAdornment?: ReactNode
  breadcrumbs?: PageHeaderCrumb[]
  /** Dense label/value pairs shown under the subtitle (owner, SLA, updated). */
  meta?: PageHeaderMetaItem[]
  /** Filters / tabs row rendered below the header block. */
  children?: ReactNode
  /** Removes the bottom divider when the header sits inside a card. */
  bare?: boolean
}

export function PageHeader({
  title,
  subtitle,
  actions,
  titleAdornment,
  breadcrumbs,
  meta,
  children,
  bare = false,
}: PageHeaderProps) {
  return (
    <header
      className={`app-page-header${bare ? ' app-page-header--bare' : ''}`}
    >
      {breadcrumbs && breadcrumbs.length > 0 ? (
        <Breadcrumb size="small" aria-label="Breadcrumb">
          {breadcrumbs.map((crumb, index) => {
            const isLast = index === breadcrumbs.length - 1
            return (
              <Fragment key={crumb.key}>
                <BreadcrumbItem>
                  <BreadcrumbButton
                    current={isLast}
                    onClick={crumb.onClick}
                    disabled={!crumb.onClick && !isLast}
                  >
                    {crumb.label}
                  </BreadcrumbButton>
                </BreadcrumbItem>
                {!isLast ? <BreadcrumbDivider /> : null}
              </Fragment>
            )
          })}
        </Breadcrumb>
      ) : null}

      <div className="app-page-header__row">
        <div className="app-page-header__text">
          <div className="app-page-header__title">
            <Text as="h1" size={600} weight="semibold">
              {title}
            </Text>
            {titleAdornment}
          </div>
          {subtitle ? (
            <Text as="p" size={200} className="app-page-header__subtitle">
              {subtitle}
            </Text>
          ) : null}
        </div>
        {actions ? (
          <div className="app-page-header__actions">{actions}</div>
        ) : null}
      </div>

      {meta && meta.length > 0 ? (
        <dl className="app-page-header__meta">
          {meta.map((item) => (
            <div key={item.key} className="app-page-header__meta-item">
              <dt className="app-page-header__meta-label">
                <Caption1>{item.label}</Caption1>
              </dt>
              <dd className="app-page-header__meta-value">{item.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {children ? (
        <div className="app-page-header__toolbar">{children}</div>
      ) : null}
    </header>
  )
}

export default PageHeader
