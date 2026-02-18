import { create } from "zustand";

const stored = {
  token: localStorage.getItem("dd_token") || null,
  user: JSON.parse(localStorage.getItem("dd_user") || "null"),
};

export const useAuthStore = create((set) => ({
  token: stored.token,
  user: stored.user,

  setAuth: (token, user) => {
    localStorage.setItem("dd_token", token);
    localStorage.setItem("dd_user", JSON.stringify(user));
    set({ token, user });
  },

  logout: () => {
    localStorage.removeItem("dd_token");
    localStorage.removeItem("dd_user");
    set({ token: null, user: null });
  },

  updateUser: (user) => {
    localStorage.setItem("dd_user", JSON.stringify(user));
    set({ user });
  },
}));
