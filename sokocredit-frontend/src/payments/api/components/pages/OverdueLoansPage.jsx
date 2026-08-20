import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { sendReminder } from '../paymentsSlice';

export const OverdueLoansPage = () => {
  const dispatch = useDispatch();
  const { overdueLoans } = useSelector((state) => state.payments);

  const handleSendReminder = (loanId, channel) => {
    dispatch(sendReminder({ loanId, channel }));
    alert(`Reminder sent via ${channel}!`);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Overdue Loans & Reminders</h1>

      <div className="bg-white border rounded-lg overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-100 border-b">
            <tr>
              <th className="p-3">Customer</th>
              <th className="p-3">Amount Owed</th>
              <th className="p-3">Days Overdue</th>
              <th className="p-3">Severity</th>
              <th className="p-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {overdueLoans.map((loan) => (
              <tr key={loan.id} className="border-b">
                <td className="p-3 font-medium">{loan.customerName}</td>
                <td className="p-3">KES {loan.amountOwed.toLocaleString()}</td>
                <td className="p-3">{loan.daysOverdue} days</td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded text-xs font-bold ${
                    loan.severity === 'HIGH' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {loan.severity}
                  </span>
                </td>
                <td className="p-3 text-center space-x-2">
                  <button
                    onClick={() => handleSendReminder(loan.id, 'SMS')}
                    className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                  >
                    Send SMS
                  </button>
                  <button
                    onClick={() => handleSendReminder(loan.id, 'WhatsApp')}
                    className="px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                  >
                    Send WhatsApp
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};