import { useEffect, useState, type ReactElement } from 'react'
import {
  Avatar,
  Badge,
  Button,
  Divider,
  Dropdown,
  Field,
  MessageBar,
  MessageBarBody,
  Option,
  Tab,
  TabList,
  Textarea,
  Tooltip,
} from '@fluentui/react-components'
import {
  ArrowExportRegular,
  CheckmarkCircleRegular,
  CopyRegular,
  DismissRegular,
  DocumentBulletListRegular,
  MailRegular,
  NoteAddRegular,
  PersonAddRegular,
  ShieldTaskRegular,
  WarningRegular,
} from '@fluentui/react-icons'
import type { KycCase } from '../../core/types'
import type { DecisionAction } from './DecisionDialog'
import {
  documentColor,
  formatAge,
  formatDateTime,
  riskColor,
  statusColor,
  type KycPermissions,
} from './kycUtils'

type PaneTab = 'profile' | 'documents' | 'notes' | 'activity'

interface CaseDetailPaneProps {
  kycCase: KycCase
  assignees: string[]
  currentUser: string
  permissions: KycPermissions
  onAssign: (assignee: string) => void
  onAddNote: (note: string) => void
  onVerifyDocument: (documentId: string) => void
  onRequestAction: (action: DecisionAction) => void
  onCopySummary: () => void
  onExportCase: () => void
  onClose: () => void
}

export function CaseDetailPane({
  kycCase,
  assignees,
  currentUser,
  permissions,
  onAssign,
  onAddNote,
  onVerifyDocument,
  onRequestAction,
  onCopySummary,
  onExportCase,
  onClose,
}: CaseDetailPaneProps) {
  const [tab, setTab] = useState<PaneTab>('profile')
  const [note, setNote] = useState('')
  const [noteTouched, setNoteTouched] = useState(false)

  useEffect(() => {
    setTab('profile')
    setNote('')
    setNoteTouched(false)
  }, [kycCase.id])

  const closed = kycCase.status === 'Approved' || kycCase.status === 'Rejected'
  const { canTriage, canDecide, reason: permissionReason } = permissions
  const pendingDocs = kycCase.documents.filter(
    (doc) => doc.status === 'Pending',
  ).length

  const triageBlocked = !canTriage
    ? permissionReason
    : closed
      ? `This case is ${kycCase.status.toLowerCase()}; reopen is not available in the prototype.`
      : ''
  const decisionBlocked = !canTriage
    ? permissionReason
    : !canDecide
      ? permissionReason
      : closed
        ? `A decision was already recorded (${kycCase.status}).`
        : ''

  const actionButton = (
    action: DecisionAction,
    label: string,
    icon: ReactElement,
    appearance: 'primary' | 'secondary' | 'outline',
    blocked: string,
  ) => (
    <Tooltip
      content={blocked || `${label} · records a reason in the audit trail`}
      relationship="label"
      withArrow
    >
      <Button
        appearance={appearance}
        icon={icon}
        size="small"
        disabledFocusable={blocked.length > 0}
        onClick={() => onRequestAction(action)}
      >
        {label}
      </Button>
    </Tooltip>
  )

  const noteInvalid = note.trim().length < 3

  return (
    <aside className="kyc-pane" aria-label={`Case detail for ${kycCase.id}`}>
      <header className="kyc-pane-header">
        <div className="kyc-pane-identity">
          <Avatar
            name={kycCase.customer}
            color="colorful"
            size={40}
            aria-hidden
          />
          <div>
            <h2 className="kyc-pane-title">{kycCase.customer}</h2>
            <p className="kyc-pane-subtitle">
              {kycCase.id} · {kycCase.type} · {kycCase.country}
            </p>
          </div>
        </div>
        <Button
          appearance="subtle"
          icon={<DismissRegular />}
          aria-label="Close case detail pane"
          onClick={onClose}
        />
      </header>

      <div className="kyc-pane-badges">
        <Badge appearance="filled" color={statusColor(kycCase.status)}>
          {kycCase.status}
        </Badge>
        <Badge appearance="outline" color={riskColor(kycCase.risk)}>
          {kycCase.risk} risk
        </Badge>
        <Badge appearance="tint" color="informative">
          Age {formatAge(kycCase.ageHours)}
        </Badge>
        <Badge
          appearance="tint"
          color={pendingDocs > 0 ? 'warning' : 'success'}
        >
          {pendingDocs > 0 ? `${pendingDocs} doc pending` : 'Docs complete'}
        </Badge>
      </div>

      {(triageBlocked || decisionBlocked) && (
        <MessageBar
          intent={closed ? 'info' : 'warning'}
          className="kyc-pane-permission"
        >
          <MessageBarBody>{triageBlocked || decisionBlocked}</MessageBarBody>
        </MessageBar>
      )}

      <div className="kyc-pane-actions">
        {actionButton(
          'Approve',
          'Approve',
          <CheckmarkCircleRegular />,
          'primary',
          decisionBlocked,
        )}
        {actionButton(
          'Reject',
          'Reject',
          <DismissRegular />,
          'secondary',
          decisionBlocked,
        )}
        {actionButton(
          'Escalate',
          'Escalate',
          <WarningRegular />,
          'secondary',
          triageBlocked,
        )}
        {actionButton(
          'Request information',
          'Request info',
          <MailRegular />,
          'secondary',
          triageBlocked,
        )}
        <Tooltip
          content="Copy a case summary to the clipboard"
          relationship="label"
          withArrow
        >
          <Button
            appearance="outline"
            size="small"
            icon={<CopyRegular />}
            onClick={onCopySummary}
          >
            Copy
          </Button>
        </Tooltip>
        <Tooltip
          content="Export this case as CSV"
          relationship="label"
          withArrow
        >
          <Button
            appearance="outline"
            size="small"
            icon={<ArrowExportRegular />}
            onClick={onExportCase}
          >
            Export
          </Button>
        </Tooltip>
      </div>

      <div className="kyc-pane-assign">
        <Field label="Assignee" className="kyc-pane-assign-field">
          <Dropdown
            value={kycCase.assignee}
            selectedOptions={[kycCase.assignee]}
            disabled={triageBlocked.length > 0}
            aria-label="Assign this case"
            onOptionSelect={(_, data) => {
              if (data.optionValue && data.optionValue !== kycCase.assignee) {
                onAssign(data.optionValue)
              }
            }}
          >
            {assignees.map((name) => (
              <Option key={name} value={name}>
                {name}
              </Option>
            ))}
          </Dropdown>
        </Field>
        <Tooltip
          content={triageBlocked || `Assign ${kycCase.id} to ${currentUser}`}
          relationship="label"
          withArrow
        >
          <Button
            icon={<PersonAddRegular />}
            appearance="outline"
            disabledFocusable={
              triageBlocked.length > 0 || kycCase.assignee === currentUser
            }
            onClick={() => onAssign(currentUser)}
          >
            Assign to me
          </Button>
        </Tooltip>
      </div>

      <TabList
        selectedValue={tab}
        onTabSelect={(_, data) => setTab(data.value as PaneTab)}
        size="small"
      >
        <Tab value="profile" icon={<ShieldTaskRegular />}>
          Profile &amp; risk
        </Tab>
        <Tab value="documents" icon={<DocumentBulletListRegular />}>
          Documents ({kycCase.documents.length})
        </Tab>
        <Tab value="notes" icon={<NoteAddRegular />}>
          Notes ({kycCase.notes.length})
        </Tab>
        <Tab value="activity">Activity ({kycCase.activity.length})</Tab>
      </TabList>

      <div className="kyc-pane-body" role="tabpanel" aria-label={tab}>
        {tab === 'profile' && (
          <section className="kyc-section">
            <h3 className="kyc-section-title">Customer profile</h3>
            <dl className="kyc-detail-grid">
              <div>
                <dt>Legal name</dt>
                <dd>{kycCase.customer}</dd>
              </div>
              <div>
                <dt>Email</dt>
                <dd>{kycCase.email}</dd>
              </div>
              <div>
                <dt>Country</dt>
                <dd>{kycCase.country}</dd>
              </div>
              <div>
                <dt>Customer type</dt>
                <dd>{kycCase.type}</dd>
              </div>
              <div>
                <dt>Created</dt>
                <dd>{formatDateTime(kycCase.createdAt)}</dd>
              </div>
              <div>
                <dt>Time in queue</dt>
                <dd>{formatAge(kycCase.ageHours)}</dd>
              </div>
            </dl>
            <Divider />
            <h3 className="kyc-section-title">
              Risk reasons ({kycCase.reasons.length})
            </h3>
            {kycCase.reasons.length === 0 ? (
              <p className="kyc-empty-inline">No risk signals recorded.</p>
            ) : (
              <ul className="kyc-reason-list">
                {kycCase.reasons.map((item) => (
                  <li key={item}>
                    <Badge
                      appearance="filled"
                      color={riskColor(kycCase.risk)}
                      size="extra-small"
                      aria-hidden
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {tab === 'documents' && (
          <section className="kyc-section">
            <h3 className="kyc-section-title">Submitted documents</h3>
            {kycCase.documents.length === 0 ? (
              <p className="kyc-empty-inline">
                No documents submitted yet. Use “Request info” to ask the
                customer for evidence.
              </p>
            ) : (
              <ul className="kyc-doc-list">
                {kycCase.documents.map((doc) => {
                  const verifyBlocked = triageBlocked
                    ? triageBlocked
                    : doc.status === 'Verified'
                      ? 'This document is already verified.'
                      : ''
                  return (
                    <li key={doc.id} className="kyc-doc-row">
                      <div className="kyc-doc-meta">
                        <span className="kyc-doc-type">{doc.type}</span>
                        <span className="kyc-doc-sub">
                          {doc.number} · expires {doc.expires}
                        </span>
                      </div>
                      <Badge
                        appearance="tint"
                        color={documentColor(doc.status)}
                      >
                        {doc.status}
                      </Badge>
                      <Tooltip
                        content={
                          verifyBlocked ||
                          `Mark ${doc.type} as verified and log it in the audit trail`
                        }
                        relationship="label"
                        withArrow
                      >
                        <Button
                          size="small"
                          appearance="outline"
                          icon={<CheckmarkCircleRegular />}
                          disabledFocusable={verifyBlocked.length > 0}
                          onClick={() => onVerifyDocument(doc.id)}
                        >
                          Verify
                        </Button>
                      </Tooltip>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        )}

        {tab === 'notes' && (
          <section className="kyc-section">
            <h3 className="kyc-section-title">Internal notes</h3>
            <Field
              label="Add a note"
              required
              validationState={noteTouched && noteInvalid ? 'error' : 'none'}
              validationMessage={
                noteTouched && noteInvalid
                  ? 'Notes need at least 3 characters.'
                  : undefined
              }
            >
              <Textarea
                value={note}
                resize="vertical"
                disabled={triageBlocked.length > 0}
                placeholder="Notes are visible to the compliance team only."
                onChange={(_, data) => setNote(data.value)}
                onBlur={() => setNoteTouched(true)}
              />
            </Field>
            <div className="kyc-note-actions">
              <Tooltip
                content={
                  triageBlocked || 'Append this note to the case timeline'
                }
                relationship="label"
                withArrow
              >
                <Button
                  appearance="primary"
                  size="small"
                  icon={<NoteAddRegular />}
                  disabledFocusable={triageBlocked.length > 0 || noteInvalid}
                  onClick={() => {
                    if (noteInvalid) {
                      setNoteTouched(true)
                      return
                    }
                    onAddNote(note.trim())
                    setNote('')
                    setNoteTouched(false)
                  }}
                >
                  Add note
                </Button>
              </Tooltip>
              <Button
                appearance="subtle"
                size="small"
                disabled={note.length === 0}
                onClick={() => {
                  setNote('')
                  setNoteTouched(false)
                }}
              >
                Clear
              </Button>
            </div>
            {kycCase.notes.length === 0 ? (
              <p className="kyc-empty-inline">
                No notes yet. The first note will appear here and in the
                activity timeline.
              </p>
            ) : (
              <ul className="kyc-note-list">
                {kycCase.notes.map((item, index) => (
                  <li key={`${kycCase.id}-note-${index}`}>{item}</li>
                ))}
              </ul>
            )}
          </section>
        )}

        {tab === 'activity' && (
          <section className="kyc-section">
            <h3 className="kyc-section-title">Audit trail</h3>
            {kycCase.activity.length === 0 ? (
              <p className="kyc-empty-inline">No activity recorded yet.</p>
            ) : (
              <ol className="kyc-timeline">
                {kycCase.activity.map((item) => (
                  <li key={item.id}>
                    <div className="kyc-timeline-head">
                      <span className="kyc-timeline-action">{item.action}</span>
                      <span className="kyc-timeline-at">
                        {formatDateTime(item.at)}
                      </span>
                    </div>
                    <p className="kyc-timeline-detail">{item.detail}</p>
                    <span className="kyc-timeline-actor">{item.actor}</span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        )}
      </div>
    </aside>
  )
}
