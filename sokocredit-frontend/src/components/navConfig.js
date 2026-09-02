import { Home, Users, Landmark, BarChart3, ShieldAlert, ScrollText, FileBarChart, UserPlus, UsersRound, Package, MapPin, MessageCircle, TrendingUp } from 'lucide-react';

// Primary nav — shown in full on the desktop sidebar and tablet drawer.
// `roles` restricts a link to specific roles (matches ProtectedRoute in
// App.jsx) — omit it to show the link to any signed-in user.
// `label` is the English fallback; `labelKey` looks up the live translation
// (see utils/i18n.js) so switching language actually changes this text.
export const navItems = [
  { to: '/', label: 'Home', labelKey: 'nav.home', icon: Home, end: true },
  { to: '/customers', label: 'Customers', labelKey: 'nav.customers', icon: Users, roles: ['admin', 'agent', 'loan_officer'] },
  { to: '/chamas', label: 'Chamas', labelKey: 'nav.chamas', icon: UsersRound, roles: ['admin', 'agent', 'loan_officer'] },
  { to: '/loans', label: 'Loans', labelKey: 'nav.loans', icon: Landmark, roles: ['admin', 'agent', 'loan_officer'] },
  { to: '/loan-renewals', label: 'Renewals', labelKey: 'nav.renewals', icon: TrendingUp, roles: ['admin', 'agent', 'loan_officer'] },
  { to: '/inventory', label: 'Inventory', labelKey: 'nav.inventory', icon: Package, roles: ['admin', 'agent', 'loan_officer'] },
  { to: '/location', label: 'Locations', labelKey: 'nav.locations', icon: MapPin, roles: ['admin', 'agent'] },
  // Role-specific communication/messaging
  { to: '/messages', label: 'Messages', labelKey: 'nav.messages', icon: MessageCircle, roles: ['customer'] },
  { to: '/customer-support', label: 'Customer Support', labelKey: 'nav.customerSupport', icon: MessageCircle, roles: ['agent'] },
  { to: '/communication-center', label: 'Communication Center', labelKey: 'nav.communicationCenter', icon: MessageCircle, roles: ['admin'] },
  { to: '/analytics', label: 'Analytics', labelKey: 'nav.analytics', icon: BarChart3, roles: ['admin', 'agent'] },
  { to: '/reports', label: 'Reports', labelKey: 'nav.reports', icon: FileBarChart, roles: ['admin', 'agent'] },
  { to: '/risk', label: 'Risk', labelKey: 'nav.risk', icon: ShieldAlert, roles: ['admin', 'agent'] },
  { to: '/audit-log', label: 'Audit Log', labelKey: 'nav.auditLog', icon: ScrollText, roles: ['admin'] },
  { to: '/loan-officers', label: 'Agents', labelKey: 'nav.agents', icon: UserPlus, roles: ['admin'] },
];

// Sidebar pins "App Settings" separately at the bottom (admin-only) — kept
// out of navItems above so it isn't duplicated in the scrollable nav list.

// Subset shown on the mobile bottom tab bar — only room for ~5 icons,
// so we keep the highest-frequency actions and tuck the rest behind "More".
export const mobileTabItems = [
  { to: '/', label: 'Home', labelKey: 'nav.home', icon: Home, end: true },
  { to: '/customers', label: 'Customers', labelKey: 'nav.customers', icon: Users, roles: ['admin', 'agent', 'loan_officer'] },
  { to: '/loans', label: 'Loans', labelKey: 'nav.loans', icon: Landmark, roles: ['admin', 'agent', 'loan_officer'] },
  { to: '/analytics', label: 'Analytics', labelKey: 'nav.analytics', icon: BarChart3, roles: ['admin', 'agent'] },
];
