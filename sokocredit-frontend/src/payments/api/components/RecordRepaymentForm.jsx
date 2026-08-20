import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { recordRepayment } from '../paymentsSlice';

export const RecordRepaymentForm = ({ totalDue = 10000 }) => {
  const dispatch = useDispatch();
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('M-Pesa');
  const [showWarning, setShowWarning] = useState(false);

  const parsedAmount = Number(amount) || 0;
  const remainingBalance = Math.max(0, totalDue - parsedAmount);
  const isPartial = parsedAmount < totalDue;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!showWarning) {
      setShowWarning(true); // Hard warning step
      return;
    }

    dispatch(recordRepayment({
      amount: parsedAmount,
      paymentMethod: method,
      isPartial,
      remainingBalance
    }));

    setShowWarning(false);
    setAmount('');
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 bg-white border rounded-lg shadow-sm max-w-md">
      <h3 className="text-lg font-bold mb-3">Record Repayment</h3>

      <div className="mb-3">
        <label className="block text-sm font-medium text-gray-700">Amount Received</label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
          className="w-full mt-1 p-2 border rounded"
          placeholder="0.00"
        />
      </div>

      <div className="mb-3">
        <label className="block text-sm font-medium text-gray-700">Payment Method</label>
        <select value={method} onChange={(e) => setMethod(e.target.value)} className="w-full mt-1 p-2 border rounded">
          <option value="M-Pesa">M-Pesa</option>
          <option value="Cash">Cash</option>
          <option value="Airtel Money">Airtel Money</option>
          <option value="Stripe">Stripe</option>
        </select>
      </div>

      {parsedAmount > 0 && (
        <div className="p-2 mb-3 bg-gray-50 border rounded text-sm">
          <p>Status: {isPartial ? <span className="text-yellow-600 font-semibold">Partial Payment</span> : <span className="text-green-600 font-semibold">Full Payment</span>}</p>
          <p>Remaining Balance: <strong>KES {remainingBalance}</strong></p>
        </div>
      )}

      {showWarning && (
        <div className="p-2 mb-3 bg-red-50 text-red-700 border border-red-200 text-xs rounded">
          ⚠️ <strong>Warning:</strong> Confirmed payments are immutable and cannot be edited or erased later.
        </div>
      )}

      <button type="submit" disabled={!method} className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 font-medium">
        {showWarning ? 'Confirm & Record Payment' : 'Submit Repayment'}
      </button>
    </form>
  );
};