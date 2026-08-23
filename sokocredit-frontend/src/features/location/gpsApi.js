// GPS Tracking API
// Track customer locations and optimize delivery/collection routes

export const trackCustomerLocation = async (customerId, latitude, longitude) => {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_API_BASE_URL}/api/gps/track`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          latitude,
          longitude,
          timestamp: new Date().toISOString(),
        }),
      }
    );
    return response.json();
  } catch (error) {
    console.error('GPS tracking failed:', error);
    return { status: 'error' };
  }
};

export const getCustomerLocation = async (customerId) => {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_API_BASE_URL}/api/gps/location/${customerId}`
    );
    return response.json();
  } catch (error) {
    console.error('Get location failed:', error);
    return { status: 'error' };
  }
};

export const optimizeDeliveryRoute = async (agentId, customerIds) => {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_API_BASE_URL}/api/gps/optimize-route`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId, customerIds }),
      }
    );
    return response.json();
  } catch (error) {
    console.error('Route optimization failed:', error);
    return { status: 'error' };
  }
};

export const getLocationHistory = async (customerId, days = 30) => {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_API_BASE_URL}/api/gps/history/${customerId}?days=${days}`
    );
    return response.json();
  } catch (error) {
    console.error('Location history fetch failed:', error);
    return { status: 'error', locations: [] };
  }
};

export const createGeofence = async (customerId, latitude, longitude, radius) => {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_API_BASE_URL}/api/gps/geofence`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId, latitude, longitude, radius }),
      }
    );
    return response.json();
  } catch (error) {
    console.error('Geofence creation failed:', error);
    return { status: 'error' };
  }
};
