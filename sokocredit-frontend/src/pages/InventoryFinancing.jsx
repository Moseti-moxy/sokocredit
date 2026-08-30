import { useState } from 'react';
import { Loader2, Plus, X } from 'lucide-react';
import AppShell from '../components/AppShell';
import LoanPicker from '../components/LoanPicker';
import { formatKES } from '../utils/format';
import { addInventoryItem, listInventoryItems, updateInventoryItem } from '../features/loans/api/inventoryApi';

const emptyForm = { itemName: '', quantity: '1', unitCost: '', supplier: '', purchasedAt: '' };

export default function InventoryFinancing() {
  const [loan, setLoan] = useState(null);
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [form, setForm] = useState(emptyForm);

  function handleLoanSelect(selected) {
    setLoan(selected);
    setItems([]);
    setError('');
    if (!selected) return;
    setIsLoading(true);
    listInventoryItems(selected.id)
      .then(setItems)
      .catch((err) => setError(err.response?.data?.error || 'Failed to load inventory items.'))
      .finally(() => setIsLoading(false));
  }

  async function submitAddStock(event) {
    event.preventDefault();
    setError('');
    try {
      const item = await addInventoryItem(loan.id, {
        itemName: form.itemName.trim(),
        quantity: Number(form.quantity),
        unitCost: Number(form.unitCost),
        supplier: form.supplier.trim() || undefined,
        purchasedAt: form.purchasedAt || undefined,
      });
      setItems((current) => [...current, item]);
      setNotice(`${item.itemName} was recorded against this loan.`);
      setForm(emptyForm);
      setIsAdding(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to record the inventory item.');
    }
  }

  async function recordSoldUnits(item, soldUnits) {
    try {
      const updated = await updateInventoryItem(loan.id, item.id, { soldUnits });
      setItems((current) => current.map((i) => (i.id === item.id ? updated : i)));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update sold units.');
    }
  }

  const totalFinanced = loan ? Number(loan.amount) : 0;
  const totalSold = items.reduce((sum, i) => sum + i.soldUnits, 0);

  return (
    <AppShell title="Inventory Financing" subtitle="Track stock purchased with an inventory-financing loan.">
      <div className="mb-6 rounded-2xl border border-brand-100 bg-white p-5">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Select a loan</p>
        <LoanPicker onSelect={handleLoanSelect} />
      </div>

      {loan && (
        <>
          <div className="grid lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-2xl border border-brand-100 p-5">
              <p className="text-xs text-slate-500 mb-1">Loan Amount</p>
              <p className="font-display text-2xl font-semibold text-slate-900">{formatKES(totalFinanced)}</p>
            </div>
            <div className="bg-white rounded-2xl border border-brand-100 p-5">
              <p className="text-xs text-slate-500 mb-1">Items Recorded</p>
              <p className="font-display text-2xl font-semibold text-slate-900">{items.length}</p>
            </div>
            <div className="bg-white rounded-2xl border border-brand-100 p-5">
              <p className="text-xs text-slate-500 mb-1">Total Units Sold</p>
              <p className="font-display text-2xl font-semibold text-slate-900">{totalSold}</p>
            </div>
            <div className="bg-white rounded-2xl border border-brand-100 p-5">
              <button type="button" onClick={() => setIsAdding(true)} className="flex items-center gap-2 text-brand-600 hover:text-brand-700 font-medium text-sm">
                <Plus size={16} /> Add Stock
              </button>
            </div>
          </div>

          {notice && <p role="status" className="mb-4 rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-800">{notice}</p>}
          {error && <p role="alert" className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
          {isLoading && (
            <p className="mb-4 flex items-center gap-2 text-sm text-slate-500"><Loader2 size={14} className="animate-spin" /> Loading inventory…</p>
          )}

          <div className="bg-white rounded-2xl border border-brand-100 overflow-hidden">
            <div className="p-5 border-b border-brand-100">
              <h2 className="font-display font-semibold text-slate-900">Stock Purchased With This Loan</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase text-slate-400 border-b border-brand-100 bg-brand-50">
                    <th className="px-5 py-3 font-medium">Item</th>
                    <th className="px-5 py-3 font-medium">Quantity</th>
                    <th className="px-5 py-3 font-medium">Unit Cost</th>
                    <th className="px-5 py-3 font-medium">Total Cost</th>
                    <th className="px-5 py-3 font-medium">Sold</th>
                    <th className="px-5 py-3 font-medium">Repayment</th>
                    <th className="px-5 py-3 font-medium">Days Left</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-b border-brand-50 last:border-0 hover:bg-brand-50/30">
                      <td className="px-5 py-3 font-medium text-slate-900">{item.itemName}</td>
                      <td className="px-5 py-3 text-slate-600">{item.quantity}</td>
                      <td className="px-5 py-3 text-slate-600">{formatKES(item.unitCost)}</td>
                      <td className="px-5 py-3 font-medium text-slate-900">{formatKES(item.totalCost)}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-16 overflow-hidden rounded-full bg-brand-100">
                            <div className="h-full bg-brand-500" style={{ width: `${Math.min(100, (item.soldUnits / item.quantity) * 100)}%` }} />
                          </div>
                          <input
                            type="number"
                            min="0"
                            max={item.quantity}
                            defaultValue={item.soldUnits}
                            onBlur={(event) => {
                              const value = Number(event.target.value);
                              if (value !== item.soldUnits) recordSoldUnits(item, value);
                            }}
                            className="w-16 rounded border border-brand-100 px-1.5 py-1 text-xs"
                          />
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${item.repaymentStatus === 'On Track' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                          {item.repaymentStatus}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-slate-600">{item.daysLeft != null ? `${item.daysLeft} days` : '—'}</td>
                    </tr>
                  ))}
                  {!items.length && !isLoading && (
                    <tr><td colSpan={7} className="px-5 py-6 text-center text-sm text-slate-500">No stock recorded against this loan yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-end bg-slate-950/35 p-4 sm:items-center sm:justify-center" role="dialog" aria-modal="true">
          <section className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <h2 className="font-display text-xl font-semibold text-slate-900">Record stock purchase</h2>
              <button type="button" onClick={() => setIsAdding(false)} aria-label="Close dialog" className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"><X size={20} /></button>
            </div>
            <form onSubmit={submitAddStock} className="grid gap-4">
              <Field label="Item name">
                <input required value={form.itemName} onChange={(e) => setForm((f) => ({ ...f, itemName: e.target.value }))} placeholder="e.g. 20kg sack of maize flour" className="app-field h-11 px-3" />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Quantity">
                  <input required type="number" min="0.01" step="0.01" value={form.quantity} onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))} className="app-field h-11 px-3" />
                </Field>
                <Field label="Unit cost (KES)">
                  <input required type="number" min="0.01" step="0.01" value={form.unitCost} onChange={(e) => setForm((f) => ({ ...f, unitCost: e.target.value }))} className="app-field h-11 px-3" />
                </Field>
              </div>
              <Field label="Supplier (optional)">
                <input value={form.supplier} onChange={(e) => setForm((f) => ({ ...f, supplier: e.target.value }))} className="app-field h-11 px-3" />
              </Field>
              <Field label="Purchase date (optional)">
                <input type="date" value={form.purchasedAt} onChange={(e) => setForm((f) => ({ ...f, purchasedAt: e.target.value }))} className="app-field h-11 px-3" />
              </Field>
              <button type="submit" className="rounded-xl bg-brand-500 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-600">Save stock record</button>
            </form>
          </section>
        </div>
      )}
    </AppShell>
  );
}

function Field({ label, children }) {
  return <label className="grid gap-1.5 text-sm font-medium text-slate-700">{label}{children}</label>;
}
