// src/features/customers/components/CustomerSearchBar.jsx
import PropTypes from 'prop-types';
import './CustomerSearchBar.css';

export default function CustomerSearchBar({
  searchValue,
  onSearchChange,
  marketValue,
  markets,
  onMarketChange,
  onNewCustomer,
}) {
  return (
    <div className="customer-search-bar">
      <div className="customer-search-bar__input">
        <span aria-hidden="true">🔍</span>
        <input
          type="text"
          placeholder="Search name or ID..."
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          aria-label="Search customers by name or ID"
        />
      </div>

      <select
        className="customer-search-bar__select"
        value={marketValue}
        onChange={(e) => onMarketChange(e.target.value)}
        aria-label="Filter by market"
      >
        <option value="all">All Markets</option>
        {markets.map((market) => (
          <option key={market} value={market}>
            {market}
          </option>
        ))}
      </select>

      <button type="button" className="btn btn--primary" onClick={onNewCustomer}>
        + New
      </button>
    </div>
  );
}

CustomerSearchBar.propTypes = {
  searchValue: PropTypes.string.isRequired,
  onSearchChange: PropTypes.func.isRequired,
  marketValue: PropTypes.string.isRequired,
  markets: PropTypes.arrayOf(PropTypes.string).isRequired,
  onMarketChange: PropTypes.func.isRequired,
  onNewCustomer: PropTypes.func.isRequired,
};
