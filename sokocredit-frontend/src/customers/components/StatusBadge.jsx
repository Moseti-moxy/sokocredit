// src/features/customers/components/StatusBadge.jsx
import PropTypes from 'prop-types';
import './StatusBadge.css';

export default function StatusBadge({ status }) {
  const variant = status.toLowerCase(); // 'active' | 'overdue' | 'inactive'
  return <span className={`status-badge status-badge--${variant}`}>{status}</span>;
}

StatusBadge.propTypes = {
  status: PropTypes.oneOf(['Active', 'Overdue', 'Inactive']).isRequired,
};
