import { getStaffDirectory } from './mockAuth';

// Browser-storage key used while the project is running without a backend.
const PRESENCE_STORAGE_KEY = 'sokocredit.agent-presence';

// Seed records make the mock-admin experience useful before staff accounts
// have checked in. A backend can replace these helpers with its staff API.
const SEED_AGENTS = [
  { id: 'AGT-001', staffId: 'AGT-001', name: 'David Ochieng', email: 'david.ochieng@sokocredit.co.ke', role: 'agent', market: 'Nairobi CBD' },
  { id: 'AGT-004', staffId: 'AGT-004', name: 'Mercy Wanjiku', email: 'mercy.wanjiku@sokocredit.co.ke', role: 'agent', market: 'Thika Town' },
];

const SEED_PRESENCE = {
  'AGT-0001': { station: 'Kiseka Market', isActive: true, lastActiveAt: new Date().toISOString() },
  'AGT-001': { station: 'Nairobi CBD', isActive: true, lastActiveAt: new Date().toISOString() },
  'AGT-004': { station: 'Thika Town', isActive: false, lastActiveAt: '2026-08-23T06:15:00.000Z' },
};

// Read saved agent deployment and availability safely. If storage is empty or
// malformed, the caller receives an empty directory instead of an app error.
function readPresence() {
  try {
    return JSON.parse(localStorage.getItem(PRESENCE_STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

// Keep all local presence changes in one place for easier backend replacement.
function savePresence(presence) {
  localStorage.setItem(PRESENCE_STORAGE_KEY, JSON.stringify(presence));
}

// Staff ID is the permanent identifier; fall back to id for legacy records.
function agentId(agent) {
  return agent.staffId || agent.id;
}

export function getAgentDirectory() {
  // Combine seeded demo agents with agents created by an administrator, while
  // retaining only one record when both sources contain the same staff member.
  const uniqueAgents = new Map();
  [...getStaffDirectory(), ...SEED_AGENTS]
    .filter((member) => member.role === 'agent')
    .forEach((member) => uniqueAgents.set(agentId(member), member));

  // Saved data takes priority so station and availability survive page reloads.
  const saved = readPresence();
  return [...uniqueAgents.values()].map((agent) => {
    const id = agentId(agent);
    const defaults = SEED_PRESENCE[id] || {
      station: agent.market && agent.market !== 'Assigned by admin' ? agent.market : 'Station not assigned',
      isActive: false,
      lastActiveAt: null,
    };
    return { ...agent, id, ...defaults, ...saved[id] };
  });
}

export function saveAgentPresence(id, updates) {
  // Merge partial updates rather than replacing other details such as station
  // or the previously recorded last-active timestamp.
  const presence = readPresence();
  presence[id] = { ...(SEED_PRESENCE[id] || {}), ...presence[id], ...updates };
  savePresence(presence);
  return presence[id];
}

export function registerAgent(agent, station) {
  // New agents start offline until their first sign-in.
  return saveAgentPresence(agentId(agent), {
    station: station.trim() || 'Station not assigned',
    isActive: false,
    lastActiveAt: null,
  });
}

export function recordAgentActivity(agent) {
  // Only field agents appear in this directory; admins and loan officers do not.
  if (agent?.role !== 'agent') return;
  saveAgentPresence(agentId(agent), { isActive: true, lastActiveAt: new Date().toISOString() });
}
