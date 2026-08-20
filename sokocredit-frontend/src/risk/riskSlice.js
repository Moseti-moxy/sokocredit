import { createSlice } from '@reduxjs/toolkit';
import { initialRiskAlerts } from './api/riskApi';

const riskSlice = createSlice({
  name: 'risk',
  initialState: {
    alerts: initialRiskAlerts,
    loading: false
  },
  reducers: {
    addRiskAlert: (state, action) => {
      state.alerts.unshift(action.payload);
    }
  }
});

export const { addRiskAlert } = riskSlice.actions;
export default riskSlice.reducer;