import { Phone, MapPin, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { formatKES } from '../utils/format';
import { useNavigate } from 'react-router-dom';

export default function CustomerDetail({ customer }) {
  const navigate = useNavigate();
  if (!customer) {
    return (
      <div className="bg-white rounded-2xl border border-brand-100 p-8 text-center text-slate-400 text-sm">
        Select a customer to view their profile.
      </div>
    );
  }

  const scoreLabel =
    customer.creditScore >= 80 ? 'Excellent' : customer.creditScore >= 60 ? 'Good' : customer.creditScore >= 40 ? 'Fair' : 'Poor';

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-brand-100 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-14 h-14 rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center font-display font-semibold text-lg shrink-0">
              {customer.name.charAt(0)}
            </div>
            <div className="min-w-0">
              <h3 className="font-display font-semibold text-lg text-slate-900 truncate">{customer.name}</h3>
              <p className="text-sm text-slate-500 truncate">{customer.business}</p>
            </div>
          </div>
          <a
            href="tel:+254700000000"
            aria-label="Call customer"
            className="p-2.5 rounded-full bg-brand-50 text-brand-600 shrink-0"
          >
            <Phone size={16} />
          </a>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-5 text-sm">
          <div>
            <p className="text-xs uppercase text-slate-400">Client ID</p>
            <p className="font-medium text-slate-800">{customer.id}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-slate-400">Joined</p>
            <p className="font-medium text-slate-800">{customer.joined}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-slate-400">Total Loans</p>
            <p className="font-medium text-slate-800">{customer.totalLoans}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-slate-400">Default Rate</p>
            <p className="font-medium text-brand-600">{customer.defaultRate}%</p>
          </div>
        </div>

        <button onClick={() => navigate('/loans')} className="mt-5 w-full sm:w-auto bg-brand-500 hover:bg-brand-600 text-white font-medium rounded-xl px-5 py-2.5 transition-colors">
          Issue Loan
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-brand-100 p-5 flex flex-col items-center text-center">
          <p className="text-xs uppercase text-slate-400 mb-2 self-start">Credit Trust Score</p>
          <div className="relative w-28 h-28 flex items-center justify-center">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              <circle cx="50" cy="50" r="42" fill="none" stroke="#dcecd6" strokeWidth="10" />
              <circle
                cx="50" cy="50" r="42" fill="none" stroke="#3f7d2e" strokeWidth="10"
                strokeDasharray={2 * Math.PI * 42}
                strokeDashoffset={2 * Math.PI * 42 * (1 - customer.creditScore / 100)}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="font-display text-2xl font-semibold text-slate-900">{customer.creditScore}</span>
              <span className="text-[11px] font-medium text-brand-600">{scoreLabel}</span>
            </div>
          </div>
          <div className="flex justify-between w-full text-[11px] text-slate-400 mt-3">
            <span>Poor</span><span>Fair</span><span>Good</span><span className="text-brand-600 font-medium">Excellent</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-brand-100 p-5">
          <div className="flex items-center gap-1 text-xs uppercase text-slate-400 mb-2">
            <MapPin size={13} /> Business Location
          </div>
          <p className="text-sm font-medium text-slate-800 mb-3">{customer.location}</p>
          <div className="h-28 rounded-xl bg-brand-50 flex items-center justify-center text-brand-300">
            <MapPin size={28} />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-brand-100 p-5">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-display font-semibold text-slate-900 text-sm">Payment History</h4>
          <a href="#" className="text-xs font-medium text-brand-600 hover:underline">View All</a>
        </div>
        <div className="space-y-3">
          {customer.paymentHistory.length === 0 && (
            <p className="text-sm text-slate-400">No payment history yet.</p>
          )}
          {customer.paymentHistory.map((p) => (
            <div key={p.id} className="flex items-center gap-3">
              <span
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  p.direction === 'in' ? 'bg-brand-50 text-brand-600' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {p.direction === 'in' ? <ArrowDownLeft size={15} /> : <ArrowUpRight size={15} />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-800 truncate">{p.type}</p>
                <p className="text-xs text-slate-400 truncate">{p.date} · {p.method}</p>
              </div>
              <div className="text-right shrink-0">
                <p className={`text-sm font-semibold ${p.direction === 'in' ? 'text-brand-600' : 'text-slate-900'}`}>
                  {p.direction === 'in' ? '+' : '-'}{formatKES(p.amount)}
                </p>
                {p.balanceAfter !== null && (
                  <p className="text-[11px] text-slate-400">Bal: {formatKES(p.balanceAfter)}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
