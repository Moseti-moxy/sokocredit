import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import { useAuth } from './hooks/useAuth';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Customers = lazy(() => import('./pages/Customers'));
const NewCustomer = lazy(() => import('./pages/NewCustomer'));
const LoanManagementPage = lazy(() => import('./features/loans/pages/LoanManagementPage'));
const Analytics = lazy(() => import('./pages/Analytics'));
const Reports = lazy(() => import('./pages/Reports'));
const RiskManagement = lazy(() => import('./pages/RiskManagement'));
const Settings = lazy(() => import('./pages/Settings'));
const AuditLog = lazy(() => import('./pages/AuditLog'));
const Login = lazy(() => import('./pages/Login'));
const Signup = lazy(() => import('./pages/Signup'));
const CustomerDashboard = lazy(() => import('./pages/CustomerDashboard'));
const LoanOfficerDashboard = lazy(() => import('./pages/LoanOfficerDashboard'));
const LoanOfficers = lazy(() => import('./pages/LoanOfficers'));
const Chamas = lazy(() => import('./pages/Chamas'));

function Home() {
  const { role } = useAuth();
  if (role === 'customer') return <CustomerDashboard />;
  if (role === 'loan_officer') return <LoanOfficerDashboard />;
  return <Dashboard />;
}

export default function App() {
  return (
    <Suspense fallback={<div role="status">Loading…</div>}>
      <Routes>
        {/* Public — no token required */}
        <Route path="/login" element={<Login />} />
        <Route path="/staff/login" element={<Login portal="staff" />} />
        <Route path="/signup" element={<Signup />} />

        {/* Any signed-in user (agent or admin) */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Home />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/customers/new" element={<NewCustomer />} />
          <Route path="/chamas" element={<Chamas />} />
          <Route path="/loans" element={<LoanManagementPage />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/risk" element={<RiskManagement />} />
        </Route>

        {/* Admin-only — agents get bounced back to the dashboard */}
        <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
          <Route path="/settings" element={<Settings />} />
          <Route path="/audit-log" element={<AuditLog />} />
          <Route path="/loan-officers" element={<LoanOfficers />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
