import { apiClient } from '../../../api/client';

// Looks up a customer's existing business registration record via Kenya's
// eCitizen/BRS system - see app/business_registry.py. Requires the customer
// to already have a businessRegistrationNumber on file (set during
// onboarding); legitimately 503s until a real BRS API consumer agreement is
// configured.
export async function checkBusinessRegistry(customerId) {
  try {
    const { data } = await apiClient.post(`/customers/${customerId}/business-registry-check`);
    return { available: true, result: data.result };
  } catch (error) {
    return { available: false, reason: error.response?.data?.error || 'Business registry lookup is not available.' };
  }
}
