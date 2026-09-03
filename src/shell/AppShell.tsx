import { useEffect, useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Avatar,
  Badge,
  Button,
  Caption1,
  CounterBadge,
  Divider,
  FluentProvider,
  Menu,
  MenuDivider,
  MenuItem,
  MenuItemRadio,
  MenuList,
  MenuPopover,
  MenuTrigger,
  Text,
  Tooltip,
  webDarkTheme,
  webLightTheme,
} from '@fluentui/react-components'
import {
  Grid20Filled,
  PanelLeftContract20Regular,
  PanelLeftExpand20Regular,
  QuestionCircle20Regular,
  Settings20Regular,
  Warning20Filled,
  WeatherMoon20Regular,
  WeatherSunny20Regular,
} from '@fluentui/react-icons'
import { usePrototype } from '../core/PrototypeContext'
import type { PersonaId } from '../core/types'
import { GlobalSearch } from './GlobalSearch'
import { HelpDialog } from './HelpDialog'
import { NoticeToasts } from './NoticeToasts'
import { NotificationsPopover } from './NotificationsPopover'
import { isNavItemActive, navItems } from './navItems'
import { useWorkCounts } from './useWorkCounts'
import './shell.css'

const NAV_STORAGE_KEY = 'internal-tools-hub:shell:nav-collapsed'

const readCollapsed = (): boolean =>
  window.localStorage.getItem(NAV_STORAGE_KEY) === 'true'

/**
 * Power Apps-familiar application shell: command bar on top, collapsible
 * left navigation, global search, persona switching and notice toasts.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const {
    persona,
    personas,
    setPersona,
    theme,
    toggleTheme,
    notify,
    lastUpdated,
  } = usePrototype()
  const [collapsed, setCollapsed] = useState<boolean>(readCollapsed)
  const [helpOpen, setHelpOpen] = useState(false)
  const [warningOpen, setWarningOpen] = useState(true)
  const location = useLocation()
  const navigate = useNavigate()
  const { badgeFor } = useWorkCounts()

  useEffect(() => {
    window.localStorage.setItem(NAV_STORAGE_KEY, String(collapsed))
  }, [collapsed])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === '\\' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault()
        setCollapsed((current) => !current)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  const activeItem =
    navItems.find((item) => isNavItemActive(item, location.pathname)) ??
    navItems[0]

  return (
    <FluentProvider theme={theme === 'dark' ? webDarkTheme : webLightTheme}>
      <div className="shell-root" data-theme={theme}>
        <a className="shell-skip-link" href="#shell-main">
          Skip to main content
        </a>
        <header className="shell-topbar">
          <div className="shell-topbar-left">
            <Tooltip
              content={
                collapsed
                  ? 'Expand navigation (Ctrl + \\)'
                  : 'Collapse navigation (Ctrl + \\)'
              }
              relationship="label"
            >
              <Button
                appearance="subtle"
                className="shell-topbar-button"
                aria-expanded={!collapsed}
                aria-controls="shell-nav"
                icon={
                  collapsed ? (
                    <PanelLeftExpand20Regular />
                  ) : (
                    <PanelLeftContract20Regular />
                  )
                }
                aria-label={
                  collapsed ? 'Expand navigation' : 'Collapse navigation'
                }
                onClick={() => setCollapsed((current) => !current)}
              />
            </Tooltip>
            <button
              type="button"
              className="shell-brand"
              onClick={() => navigate('/')}
              aria-label="Internal Tools Hub, go to home"
            >
              <Grid20Filled className="shell-brand-icon" />
              <span className="shell-brand-text">
                <Text weight="semibold" size={300}>
                  Internal Tools Hub
                </Text>
                <Caption1 className="shell-muted">{activeItem.label}</Caption1>
              </span>
            </button>
          </div>

          <GlobalSearch />

          <div className="shell-topbar-right">
            <Badge
              appearance="outline"
              color="informative"
              size="medium"
              className="shell-mock-badge"
            >
              Mocked data
            </Badge>
            <NotificationsPopover />
            <Tooltip
              content={
                theme === 'dark'
                  ? 'Switch to light theme'
                  : 'Switch to dark theme'
              }
              relationship="label"
            >
              <Button
                appearance="subtle"
                className="shell-topbar-button"
                icon={
                  theme === 'dark' ? (
                    <WeatherSunny20Regular />
                  ) : (
                    <WeatherMoon20Regular />
                  )
                }
                aria-label={
                  theme === 'dark'
                    ? 'Switch to light theme'
                    : 'Switch to dark theme'
                }
                onClick={toggleTheme}
              />
            </Tooltip>
            <Tooltip content="Help and prototype guide" relationship="label">
              <Button
                appearance="subtle"
                className="shell-topbar-button"
                icon={<QuestionCircle20Regular />}
                aria-label="Open help and prototype guide"
                onClick={() => setHelpOpen(true)}
              />
            </Tooltip>
            <Tooltip content="Settings" relationship="label">
              <Button
                appearance="subtle"
                className="shell-topbar-button"
                icon={<Settings20Regular />}
                aria-label="Open settings"
                onClick={() => navigate('/settings')}
              />
            </Tooltip>
            <Menu
              checkedValues={{ persona: [persona.id] }}
              onCheckedValueChange={(_event, data) => {
                const nextId = data.checkedItems[0] as PersonaId | undefined
                if (!nextId || nextId === persona.id) return
                setPersona(nextId)
                const next = personas.find((item) => item.id === nextId)
                notify(
                  'Persona switched',
                  next ? `You are now ${next.name}, ${next.role}.` : undefined,
                  'info',
                )
              }}
            >
              <MenuTrigger disableButtonEnhancement>
                <button type="button" className="shell-persona-trigger">
                  <Avatar
                    name={persona.name}
                    initials={persona.initials}
                    size={28}
                    color="colorful"
                    aria-hidden
                  />
                  <span className="shell-persona-text">
                    <Text size={200} weight="semibold">
                      {persona.name}
                    </Text>
                    <Caption1 className="shell-muted">{persona.role}</Caption1>
                  </span>
                </button>
              </MenuTrigger>
              <MenuPopover>
                <MenuList>
                  {personas.map((item) => (
                    <MenuItemRadio key={item.id} name="persona" value={item.id}>
                      <span className="shell-persona-option">
                        <Text size={200} weight="semibold">
                          {item.name}
                        </Text>
                        <Caption1 className="shell-muted">
                          {item.role} · {item.team}
                        </Caption1>
                      </span>
                    </MenuItemRadio>
                  ))}
                  <MenuDivider />
                  <MenuItem
                    icon={<Settings20Regular />}
                    onClick={() => navigate('/settings')}
                  >
                    Manage persona in settings
                  </MenuItem>
                </MenuList>
              </MenuPopover>
            </Menu>
          </div>
        </header>

        <div className="shell-body">
          <nav
            id="shell-nav"
            className={
              collapsed ? 'shell-nav shell-nav-collapsed' : 'shell-nav'
            }
            aria-label="Primary"
          >
            <ul className="shell-nav-list">
              {navItems.map((item) => {
                const active = isNavItemActive(item, location.pathname)
                const badge = badgeFor(item.key)
                const Icon = item.icon
                return (
                  <li key={item.key}>
                    <Tooltip
                      content={`${item.label} — ${item.description}`}
                      relationship="label"
                      positioning="after"
                    >
                      <button
                        type="button"
                        className={
                          active
                            ? 'shell-nav-item shell-nav-item-active'
                            : 'shell-nav-item'
                        }
                        aria-current={active ? 'page' : undefined}
                        onClick={() => navigate(item.path)}
                      >
                        <span className="shell-nav-rail" aria-hidden />
                        <Icon className="shell-nav-icon" />
                        {collapsed ? null : (
                          <span className="shell-nav-label">{item.label}</span>
                        )}
                        {badge > 0 ? (
                          <CounterBadge
                            className="shell-nav-badge"
                            count={badge}
                            size="small"
                            color="informative"
                            aria-label={`${badge} item${badge === 1 ? '' : 's'} needing attention`}
                          />
                        ) : null}
                      </button>
                    </Tooltip>
                  </li>
                )
              })}
            </ul>
            <Divider />
            <div className="shell-nav-foot">
              {collapsed ? null : (
                <Caption1 className="shell-muted">
                  Data refreshed{' '}
                  {new Date(lastUpdated).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Caption1>
              )}
              <Button
                size="small"
                appearance="subtle"
                icon={collapsed ? <PanelLeftExpand20Regular /> : undefined}
                onClick={() => setCollapsed((current) => !current)}
                aria-label={
                  collapsed ? 'Expand navigation' : 'Collapse navigation'
                }
              >
                {collapsed ? '' : 'Collapse'}
              </Button>
            </div>
          </nav>

          <main id="shell-main" className="shell-main" tabIndex={-1}>
            {warningOpen ? (
              <div className="shell-demo-warning" role="status">
                <Warning20Filled className="shell-demo-warning-icon" />
                <span className="shell-demo-warning-text">
                  <Text size={200} weight="semibold">
                    Demo environment — mocked data only
                  </Text>
                  <Caption1 className="shell-muted">
                    Nothing you do here affects real customers, payments or
                    production flags. Records live in this browser and can be
                    reset from Settings.
                  </Caption1>
                </span>
                <Button
                  size="small"
                  appearance="subtle"
                  onClick={() => setHelpOpen(true)}
                >
                  What is mocked?
                </Button>
                <Button
                  size="small"
                  appearance="subtle"
                  onClick={() => navigate('/settings')}
                >
                  Reset options
                </Button>
                <Button
                  size="small"
                  appearance="transparent"
                  onClick={() => {
                    setWarningOpen(false)
                    notify(
                      'Demo banner hidden',
                      'Reopen it from Settings if you need the reminder.',
                      'info',
                    )
                  }}
                >
                  Hide
                </Button>
              </div>
            ) : (
              <div className="shell-demo-warning shell-demo-warning-collapsed">
                <Caption1 className="shell-muted">
                  Demo environment — mocked data only.
                </Caption1>
                <Button
                  size="small"
                  appearance="transparent"
                  onClick={() => setWarningOpen(true)}
                >
                  Show details
                </Button>
              </div>
            )}
            <div className="shell-content">{children}</div>
          </main>
        </div>

        <HelpDialog open={helpOpen} onOpenChange={setHelpOpen} />
        <NoticeToasts />
      </div>
    </FluentProvider>
  )
}
