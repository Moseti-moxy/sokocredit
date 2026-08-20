// src/features/customers/pages/CustomerDirectoryPage.jsx
import { useMemo, useState } from 'react';
import { customers as mockCustomers } from '../data/customers.mock';
import CustomerListItem from '../components/CustomerListItem';
import CustomerDetailPanel from '../components/CustomerDetailPanel';
import CustomerSearchBar from '../components/CustomerSearchBar';
import './CustomerDirectoryPage.css';

const PAGE_SIZE = 3;

export default function CustomerDirectoryPage() {
  // In production this reads from customersSlice via useSelector,
  // and dispatches fetchCustomers() on mount. Using mock data directly
  // here so the module runs standalone during development.
  const [customers] = useState(mockCustomers);
  const [selectedId, setSelectedId] = useState(mockCustomers[0]?.id ?? null);
  const [search, setSearch] = useState('');
  const [market, setMarket] = useState('all');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const markets = useMemo(
    () => [...new Set(customers.map((c) => c.market).filter(Boolean))],
    [customers]
  );

  const filteredCustomers = useMemo(() => {
    return customers.filter((customer) => {
      const matchesSearch =
        search.trim() === '' ||
        customer.fullName.toLowerCase().includes(search.toLowerCase()) ||
        customer.id.toLowerCase().includes(search.toLowerCase());
      const matchesMarket = market === 'all' || customer.market === market;
      return matchesSearch && matchesMarket;
    });
  }, [customers, search, market]);

  const visibleCustomers = filteredCustomers.slice(0, visibleCount);
  const selectedCustomer = customers.find((c) => c.id === selectedId) ?? null;

  const handleNewCustomer = () => {
    // Routes to the onboarding flow — wire up with react-router:
    // navigate('/customers/new')
  };

  const handleIssueLoan = (customerId) => {
    // Hands off to the Loans module with the customer pre-filled.
    // Loans module owns this screen — this page only triggers navigation:
    // navigate(`/loans/new?customerId=${customerId}`)
    console.log('Issue loan for', customerId);
  };

  return (
    <div className="customer-directory-page">
      <header className="customer-directory-page__header">
        <div>
          <h1>Customer Directory</h1>
          <p>Manage field traders and microfinance profiles.</p>
        </div>
      </header>

      <CustomerSearchBar
        searchValue={search}
        onSearchChange={setSearch}
        marketValue={market}
        markets={markets}
        onMarketChange={setMarket}
        onNewCustomer={handleNewCustomer}
      />

      <div className="customer-directory-page__layout">
        <section className="customer-directory-page__list" aria-label="Active traders list">
          <div className="customer-directory-page__list-heading">
            <h2>Active Traders</h2>
            <span>{filteredCustomers.length} Total</span>
          </div>

          <div className="customer-directory-page__list-items">
            {visibleCustomers.length === 0 ? (
              <p className="customer-directory-page__empty">
                No traders match your search.
              </p>
            ) : (
              visibleCustomers.map((customer) => (
                <CustomerListItem
                  key={customer.id}
                  customer={customer}
                  isSelected={customer.id === selectedId}
                  onSelect={setSelectedId}
                />
              ))
            )}
          </div>

          {visibleCount < filteredCustomers.length && (
            <button
              type="button"
              className="customer-directory-page__load-more"
              onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
            >
              Load More ⌄
            </button>
          )}
        </section>

        <section className="customer-directory-page__detail" aria-label="Trader profile">
          <CustomerDetailPanel customer={selectedCustomer} onIssueLoan={handleIssueLoan} />
        </section>
      </div>
    </div>
  );
}
