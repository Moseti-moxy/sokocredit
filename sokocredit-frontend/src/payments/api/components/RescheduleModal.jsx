import React, { useState } from 'react';

export const RescheduleModal = ({ isOpen, onClose, loanId }) => {
  const [newDate, setNewDate] = useState('');
  const [reason, setReason] = useState('');
  const [authorized, setAuthorized] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!authorized) return;
    
    // Submit reschedule request
    console.log({ loanId, newDate, reason, authorized });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-lg">
        <h3 className="text-xl font-bold mb-4">Reschedule Payment</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">New Due Date</label>
            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              required
              className="w-full mt-1 p-2 border rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Reason for Reschedule</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              rows={3}
              className="w-full mt-1 p-2 border rounded"
              placeholder="State clear justification..."
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="authCheck"
              checked={authorized}
              onChange={(e) => setAuthorized(e.target.checked)}
              required
            />
            <label htmlFor="authCheck" className="text-xs text-gray-700">
              Authorized by Credit Officer (No silent term changes permitted)
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!authorized}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              Request Reschedule
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};