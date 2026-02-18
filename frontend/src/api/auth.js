import axios from "axios";
import client from "./client";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export const authApi = {
  login: async (email, password) => {
    const formData = new URLSearchParams();
    formData.append("username", email);
    formData.append("password", password);

    return await axios.post(`${API_BASE}/api/v1/auth/login`, formData, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });
  },

  // ✅ FIXED: Accept token as parameter
  me: async (token) => {
    return await axios.get(`${API_BASE}/api/v1/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },

  register: async (email, password, fullName, role = "patient") => {
    return await axios.post(`${API_BASE}/api/v1/auth/register`, {
      email,
      password,
      full_name: fullName,
      role,
    });
  },

  changePassword: async (oldPassword, newPassword) => {
    return await client.put("/api/v1/auth/change-password", {
      old_password: oldPassword,
      new_password: newPassword,
    });
  },

  deactivateAccount: async () => {
    return await client.delete("/api/v1/auth/account");
  },
};
