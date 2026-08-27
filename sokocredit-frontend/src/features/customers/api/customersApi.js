import { apiClient } from '../../../api/client';

const STATUS_LABELS = { ACTIVE: 'Active', INACTIVE: 'Inactive', BLACKLISTED: 'Blacklisted' };

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-KE', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-KE', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export function normalizeDocument(doc) {
  return { id: doc.id, type: doc.documentType, filename: doc.originalFilename, uploadedAt: formatDate(doc.uploadedAt) };
}

// Maps the Flask Customer JSON onto the shape data/mockData.js established for
// this screen. Fields that only exist once loan history is loaded (credit
// score, payment history, totals) get sensible zero/empty defaults here and
// are filled in by fetchCreditProfile() once a customer is selected — the
// list endpoint intentionally doesn't compute per-customer credit scores so
// loading the full directory stays fast.
export function normalizeCustomer(apiCustomer) {
  return {
    id: apiCustomer.id,
    name: apiCustomer.fullName,
    business: apiCustomer.businessName,
    market: apiCustomer.market || '—',
    location: [apiCustomer.stallNumber && `Stall ${apiCustomer.stallNumber}`, apiCustomer.market].filter(Boolean).join(', ') || apiCustomer.address || '—',
    status: STATUS_LABELS[apiCustomer.status] || 'Active',
    phone: apiCustomer.phoneNumber,
    nationalId: apiCustomer.nationalId,
    joined: formatDate(apiCustomer.createdAt),
    yearsOperating: apiCustomer.yearsInBusiness,
    totalLoans: 0,
    defaultRate: 0,
    creditScore: 0,
    creditRating: null,
    lastRepayment: '—',
    paymentHistory: [],
    documents: (apiCustomer.documents || []).map(normalizeDocument),
  };
}

export async function fetchCustomers(params = {}) {
  const { data } = await apiClient.get('/customers', { params });
  if (!Array.isArray(data?.customers)) {
    throw new Error('Customer service returned an invalid response. Check the API URL and try again.');
  }
  return data.customers.map(normalizeCustomer);
}

export async function fetchCustomer(id) {
  const { data } = await apiClient.get(`/customers/${id}`);
  return normalizeCustomer(data.customer);
}

// Fetches score + history and reduces them to the fields CustomerDetail
// renders. Kept separate from fetchCustomer() since it's two extra requests
// only needed once a customer is actually opened.
export async function fetchCreditProfile(id) {
  const [{ data: score }, { data: history }] = await Promise.all([
    apiClient.get(`/customers/${id}/credit-score`),
    apiClient.get(`/customers/${id}/credit-history`),
  ]);
  const paymentHistory = (history.paymentHistory || []).map((p) => ({ ...p, date: formatDateTime(p.date) }));
  const lastIncoming = (history.paymentHistory || []).find((p) => p.direction === 'in');
  return {
    creditScore: score.score,
    creditRating: score.rating,
    totalLoans: score.loansConsidered,
    defaultRate: score.defaultRatePct ?? 0,
    lastRepayment: lastIncoming ? formatDate(lastIncoming.date) : '—',
    paymentHistory,
  };
}

export async function createCustomer(payload) {
  const { data } = await apiClient.post('/customers', payload);
  return normalizeCustomer(data.customer);
}

export async function updateCustomer(id, payload) {
  const { data } = await apiClient.patch(`/customers/${id}`, payload);
  return normalizeCustomer(data.customer);
}

export async function uploadCustomerDocument(customerId, file, documentType) {
  const form = new FormData();
  form.append('file', file);
  form.append('documentType', documentType);
  const { data } = await apiClient.post(`/customers/${customerId}/documents`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return normalizeDocument(data.document);
}

export async function deleteCustomerDocument(customerId, documentId) {
  await apiClient.delete(`/customers/${customerId}/documents/${documentId}`);
  return documentId;
}
