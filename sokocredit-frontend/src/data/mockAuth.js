// Demo accounts used ONLY when VITE_USE_MOCK_AUTH is enabled (see .env.example).
// Lets the team log in and exercise ProtectedRoute / role gating before the
// Flask /auth/login and /auth/signup endpoints are live. Swap the base URL in
// src/api/client.js once the backend is ready and this file becomes unused.
export const MOCK_USERS = [
  {
    id: 'AGT-8492',
    identifier: 'AGT-8492',
    email: 'jane.wanjiru@sokocredit.co.ke',
    password: '1234',
    name: 'Jane Wanjiru',
    role: 'agent',
    market: 'Kiseka Market',
  },
  {
    id: 'ADM-1001',
    identifier: 'ADM-1001',
    email: 'david.otieno@sokocredit.co.ke',
    password: '1001',
    name: 'David Otieno',
    role: 'admin',
    market: 'All Markets',
  },
];

const STAFF_STORAGE_KEY = 'sokocredit.loan-officers';
const CUSTOMER_STORAGE_KEY = 'sokocredit.customers';

function readStored(key) {
  try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
}

export function getLoanOfficers() { return readStored(STAFF_STORAGE_KEY); }

export function addLoanOfficer({ name, email, pin }) {
  const officers = getLoanOfficers();
  if (officers.some((officer) => officer.email.toLowerCase() === email.toLowerCase())) throw new Error('That email is already in use.');
  const officer = { id: `LO-${Date.now().toString().slice(-6)}`, identifier: email, name, email, password: pin, role: 'loan_officer', market: 'Assigned by admin' };
  localStorage.setItem(STAFF_STORAGE_KEY, JSON.stringify([...officers, officer]));
  return officer;
}

export function addCustomer({ name, customerId, pin }) {
  const customers = readStored(CUSTOMER_STORAGE_KEY);
  if (customers.some((customer) => customer.identifier.toLowerCase() === customerId.toLowerCase())) throw new Error('That customer ID is already in use.');
  const customer = { id: customerId, identifier: customerId, name, password: pin, role: 'customer', market: 'Customer portal' };
  localStorage.setItem(CUSTOMER_STORAGE_KEY, JSON.stringify([...customers, customer]));
  return customer;
}

export function findMockUser(identifier, password) {
  const needle = identifier.trim().toLowerCase();
  const user = [...MOCK_USERS, ...getLoanOfficers(), ...readStored(CUSTOMER_STORAGE_KEY)].find(
    (u) => u.identifier.toLowerCase() === needle || u.email.toLowerCase() === needle
  );
  if (!user || user.password !== password) return null;
  // eslint-disable-next-line no-unused-vars
  const { password: _pw, ...safeUser } = user;
  return safeUser;
}
