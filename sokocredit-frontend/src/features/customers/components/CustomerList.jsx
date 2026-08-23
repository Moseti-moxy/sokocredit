import { useState } from 'react';
import Avatar from './Avatar';
import { Icon } from './Icon';

export default function CustomerList({ customers, selectedId, onSelect, total }) {
  const [visible, setVisible] = useState(10);
  const shown = customers.slice(0, visible);
  return <div className="customer-panel"><div className="panel-title"><h2>Active Traders</h2><span>{total} Total</span></div><div className="customer-list">{customers.length ? shown.map((customer) => <button type="button" className={`customer-row ${selectedId === customer.id ? 'selected' : ''}`} key={customer.id} onClick={() => onSelect(customer)}><Avatar customer={customer} /><span className="customer-copy"><strong>{customer.name}</strong><small>{customer.business}</small><small className="location"><Icon name="pin" size={13} />{customer.market}</small></span><span className={`status ${customer.status.toLowerCase()}`}>{customer.status}</span></button>) : <div className="empty"><Icon name="users" size={32} /><strong>No customers yet</strong><span>Try a different search or market filter.</span></div>}</div>{visible < customers.length && <button type="button" className="load-more" onClick={() => setVisible((count) => count + 10)}>Load More <Icon name="chevron" size={14} /></button>}</div>;
}
