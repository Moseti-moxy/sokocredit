import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/auth/authSlice';
import ProtectedRoute from './ProtectedRoute';

function renderProtected({ authState, allowedRoles, initialPath = '/dashboard' }) {
  const store = configureStore({
    reducer: { auth: authReducer },
    preloadedState: { auth: authState },
  });

  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/login" element={<div>Login Page</div>} />
          <Route element={<ProtectedRoute allowedRoles={allowedRoles} />}>
            <Route path="/dashboard" element={<div>Dashboard Page</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </Provider>
  );
}

const signedOut = { token: null, user: null, role: null, status: 'idle', error: null };
const asAgent = { token: 't', user: { id: 'AGT-1' }, role: 'agent', status: 'idle', error: null };
const asAdmin = { token: 't', user: { id: 'ADM-1' }, role: 'admin', status: 'idle', error: null };

describe('ProtectedRoute', () => {
  it('redirects unauthenticated users to /login', () => {
    renderProtected({ authState: signedOut });

    expect(screen.getByText('Login Page')).toBeInTheDocument();
    expect(screen.queryByText('Dashboard Page')).not.toBeInTheDocument();
  });

  it('renders the protected page for a signed-in user when no role is required', () => {
    renderProtected({ authState: asAgent });

    expect(screen.getByText('Dashboard Page')).toBeInTheDocument();
  });

  it('blocks wrong-role users from a role-restricted page', () => {
    renderProtected({ authState: asAgent, allowedRoles: ['admin'] });

    // Agent is signed in but not admin — ProtectedRoute sends them to "/",
    // which isn't one of the routes registered in this test, so neither
    // page renders. What matters is Dashboard/the restricted page does not.
    expect(screen.queryByText('Dashboard Page')).not.toBeInTheDocument();
  });

  it('renders the protected page for a user whose role is allowed', () => {
    renderProtected({ authState: asAdmin, allowedRoles: ['admin'] });

    expect(screen.getByText('Dashboard Page')).toBeInTheDocument();
  });
});
