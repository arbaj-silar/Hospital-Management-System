
import axios from "axios";
import keycloak from "../auth/keycloak.js";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
  async (config) => {
    if (!keycloak.authenticated) {
      throw new Error("Please log in before calling the API.");
    }

    // Refresh the token if it expires within 30 seconds.
    await keycloak.updateToken(30);

    if (!keycloak.token) {
      throw new Error("No access token is available. Please log in again.");
    }

    config.headers.Authorization = `Bearer ${keycloak.token}`;

    return config;
  },
  (error) => Promise.reject(error)
);

export default api;
