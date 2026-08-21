import { describe, it, expect, beforeEach } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import authReducer, { loginUser, logout, AUTH_STORAGE_KEY } from './authSlice';

function buildStore() {
  return configureStore({ reducer: { auth: authReducer } });
}

describe('authSlice', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
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
      loginUser({ identifier: 'AGT-8492', password: '1234', remember: true, portal: 'staff' })
    );

    const state = store.getState().auth;
    expect(state.status).toBe('idle');
    expect(state.error).toBeNull();
    expect(state.token).toBeTruthy();
    expect(state.user).toMatchObject({ id: 'AGT-8492', role: 'agent' });
    expect(state.role).toBe('agent');
  });

  it('login failure: wrong password sets an error and leaves the user signed out', async () => {
    const store = buildStore();
    await store.dispatch(
      loginUser({ identifier: 'AGT-8492', password: 'wrong-password', remember: true, portal: 'staff' })
    );

    const state = store.getState().auth;
    expect(state.status).toBe('failed');
    expect(state.error).toBeTruthy();
    expect(state.token).toBeNull();
    expect(state.user).toBeNull();
  });

  it('login failure: unknown identifier is also rejected', async () => {
    const store = buildStore();
    await store.dispatch(
      loginUser({ identifier: 'NOBODY-0000', password: '1234', remember: true, portal: 'staff' })
    );

    const state = store.getState().auth;
    expect(state.status).toBe('failed');
    expect(state.token).toBeNull();
  });

  it('token storage: remember=true persists to localStorage, not sessionStorage', async () => {
    const store = buildStore();
    await store.dispatch(
      loginUser({ identifier: 'AGT-8492', password: '1234', remember: true, portal: 'staff' })
    );

    expect(localStorage.getItem(AUTH_STORAGE_KEY)).toBeTruthy();
    expect(sessionStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
  });

  it('token storage: remember=false persists to sessionStorage, not localStorage', async () => {
    const store = buildStore();
    await store.dispatch(
      loginUser({ identifier: 'AGT-8492', password: '1234', remember: false, portal: 'staff' })
    );

    expect(sessionStorage.getItem(AUTH_STORAGE_KEY)).toBeTruthy();
    expect(localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
  });

  it('logout clears state and both storage locations', async () => {
    const store = buildStore();
    await store.dispatch(
      loginUser({ identifier: 'ADM-1001', password: '1001', remember: true, portal: 'staff' })
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
