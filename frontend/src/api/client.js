import axios from "axios";

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8000",
  timeout: 30000,
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem("dd_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

client.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("dd_token");
      localStorage.removeItem("dd_user");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  },
);

export default client;
