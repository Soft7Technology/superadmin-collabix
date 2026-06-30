import axios from "axios";
import type { Organization, User } from "./types";

const origin = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

const readCookie = (name: string) =>
  document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${name}=`))
    ?.split("=")
    .slice(1)
    .join("=");

const http = axios.create({
  baseURL: origin,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

http.interceptors.request.use((request) => {
  const csrfToken = readCookie("csrf_token");
  if (csrfToken) request.headers["X-CSRF-Token"] = csrfToken;
  return request;
});

export const api = {
  login: async (email: string, password: string) => {
    const { data } = await http.post<{ user: User }>("/auth/login", {
      email,
      password,
    });
    return data.user;
  },
  session: async () => {
    const { data } = await http.get<{ user: User }>("/auth/me");
    return data.user;
  },
  logout: () => http.post("/auth/logout"),
  organizations: async () => {
    const { data } = await http.get<Organization[]>("/api/super/organizations");
    return data;
  },
  approve: (id: string) => http.post(`/api/super/organizations/${id}/approve`),
  revoke: (id: string) => http.post(`/api/super/organizations/${id}/revoke`),
  remove: (id: string) => http.delete(`/api/super/organizations/${id}`),
};

export function apiErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.error?.message || fallback;
  }
  return fallback;
}
