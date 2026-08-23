SokoCredit — Microfinance Operations Portal
SokoCredit is a responsive React portal for the day-to-day work of microfinance teams. It gives administrators, field agents, loan officers, and customers role-appropriate views for customer management, lending, communications, field operations, and reporting.

The frontend is built with React, Redux Toolkit, Tailwind CSS v4, and Vite. It is currently designed to work with mock data and can be connected to a Flask backend through the configured API layer.

Features
Customer registration and KYC validation
Customer and loan management
Loan eligibility and application tracking
Loan approval, rejection, and repayment workflows
Loan renewal recommendations
Risk management and analytics
Credit Reference Bureau (CRB) checks
Inventory financing
Business registration verification
Customer location management
WhatsApp, SMS, and email communication interfaces
Role-based navigation and access
Admin agent directory with station, active/inactive state, and last-active time
Multi-language support
Responsive layouts for mobile, tablet, and desktop
Audit logging and activity monitoring
Tech Stack
Technology	Purpose
React	Frontend framework
Redux Toolkit	Application state management
Tailwind CSS v4	Styling and responsive design
Vite	Development and build tooling
Lucide React	UI icons
Flask	Planned backend API
Mock Data	Frontend development and testing
Getting Started
Prerequisites
Node.js
npm
Installation
git clone <repository-url>
cd sokocredit-frontend
npm install
Development
npm run dev
The development server will be available at the URL provided by Vite.

Demo accounts
With VITE_USE_MOCK_AUTH=true (the default), use these accounts to explore role-specific views:

Portal	Identifier	PIN	What to try
Staff	ADM-0001	1001	Open Agents to view the complete agent directory.
Staff	AGT-0001	1234	Sign in to record the agent as active.
Staff	LO-0001	5555	View the loan-officer workspace.
Customer	12345678	1234	View the customer portal.
The demo data is stored in the browser. Clearing site data resets agents created locally and any manually changed activity state.

Production Build
npm run build
The production build will be generated in:

dist/
Project Structure
src/
├── app/
│   └── store.js
│
├── components/
│   ├── AppShell.jsx
│   ├── Sidebar.jsx
│   ├── NavDrawer.jsx
│   ├── MobileTabBar.jsx
│   ├── TopBar.jsx
│   ├── StatCard.jsx
│   ├── CustomerDetail.jsx
│   ├── LanguageSettings.jsx
│   └── navConfig.js
│
├── features/
│   ├── ui/
│   ├── customers/
│   ├── loans/
│   ├── crb/
│   ├── inventory/
│   ├── communications/
│   ├── location/
│   └── business/
│
├── pages/
│   ├── Dashboard.jsx
│   ├── Customers.jsx
│   ├── Loans.jsx
│   ├── Analytics.jsx
│   ├── RiskManagement.jsx
│   ├── Settings.jsx
│   ├── AuditLog.jsx
│   ├── Login.jsx
│   ├── Signup.jsx
│   ├── CRBChecks.jsx
│   ├── InventoryFinancing.jsx
│   ├── Communications.jsx
│   ├── CustomerLocation.jsx
│   ├── BusinessRegistry.jsx
│   └── LoanRenewals.jsx
│
├── data/
│   ├── agentDirectory.js
│   ├── mockAuth.js
│   └── mockData.js
│
└── utils/
    └── i18n.js
Application Modules
Customer Management
The customer management module provides functionality for registering and managing customers, including:

KYC information
Customer identification
Market information
Next-of-kin details
Customer profiles
Customer loan history
Loan Management
Agents and loan officers can manage the complete loan lifecycle:

Application → Review → Approval/Rejection → Repayment → Completion
The module supports loan applications, eligibility estimates, repayment schedules, payment records, reminders, and renewal recommendations.

Risk Management
Risk management provides tools for reviewing customer and loan information to support lending decisions.

Credit Reference Bureau
The CRB module provides the frontend interface for credit verification and credit report management.

Planned API endpoints include:

POST /api/crb/check
POST /api/crb/sync
GET  /api/crb/status
Inventory Financing
Inventory financing allows staff to monitor stock purchases financed through SokoCredit.

Features include:

Financing amounts
Stock purchases
Sold units
Repayment status
Completion tracking
Example API endpoints:

POST /api/inventory/finance
GET  /api/inventory/tracking/{customerId}
PUT  /api/inventory/{inventoryId}
Communications
The communications module provides a unified interface for customer communication.

Supported channels include:

WhatsApp
SMS
Email
Example endpoints:

POST /api/whatsapp/send
POST /api/whatsapp/loan-notification
GET  /api/whatsapp/history/{customerId}
Location Management
The location module is designed to support field-agent operations through:

Customer location tracking
Location history
Route optimization
Geofence monitoring
Example endpoints:

POST /api/gps/track
GET  /api/gps/location/{customerId}
POST /api/gps/optimize-route
Business Verification
The business registry module provides an interface for verifying customer businesses and linking verified businesses to customer accounts.

Supported business types include:

Sole proprietorship
Partnership
Limited company
Loan Renewals
The loan renewal module analyzes repayment history and provides renewal recommendations.

Features include:

Renewal eligibility
Suggested renewal amounts
Payment history
Renewal requests
Renewal history
Admin Agent Directory
Administrators can open Agents from the sidebar to see every field agent in one place. Each row shows the agent's email, station/market, activity state, and last-active time. The page also provides:

Active, inactive, and all-agent filters
Search by agent name, email, staff ID, or station
Agent creation with an assigned station
Manual active/inactive updates for the demo environment
When a mock field agent signs in, the directory automatically records their last-active timestamp and marks them active. The current frontend implementation persists this information in localStorage; production deployments should retrieve and update it through an authenticated backend endpoint.

Role-Based Access
The interface supports different application roles:

Role	Access
Admin	Full system access, including the Agents directory and staff monitoring
Agent	Customer, loan, risk, communication and field operations
Loan Officer	Loan, inventory, renewal and reporting functions
Customer	Personal loans, repayments, notifications and available customer services
Frontend role restrictions are intended for interface control. Authorization for protected resources must be enforced by the backend.

Responsive Design
The application is designed for mobile, tablet, and desktop environments.

Screen	Navigation	Data Layout
Mobile	Bottom navigation + drawer	Cards
Tablet	Drawer navigation	Responsive cards/tables
Desktop	Persistent sidebar	Tables
Tailwind CSS breakpoints are used to control layouts rather than JavaScript-based screen-width detection.

Statistical cards use responsive grids, while data-heavy pages switch from tables to stacked cards on smaller screens.

Multi-Language Support
The application supports:

English
Swahili
Language preferences are persisted locally and can be changed from the Settings page.

Translations are managed through:

src/utils/i18n.js
Configuration
Create a .env file for local development:

VITE_USE_MOCK_AUTH=true
VITE_API_BASE_URL=http://localhost:5000
For a backend-connected environment:

VITE_USE_MOCK_AUTH=false
VITE_API_BASE_URL=https://your-api-domain.com
API requests are expected to use the configured API base URL:

${VITE_API_BASE_URL}/api/
Current Architecture
The current version is frontend-focused and uses local mock data for demonstration.

The following functionality is currently simulated:

Authentication
Customer data
Loan data
Eligibility calculations
Notifications
M-Pesa/cash repayment records
Browser storage
The application architecture is designed so these implementations can be replaced with backend API calls without restructuring the main UI.

Backend Integration
The planned backend is a Flask API responsible for:

Authentication and authorization
Customer data
Loan processing
Database operations
Payment verification
CRB communication
Business verification
Notifications
Audit logging
Location services
Example API structure:

/api/
├── auth/
├── customers/
├── loans/
├── repayments/
├── crb/
├── inventory/
├── whatsapp/
├── gps/
├── business-registry/
└── loan-renewal/
Development
Run the following commands before committing changes:

npm run lint
npm test
npm run build
For CI environments:

npm ci
npm run lint
npm test
npm run build
Production Considerations
This project is currently a frontend implementation and should not be used to process real customer or financial data until the backend and security infrastructure are implemented.

Before production deployment, the system requires:

Server-side authentication
Server-side authorization
Secure database storage
Server-side validation
Secure M-Pesa transaction verification
Protected API credentials
Audit logging
Rate limiting
Backups
Error monitoring
Secure session management
Appropriate data-protection and consent controls
Payment credentials, API secrets, and other sensitive information must remain on the server and must not be exposed through Vite client-side environment variables.

Deployment
Build the application:

npm run build
Deploy the generated dist/ directory to a static hosting provider configured with SPA route fallback.

Before deployment:

Configure the production API URL.
Disable mock authentication.
Verify backend authentication and authorization.
Run the test suite.
Test customer, agent, loan officer, and admin workflows.
Verify responsive layouts.
Test payment and notification integrations in a staging environment.
Project Status
The SokoCredit Agent Frontend currently provides the complete frontend structure and interfaces for the core agent portal functionality.

Backend services and external integrations are the next stage of development.

License
This project is currently intended for development and demonstration purposes.
