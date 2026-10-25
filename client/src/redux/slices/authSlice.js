// src/redux/slices/authSlice.js
import { createSlice } from '@reduxjs/toolkit';

/*
  Get user information from localStorage when the application starts.

  Why?
  Redux state refresh hone par reset ho jata hai.
  But localStorage browser refresh ke baad bhi data rakhta hai.

  So:
  Browser Refresh
       ↓
  Redux starts again
       ↓
  Read user from localStorage
       ↓
  Restore authenticated user
*/
const getStoredUser = () => {
  try {
    const storedUser = localStorage.getItem('user');

    if (!storedUser) {
      return null;
    }

    return JSON.parse(storedUser);
  } catch (error) {
    console.error('Error reading user from localStorage:', error);

    // Remove corrupted user data so that it does not
    // crash the application on future reloads.
    localStorage.removeItem('user');

    return null;
  }
};

const initialState = {
  user: getStoredUser(),
  loading: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',

  initialState,

  reducers: {
    loginStart: (state) => {
      state.loading = true;
      state.error = null;
    },

    loginSuccess: (state, action) => {
      state.loading = false;
      state.error = null;
      state.user = action.payload;
    },

    loginFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },

    logout: (state) => {
      state.user = null;
      state.loading = false;
      state.error = null;
    },
  },
});

// Export actions
export const {
  loginStart,
  loginSuccess,
  loginFailure,
  logout,
} = authSlice.actions;

// Export reducer
export default authSlice.reducer;