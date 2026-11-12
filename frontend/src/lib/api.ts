import axios from "axios";

export const getApiBaseUrl = () => {
  if (typeof window !== "undefined") {
    // In browser client (mobile devices, desktops, LAN, Vercel, WebView):
    // If a custom external production API URL is explicitly configured (e.g. https://api.desimuchads.com/api/v1), use it.
    const customApi = process.env.NEXT_PUBLIC_API_URL;
    if (
      customApi &&
      !customApi.includes("localhost") &&
      !customApi.includes("127.0.0.1") &&
      customApi.startsWith("http")
    ) {
      return customApi;
    }
    // Otherwise, always route requests via same-origin relative path "/api/v1".
    // Next.js handles server-side proxying and serverless fallback seamlessly.
    // This eliminates CORS issues and port 8000 Windows Firewall blocks on mobile devices,
    // and ensures 100% reliable functionality when hosted on Vercel or accessed via mobile LAN.
    return "/api/v1";
  }
  // Server-side (SSR / RSC)
  return process.env.BACKEND_URL || "http://127.0.0.1:8000/api/v1";
};

export const api = axios.create({
  baseURL: getApiBaseUrl(),
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to attach bearer token and dynamic host
api.interceptors.request.use((config) => {
  config.baseURL = getApiBaseUrl();
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("muchad_access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Response interceptor for token refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshResponse = await axios.post(
          `${getApiBaseUrl()}/auth/refresh`,
          {},
          { withCredentials: true }
        );
        const newAccessToken = refreshResponse.data?.data?.access_token;
        if (newAccessToken && typeof window !== "undefined") {
          localStorage.setItem("muchad_access_token", newAccessToken);
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return api(originalRequest);
        }
      } catch (refreshErr) {
        if (typeof window !== "undefined") {
          localStorage.removeItem("muchad_access_token");
          localStorage.removeItem("muchad_user");
        }
      }
    }
    return Promise.reject(error);
  }
);

