import { useState } from 'react';
import CustomerPicker from './CustomerPicker';
import { apiClient } from '../api/client';
import { formatKES } from '../utils/format';

// Two-step picker: choose a customer, then one of their loans. Used by pages
// where the real backend endpoint is scoped to a loan (inventory financing).
export default function LoanPicker({ onSelect }) {
  const [customer, setCustomer] = useState(null);
  const [loans, setLoans] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loanId, setLoanId] = useState('');

  function handleCustomerSelect(selected) {
    setCustomer(selected);
    setLoans([]);
    setLoanId('');
    onSelect(null);
    if (!selected) return;
    setIsLoading(true);
    apiClient.get('/loans', { params: { customerId: selected.id } })
      .then(({ data }) => setLoans(data.loans || []))
      .catch(() => setLoans([]))
      .finally(() => setIsLoading(false));
  }

  function handleLoanChange(event) {
    const id = event.target.value;
    setLoanId(id);
    onSelect(loans.find((loan) => loan.id === id) || null);
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <CustomerPicker selected={customer} onSelect={handleCustomerSelect} />
      {customer && (
        <select
          value={loanId}
          onChange={handleLoanChange}
          disabled={isLoading || !loans.length}
          className="w-full rounded-lg border border-brand-100 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 disabled:bg-slate-50 disabled:text-slate-400"
        >
          <option value="">
            {isLoading ? 'Loading loans…' : loans.length ? 'Select a loan…' : 'This customer has no loans'}
          </option>
          {loans.map((loan) => (
            <option key={loan.id} value={loan.id}>
              {loan.id.slice(0, 8)} · {formatKES(loan.amount)} · {loan.status}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
