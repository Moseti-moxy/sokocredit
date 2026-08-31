import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiClient } from '../../api/client';
import { addCustomer, findMockUser } from '../../data/mockAuth';
import { recordAgentActivity } from '../../data/agentDirectory';

export const AUTH_STORAGE_KEY = 'sokocredit.auth';

// Mock login/signup let the team build and test screens before the Flask
// /auth endpoints exist (same pattern as src/data/mockData.js). Only ever
// enabled in local dev builds (import.meta.env.DEV) with the flag explicitly
// set to 'true', so a production build can't accidentally ship with the
// hardcoded demo credentials in mockAuth.js reachable.
const USE_MOCK_AUTH = import.meta.env.DEV && import.meta.env.VITE_USE_MOCK_AUTH === 'true';

// "Remember me" checked -> localStorage (survives closing the browser).
// Unchecked -> sessionStorage (cleared when the tab/browser closes). We
// check both on load since we don't know which one was used last.
function loadPersistedAuth() {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY) || sessionStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return { token: null, user: null, role: null };
    const parsed = JSON.parse(raw);
    if (!parsed?.token || !parsed?.user) return { token: null, user: null, role: null };
    return { token: parsed.token, user: parsed.user, role: parsed.user.role ?? null };
  } catch {
    // Corrupt/blocked storage shouldn't crash the app — just start signed out.
    return { token: null, user: null, role: null };
  }
}

function persistAuth(token, user, remember) {
  const payload = JSON.stringify({ token, user });
  try {
    if (remember) {
      localStorage.setItem(AUTH_STORAGE_KEY, payload);
      sessionStorage.removeItem(AUTH_STORAGE_KEY);
    } else {
      sessionStorage.setItem(AUTH_STORAGE_KEY, payload);
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  } catch {
    // e.g. Safari private mode / storage quota — auth still works for this
    // session, it just won't survive a refresh.
  }
}

function clearPersistedAuth() {
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export const loginUser = createAsyncThunk(
  'auth/login',
  async ({ identifier, password, remember = true, portal = 'customer' }, { rejectWithValue }) => {
    if (USE_MOCK_AUTH) {
      const user = findMockUser(identifier, password);
      if (!user) return rejectWithValue('Invalid sign-in details.');
      const isCustomer = user.role === 'customer';
      if (portal === 'customer' && !isCustomer) return rejectWithValue('Please use the staff login for this account.');
      if (portal === 'staff' && isCustomer) return rejectWithValue('Please use the customer login for this account.');
      const token = `mock-jwt.${user.id}.${Date.now()}`;
      return { token, user, remember };
    }
    try {
      // Staff (User) accounts sign in with email; customer accounts sign in
      // with email-or-national-ID (see app/customer_auth_routes.py) — same
      // form field, different backend blueprint and response shape.
      if (portal === 'staff') {
        const { data } = await apiClient.post('/auth/login', { email: identifier, password });
        return { token: data.accessToken, user: data.user, remember };
      }
      const { data } = await apiClient.post('/customer-auth/login', { identifier, password });
      return { token: data.accessToken, user: { ...data.customer, role: 'customer' }, remember };
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || 'Unable to sign in. Please try again.');
    }
  }
);

export const signupUser = createAsyncThunk(
  'auth/signup',
  async ({ fullName, email, customerId, pin, profile }, { rejectWithValue }) => {
    if (USE_MOCK_AUTH) {
      try {
        const user = customerId ? addCustomer({ name: fullName, customerId, email, pin, ...profile }) : null;
        if (!user) return rejectWithValue('Only customers can create an account.');
        const safeUser = { ...user };
        delete safeUser.password;
        return { token: `mock-jwt.${user.id}.${Date.now()}`, user: safeUser };
      } catch (err) { return rejectWithValue(err.message); }
    }
    try {
      // Signup.jsx only registers customers (traders) — staff accounts are
      // created via the admin-only /api/users endpoints instead.
      const { data } = await apiClient.post('/customer-auth/register', {
        fullName,
        email,
        nationalId: customerId,
        phoneNumber: profile?.phone,
        password: pin,
      });
      return { token: data.accessToken, user: { ...data.customer, role: 'customer' } };
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || 'Unable to create account. Please try again.');
    }
  }
);

const persisted = loadPersistedAuth();

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    token: persisted.token,
    user: persisted.user,
    role: persisted.role,
    status: 'idle', // 'idle' | 'loading' | 'failed'
    error: null,
  },
  reducers: {
    logout: (state) => {
      state.token = null;
      state.user = null;
      state.role = null;
      state.status = 'idle';
      state.error = null;
      clearPersistedAuth();
    },
    clearAuthError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.status = 'idle';
        state.token = action.payload.token;
        state.user = action.payload.user;
        state.role = action.payload.user.role;
        persistAuth(action.payload.token, action.payload.user, action.payload.remember);
        // In the mock app this is the source of the admin directory's
        // "active" and "last active" indicators. The production equivalent
        // belongs in the authentication/session API.
        recordAgentActivity(action.payload.user);
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || 'Login failed.';
      })
      .addCase(signupUser.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(signupUser.fulfilled, (state, action) => {
        state.status = 'idle';
        state.token = action.payload.token;
        state.user = action.payload.user;
        state.role = action.payload.user.role;
        persistAuth(action.payload.token, action.payload.user, true);
      })
      .addCase(signupUser.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || 'Signup failed.';
      });
  },
});

export const { logout, clearAuthError } = authSlice.actions;
export default authSlice.reducer;
