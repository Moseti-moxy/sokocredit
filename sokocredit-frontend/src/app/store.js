import { configureStore } from '@reduxjs/toolkit';
import uiReducer from '../features/ui/uiSlice';
import customersReducer from '../features/customers/customersSlice';
import loansReducer from '../features/loans/loansSlice';
import authReducer from '../features/auth/authSlice';
import communicationsReducer from '../features/communications/communicationsSlice';

export const store = configureStore({
  reducer: {
    ui: uiReducer,
    customers: customersReducer,
    loans: loansReducer,
    auth: authReducer,
    communications: communicationsReducer,
  },
});
