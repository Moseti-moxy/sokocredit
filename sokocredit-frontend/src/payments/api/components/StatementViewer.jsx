import React from 'react';

export const StatementViewer = ({ customerName = "John Doe", loanId = "loan-001", payments = [] }) => {
  const handlePrint = () => {
    window.print();
  };

  const totalPaid = payments.reduce((acc, p) => acc + p.amount, 0);

  return (
    <div className="bg-white p-6 border rounded-lg shadow-sm print:shadow-none print:border-none">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">Loan Statement</h2>
          <p className="text-sm text-gray-500">Loan ID: {loanId} | Customer: {customerName}</p>
        </div>
        <button
          onClick={handlePrint}
          className="px-4 py-2 bg-gray-800 text-white rounded text-sm print:hidden"
        >
          Print / Download PDF
        </button>
      </div>

      <table className="w-full text-left text-sm border-collapse mb-6">
        <thead>
          <tr className="border-b bg-gray-50">
            <th className="p-2">Date</th>
            <th className="p-2">Method</th>
            <th className="p-2">Ref #</th>
            <th className="p-2 text-right">Amount Paid</th>
          </tr>
        </thead>
        <tbody>
          {payments.length === 0 ? (
            <tr>
              <td colSpan={4} className="p-4 text-center text-gray-500">No payment records found.</td>
            </tr>
          ) : (
            payments.map((p) => (
              <tr key={p.id} className="border-b">
                <td className="p-2">{p.date || p.timestamp?.split('T')[0]}</td>
                <td className="p-2">{p.paymentMethod}</td>
                <td className="p-2">{p.reference || p.id}</td>
                <td className="p-2 text-right font-medium">KES {p.amount.toLocaleString()}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <div className="flex justify-between items-center pt-4 border-t font-bold">
        <span>Total Paid to Date:</span>
        <span className="text-lg text-green-600">KES {totalPaid.toLocaleString()}</span>
      </div>
    </div>
  );
};