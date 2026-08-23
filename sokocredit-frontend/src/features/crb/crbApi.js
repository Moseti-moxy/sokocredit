// CRB (Credit Reference Bureau) integration API
// Real-time credit checks against Kenya's CRB system

export const getCreditReport = async (customerId, idNumber) => {
  try {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/crb/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerId, idNumber }),
    });
    return response.json();
  } catch (error) {
    console.error('CRB check failed:', error);
    return { status: 'error', message: error.message };
  }
};

export const syncCRBData = async () => {
  try {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/crb/sync`, {
      method: 'POST',
    });
    return response.json();
  } catch (error) {
    console.error('CRB sync failed:', error);
    return { status: 'error' };
  }
};

export const getCRBStatus = async () => {
  try {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/crb/status`);
    return response.json();
  } catch (error) {
    console.error('CRB status check failed:', error);
    return { status: 'offline' };
  }
};
