import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/auth/authSlice';
import { useHasRole } from './useAuth';

function renderWithAuthState(preloadedAuth, roles) {
  const store = configureStore({
    reducer: { auth: authReducer },
    preloadedState: { auth: preloadedAuth },
  });
  return renderHook(() => useHasRole(roles), {
    wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
  });
}

const signedOut = { token: null, user: null, role: null, status: 'idle', error: null };
const asAgent = { token: 't', user: { id: 'AGT-1' }, role: 'agent', status: 'idle', error: null };
const asAdmin = { token: 't', user: { id: 'ADM-1' }, role: 'admin', status: 'idle', error: null };

describe('useHasRole', () => {
  it('returns false when signed out, regardless of roles requested', () => {
    const { result } = renderWithAuthState(signedOut, ['agent', 'admin']);
    expect(result.current).toBe(false);
  });

  it('returns true for any signed-in user when no roles are specified', () => {
    const { result } = renderWithAuthState(asAgent, undefined);
    expect(result.current).toBe(true);
  });

  it('returns true when the user role is in the allowed list', () => {
    const { result } = renderWithAuthState(asAdmin, ['admin']);
    expect(result.current).toBe(true);
  });

  it('returns false when the user role is not in the allowed list', () => {
    const { result } = renderWithAuthState(asAgent, ['admin']);
    expect(result.current).toBe(false);
  });

  it('accepts a single role string as well as an array', () => {
    const { result } = renderWithAuthState(asAgent, 'agent');
    expect(result.current).toBe(true);
  });
});
