// profileSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "";

export const updateProfile = createAsyncThunk(
  "profile/updateProfile",
  async (formData) => {
    const res = await axios.put(`${API_URL}/api/users/profile`, formData);
    return res.data;
  },
);

const profileSlice = createSlice({
  name: "profile",
  initialState: { user: null },
  reducers: {
    setUser: (state, action) => {
      state.user = action.payload;
    }, // Directly set user profile
  },
  extraReducers: (builder) => {
    builder.addCase(updateProfile.fulfilled, (state, action) => {
      state.user = action.payload; // Update profile on successful change
    });
  },
});

export const { setUser } = profileSlice.actions;
export default profileSlice.reducer;
