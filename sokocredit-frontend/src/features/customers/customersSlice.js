import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import * as customersApi from './api/customersApi';

export const loadCustomers = createAsyncThunk('customers/load', () => customersApi.fetchCustomers());

// Loads score + payment history for one customer and merges it into that
// customer's entry in `list`. Called when a customer is opened, not on
// directory load, so the list stays fast for large customer counts.
export const loadCustomerDetail = createAsyncThunk('customers/loadDetail', async (customerId) => {
  const creditProfile = await customersApi.fetchCreditProfile(customerId);
  return { customerId, creditProfile };
});

export const registerCustomer = createAsyncThunk('customers/register', (payload) => customersApi.createCustomer(payload));

export const uploadCustomerDocument = createAsyncThunk(
  'customers/uploadDocument',
  async ({ customerId, file, documentType }) => {
    const document = await customersApi.uploadCustomerDocument(customerId, file, documentType);
    return { customerId, document };
  }
);

const customersSlice = createSlice({
  name: 'customers',
  initialState: {
    list: [],
    selectedId: null,
    searchTerm: '',
    status: 'idle', // idle | loading | succeeded | failed
    error: null,
    detailStatus: 'idle',
  },
  reducers: {
    selectCustomer: (state, action) => {
      state.selectedId = action.payload;
    },
    setSearchTerm: (state, action) => {
      state.searchTerm = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadCustomers.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(loadCustomers.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.list = action.payload;
        if (!state.selectedId && action.payload.length) state.selectedId = action.payload[0].id;
      })
      .addCase(loadCustomers.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Could not load customers.';
      })
      .addCase(loadCustomerDetail.pending, (state) => {
        state.detailStatus = 'loading';
      })
      .addCase(loadCustomerDetail.fulfilled, (state, action) => {
        state.detailStatus = 'succeeded';
        const { customerId, creditProfile } = action.payload;
        const customer = state.list.find((c) => c.id === customerId);
        if (customer) Object.assign(customer, creditProfile);
      })
      .addCase(loadCustomerDetail.rejected, (state) => {
        state.detailStatus = 'failed';
      })
      .addCase(registerCustomer.fulfilled, (state, action) => {
        state.list.unshift(action.payload);
        state.selectedId = action.payload.id;
      })
      .addCase(uploadCustomerDocument.fulfilled, (state, action) => {
        const { customerId, document } = action.payload;
        const customer = state.list.find((c) => c.id === customerId);
        if (customer) customer.documents = [document, ...(customer.documents || [])];
      });
  },
});

export const { selectCustomer, setSearchTerm } = customersSlice.actions;
export default customersSlice.reducer;
