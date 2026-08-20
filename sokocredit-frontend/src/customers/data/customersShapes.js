// src/features/customers/customersShapes.js
import PropTypes from 'prop-types';

export const paymentHistoryItemShape = PropTypes.shape({
  id: PropTypes.string.isRequired,
  type: PropTypes.oneOf(['repayment', 'disbursement']).isRequired,
  label: PropTypes.string.isRequired,
  method: PropTypes.string,
  timestamp: PropTypes.string.isRequired,
  amount: PropTypes.number.isRequired,
  loanBalance: PropTypes.number,
  principalAmount: PropTypes.number,
});

export const customerShape = PropTypes.shape({
  id: PropTypes.string.isRequired,
  fullName: PropTypes.string.isRequired,
  businessType: PropTypes.string.isRequired,
  market: PropTypes.string,
  address: PropTypes.string,
  status: PropTypes.oneOf(['Active', 'Overdue', 'Inactive']).isRequired,
  lastRepayment: PropTypes.string,
  joined: PropTypes.string,
  totalLoans: PropTypes.number,
  defaultRate: PropTypes.number,
  creditScore: PropTypes.number,
  photo: PropTypes.string,
  coordinates: PropTypes.shape({ lat: PropTypes.number, lng: PropTypes.number }),
  paymentHistory: PropTypes.arrayOf(paymentHistoryItemShape),
});
