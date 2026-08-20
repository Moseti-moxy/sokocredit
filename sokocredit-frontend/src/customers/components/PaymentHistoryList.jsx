// src/features/customers/components/PaymentHistoryList.jsx
import PropTypes from 'prop-types';
import { paymentHistoryItemShape } from '../customersShapes';
import './PaymentHistoryList.css';

function formatAmount(amount) {
  const isPositive = amount >= 0;
  const formatted = `KES ${Math.abs(amount).toLocaleString()}`;
  return { text: `${isPositive ? '+' : '-'} ${formatted}`, isPositive };
}

export default function PaymentHistoryList({ items, onViewAll }) {
  return (
    <div className="payment-history">
      <div className="payment-history__header">
        <h3>Payment History</h3>
        {onViewAll && (
          <button type="button" className="payment-history__view-all" onClick={onViewAll}>
            View All
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <p className="payment-history__empty">No transactions recorded yet.</p>
      ) : (
        <ul className="payment-history__list">
          {items.map((item) => {
            const { text, isPositive } = formatAmount(item.amount);
            return (
              <li key={item.id} className="payment-history__row">
                <div
                  className={`payment-history__icon ${
                    item.type === 'repayment'
                      ? 'payment-history__icon--in'
                      : 'payment-history__icon--out'
                  }`}
                >
                  {item.type === 'repayment' ? '↓' : '↑'}
                </div>

                <div className="payment-history__details">
                  <span className="payment-history__label">{item.label}</span>
                  <span className="payment-history__meta">
                    {item.timestamp}
                    {item.method ? ` • ${item.method}` : ''}
                  </span>
                </div>

                <div className="payment-history__amounts">
                  <span
                    className={
                      isPositive ? 'payment-history__amount--in' : 'payment-history__amount--out'
                    }
                  >
                    {text}
                  </span>
                  <span className="payment-history__balance">
                    {item.loanBalance !== undefined
                      ? `Loan Bal: KES ${item.loanBalance.toLocaleString()}`
                      : `Principal Amount`}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

PaymentHistoryList.propTypes = {
  items: PropTypes.arrayOf(paymentHistoryItemShape).isRequired,
  onViewAll: PropTypes.func,
};

PaymentHistoryList.defaultProps = {
  onViewAll: undefined,
};
