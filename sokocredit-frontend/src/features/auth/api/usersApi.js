import { apiClient } from '../../../api/client';

// Admin-only staff account creation - POST /api/users on the Flask backend
// (see app/user_routes.py). Distinct from the customer-portal registration
// and from src/data/mockAuth.js, which only ever writes to localStorage and
// therefore can never produce an account the real /api/auth/login accepts.
export async function createStaffUser({ email, password, fullName, role = 'agent' }) {
  const { data } = await apiClient.post('/users', { email, password, fullName, role });
  return data.user;
}
