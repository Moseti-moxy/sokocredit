import React from 'react';
import { useSelector } from 'react-redux';
import { RecordRepaymentForm } from '../components/RecordRepaymentForm';
import { StatementViewer } from '../components/StatementViewer';

export const PaymentsPage = () => {
  const { paymentsHistory } = useSelector((state) => state.payments);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Payments Management</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <RecordRepaymentForm totalDue={15000} />
        </div>
        <div>
          <StatementViewer payments={paymentsHistory} />
        </div>
      </div>
    </div>
  );
};