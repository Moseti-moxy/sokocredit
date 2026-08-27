import { describe, expect, it, vi } from 'vitest';
import { apiClient } from '../../../api/client';
import { fetchCustomers } from './customersApi';

describe('fetchCustomers', () => {
  it('rejects a response without a customers array with an actionable error', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue({ data: '<!doctype html>' });

    await expect(fetchCustomers()).rejects.toThrow('Customer service returned an invalid response');

    vi.restoreAllMocks();
  });
});
