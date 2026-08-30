import { apiClient } from '../../../api/client';

export async function listInventoryItems(loanId) {
  const { data } = await apiClient.get(`/loans/${loanId}/inventory-items`);
  return data.items || [];
}

export async function addInventoryItem(loanId, { itemName, quantity, unitCost, supplier, purchasedAt }) {
  const { data } = await apiClient.post(`/loans/${loanId}/inventory-items`, {
    itemName, quantity, unitCost, supplier, purchasedAt,
  });
  return data.item;
}

export async function updateInventoryItem(loanId, itemId, payload) {
  const { data } = await apiClient.patch(`/loans/${loanId}/inventory-items/${itemId}`, payload);
  return data.item;
}
