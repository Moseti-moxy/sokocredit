// WhatsApp Business API Integration
// Send customer communications via WhatsApp

export const sendWhatsAppMessage = async (customerId, phoneNumber, message) => {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_API_BASE_URL}/api/whatsapp/send`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          phoneNumber,
          message,
          timestamp: new Date().toISOString(),
        }),
      }
    );
    return response.json();
  } catch (error) {
    console.error('WhatsApp send failed:', error);
    return { status: 'error' };
  }
};

export const sendLoanNotification = async (customerId, loanStatus, details) => {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_API_BASE_URL}/api/whatsapp/loan-notification`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          loanStatus,
          amount: details.amount,
          dueDate: details.dueDate,
          loanId: details.loanId,
        }),
      }
    );
    return response.json();
  } catch (error) {
    console.error('Loan notification failed:', error);
    return { status: 'error' };
  }
};

export const getWhatsAppMessageHistory = async (customerId) => {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_API_BASE_URL}/api/whatsapp/history/${customerId}`
    );
    return response.json();
  } catch (error) {
    console.error('Message history fetch failed:', error);
    return { status: 'error', messages: [] };
  }
};

export const enableWhatsAppChannel = async (customerId, phoneNumber) => {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_API_BASE_URL}/api/whatsapp/enable`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId, phoneNumber }),
      }
    );
    return response.json();
  } catch (error) {
    console.error('WhatsApp enable failed:', error);
    return { status: 'error' };
  }
};
