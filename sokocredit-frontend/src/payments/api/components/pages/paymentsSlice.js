import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  paymentsHistory: [],
  overdueLoans: [
    { id: 'loan-201', customerName: 'Jane Smith', amountOwed: 12000, daysOverdue: 18, severity: 'HIGH' },
    { id: 'loan-202', customerName: 'Peter Kamau', amountOwed: 4500, daysOverdue: 5, severity: 'LOW' }
  ],
  loading: false,
  error: null
};

const paymentsSlice = createSlice({
  name: 'payments',
  initialState,
  reducers: {
    recordRepayment: (state, action) => {
      // Immutability rule: Once created, payment records cannot be directly edited/removed
      const newPayment = {
        ...action.payload,
        id: `pay-${Date.now()}`,
        timestamp: new Date().toISOString()
      };
      state.paymentsHistory.unshift(newPayment);
    },
    sendReminder: (state, action) => {
      const { loanId, channel } = action.payload;
      const loan = state.overdueLoans.find(l => l.id === loanId);
      if (loan) {
        loan.lastReminderSent = new Date().toISOString();
        loan.lastChannel = channel;
      }
    }
  }
});

export const { recordRepayment, sendReminder } = paymentsSlice.actions;
export default paymentsSlice.reducer;