import { apiClient, USE_MOCK_AUTH } from '../../api/client';
import { loans as demoLoans } from '../../data/mockData';

function isApiUnavailable(error) {
  return error?.response?.status === 502 || error?.code === 'ERR_NETWORK';
}

// Every suggestion GET /api/risk/renewal-suggestions returns is implicitly
// eligible (the backend only returns customers who qualify) - see
// app/risk.py:suggest_renewals().
export async function getRenewalSuggestions() {
  try {
    const { data } = await apiClient.get('/risk/renewal-suggestions');
    return data.suggestions || [];
  } catch (error) {
    const status = error?.response?.status;
    if (isApiUnavailable(error) || USE_MOCK_AUTH || status === 401 || status === 422) return demoLoans || [];
    throw error;
  }
}

export async function getLoanDetail(loanId) {
  const { data } = await apiClient.get(`/loans/${loanId}`);
  return data.loan;
}

export async function requestLoanRenewal(loanId, terms = {}) {
  const { data } = await apiClient.post(`/loans/${loanId}/renew`, terms);
  return data.loan;
}
