import { Home, Users, Landmark, BarChart3, ShieldAlert, ScrollText, FileBarChart } from 'lucide-react';

// Primary nav — shown in full on the desktop sidebar and tablet drawer.
// `roles` restricts a link to specific roles (matches ProtectedRoute in
// App.jsx) — omit it to show the link to any signed-in user.
export const navItems = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/customers', label: 'Customers', icon: Users },
  { to: '/loans', label: 'Loans', icon: Landmark },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/reports', label: 'Reports', icon: FileBarChart },
  { to: '/risk', label: 'Risk', icon: ShieldAlert },
  { to: '/audit-log', label: 'Audit Log', icon: ScrollText, roles: ['admin'] },
];

// Sidebar pins "App Settings" separately at the bottom (admin-only) — kept
// out of navItems above so it isn't duplicated in the scrollable nav list.

// Subset shown on the mobile bottom tab bar — only room for ~5 icons,
// so we keep the highest-frequency actions and tuck the rest behind "More".
export const mobileTabItems = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/customers', label: 'Customers', icon: Users },
  { to: '/loans', label: 'Loans', icon: Landmark },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
];
