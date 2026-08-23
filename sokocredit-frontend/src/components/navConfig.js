import { Home, Users, Landmark, BarChart3, ShieldAlert, ScrollText, FileBarChart, UserPlus, UsersRound, Package, MapPin, CheckCircle, MessageCircle, Building2, TrendingUp } from 'lucide-react';

// Primary nav — shown in full on the desktop sidebar and tablet drawer.
// `roles` restricts a link to specific roles (matches ProtectedRoute in
// App.jsx) — omit it to show the link to any signed-in user.
export const navItems = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/customers', label: 'Customers', icon: Users, roles: ['admin', 'agent', 'loan_officer'] },
  { to: '/chamas', label: 'Chamas', icon: UsersRound, roles: ['admin', 'agent', 'loan_officer'] },
  { to: '/loans', label: 'Loans', icon: Landmark, roles: ['admin', 'agent', 'loan_officer'] },
  { to: '/loan-renewals', label: 'Renewals', icon: TrendingUp, roles: ['admin', 'agent', 'loan_officer'] },
  { to: '/inventory', label: 'Inventory', icon: Package, roles: ['admin', 'agent', 'loan_officer'] },
  { to: '/crb-checks', label: 'Credit Checks', icon: CheckCircle, roles: ['admin', 'agent'] },
  { to: '/location', label: 'Locations', icon: MapPin, roles: ['admin', 'agent'] },
  // Role-specific communication/messaging
  { to: '/messages', label: 'Messages', icon: MessageCircle, roles: ['customer'] },
  { to: '/customer-support', label: 'Customer Support', icon: MessageCircle, roles: ['agent'] },
  { to: '/communication-center', label: 'Communication Center', icon: MessageCircle, roles: ['admin'] },
  { to: '/business-registry', label: 'Business Registry', icon: Building2, roles: ['admin', 'agent'] },
  { to: '/analytics', label: 'Analytics', icon: BarChart3, roles: ['admin', 'agent'] },
  { to: '/reports', label: 'Reports', icon: FileBarChart, roles: ['admin', 'agent'] },
  { to: '/risk', label: 'Risk', icon: ShieldAlert, roles: ['admin', 'agent'] },
  { to: '/audit-log', label: 'Audit Log', icon: ScrollText, roles: ['admin'] },
  { to: '/loan-officers', label: 'Agents', icon: UserPlus, roles: ['admin'] },
];

// Sidebar pins "App Settings" separately at the bottom (admin-only) — kept
// out of navItems above so it isn't duplicated in the scrollable nav list.

// Subset shown on the mobile bottom tab bar — only room for ~5 icons,
// so we keep the highest-frequency actions and tuck the rest behind "More".
export const mobileTabItems = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/customers', label: 'Customers', icon: Users, roles: ['admin', 'agent', 'loan_officer'] },
  { to: '/loans', label: 'Loans', icon: Landmark, roles: ['admin', 'agent', 'loan_officer'] },
  { to: '/analytics', label: 'Analytics', icon: BarChart3, roles: ['admin', 'agent'] },
];
