// Business Registration Integration API
// Verify business registration with Kenya's business registry systems

export const verifyBusinessRegistration = async (businessName, registrationNumber) => {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_API_BASE_URL}/api/business-registry/verify`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessName, registrationNumber }),
      }
    );
    return response.json();
  } catch (error) {
    console.error('Business verification failed:', error);
    return { status: 'error', verified: false };
  }
};

export const getBusinessDetails = async (registrationNumber) => {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_API_BASE_URL}/api/business-registry/${registrationNumber}`
    );
    return response.json();
  } catch (error) {
    console.error('Business details fetch failed:', error);
    return { status: 'error' };
  }
};

export const linkBusinessToCustomer = async (customerId, businessRegistration) => {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_API_BASE_URL}/api/business-registry/link`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          registrationNumber: businessRegistration.registrationNumber,
          businessName: businessRegistration.businessName,
          registrationType: businessRegistration.registrationType,
          registrationDate: businessRegistration.registrationDate,
        }),
      }
    );
    return response.json();
  } catch (error) {
    console.error('Business linking failed:', error);
    return { status: 'error' };
  }
};

export const getBusinessStatus = async (customerId) => {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_API_BASE_URL}/api/business-registry/status/${customerId}`
    );
    return response.json();
  } catch (error) {
    console.error('Business status fetch failed:', error);
    return { status: 'error', linked: false };
  }
};
