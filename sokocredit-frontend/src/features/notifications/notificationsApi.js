import { apiClient } from '../../api/client';

export async function getNotifications() {
  const { data } = await apiClient.get('/notifications');
  return data.notifications || [];
}

export async function markNotificationRead(id) {
  const { data } = await apiClient.patch(`/notifications/${id}/read`);
  return data.notification;
}

export async function markAllNotificationsRead() {
  const { data } = await apiClient.post('/notifications/read-all');
  return data.updated;
}
