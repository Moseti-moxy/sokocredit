// Demo accounts used ONLY when VITE_USE_MOCK_AUTH is enabled (see .env.example).
// Lets the team log in and exercise ProtectedRoute / role gating before the
// Flask /auth/login and /auth/signup endpoints are live. Swap the base URL in
// src/api/client.js once the backend is ready and this file becomes unused.
export const MOCK_USERS = [
  {
    id: 'AGT-8492',
    identifier: 'AGT-8492',
    email: 'jane.wanjiru@sokocredit.co.ke',
    password: 'password123',
    name: 'Jane Wanjiru',
    role: 'agent',
    market: 'Kiseka Market',
  },
  {
    id: 'ADM-1001',
    identifier: 'ADM-1001',
    email: 'david.otieno@sokocredit.co.ke',
    password: 'admin123',
    name: 'David Otieno',
    role: 'admin',
    market: 'All Markets',
  },
];

export function findMockUser(identifier, password) {
  const needle = identifier.trim().toLowerCase();
  const user = MOCK_USERS.find(
    (u) => u.identifier.toLowerCase() === needle || u.email.toLowerCase() === needle
  );
  if (!user || user.password !== password) return null;
  // eslint-disable-next-line no-unused-vars
  const { password: _pw, ...safeUser } = user;
  return safeUser;
}
