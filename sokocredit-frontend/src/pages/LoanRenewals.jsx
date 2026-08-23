import { useState } from 'react';
import { TrendingUp, CheckCircle, AlertCircle } from 'lucide-react';
import AppShell from '../components/AppShell';
import { formatKES } from '../utils/format';

export default function LoanRenewals() {
  const [renewals] = useState([
    { id: 1, customer: 'Jane Wanjiru', loanAmount: 50000, paidAmount: 48000, paymentHistory: 'Excellent', eligible: true, suggestedAmount: 75000, daysUntilMaturity: 5 },
    { id: 2, customer: 'David Otieno', loanAmount: 100000, paidAmount: 95000, paymentHistory: 'Good', eligible: true, suggestedAmount: 150000, daysUntilMaturity: 10 },
    { id: 3, customer: 'Mary Kipchoge', loanAmount: 75000, paidAmount: 60000, paymentHistory: 'Fair', eligible: false, suggestedAmount: 0, daysUntilMaturity: 15 },
  ]);

  return (
    <AppShell title="Loan Renewals" subtitle="Automated renewal suggestions based on payment history.">
      <div className="grid lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-brand-100 p-5">
          <p className="text-xs text-slate-500 mb-1">Eligible for Renewal</p>
          <p className="font-display text-2xl font-semibold text-green-600">{renewals.filter(r => r.eligible).length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-brand-100 p-5">
          <p className="text-xs text-slate-500 mb-1">Not Eligible</p>
          <p className="font-display text-2xl font-semibold text-orange-600">{renewals.filter(r => !r.eligible).length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-brand-100 p-5">
          <p className="text-xs text-slate-500 mb-1">Maturing Soon</p>
          <p className="font-display text-2xl font-semibold text-red-600">{renewals.filter(r => r.daysUntilMaturity <= 7).length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-brand-100 p-5">
          <p className="text-xs text-slate-500 mb-1">Avg Payment Rate</p>
          <p className="font-display text-2xl font-semibold text-blue-600">96%</p>
        </div>
      </div>

      <div className="space-y-4">
        {renewals.map((renewal) => (
          <div key={renewal.id} className={`rounded-2xl border p-5 ${renewal.eligible ? 'bg-white border-brand-100' : 'bg-orange-50/30 border-orange-100'}`}>
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold text-slate-900">{renewal.customer}</h3>
                  {renewal.eligible ? (
                    <span className="flex items-center gap-1 text-xs bg-green-50 text-green-700 px-2 py-1 rounded-full">
                      <CheckCircle size={12} /> Eligible
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs bg-orange-50 text-orange-700 px-2 py-1 rounded-full">
                      <AlertCircle size={12} /> Not Eligible
                    </span>
                  )}
                </div>
              </div>
              <span className={`text-xs font-medium px-3 py-1.5 rounded-full ${
                renewal.daysUntilMaturity <= 7
                  ? 'bg-red-100 text-red-700'
                  : 'bg-blue-100 text-blue-700'
              }`}>
                {renewal.daysUntilMaturity} days to maturity
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4 pb-4 border-b border-brand-100">
              <div>
                <p className="text-xs text-slate-500 mb-1">Original Amount</p>
                <p className="font-semibold text-slate-900">{formatKES(renewal.loanAmount)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Amount Paid</p>
                <p className="font-semibold text-green-600">{formatKES(renewal.paidAmount)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Payment History</p>
                <p className="font-semibold text-slate-900">{renewal.paymentHistory}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Payment Rate</p>
                <p className="font-semibold text-blue-600">{Math.round((renewal.paidAmount / renewal.loanAmount) * 100)}%</p>
              </div>
            </div>

            {renewal.eligible && renewal.suggestedAmount > 0 && (
              <div className="bg-brand-50 rounded-lg p-3 mb-4">
                <p className="text-xs text-slate-600 mb-1">Suggested Renewal Amount Based on Payment History</p>
                <p className="font-display text-lg font-semibold text-brand-700">{formatKES(renewal.suggestedAmount)}</p>
              </div>
            )}

            <div className="flex gap-2">
              {renewal.eligible ? (
                <>
                  <button className="flex-1 bg-brand-500 hover:bg-brand-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium">
                    Process Renewal
                  </button>
                  <button className="px-4 py-2.5 border border-brand-200 text-brand-700 rounded-lg text-sm font-medium hover:bg-brand-50">
                    View Details
                  </button>
                </>
              ) : (
                <button className="w-full px-4 py-2.5 border border-orange-200 text-orange-700 rounded-lg text-sm font-medium hover:bg-orange-50">
                  Review Payment History
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
