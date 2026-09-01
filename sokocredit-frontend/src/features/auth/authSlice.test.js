import { describe, it, expect, beforeEach, vi } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import { apiClient } from '../../api/client';
import authReducer, { loginUser, logout, AUTH_STORAGE_KEY } from './authSlice';

vi.mock('../../api/client', () => ({
  apiClient: { post: vi.fn() },
}));

function buildStore() {
  return configureStore({ reducer: { auth: authReducer } });
}

describe('authSlice', () => {
  beforeEach(() => {
    // Storage is part of the auth contract, so each test starts independently.
    localStorage.clear();
    sessionStorage.clear();
    apiClient.post.mockReset();
    apiClient.post.mockResolvedValue({
      data: {
        accessToken: 'test-access-token',
        user: { id: 'user-1', fullName: 'Amina Agent', role: 'agent' },
      },
    });
  });

  it('starts signed out with no persisted session', () => {
    const store = buildStore();
    const state = store.getState().auth;
    expect(state.token).toBeNull();
    expect(state.user).toBeNull();
    expect(state.role).toBeNull();
  });

  it('login success: sets token, user, and role, and clears any error', async () => {
    const store = buildStore();
    await store.dispatch(
      loginUser({ identifier: 'amina@sokocredit.co.ke', password: 'SecurePass1', remember: true, portal: 'staff' })
    );

    const state = store.getState().auth;
    expect(state.status).toBe('idle');
    expect(state.error).toBeNull();
    expect(state.token).toBeTruthy();
    expect(state.user).toMatchObject({ id: 'user-1', role: 'agent', name: 'Amina Agent' });
    expect(state.role).toBe('agent');
  });

  it('login failure: wrong password sets an error and leaves the user signed out', async () => {
    apiClient.post.mockRejectedValueOnce({ response: { data: { error: 'Invalid email or password.' } } });
    const store = buildStore();
    await store.dispatch(
      loginUser({ identifier: 'amina@sokocredit.co.ke', password: 'wrong-password', remember: true, portal: 'staff' })
    );

    const state = store.getState().auth;
    expect(state.status).toBe('failed');
    expect(state.error).toBeTruthy();
    expect(state.token).toBeNull();
    expect(state.user).toBeNull();
  });

  it('login failure: unknown identifier is also rejected', async () => {
    apiClient.post.mockRejectedValueOnce({ response: { data: { error: 'Invalid email or password.' } } });
    const store = buildStore();
    await store.dispatch(
      loginUser({ identifier: 'nobody@sokocredit.co.ke', password: 'SecurePass1', remember: true, portal: 'staff' })
    );

    const state = store.getState().auth;
    expect(state.status).toBe('failed');
    expect(state.token).toBeNull();
  });

  it('token storage: remember=true persists to localStorage, not sessionStorage', async () => {
    const store = buildStore();
    await store.dispatch(
      loginUser({ identifier: 'amina@sokocredit.co.ke', password: 'SecurePass1', remember: true, portal: 'staff' })
    );

    expect(localStorage.getItem(AUTH_STORAGE_KEY)).toBeTruthy();
    expect(sessionStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
  });

  it('token storage: remember=false persists to sessionStorage, not localStorage', async () => {
    const store = buildStore();
    await store.dispatch(
      loginUser({ identifier: 'amina@sokocredit.co.ke', password: 'SecurePass1', remember: false, portal: 'staff' })
    );

    expect(sessionStorage.getItem(AUTH_STORAGE_KEY)).toBeTruthy();
    expect(localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
  });

  it('logout clears state and both storage locations', async () => {
    const store = buildStore();
    await store.dispatch(
      loginUser({ identifier: 'admin@sokocredit.co.ke', password: 'SecurePass1', remember: true, portal: 'staff' })
    );
    expect(store.getState().auth.token).toBeTruthy();

    store.dispatch(logout());

    const state = store.getState().auth;
    expect(state.token).toBeNull();
    expect(state.user).toBeNull();
    expect(state.role).toBeNull();
    expect(localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
    expect(sessionStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
  });
});
