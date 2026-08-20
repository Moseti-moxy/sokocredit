import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Plus, ChevronLeft, ChevronDown } from 'lucide-react';
import AppShell from '../components/AppShell';
import CustomerDetail from '../components/CustomerDetail';
import { selectCustomer, setSearchTerm } from '../features/customers/customersSlice';

export default function Customers() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { list, selectedId, searchTerm } = useSelector((state) => state.customers);
  const [mobileView, setMobileView] = useState('list'); // 'list' | 'detail'
  const [market, setMarket] = useState('All Markets');

  const filtered = list.filter((c) =>
    (c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.id.toLowerCase().includes(searchTerm.toLowerCase())) &&
    (market === 'All Markets' || c.market === market)
  );

  const selected = list.find((c) => c.id === selectedId);

  useEffect(() => {
    const customerId = searchParams.get('customer');
    if (customerId && list.some((customer) => customer.id === customerId) && customerId !== selectedId) {
      dispatch(selectCustomer(customerId));
    }
  }, [dispatch, list, searchParams, selectedId]);

  const handleSelect = (id) => {
    dispatch(selectCustomer(id));
    setSearchParams({ customer: id });
    setMobileView('detail');
  };

  return (
    <AppShell title="Customer Directory" subtitle="Manage field traders and microfinance profiles.">
      {/* Search + filter row */}
      <div className={`flex flex-col sm:flex-row gap-3 mb-5 ${mobileView === 'detail' ? 'hidden lg:flex' : 'flex'}`}>
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={searchTerm}
            onChange={(e) => dispatch(setSearchTerm(e.target.value))}
            placeholder="Search name or ID..."
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-brand-100 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
          />
        </div>
        <label className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-brand-100 bg-white text-sm text-slate-600 justify-center">
          <select aria-label="Market" value={market} onChange={(e) => setMarket(e.target.value)} className="bg-transparent outline-none">
            <option>All Markets</option>{[...new Set(list.map((c) => c.market))].map((item) => <option key={item}>{item}</option>)}
          </select><ChevronDown size={14} />
        </label>
        <button onClick={() => navigate('/customers/new')} className="flex items-center justify-center gap-1.5 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-xl px-4 py-2.5">
          <Plus size={16} /> New
        </button>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,360px)_1fr] gap-5">
        {/* List column */}
        <div className={`${mobileView === 'detail' ? 'hidden lg:block' : 'block'}`}>
          <h2 className="font-display font-semibold text-sm text-slate-900 mb-2">
            Active Traders <span className="text-slate-400 font-normal">({filtered.length} Total)</span>
          </h2>
          <div className="space-y-2">
            {filtered.map((c) => (
              <button
                key={c.id}
                onClick={() => handleSelect(c.id)}
                className={`w-full text-left bg-white rounded-xl border p-3.5 flex items-center gap-3 transition-colors ${
                  c.id === selectedId ? 'border-brand-500 ring-1 ring-brand-200' : 'border-brand-100 hover:border-brand-300'
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-medium text-sm shrink-0">
                  {c.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm text-slate-900 truncate">{c.name}</p>
                  <p className="text-xs text-slate-500 truncate">{c.business} · {c.market}</p>
                </div>
                <span
                  className={`text-[11px] font-medium px-2 py-1 rounded-full shrink-0 ${
                    c.status === 'Active' ? 'bg-brand-50 text-brand-700' : 'bg-red-50 text-red-600'
                  }`}
                >
                  {c.status}
                </span>
              </button>
            ))}
            <p className="w-full text-center text-sm text-slate-400 py-2">
              Showing {filtered.length} of {list.length} customers
            </p>
          </div>
        </div>

        {/* Detail column */}
        <div className={`${mobileView === 'list' ? 'hidden lg:block' : 'block'}`}>
          <button
            onClick={() => setMobileView('list')}
            className="lg:hidden flex items-center gap-1 text-sm font-medium text-brand-600 mb-3"
          >
            <ChevronLeft size={16} /> Back to directory
          </button>
          <CustomerDetail customer={selected} />
        </div>
      </div>
    </AppShell>
  );
}
