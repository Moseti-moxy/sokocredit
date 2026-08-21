# SokoCredit — Agent Frontend

React + Redux Toolkit frontend for the SokoCredit agent portal, built responsive
from mobile through tablet to desktop (Tailwind v4 + `@tailwindcss/vite`).

## Getting started

```bash
npm install
npm run dev      # local dev server
npm run build    # production build -> dist/
```

## Structure

```
src/
  app/store.js              Redux store
  features/ui/               nav drawer open/close state (mobile/tablet)
  features/customers/        customer list + selected customer
  features/loans/            loan list + status filter
  data/mockData.js           placeholder data — swap for Flask API calls
  components/
    AppShell.jsx              layout: sidebar (desktop) + drawer (mobile/tablet)
                               + bottom tab bar (mobile) wrapping every page
    Sidebar.jsx / NavDrawer.jsx / MobileTabBar.jsx / TopBar.jsx
    StatCard.jsx, CustomerDetail.jsx
  pages/
    Dashboard.jsx, Customers.jsx, Loans.jsx, Analytics.jsx,
    RiskManagement.jsx, Settings.jsx, AuditLog.jsx, Login.jsx, Signup.jsx
```

## Responsive approach

- **Breakpoints**: mobile <640px (`sm`), tablet 640–1024px, desktop 1024px+ (`lg`).
- **Navigation**: persistent sidebar on desktop (`lg:flex`), a slide-out drawer
  triggered by the hamburger in the top bar on mobile/tablet, plus a 5-icon
  bottom tab bar on mobile only (`lg:hidden`).
- **Tables → cards**: every data table (loans, audit log, customers, risk
  accounts) renders as a table from `md`/`xl` up and as stacked cards below
  that — check each page for the exact breakpoint used, since table density
  varies (e.g. the Loans table needs more horizontal room, so it switches at
  `xl` instead of `md`).
- **Grids**: stat cards use `grid-cols-2` on mobile and `lg:grid-cols-4` on
  desktop so nothing overflows a small screen.
- Redux `ui` slice only tracks whether the mobile drawer is open — everything
  else (which layout renders) is pure CSS via Tailwind breakpoints, so there's
  no JS-based screen-width detection to keep in sync.

## Frontend-only demo capabilities

- Customer sign-up validates KYC, market, next-of-kin, customer ID, and PIN fields.
- Customer loan requests include a transparent estimated eligibility amount and
  remain visible through pending, approved, rejected, and repayment stages.
- Admins, agents, and loan officers receive persistent in-app notification alerts.
- Staff can review applications, record simulated M-Pesa/cash repayments,
  manage schedules, and record reminders.
- Analytics, audit views, and role-restricted navigation are available with the
  project’s local mock data.

## Before production

This project deliberately has no backend yet. Browser storage, demo credentials,
M-Pesa references, notifications, and eligibility calculations are simulations;
they are not secure or shared between devices. Before handling real customers or
money, add server-side authentication and authorization, a database, encrypted
secrets, M-Pesa API verification, SMS/email delivery, audit logging, rate
limiting, backups, and server-side validation.

## Deployment checklist

1. Set `VITE_USE_MOCK_AUTH=false` and configure the production API base URL.
2. Run `npm ci`, `npm run lint`, `npm test`, and `npm run build` in CI.
3. Deploy the generated `dist/` directory to a static host with SPA route
   fallback enabled.
4. Keep all API keys and payment credentials only on the server—never in Vite
   variables exposed to the browser.
5. Add error monitoring and test customer, staff, admin, and payment flows in
   a staging environment before release.
