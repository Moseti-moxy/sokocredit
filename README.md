# SokoCredit

SokoCredit is a responsive microfinance operations portal for market traders and lending teams. The application gives administrators, field agents, loan officers, and customers role-specific tools for customer onboarding, loan management, repayments, communication, field operations, and reporting.

> This repository contains the React frontend. It currently uses mock data and browser storage for demonstrations, with API modules ready to connect to a backend service.

## Contents

- [Features](#features)
- [User roles](#user-roles)
- [Technology](#technology)
- [Quick start](#quick-start)
- [Demo accounts](#demo-accounts)
- [Project structure](#project-structure)
- [Configuration](#configuration)
- [Testing](#testing)
- [Deployment](#deployment)
- [Production notes](#production-notes)

## Features

### Customer and business management

- Customer registration with KYC, contact, next-of-kin, market, and business details
- Customer profiles, loan histories, account views, and customer settings
- Market location tracking and field-agent route support
- Business registry verification and customer-business linking
- Chama/group lending information

### Lending operations

- Loan applications, eligibility checks, review, approval, rejection, and repayment workflows
- Loan tracking, repayment records, reminders, and renewal recommendations
- Inventory-financing records for trader stock purchases
- Credit Reference Bureau (CRB) check interfaces
- Risk-management, analytics, audit-log, and reporting dashboards

### Communication and administration

- Role-specific customer, agent, and administrator communication screens
- WhatsApp, SMS, and email workflow interfaces
- Admin agent directory with assigned station, active/inactive status, last-active time, filters, and search
- Role-based route protection and navigation
- English and Swahili language support

### User experience

- Mobile, tablet, and desktop responsive layouts
- Sidebar, drawer, and mobile tab navigation adapted to screen size
- Loading, empty-state, and error feedback in key workflows

## User roles

| Role | Main capabilities |
| --- | --- |
| **Administrator** | Full operational access, staff/agent monitoring, audit logs, communication center, and application settings. |
| **Field agent** | Customer onboarding, customer records, lending workflows, risk tools, locations, and customer support. |
| **Loan officer** | Loan-officer dashboard, loan reviews, inventory financing, renewals, and portfolio operations. |
| **Customer** | Customer dashboard, loan information, messages, notifications, and account settings. |

> Frontend role protection controls the interface. A connected backend must enforce authorization for real protected data and actions.

## Technology

| Technology | Purpose |
| --- | --- |
| React 19 | Component-based user interface |
| Vite | Development server and production bundling |
| Redux Toolkit | Authentication and application state |
| React Router | Protected, role-based routing |
| Tailwind CSS | Responsive styling and design system |
| Lucide React | Interface icons |
| Recharts | Reporting and analytics visualizations |
| Vitest + Testing Library | Unit and component tests |

## Quick start

### Prerequisites

- Node.js 20 or later
- npm 10 or later
- Git

### Install and run locally

```bash
git clone https://github.com/Moseti-moxy/sokocredit.git
cd sokocredit/sokocredit-frontend
npm install
npm run dev
```

Vite prints the local application address in the terminal, typically `http://localhost:5173`.

### Production build

```bash
cd sokocredit-frontend
npm run build
npm run preview
```

The production-ready static files are generated in `sokocredit-frontend/dist/`.

## Demo accounts

Mock authentication is enabled by default. Use the appropriate portal at `/login` or `/staff/login`.

| Portal | Identifier | PIN | Try this workflow |
| --- | --- | --- | --- |
| Staff | `ADM-0001` | `1001` | Open **Agents** to manage stations and monitor activity. |
| Staff | `AGT-0001` | `1234` | Explore customer onboarding and field-agent operations. |
| Staff | `LO-0001` | `5555` | Review the loan-officer workspace. |
| Customer | `12345678` | `1234` | View the customer dashboard, messages, and settings. |

Demo accounts, locally created users, and agent presence data are stored in browser storage. Clear the site data to reset them.

## Project structure

```text
sokocredit/
├── README.md                         # Repository overview (this file)
└── sokocredit-frontend/
    ├── public/                       # Static assets and Netlify SPA redirect
    ├── src/
    │   ├── api/                      # Shared HTTP client
    │   ├── app/                      # Redux store
    │   ├── components/               # Reusable navigation and UI components
    │   ├── data/                     # Mock accounts, sample data, agent presence
    │   ├── features/                 # Auth, customers, loans, communications, etc.
    │   ├── hooks/                    # Reusable React hooks
    │   ├── pages/                    # Route-level screens
    │   └── utils/                    # Formatting, translations, IDs, time helpers
    ├── package.json                  # Scripts and frontend dependencies
    └── vite.config.js                # Vite and test configuration
```

For more implementation detail, see the [frontend README](./sokocredit-frontend/README.md).

## Configuration

Create `sokocredit-frontend/.env` when you need to override defaults:

```env
# Set to false when a real backend is available.
VITE_USE_MOCK_AUTH=true

# URL of the backend API when mock authentication is disabled.
VITE_API_BASE_URL=http://localhost:5000/api
```

When integrating a backend, set `VITE_USE_MOCK_AUTH=false` and provide the deployed API URL. Never place secrets, payment credentials, or private keys in `VITE_` variables because Vite exposes them to the browser.

## Testing

Run all checks before opening a pull request or deploying:

```bash
cd sokocredit-frontend
npm run lint
npm test
npm run build
```

- `npm run lint` checks code quality with ESLint.
- `npm test` runs the Vitest test suite.
- `npm run build` verifies that Vite can produce a deployable build.

## Deployment

The app is configured as a single-page application. The [`_redirects`](./sokocredit-frontend/public/_redirects) file sends client-side routes such as `/login` back to `index.html`.

For Netlify, configure the repository as follows:

| Setting | Value when the Base directory is `sokocredit-frontend` |
| --- | --- |
| Build command | `npm run build` |
| Publish directory | `dist` |

If you leave the Base directory blank, use:

| Setting | Value |
| --- | --- |
| Build command | `npm --prefix sokocredit-frontend run build` |
| Publish directory | `sokocredit-frontend/dist` |

## Production notes

This version is a frontend demonstration and should not process real financial or personal data until production services are in place. Before launch, implement:

- Server-side authentication, authorization, validation, and audit logging
- Secure database storage, backups, monitoring, and error reporting
- Secure M-Pesa/payment verification and private credential management
- Rate limiting, session security, and data-protection controls
- Real integrations for CRB, communication channels, business verification, and locations

## License

This project is currently intended for educational and demonstration use.
