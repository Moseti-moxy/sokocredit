import { useSelector } from 'react-redux';

// Central place to read auth state — components use this instead of
// reaching into state.auth directly, so the shape can change in one spot.
export function useAuth() {
  const { token, user, role, status, error } = useSelector((state) => state.auth);
  return { token, user, role, status, error, isAuthenticated: Boolean(token) };
}

// Returns true if the current user's role is in `roles`. Pass a single role
// string or an array. No roles required -> just checks sign-in status.
export function useHasRole(roles) {
  const { role, isAuthenticated } = useAuth();
  if (!roles) return isAuthenticated;
  const allowed = Array.isArray(roles) ? roles : [roles];
  return isAuthenticated && allowed.includes(role);
}
