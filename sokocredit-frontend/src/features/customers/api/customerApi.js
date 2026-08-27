import { apiClient } from '../../../api/client'

export async function getCustomers() {
  const { data } = await apiClient.get('/customers')
  return data.customers || []
}

export async function createCustomer(values) {
  const { data } = await apiClient.post('/customers', values)
  return data.customer
}
