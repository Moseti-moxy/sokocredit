import { createSlice } from '@reduxjs/toolkit';

const customersSlice = createSlice({
  name: 'customers',
  initialState: {
    // Customer records are loaded from the persistent backend database.
    list: [],
    selectedId: null,
    searchTerm: '',
  },
  reducers: {
    selectCustomer: (state, action) => {
      state.selectedId = action.payload;
    },
    setSearchTerm: (state, action) => {
      state.searchTerm = action.payload;
    },
    addCustomer: (state, action) => {
      state.list.unshift(action.payload);
      state.selectedId = action.payload.id;
    },
    replaceCustomers: (state, action) => {
      state.list = action.payload;
      state.selectedId = action.payload[0]?.id ?? null;
    },
  },
});

export const { selectCustomer, setSearchTerm, addCustomer, replaceCustomers } = customersSlice.actions;
export default customersSlice.reducer;
