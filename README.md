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

## Local setup

### Prerequisites

- [Git](https://git-scm.com/downloads)
- [Node.js 22 LTS](https://nodejs.org/) (the version used by CI)
- npm 10 or newer (included with Node.js 22)

No environment variables, API keys, database, Docker services, or external
accounts are required.

Verify the installed versions:

```console
node --version
npm --version
```

The repository includes `.nvmrc`, so macOS/Linux users with
[nvm](https://github.com/nvm-sh/nvm) can run `nvm install && nvm use`.

### Clone and start

```console
git clone https://github.com/paulokiim/devin-ai-task.git
cd devin-ai-task
npm ci
npm start
```

Open [http://localhost:5173](http://localhost:5173). Keep the terminal running
while using the prototype and press `Ctrl+C` to stop it. If port 5173 is
already occupied, Vite prints the replacement URL in the terminal.

`npm ci` installs the exact versions in `package-lock.json` and also installs
the repository's pre-commit hook. npm is the authoritative package manager for
this repository.

### Local data

All data is generated from deterministic synthetic fixtures. Changes are
stored only in the current browser's local storage under
`internal-tools-hub:demo:v1`; no information is sent to a server.

To restore the original records, persona, and theme, open **Settings** and
select **Reset demo**. Clearing site data for `localhost:5173` has the same
effect.

## Production-style local build

Build and serve the optimized static bundle:

```console
npm run build
npm run preview
```

Open [http://localhost:4173](http://localhost:4173). The generated files are
written to `dist/`. This preview is for local review, not a production
deployment.

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

## Tests and quality checks

Run the code checks:

```console
npm run lint
npm run typecheck
npm test
npm run build
npm run format:check
```

Before the first browser-test run, install Playwright's Chromium binary:

```console
npm run e2e:install
npm run e2e
```

On a Linux CI image or container that also needs Chromium system libraries,
run `npx playwright install --with-deps chromium` instead. The Playwright suite
starts Vite automatically on port 4173 and checks navigation, a role-gated
workflow entry, and WCAG A/AA violations on the home screen.

| Command                | Purpose                                     |
| ---------------------- | ------------------------------------------- |
| `npm start`            | Start the development server                |
| `npm run build`        | Type-check and create the production bundle |
| `npm run preview`      | Serve the production bundle locally         |
| `npm run lint`         | Run ESLint                                  |
| `npm run typecheck`    | Run TypeScript without emitting files       |
| `npm test`             | Run Vitest component tests                  |
| `npm run e2e:install`  | Install Chromium for Playwright             |
| `npm run e2e`          | Run Playwright browser tests                |
| `npm run format`       | Format supported files with Prettier        |
| `npm run format:check` | Verify formatting without changing files    |

## Troubleshooting

### `npm` reports an unsupported Node version

Install Node.js 22 LTS, open a new terminal, and confirm `node --version`
before running `npm ci` again. With nvm, run `nvm install && nvm use`.

### The development port is already in use

Start Vite on another port:

```console
npm start -- --port 5174
```

Then open the URL printed by Vite.

### Playwright cannot find Chromium

Run `npm run e2e:install`, then retry `npm run e2e`.

### The demo contains old local changes

Use **Settings → Reset demo**. If the page is not open, clear the site's
stored data in the browser and reload it.

### Installation differs from CI

Pull the latest branch and use `npm ci`, not `npm install`, for a clean,
lockfile-based install. Use `npm install` only when intentionally changing
dependencies and commit the resulting `package-lock.json`.

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
