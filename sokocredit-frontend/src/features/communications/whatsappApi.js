import { apiClient } from '../../api/client';

export async function sendWhatsAppMessage(customerId, message) {
  try {
    const { data } = await apiClient.post('/whatsapp/send', { customerId, message });
    return { sent: true, message: data.message };
  } catch (error) {
    return { sent: false, reason: error.response?.data?.error || 'Failed to send the WhatsApp message.' };
  }
}

export async function getWhatsAppHistory(customerId) {
  const { data } = await apiClient.get(`/whatsapp/history/${customerId}`);
  return data.messages || [];
}
