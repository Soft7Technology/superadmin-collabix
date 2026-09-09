import axios from "axios";
import type { Organization, PlatformUser, SystemLog, User } from "./types";

const origin = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");

const readCookie = (name: string) => {
  if (typeof document === "undefined") return undefined;
  return document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${name}=`))
    ?.split("=")
    .slice(1)
    .join("=");
};

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
  updateOrganization: async (
    id: string,
    payload: {
      name?: string;
      phone?: string;
      subscriptionStatus?: string;
      trialEndsAt?: string;
      plan?: string;
      isApproved?: boolean;
    },
  ) => {
    const { data } = await http.patch<{ message: string; organization: Organization }>(
      `/api/super/organizations/${id}`,
      payload,
    );
    return data;
  },
  approve: (id: string) => http.post(`/api/super/organizations/${id}/approve`),
  revoke: (id: string) => http.post(`/api/super/organizations/${id}/revoke`),
  updateOrgPlan: (id: string, plan: string) => http.patch<{ message: string; organization: Organization }>(`/api/super/organizations/${id}/plan`, { plan }),
  remove: (id: string) => http.delete(`/api/super/organizations/${id}`),
  createOrganization: async (payload: { name: string; ownerEmail?: string; phone?: string; plan?: string }) => {
    const { data } = await http.post<Organization>("/api/super/organizations", payload);
    return data;
  },
  impersonate: async (id: string) => {
    const { data } = await http.post<{ message: string; redirectUrl?: string; user?: any }>(`/api/super/organizations/${id}/impersonate`);
    return data;
  },
  users: async () => {
    const { data } = await http.get<PlatformUser[]>("/api/super/users");
    return data;
  },
  updateUser: async (id: string, payload: { name?: string; email?: string; roleName?: string; status?: string }) => {
    const { data } = await http.patch<{ message: string; user: PlatformUser }>(`/api/super/users/${id}`, payload);
    return data;
  },
  updateUserRole: async (id: string, roleName: string) => {
    const { data } = await http.patch<{ message: string; user: PlatformUser }>(`/api/super/users/${id}/role`, { roleName });
    return data;
  },
  updateUserStatus: async (id: string, status: string) => {
    const { data } = await http.patch<{ message: string; user: PlatformUser }>(`/api/super/users/${id}/status`, { status });
    return data;
  },
  deleteUser: async (id: string) => {
    const { data } = await http.delete<{ message: string; id: string }>(`/api/super/users/${id}`);
    return data;
  },
  logs: async () => {
    const { data } = await http.get<SystemLog[]>("/api/super/logs");
    return data;
  },
};

export function apiErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.error?.message || error.response?.data?.message || error.message || fallback;
  }
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return fallback;
}
