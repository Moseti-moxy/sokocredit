// Inventory Financing API
// Track stock purchases and provide financing for inventory

export const createInventoryFinance = async (customerId, details) => {
  try {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/inventory/finance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerId,
        itemDescription: details.itemDescription,
        quantity: details.quantity,
        unitCost: details.unitCost,
        financedAmount: details.financedAmount,
        repaymentPeriod: details.repaymentPeriod,
        marketLocation: details.marketLocation,
      }),
    });
    return response.json();
  } catch (error) {
    console.error('Inventory finance creation failed:', error);
    return { status: 'error' };
  }
};

export const getInventoryTracking = async (customerId) => {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_API_BASE_URL}/api/inventory/tracking/${customerId}`
    );
    return response.json();
  } catch (error) {
    console.error('Inventory tracking failed:', error);
    return { status: 'error' };
  }
};

export const updateInventoryStatus = async (inventoryId, status, soldUnits) => {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_API_BASE_URL}/api/inventory/${inventoryId}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, soldUnits }),
      }
    );
    return response.json();
  } catch (error) {
    console.error('Inventory update failed:', error);
    return { status: 'error' };
  }
};
