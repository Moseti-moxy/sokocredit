import { Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import NewCustomer from './pages/NewCustomer';
import LoanManagementPage from './features/loans/pages/LoanManagementPage';
import Analytics from './pages/Analytics';
import Reports from './pages/Reports';
import RiskManagement from './pages/RiskManagement';
import Settings from './pages/Settings';
import AuditLog from './pages/AuditLog';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ProtectedRoute from './components/ProtectedRoute';
import CustomerDashboard from './pages/CustomerDashboard';
import LoanOfficerDashboard from './pages/LoanOfficerDashboard';
import LoanOfficers from './pages/LoanOfficers';
import { useAuth } from './hooks/useAuth';

function Home() {
  const { role } = useAuth();
  if (role === 'customer') return <CustomerDashboard />;
  if (role === 'loan_officer') return <LoanOfficerDashboard />;
  return <Dashboard />;
}

export default function App() {
  return (
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
  );
}
