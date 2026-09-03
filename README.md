# Internal Tools Hub

A working, browser-based prototype of three fintech operations tools that
currently run in Microsoft Power Apps:

- KYC review queue
- Refund operations dashboard
- Feature-flag administration

The interface uses Fluent UI and familiar Power Apps patterns—persistent
navigation, command bars, filters, dense tables, detail panes, dialogs, and
explicit feedback—while improving cross-app navigation and consistency.

## Important boundary

All people, payments, documents, decisions, and production controls are
synthetic. The prototype does not connect to an identity provider, payment
processor, KYC vendor, database, or production feature-flag service. It is not
a compliance system.

## Run locally

Requirements:

- Node.js 22
- pnpm 10.15.1

```bash
pnpm install
pnpm dev
```

Vite prints the local URL. State persists in browser local storage.

## Demo personas

Use the persona menu in the top bar to demonstrate role-specific behavior:

- Priya Shah — KYC Analyst
- Marcus Reed — KYC Compliance Lead
- Dana Brooks — Support Operations
- Luis Ortega — Finance Approver
- Sam Chen — Platform Engineer
- Aisha Khan — Release Manager

KYC high-risk decisions, refund maker-checker controls, and protected
production flag changes are intentionally role-gated.

## Demo flows

### KYC

Filter and search the queue, assign a case, verify mock documents, add notes,
request customer information, escalate, approve, reject, and export CSV.

### Refunds

Review operational metrics, create a validated refund request, approve or
reject as a checker, retry a failed refund, cancel eligible requests, inspect
reconciliation, and export CSV.

### Feature flags

Filter by environment and status, create flags, toggle non-production states,
request and approve protected production changes, edit rollout percentage,
copy keys, archive or restore flags, and use the typed-confirmation kill switch.

Settings can refresh timestamps or reset every record to the seeded dataset.

## Quality commands

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm e2e
pnpm format:check
```

The Playwright suite starts Vite automatically and checks navigation, a
role-gated workflow entry, and WCAG A/AA violations on the home screen.

## Architecture

- React, TypeScript, Vite
- Fluent UI React v9
- React Router
- Local context plus local-storage persistence
- Vitest and Testing Library
- Playwright and axe

Domain data and mutations live behind `PrototypeContext`. This keeps screen
components independent of storage and provides a straightforward seam for a
future authenticated API, database, audit log, and policy-enforcement layer.
