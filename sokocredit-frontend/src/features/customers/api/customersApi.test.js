import { describe, expect, it, vi } from 'vitest';
import { apiClient } from '../../../api/client';
import { fetchCustomers } from './customersApi';

describe('fetchCustomers', () => {
  it('rejects a response without a customers array with an actionable error', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue({ data: '<!doctype html>' });

    await expect(fetchCustomers()).rejects.toThrow('Customer service returned an invalid response');

    vi.restoreAllMocks();
  });

  it('uses demo customers when the Vite API proxy has no backend to reach', async () => {
    vi.spyOn(apiClient, 'get').mockRejectedValue({ response: { status: 502 } });

    await expect(fetchCustomers()).resolves.toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'SC-2023-894', name: 'Jane Doe' }),
    ]));

    vi.restoreAllMocks();
  });
});
