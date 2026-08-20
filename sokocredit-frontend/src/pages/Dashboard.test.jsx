import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import uiReducer from '../features/ui/uiSlice';
import authReducer from '../features/auth/authSlice';
import Dashboard from './Dashboard';
import { dashboardStats, recentActivity } from '../data/mockData';
import { formatKES } from '../utils/format';

// The Flask endpoints aren't live yet, so Dashboard currently reads from
// src/data/mockData.js — the same stand-in-for-the-API source the whole
// team builds against (see the comment at the top of that file). This test
// exercises the same "fetch → display" path the integration card asks for;
// swap the assertions' data source once Dashboard calls a real endpoint.
function renderDashboard(authState = { token: null, user: null, role: null, status: 'idle', error: null }) {
  const store = configureStore({
    reducer: { ui: uiReducer, auth: authReducer },
    preloadedState: { auth: authState },
  });

  return render(
    <Provider store={store}>
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    </Provider>
  );
}

describe('Dashboard', () => {
  it('displays the portfolio metrics from the data source', () => {
    renderDashboard();

    // Scope each lookup to its StatCard so a coincidental value match
    // elsewhere on the page (e.g. the Collection Targets section reusing
    // the same mock numbers) doesn't produce a false "multiple matches".
    function statCardValue(labelText) {
      const card = screen.getByText(labelText).closest('.bg-white');
      return within(card);
    }

    expect(
      statCardValue('Total Portfolio').getByText(formatKES(dashboardStats.totalPortfolio))
    ).toBeInTheDocument();
    expect(
      statCardValue('Active Loans').getByText(String(dashboardStats.activeLoans))
    ).toBeInTheDocument();
    expect(
      statCardValue("Today's Target").getByText(formatKES(dashboardStats.todaysTarget))
    ).toBeInTheDocument();
    expect(
      statCardValue('Collected Today').getByText(formatKES(dashboardStats.collectedToday))
    ).toBeInTheDocument();
  });

  it('lists every recent activity entry', () => {
    renderDashboard();

    // Two renderings exist (mobile card list + desktop table) — assert
    // against the desktop table since it's always in the DOM in jsdom.
    const table = screen.getByRole('table');
    recentActivity.forEach((item) => {
      expect(within(table).getByText(item.customer)).toBeInTheDocument();
    });
  });

  it('greets the signed-in user by first name when available', () => {
    renderDashboard({
      token: 't',
      user: { id: 'AGT-1', name: 'Mercy Wanjiku', role: 'agent', market: 'Thika Town' },
      role: 'agent',
      status: 'idle',
      error: null,
    });

    expect(screen.getAllByText(/Good morning, Mercy/).length).toBeGreaterThan(0);
  });
});
