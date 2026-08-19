# SokoCredit — Customer Management Module

Frontend module for managing mama mboga / small-scale trader customer profiles within the SokoCredit loan management system. Built as part of a 4-developer team; this module owns all customer-facing data, forms, and views.

## Table of Contents
- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Folder Structure](#folder-structure)
- [Getting Started](#getting-started)
- [Available Scripts](#available-scripts)
- [Features](#features)
- [State Management](#state-management)
- [Mock Data / API Contract](#mock-data--api-contract)
- [Testing](#testing)
- [Integration Points](#integration-points)
- [Mobile & Accessibility](#mobile--accessibility)
- [Contributing (Team Workflow)](#contributing-team-workflow)

## Overview

This module handles everything related to customer identity and business profile management:
- Creating and editing mama mboga customer profiles
- Uploading and storing ID/business permit documents
- Viewing customer credit history and loan history (read-only, sourced from other modules)
- Tracking business performance and seasonal patterns

This module is built to be **self-contained** — it does not depend on live data from the Loans, Payments, or Dashboard modules during development. All cross-module data is stubbed with mock data until the final integration sprint.

## Tech Stack

- **React** (Vite)
- **Redux Toolkit** — state management
- **React Router** — routing
- **React Hook Form + Yup** — forms and validation
- **PropTypes** — runtime type checking (JS project, no TypeScript)
- **Recharts** — business performance / seasonal charts
- **Jest + React Testing Library** — testing
- **Axios** — API client

## Folder Structure

```
src/
├── features/
│   └── customers/
│       ├── components/
│       │   ├── CustomerCard.jsx
│       │   ├── CustomerSelector.jsx        # exported for use by other modules
│       │   ├── CustomerTable.jsx
│       │   ├── DocumentUpload.jsx
│       │   ├── SeasonalPerformanceChart.jsx
│       │   └── CreditHistoryTab.jsx
│       ├── pages/
│       │   ├── CustomerListPage.jsx
│       │   ├── CustomerOnboardingPage.jsx
│       │   └── CustomerProfilePage.jsx
│       ├── customersSlice.js
│       ├── customersApi.js
│       ├── customersShapes.js              # PropTypes shape definitions
│       └── customers.test.js
├── components/
│   └── common/                             # shared UI library (Button, Modal, Input, etc.)
├── services/
│   └── apiClient.js
└── app/
    └── store.js
```

## Getting Started

```bash
# Clone the repo
git clone <repo-url>
cd sokocredit-frontend

# Install dependencies
npm install

# Start the dev server
npm run dev

# Run on a specific port if needed
npm run dev -- --port 3001
```

Create a `.env` file at the project root (see `.env.example`):

```
VITE_API_BASE_URL=http://localhost:5000/api
VITE_USE_MOCK_DATA=true
```

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start local dev server |
| `npm run build` | Production build |
| `npm run test` | Run Jest test suite |
| `npm run test:watch` | Run tests in watch mode |
| `npm run lint` | Run ESLint |
| `npm run format` | Run Prettier |

## Features

- [x] Customer list view — search, filter by location/business type, pagination
- [x] Multi-step onboarding form — personal info → business details → document upload
- [x] Customer profile page — tabs for Overview / Documents / Loan History / Credit History
- [x] Edit mode with inline validation
- [x] Document upload (drag-and-drop + mobile camera capture)
- [x] Business performance & seasonal pattern chart (stubbed data pending backend)
- [x] Reusable `CustomerSelector` component (consumed by Loans module)

## State Management

Customer data lives in `customersSlice.js` (Redux Toolkit):

```js
{
  customers: {
    list: [],
    selectedCustomer: null,
    status: 'idle' | 'loading' | 'succeeded' | 'failed',
    error: null,
    filters: { search: '', location: '', businessType: '' }
  }
}
```

Local/ephemeral UI state (form step index, modal open/close) stays in component state — not pushed to Redux.

## Mock Data / API Contract

All development happens against `customersApi.js`, which switches between mock data and live backend calls based on `VITE_USE_MOCK_DATA`.

Expected customer shape (see `customersShapes.js` for full PropTypes):

```js
{
  id: 'string',
  fullName: 'string',
  phoneNumber: 'string',
  idNumber: 'string',
  businessName: 'string',
  businessType: 'string',
  location: 'string',
  documents: [{ type: 'id' | 'permit', url: 'string', uploadedAt: 'string' }],
  creditScore: 'number',       // read-only, sourced from Risk module in production
  createdAt: 'string'
}
```

Mock data lives in `src/features/customers/__mocks__/customers.mock.js` and should be updated whenever the agreed API contract changes.

## Testing

Run the full suite:

```bash
npm run test
```

Coverage includes:
- Unit tests — form validation schema, slice reducers
- Component tests (RTL) — list rendering, search/filter behavior, multi-step form gating, snapshot checks across viewport sizes
- Integration tests — form submission calls API with correct payload

Test files sit alongside their source file (`Component.jsx` + `Component.test.jsx`).

## Integration Points

This module exposes the following for other teams to consume — **do not modify these without a heads-up in standup**, since changes ripple into other modules:

| Component | Consumed by | Purpose |
|---|---|---|
| `CustomerSelector` | Loans module | Search/select a customer when creating a loan application |
| `CustomerCard` | Dashboard module | Compact customer summary display |
| `customersShapes.js` | All modules | Shared PropTypes contract for customer objects |

This module **does not** import from Loans, Payments, or Dashboard during core development. Loan history and payment history tabs on the customer profile render with placeholder/empty states until the final integration sprint.

## Mobile & Accessibility

- All views tested at 360px minimum width
- Document upload supports native camera capture on mobile devices
- Forms use large touch targets and dropdowns/pickers over free text where practical
- Color contrast checked for outdoor/bright-light readability

## Contributing (Team Workflow)

- Branch naming: `feature/customers-<short-description>`
- PRs target `develop`, not `main`
- Run `npm run lint` and `npm run test` before opening a PR
- Any change to shared components (`src/components/common/`) or `customersShapes.js` requires a second reviewer, since other modules depend on them