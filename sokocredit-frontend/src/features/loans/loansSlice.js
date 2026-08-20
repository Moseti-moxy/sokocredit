import { createSlice } from '@reduxjs/toolkit';
import { loans } from '../../data/mockData';

const loansSlice = createSlice({
  name: 'loans',
  initialState: {
    list: loans,
    statusFilter: 'All',
  },
  reducers: {
    setStatusFilter: (state, action) => {
      state.statusFilter = action.payload;
    },
    addLoan: (state, action) => {
      state.list.unshift(action.payload);
    },
  },
});

export const { setStatusFilter, addLoan } = loansSlice.actions;
export default loansSlice.reducer;
