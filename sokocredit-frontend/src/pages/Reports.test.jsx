import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import uiReducer from '../features/ui/uiSlice';
import authReducer from '../features/auth/authSlice';
import Reports from './Reports';
import { defaultRateByMarket } from '../data/mockData';

function renderReports() {
  const store = configureStore({
    reducer: { ui: uiReducer, auth: authReducer },
    preloadedState: {
      auth: { token: 't', user: { id: 'AGT-1', name: 'Jane', role: 'agent' }, role: 'agent', status: 'idle', error: null },
    },
  });

  return render(
    <Provider store={store}>
      <MemoryRouter>
        <Reports />
      </MemoryRouter>
    </Provider>
  );
}

describe('Reports filters', () => {
  it('shows every market row by default (no filters applied)', () => {
    renderReports();
    const table = screen.getByRole('table');
    defaultRateByMarket.forEach((row) => {
      expect(within(table).getByText(row.location)).toBeInTheDocument();
    });
  });

  it('narrows the table when a location filter is applied', async () => {
    const user = userEvent.setup();
    renderReports();

    const target = defaultRateByMarket.find((r) => r.location !== 'All Markets');
    await user.selectOptions(screen.getByLabelText('Location'), target.location);

    const table = screen.getByRole('table');
    expect(within(table).getByText(target.location)).toBeInTheDocument();

    defaultRateByMarket
      .filter((r) => r.location !== target.location)
      .forEach((r) => {
        expect(within(table).queryByText(r.location)).not.toBeInTheDocument();
      });
  });

  it('narrows the table when a loan officer filter is applied', async () => {
    const user = userEvent.setup();
    renderReports();

    const target = defaultRateByMarket[0];
    await user.selectOptions(screen.getByLabelText('Loan Officer'), target.officer);

    const table = screen.getByRole('table');
    expect(within(table).getByText(target.location)).toBeInTheDocument();
  });

  it('shows an empty-state message when no rows match the combined filters', async () => {
    const user = userEvent.setup();
    renderReports();

    // Pair a location with an officer who doesn't work that market.
    const mismatch = defaultRateByMarket[0];
    const otherOfficer = defaultRateByMarket.find((r) => r.officer !== mismatch.officer).officer;

    await user.selectOptions(screen.getByLabelText('Location'), mismatch.location);
    await user.selectOptions(screen.getByLabelText('Loan Officer'), otherOfficer);

    expect(screen.getByText(/No results for this filter combination/i)).toBeInTheDocument();
  });

  it('disables the export button when the filtered table is empty', async () => {
    const user = userEvent.setup();
    renderReports();

    const mismatch = defaultRateByMarket[0];
    const otherOfficer = defaultRateByMarket.find((r) => r.officer !== mismatch.officer).officer;

    await user.selectOptions(screen.getByLabelText('Location'), mismatch.location);
    await user.selectOptions(screen.getByLabelText('Loan Officer'), otherOfficer);

    expect(screen.getByRole('button', { name: /export csv/i })).toBeDisabled();
  });
});
