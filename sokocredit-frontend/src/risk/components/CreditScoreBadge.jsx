import React from 'react';

export const CreditScoreBadge = ({ score }) => {
  let badgeColor = 'bg-green-100 text-green-800 border-green-300';
  let tier = 'Good';

  if (score < 600) {
    badgeColor = 'bg-red-100 text-red-800 border-red-300';
    tier = 'High Risk';
  } else if (score < 700) {
    badgeColor = 'bg-yellow-100 text-yellow-800 border-yellow-300';
    tier = 'Moderate Risk';
  }

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1 text-sm font-semibold border rounded-full ${badgeColor}`}>
      <span>Score: {score}</span>
      <span className="text-xs font-normal">({tier})</span>
    </div>
  );
};