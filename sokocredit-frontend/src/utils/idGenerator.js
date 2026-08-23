// Unique identifier system for SokoCredit accounts.
//
// Every internal staff member gets a permanent, role-prefixed ID:
//   Agents         -> AGT-0001
//   Administrators -> ADM-0001
//   Loan Officers  -> LO-0001
//   Customers      -> CUS-xxxx (display form; login uses National ID/email)
//
// IDs are sequential per prefix so two employees can never collide, and the
// generator scans every known account source before minting a new one.

export const ROLE_ID_PREFIXES = {
  agent: 'AGT',
  admin: 'ADM',
  loan_officer: 'LO',
  customer: 'CUS',
};

const STAFF_STORAGE_KEYS = ['sokocredit.agents', 'sokocredit.loan-officers'];
const CUSTOMER_STORAGE_KEY = 'sokocredit.customers';

function readStoredIds(key) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.map((entry) => entry?.staffId || entry?.id).filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Mint the next sequential staff/customer ID for a role.
 * @param {'agent'|'admin'|'loan_officer'|'customer'} role
 * @param {Array<{id?: string, staffId?: string}>} seedUsers Extra in-memory users to scan (e.g. MOCK_USERS).
 */
export function nextStaffId(role, seedUsers = []) {
  const prefix = ROLE_ID_PREFIXES[role];
  if (!prefix) throw new Error(`Unknown role for ID generation: ${role}`);

  const keys = role === 'customer' ? [CUSTOMER_STORAGE_KEY] : STAFF_STORAGE_KEYS;
  const allIds = [
    ...seedUsers.map((user) => user.staffId || user.id).filter(Boolean),
    ...keys.flatMap(readStoredIds),
  ];

  const pattern = new RegExp(`^${prefix}-(\\d+)$`, 'i');
  let highest = 0;
  for (const id of allIds) {
    const match = pattern.exec(String(id));
    if (match) highest = Math.max(highest, parseInt(match[1], 10));
  }

  return `${prefix}-${String(highest + 1).padStart(4, '0')}`;
}
