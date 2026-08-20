import { Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import Loans from './pages/Loans';
import Analytics from './pages/Analytics';
import Reports from './pages/Reports';
import RiskManagement from './pages/RiskManagement';
import Settings from './pages/Settings';
import AuditLog from './pages/AuditLog';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ProtectedRoute from './components/ProtectedRoute';

export default function App() {
  return (
    <Routes>
      {/* Public — no token required */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      {/* Any signed-in user (agent or admin) */}
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/customers" element={<Customers />} />
        <Route path="/loans" element={<Loans />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/risk" element={<RiskManagement />} />
      </Route>

      {/* Admin-only — agents get bounced back to the dashboard */}
      <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
        <Route path="/settings" element={<Settings />} />
        <Route path="/audit-log" element={<AuditLog />} />
      </Route>
    </Routes>
  );
}
