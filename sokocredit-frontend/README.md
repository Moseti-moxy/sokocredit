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

## Next steps for the team

- Replace `src/data/mockData.js` reads with real API calls (RTK Query is a
  natural fit given Redux Toolkit is already in place) once the Flask
  endpoints are ready.
- Login/Signup currently have no auth wiring — hook up JWT storage + protected
  routes once the backend auth endpoints exist.
- `npm run build` currently warns about one JS chunk being ~690kB; worth
  code-splitting routes with `React.lazy` once more pages/libraries are added.
