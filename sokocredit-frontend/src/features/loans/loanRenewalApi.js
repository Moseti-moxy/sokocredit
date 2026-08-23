// Loan Renewal Suggestions API
// Automated suggestions for loan renewals based on payment history

export const getLoanRenewalSuggestions = async (customerId) => {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_API_BASE_URL}/api/loan-renewal/suggestions/${customerId}`
    );
    return response.json();
  } catch (error) {
    console.error('Renewal suggestions fetch failed:', error);
    return { status: 'error', suggestions: [] };
  }
};

export const getPaymentHistory = async (customerId) => {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_API_BASE_URL}/api/loan-renewal/payment-history/${customerId}`
    );
    return response.json();
  } catch (error) {
    console.error('Payment history fetch failed:', error);
    return { status: 'error', payments: [] };
  }
};

export const calculateRenewalEligibility = async (loanId) => {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_API_BASE_URL}/api/loan-renewal/eligibility/${loanId}`
    );
    return response.json();
  } catch (error) {
    console.error('Eligibility calculation failed:', error);
    return { status: 'error', eligible: false };
  }
};

export const requestLoanRenewal = async (loanId, newAmount, newTerm) => {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_API_BASE_URL}/api/loan-renewal/request`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loanId,
          newAmount,
          newTerm,
          requestDate: new Date().toISOString(),
        }),
      }
    );
    return response.json();
  } catch (error) {
    console.error('Renewal request failed:', error);
    return { status: 'error' };
  }
};

export const getRenewalHistory = async (customerId) => {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_API_BASE_URL}/api/loan-renewal/history/${customerId}`
    );
    return response.json();
  } catch (error) {
    console.error('Renewal history fetch failed:', error);
    return { status: 'error', renewals: [] };
  }
};
