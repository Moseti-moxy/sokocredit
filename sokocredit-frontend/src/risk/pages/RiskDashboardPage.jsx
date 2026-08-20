import React from 'react';
import { RiskAlertsPanel } from '../components/RiskAlertsPanel';

export const RiskDashboardPage = () => {
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Risk Management Dashboard</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-4 border rounded-lg shadow-sm">
          <h3 className="text-lg font-bold mb-2">Risk Policy & Rules</h3>
          <ul className="list-disc list-inside text-sm text-gray-600 space-y-2">
            <li>Accounts with <strong>3+ missed payments</strong> are automatically flagged as HIGH risk.</li>
            <li>Credit score under <strong>600</strong> restricts maximum loan request limit.</li>
            <li>Payment rescheduling requires supervisor authentication.</li>
          </ul>
        </div>
        <div>
          <RiskAlertsPanel />
        </div>
      </div>
    </div>
  );
};