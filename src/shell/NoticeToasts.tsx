import {
  Button,
  MessageBar,
  MessageBarActions,
  MessageBarBody,
  MessageBarTitle,
} from '@fluentui/react-components'
import { Dismiss16Regular } from '@fluentui/react-icons'
import { usePrototype } from '../core/PrototypeContext'

/** Bottom-right toast stack for notices raised by any module mutation. */
export function NoticeToasts() {
  const { notices, dismissNotice } = usePrototype()

  if (notices.length === 0) return null

  return (
    <div
      className="shell-toasts"
      role="region"
      aria-label="Recent activity toasts"
    >
      {notices
        .slice()
        .reverse()
        .map((notice) => (
          <MessageBar
            key={notice.id}
            intent={notice.tone}
            className="shell-toast"
            politeness="polite"
          >
            <MessageBarBody>
              <MessageBarTitle>{notice.title}</MessageBarTitle>
              {notice.message ? ` ${notice.message}` : null}
            </MessageBarBody>
            <MessageBarActions
              containerAction={
                <Button
                  appearance="transparent"
                  icon={<Dismiss16Regular />}
                  aria-label={`Dismiss notification: ${notice.title}`}
                  onClick={() => dismissNotice(notice.id)}
                />
              }
            />
          </MessageBar>
        ))}
      {notices.length > 1 ? (
        <div className="shell-toasts-footer">
          <Button
            size="small"
            appearance="subtle"
            onClick={() =>
              notices.forEach((notice) => dismissNotice(notice.id))
            }
          >
            Dismiss all {notices.length}
          </Button>
        </div>
      ) : null}
    </div>
  )
}
