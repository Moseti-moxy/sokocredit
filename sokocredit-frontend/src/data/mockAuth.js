import { nextStaffId } from '../utils/idGenerator';

// Demo accounts used ONLY when VITE_USE_MOCK_AUTH is enabled (see .env.example).
// Lets the team log in and exercise ProtectedRoute / role gating before the
// Flask /auth/login and /auth/signup endpoints are live. Swap the base URL in
// src/api/client.js once the backend is ready and this file becomes unused.
export const MOCK_USERS = [
  {
    id: 'AGT-0001',
    staffId: 'AGT-0001',
    identifier: 'AGT-0001',
    email: 'jane.wanjiru@sokocredit.co.ke',
    password: '1234',
    name: 'Jane Wanjiru',
    role: 'agent',
    market: 'Kiseka Market',
  },
  {
    id: 'ADM-0001',
    staffId: 'ADM-0001',
    identifier: 'ADM-0001',
    email: 'david.otieno@sokocredit.co.ke',
    password: '1001',
    name: 'David Otieno',
    role: 'admin',
    market: 'All Markets',
  },
  {
    id: 'LO-0001',
    staffId: 'LO-0001',
    identifier: 'LO-0001',
    email: 'grace.kipchoge@sokocredit.co.ke',
    password: '5555',
    name: 'Grace Kipchoge',
    role: 'loan_officer',
    market: 'Central Market',
  },
  // Customer test accounts - can login via National ID or Email
  {
    id: 'CUS-2024-001',
    identifier: '12345678',
    email: 'customer@example.com',
    password: '1234',
    name: 'Test Customer',
    role: 'customer',
    market: 'Customer portal',
  },
  {
    id: 'CUS-2024-002',
    identifier: '87654321',
    email: 'trader@sokocredit.ke',
    password: '5678',
    name: 'Market Trader',
    role: 'customer',
    market: 'Customer portal',
  },
];

const STAFF_STORAGE_KEY = 'sokocredit.agents';
const LEGACY_STAFF_STORAGE_KEY = 'sokocredit.loan-officers';
const CUSTOMER_STORAGE_KEY = 'sokocredit.customers';

function readStored(key) {
  try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
}

export function getLoanOfficers() { return [...readStored(LEGACY_STAFF_STORAGE_KEY), ...readStored(STAFF_STORAGE_KEY)].map((agent) => ({ ...agent, role: 'agent' })); }

export function addLoanOfficer({ name, email, pin }) {
  const officers = getLoanOfficers();
  if (officers.some((officer) => officer.email.toLowerCase() === email.toLowerCase())) throw new Error('That email is already in use.');
  // Permanent, role-prefixed Staff ID (AGT-0002, AGT-0003, …) — unique across
  // every known account source so two employees can never collide.
  const staffId = nextStaffId('agent', MOCK_USERS);
  const officer = { id: staffId, staffId, identifier: email, name, email, password: pin, role: 'agent', market: 'Assigned by admin' };
  localStorage.setItem(STAFF_STORAGE_KEY, JSON.stringify([...officers, officer]));
  return officer;
}

// Merged directory of every internal staff member (seeded + locally created),
// used by the Admin Communication Center for reassignment and messaging.
export function getStaffDirectory() {
  const seen = new Set();
  const directory = [];
  for (const member of [...MOCK_USERS, ...getLoanOfficers()]) {
    if (!['agent', 'admin', 'loan_officer'].includes(member.role)) continue;
    const id = member.staffId || member.id;
    if (seen.has(id)) continue;
    seen.add(id);
    directory.push({ id, name: member.name, role: member.role, email: member.email, market: member.market });
  }
  return directory;
}

// Every known customer ID (seeded demo accounts + locally registered ones).
export function getAllCustomerIds() {
  const seeded = MOCK_USERS.filter((user) => user.role === 'customer').map((user) => user.id);
  let stored = [];
  try {
    stored = JSON.parse(localStorage.getItem(CUSTOMER_STORAGE_KEY) || '[]').map((customer) => customer.id);
  } catch {
    stored = [];
  }
  return [...new Set([...seeded, ...stored])];
}

export function addCustomer({ name, customerId, pin, ...profile }) {
  const customers = readStored(CUSTOMER_STORAGE_KEY);
  if (customers.some((customer) => customer.identifier.toLowerCase() === customerId.toLowerCase())) throw new Error('That customer ID is already in use.');
  // National ID stays the private sign-in identifier. Internal records and
  // support cases use a separate permanent CUS-xxxx customer reference.
  const id = nextStaffId('customer', MOCK_USERS);
  const customer = { id, customerId: id, identifier: customerId, name, password: pin, role: 'customer', market: 'Customer portal', ...profile };
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
