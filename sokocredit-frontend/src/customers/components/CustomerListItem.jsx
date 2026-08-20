// src/features/customers/components/CustomerListItem.jsx
import PropTypes from 'prop-types';
import { customerShape } from '../customersShapes';
import StatusBadge from './StatusBadge';
import './CustomerListItem.css';

function getInitials(fullName) {
  return fullName
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export default function CustomerListItem({ customer, isSelected, onSelect }) {
  return (
    <button
      type="button"
      className={`customer-list-item ${isSelected ? 'customer-list-item--selected' : ''}`}
      onClick={() => onSelect(customer.id)}
      data-testid={`customer-list-item-${customer.id}`}
    >
      <div className="customer-list-item__avatar">
        {customer.photo ? (
          <img src={customer.photo} alt="" />
        ) : (
          <span>{getInitials(customer.fullName)}</span>
        )}
      </div>

      <div className="customer-list-item__body">
        <div className="customer-list-item__top-row">
          <span className="customer-list-item__name">{customer.fullName}</span>
          <StatusBadge status={customer.status} />
        </div>
        <span className="customer-list-item__business">{customer.businessType}</span>
        <span className="customer-list-item__market">📍 {customer.market}</span>
      </div>
    </button>
  );
}

CustomerListItem.propTypes = {
  customer: customerShape.isRequired,
  isSelected: PropTypes.bool,
  onSelect: PropTypes.func.isRequired,
};

CustomerListItem.defaultProps = {
  isSelected: false,
};
