import { apiClient } from '../../api/client';

function isApiUnavailable(error) {
  return error?.response?.status === 502 || error?.code === 'ERR_NETWORK';
}

// GET /api/customers already returns latitude/longitude, but
// customersApi.js's normalizeCustomer() drops them (not needed by the
// customer directory screens) - map them separately here.
function normalizeLocation(customer) {
  return {
    id: customer.id,
    name: customer.fullName,
    market: customer.market || '—',
    lat: customer.latitude,
    lng: customer.longitude,
    status: customer.status === 'ACTIVE' ? 'Active' : 'Inactive',
  };
}

export async function fetchCustomerLocations() {
  const { data } = await apiClient.get('/customers', { params: { status: 'ACTIVE' } });
  return (data.customers || [])
    .map(normalizeLocation)
    .filter((location) => location.lat != null && location.lng != null);
}

export async function optimizeRoute({ startLat, startLng, market }) {
  try {
    const { data } = await apiClient.get('/customers/route-optimize', {
      params: { startLat, startLng, ...(market ? { market } : {}) },
    });
    return { route: data.route, totalDistanceKm: data.totalDistanceKm };
  } catch (error) {
    if (isApiUnavailable(error)) return { route: [], totalDistanceKm: 0, unavailable: true };
    throw error;
  }
}
