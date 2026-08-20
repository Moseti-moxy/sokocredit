import React from 'react';
import { useSelector } from 'react-redux';
import { CreditScoreBadge } from './CreditScoreBadge';

export const RiskAlertsPanel = () => {
  const { alerts } = useSelector((state) => state.risk);

  return (
    <div className="bg-white p-4 border rounded-lg shadow-sm">
      <h3 className="text-lg font-bold mb-4 text-gray-800 flex items-center gap-2">
        <span>⚠️</span> High-Risk Accounts
      </h3>

      <div className="space-y-3">
        {alerts.map((alert) => (
          <div key={alert.id} className="p-3 border rounded bg-red-50/50 flex items-center justify-between">
            <div>
              <p className="font-semibold text-gray-900">{alert.customerName}</p>
              <p className="text-xs text-red-600">
                {alert.missedPayments} missed payments • {alert.daysOverdue} days overdue
              </p>
            </div>
            <CreditScoreBadge score={alert.creditScore} />
          </div>
        ))}
      </div>
    </div>
  );
};