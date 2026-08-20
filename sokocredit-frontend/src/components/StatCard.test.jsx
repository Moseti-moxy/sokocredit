import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Wallet } from 'lucide-react';
import StatCard from './StatCard';
import { formatKES } from '../utils/format';

describe('StatCard', () => {
  it('renders the label and a formatted KES currency value', () => {
    render(<StatCard label="Total Portfolio" value={formatKES(1250000)} icon={Wallet} />);

    expect(screen.getByText('Total Portfolio')).toBeInTheDocument();
    expect(screen.getByText('KES 1,250,000')).toBeInTheDocument();
  });

  it('renders a plain numeric value as-is (e.g. an active loan count)', () => {
    render(<StatCard label="Active Loans" value={142} deltaLabel="across 5 markets" />);

    expect(screen.getByText('142')).toBeInTheDocument();
    expect(screen.getByText('across 5 markets')).toBeInTheDocument();
  });

  it('renders a percent delta value', () => {
    render(<StatCard label="PAR > 30 Days" value="4.1%" delta="Watchlist" tone="danger" />);

    expect(screen.getByText('4.1%')).toBeInTheDocument();
    expect(screen.getByText('Watchlist')).toBeInTheDocument();
  });

  it('applies the danger tone class when tone="danger"', () => {
    render(<StatCard label="PAR > 30 Days" value="4.1%" tone="danger" />);

    expect(screen.getByText('4.1%')).toHaveClass('text-red-600');
  });
});
