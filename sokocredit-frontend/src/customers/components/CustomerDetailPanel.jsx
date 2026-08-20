// src/features/customers/components/CustomerDetailPanel.jsx
import PropTypes from 'prop-types';
import { customerShape } from '../customersShapes';
import CreditScoreGauge from './CreditScoreGauge';
import PaymentHistoryList from './PaymentHistoryList';
import './CustomerDetailPanel.css';

function getInitials(fullName) {
  return fullName
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export default function CustomerDetailPanel({ customer, onIssueLoan }) {
  if (!customer) {
    return (
      <div className="customer-detail-panel customer-detail-panel--empty">
        <p>Select a trader from the list to view their profile.</p>
      </div>
    );
  }

  return (
    <div className="customer-detail-panel">
      {/* Profile header */}
      <div className="customer-detail-card customer-detail-header">
        <div className="customer-detail-header__avatar">
          {customer.photo ? (
            <img src={customer.photo} alt={customer.fullName} />
          ) : (
            <span>{getInitials(customer.fullName)}</span>
          )}
        </div>

        <div className="customer-detail-header__info">
          <h2>{customer.fullName}</h2>
          <p>🏪 {customer.businessType}</p>
        </div>

        <div className="customer-detail-header__actions">
          <button type="button" className="btn btn--icon" aria-label="Call customer">
            📞
          </button>
          <button type="button" className="btn btn--primary" onClick={() => onIssueLoan(customer.id)}>
            Issue Loan
          </button>
        </div>

        <dl className="customer-detail-header__meta">
          <div>
            <dt>Client ID</dt>
            <dd>{customer.id}</dd>
          </div>
          <div>
            <dt>Joined</dt>
            <dd>{customer.joined}</dd>
          </div>
          <div>
            <dt>Total Loans</dt>
            <dd>{customer.totalLoans}</dd>
          </div>
          <div>
            <dt>Default Rate</dt>
            <dd>{customer.defaultRate}%</dd>
          </div>
        </dl>
      </div>

      {/* Credit score + location row */}
      <div className="customer-detail-row">
        <div className="customer-detail-card customer-detail-card--score">
          <div className="customer-detail-card__header">
            <h3>Credit Trust Score</h3>
            <span aria-hidden="true">📈</span>
          </div>
          <CreditScoreGauge score={customer.creditScore} />
        </div>

        <div className="customer-detail-card customer-detail-card--location">
          <div className="customer-detail-card__header">
            <h3>Business Location</h3>
            <span aria-hidden="true">🗺️</span>
          </div>
          <p className="customer-detail-card__address">{customer.address}</p>
          <div className="customer-detail-card__map-placeholder" role="img" aria-label="Map showing business location">
            📍
          </div>
        </div>
      </div>

      {/* Payment history */}
      <PaymentHistoryList items={customer.paymentHistory} onViewAll={() => {}} />
    </div>
  );
}

CustomerDetailPanel.propTypes = {
  customer: customerShape,
  onIssueLoan: PropTypes.func.isRequired,
};

CustomerDetailPanel.defaultProps = {
  customer: null,
};
