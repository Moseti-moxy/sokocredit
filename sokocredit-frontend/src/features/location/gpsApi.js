import { apiClient, USE_MOCK_AUTH } from '../../api/client';
import { customers as demoCustomers } from '../../data/mockData';

function isApiUnavailable(error) {
  return error?.response?.status === 502 || error?.code === 'ERR_NETWORK';
}

// GET /api/customers already returns latitude/longitude, but
// customersApi.js's normalizeCustomer() drops them (not needed by the
// customer directory screens) - map them separately here.
function normalizeLocation(customer) {
  return {
    id: customer.id,
    name: customer.fullName || customer.name,
    market: customer.market || '—',
    lat: customer.latitude,
    lng: customer.longitude,
    status: customer.status === 'ACTIVE' ? 'Active' : 'Inactive',
  };
}

function normalizeAlert(alert) {
  return {
    id: alert.id,
    type: alert.type,
    customerId: alert.customerId,
    distanceM: alert.distanceM,
    status: alert.status,
    createdAt: alert.createdAt,
  };
}

export async function fetchLocationCustomers() {
  const { data } = await apiClient.get('/customers', { params: { status: 'ACTIVE' } });
  return (data.customers || []).map(normalizeLocation);
}

export async function fetchCustomerLocations() {
  try {
    const { data } = await apiClient.get('/customers', { params: { status: 'ACTIVE' } });
    return (data.customers || []).map(normalizeLocation).filter((location) => location.lat != null && location.lng != null);
  } catch (error) {
    const status = error?.response?.status;
    if (USE_MOCK_AUTH || status === 401 || status === 422) {
      return (demoCustomers || []).map((c) => ({
        id: c.id,
        name: c.name,
        market: c.market,
        lat: c.latitude,
        lng: c.longitude,
        status: 'Active',
      })).filter((l) => l.lat != null && l.lng != null);
    }
    throw error;
  }
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

export async function recordCustomerLocation(customerId, { latitude, longitude }) {
  const { data } = await apiClient.post(`/customers/${customerId}/location`, { latitude, longitude });
  return data;
}

export async function fetchGeofenceAlerts() {
  try {
    const { data } = await apiClient.get('/geofence-alerts', { params: { status: 'open', per_page: 20 } });
    return (data.items || []).map(normalizeAlert);
  } catch (error) {
    if (USE_MOCK_AUTH || isApiUnavailable(error)) return [];
    throw error;
  }
}

export async function resolveGeofenceAlert(alertId) {
  await apiClient.patch(`/geofence-alerts/${alertId}`, { status: 'resolved' });
  return alertId;
}
