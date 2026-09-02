# SokoCredit

SokoCredit is a full-stack microfinance operations platform for Kenyan market traders and lending teams. It supports customer onboarding, loan and repayment workflows, group lending, field operations, communications, payments, analytics, and customer self-service.

## Features

- Staff and customer authentication with role-based access
- Customer KYC, market/stall profiles, document uploads, and self-registration
- Loan applications, approvals, repayment schedules, renewals, inventory financing, and credit scoring
- M-Pesa STK Push, Airtel Money, Stripe, SMS, WhatsApp, notifications, audit logs, and reports
- GPS customer location capture, route optimisation, map markers, and geofence alerts
- Responsive English/Swahili React interface

## Architecture

```text
React + Vite (Vercel) ──► Flask API (Render) ──► PostgreSQL
       │                       │
       └─ Leaflet/OpenStreetMap └─ M-Pesa, Airtel, Stripe, SMS, WhatsApp
```

| Directory | Purpose |
| --- | --- |
| `sokocredit-frontend/` | React 19/Vite web application |
| `sokocredit-backend/flask_app/` | Flask API, SQLAlchemy models, Alembic migrations, and tests |
| `sokocredit-backend/` | Render deployment configuration and Python dependencies |

## Prerequisites

- Node.js 20+
- Python 3.12+
- PostgreSQL 14+
- npm and Git

## Local setup

### Backend

```bash
cd sokocredit-backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp flask_app/.env.example flask_app/.env
cd flask_app
flask --app run.py db upgrade
flask --app run.py run --debug
```

Set a local PostgreSQL `DATABASE_URL`, strong `JWT_SECRET_KEY`, and generated `FIELD_ENCRYPTION_KEY` in `flask_app/.env`. The API is available at `http://localhost:5000`; use `GET /api/health` to check it.

### Frontend

```bash
cd sokocredit-frontend
cp .env.example .env
npm install
npm run dev
```

To use the local Flask API, set:

```env
VITE_API_BASE_URL=http://localhost:5000/api
VITE_USE_MOCK_AUTH=false
```

Vite normally runs at `http://localhost:5173`.

## Location and geofencing

Location capture is consent-based and requires HTTPS or `localhost`.

1. A staff member or customer chooses **Capture/Record location**.
2. The browser requests permission and returns GPS coordinates.
3. The first verified point becomes the customer’s geofence center.
4. Later reports outside the zone create an alert.
5. Staff can review and resolve open alerts on **Customer Locations**.

Route optimisation uses the field agent’s current position and stored active-customer locations.

## Commands

```bash
# Frontend
cd sokocredit-frontend
npm run lint
npm test
npm run build

# Backend
cd sokocredit-backend/flask_app
pytest
flask --app run.py db upgrade
```

## Configuration and integrations

`sokocredit-backend/flask_app/.env.example` documents all configuration, including database, CORS, encryption, M-Pesa, Airtel, Stripe, Africa’s Talking SMS, Meta WhatsApp, CRB, and business-registry settings. Keep secrets out of version control.

## Deployment

- `sokocredit-backend/render.yaml` provisions the Flask service and PostgreSQL database on Render; it applies migrations before Gunicorn starts.
- `sokocredit-frontend/vercel.json` proxies `/api/*` to the Render API and rewrites client routes to `index.html`.

Before production, configure `CORS_ORIGINS`, durable JWT/encryption secrets, HTTPS callback URLs, backups, monitoring, and provider credentials.

## Security

SokoCredit handles financial and personal data. Use production-grade secrets, restrict CORS, protect API keys and `.env` files, back up PostgreSQL, and complete provider verification before processing live payments or CRB data.

## License

Educational and demonstration use unless a project license is added.
