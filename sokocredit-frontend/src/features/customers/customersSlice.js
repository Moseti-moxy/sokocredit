import { createSlice } from '@reduxjs/toolkit';
import { customers } from '../../data/mockData';

const customersSlice = createSlice({
  name: 'customers',
  initialState: {
    list: customers,
    selectedId: customers[0]?.id ?? null,
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
  },
});

export const { selectCustomer, setSearchTerm, addCustomer } = customersSlice.actions;
export default customersSlice.reducer;
