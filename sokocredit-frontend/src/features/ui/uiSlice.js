import { createSlice } from '@reduxjs/toolkit';

const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    // Controls the slide-out drawer on mobile/tablet. Desktop sidebar
    // ignores this and is always visible.
    navOpen: false,
  },
  reducers: {
    openNav: (state) => {
      state.navOpen = true;
    },
    closeNav: (state) => {
      state.navOpen = false;
    },
    toggleNav: (state) => {
      state.navOpen = !state.navOpen;
    },
  },
});

export const { openNav, closeNav, toggleNav } = uiSlice.actions;
export default uiSlice.reducer;
