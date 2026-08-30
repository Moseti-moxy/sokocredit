import { apiClient } from '../../../api/client';

// A "credit report" blends two things: SokoCredit's own repayment ledger
// (always available, computed by customers/scoring.py) and an external CRB
// bureau score (only available once a real bureau data-sharing agreement is
// signed - see app/crb.py). The bureau side legitimately 503s until then;
// that's surfaced as `external.available === false`, not treated as a
// network failure.
function isApiUnavailable(error) {
  return error?.response?.status === 502 || error?.code === 'ERR_NETWORK';
}

function buildSummary({ loansConsidered, defaultRatePct, overdueInstallments, outstandingBalance }) {
  if (!loansConsidered) return 'No loan history on file yet for this customer.';
  const onTimePct = Math.round(100 - defaultRatePct);
  return `${loansConsidered} loan${loansConsidered === 1 ? '' : 's'} considered, ${onTimePct}% on-time, ` +
    `${overdueInstallments} overdue installment${overdueInstallments === 1 ? '' : 's'}, ` +
    `KES ${outstandingBalance.toLocaleString('en-KE')} outstanding.`;
}

export async function getCreditReport(customerId) {
  const [scoreResult, crbResult] = await Promise.allSettled([
    apiClient.get(`/customers/${customerId}/credit-score`),
    apiClient.post(`/customers/${customerId}/crb-check`),
  ]);

  if (scoreResult.status === 'rejected') {
    if (isApiUnavailable(scoreResult.reason)) {
      return { unavailable: true };
    }
    throw scoreResult.reason;
  }
  const score = scoreResult.value.data;

  const external = crbResult.status === 'fulfilled'
    ? { available: true, score: crbResult.value.data.score, rating: crbResult.value.data.rating, flags: crbResult.value.data.flags }
    : { available: false, reason: crbResult.reason?.response?.data?.error || 'Bureau check is not available.' };

  return {
    unavailable: false,
    internal: { score: score.score, rating: score.rating },
    external,
    accounts: score.loansConsidered,
    outstanding: score.outstandingBalance,
    latePayments: score.overdueInstallments,
    summary: buildSummary(score),
  };
}
