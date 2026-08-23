import { useState } from 'react';
import { Plus } from 'lucide-react';
import AppShell from '../components/AppShell';
import { formatKES } from '../utils/format';

export default function InventoryFinancing() {
  const [inventory, setInventory] = useState([
    { id: 1, item: 'Vegetables', quantity: 50, unitCost: 2000, financedAmount: 80000, soldUnits: 32, repaymentStatus: 'On Track', daysLeft: 15 },
    { id: 2, item: 'Fruits', quantity: 100, unitCost: 1500, financedAmount: 120000, soldUnits: 65, repaymentStatus: 'On Track', daysLeft: 22 },
    { id: 3, item: 'Grains', quantity: 200, unitCost: 800, financedAmount: 160000, soldUnits: 120, repaymentStatus: 'At Risk', daysLeft: 5 },
  ]);
  const [notice, setNotice] = useState('');

  const addStock = () => {
    const id = Math.max(...inventory.map((item) => item.id), 0) + 1;
    setInventory((items) => [...items, { id, item: `New stock #${id}`, quantity: 1, unitCost: 0, financedAmount: 0, soldUnits: 0, repaymentStatus: 'On Track', daysLeft: 30 }]);
    setNotice('A new stock record was added. Update its details when the financing data is available.');
  };

  return (
    <AppShell title="Inventory Financing" subtitle="Track and manage stock financing for market traders.">
      <div className="grid lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-brand-100 p-5">
          <p className="text-xs text-slate-500 mb-1">Total Financed</p>
          <p className="font-display text-2xl font-semibold text-slate-900">{formatKES(inventory.reduce((sum, i) => sum + i.financedAmount, 0))}</p>
        </div>
        <div className="bg-white rounded-2xl border border-brand-100 p-5">
          <p className="text-xs text-slate-500 mb-1">Active Stocks</p>
          <p className="font-display text-2xl font-semibold text-slate-900">{inventory.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-brand-100 p-5">
          <p className="text-xs text-slate-500 mb-1">Total Sold</p>
          <p className="font-display text-2xl font-semibold text-slate-900">{inventory.reduce((sum, i) => sum + i.soldUnits, 0)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-brand-100 p-5">
          <button type="button" onClick={addStock} className="flex items-center gap-2 text-brand-600 hover:text-brand-700 font-medium text-sm">
            <Plus size={16} /> Add Stock
          </button>
        </div>
      </div>
      {notice && <p role="status" className="mb-4 rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-800">{notice}</p>}

      <div className="bg-white rounded-2xl border border-brand-100 overflow-hidden">
        <div className="p-5 border-b border-brand-100">
          <h2 className="font-display font-semibold text-slate-900">Active Inventory</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-slate-400 border-b border-brand-100 bg-brand-50">
                <th className="px-5 py-3 font-medium">Item</th>
                <th className="px-5 py-3 font-medium">Quantity</th>
                <th className="px-5 py-3 font-medium">Unit Cost</th>
                <th className="px-5 py-3 font-medium">Financed</th>
                <th className="px-5 py-3 font-medium">Sold</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Days Left</th>
              </tr>
            </thead>
            <tbody>
              {inventory.map((item) => (
                <tr key={item.id} className="border-b border-brand-50 last:border-0 hover:bg-brand-50/30">
                  <td className="px-5 py-3 font-medium text-slate-900">{item.item}</td>
                  <td className="px-5 py-3 text-slate-600">{item.quantity}</td>
                  <td className="px-5 py-3 text-slate-600">{formatKES(item.unitCost)}</td>
                  <td className="px-5 py-3 font-medium text-slate-900">{formatKES(item.financedAmount)}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-brand-100 rounded-full overflow-hidden">
                        <div className="h-full bg-brand-500" style={{ width: `${(item.soldUnits / item.quantity) * 100}%` }} />
                      </div>
                      <span className="text-xs font-medium">{Math.round((item.soldUnits / item.quantity) * 100)}%</span>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                      item.repaymentStatus === 'On Track' 
                        ? 'bg-green-50 text-green-700' 
                        : 'bg-red-50 text-red-700'
                    }`}>
                      {item.repaymentStatus}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-slate-600">{item.daysLeft} days</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
