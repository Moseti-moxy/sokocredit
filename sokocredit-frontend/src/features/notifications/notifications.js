import { store } from '../../app/store';
import { createCustomerNotification as addCommunicationNotification } from '../communications/communicationsSlice';

// The staff-facing bell (TopBar.jsx) is now backed by the real backend
// (see features/notifications/notificationsApi.js). This module only feeds
// the customer-only "Messages" inbox (CustomerMessages.jsx / communicationsSlice)
// for staff-initiated account events (approval, rejection, disbursement,
// repayment confirmation, reminders) - see LoanManagementPage.jsx's callers.
export function createCustomerNotification({ customerId, title, message, loanId }) {
  if (!customerId) return;
  const type = title === 'Loan request approved'
    ? 'loan_approved'
    : title === 'Loan request update'
      ? 'loan_rejected'
      : title === 'Loan disbursed'
        ? 'loan_disbursed'
        : title === 'Repayment reminder'
          ? 'payment_reminder'
          : 'account_update';
  store.dispatch(addCommunicationNotification({
    userId: customerId,
    type,
    title,
    body: message,
    refId: loanId || null,
  }));
}
