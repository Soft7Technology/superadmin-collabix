import axios from "axios";
import type {
  FeatureFlag,
  Invoice,
  Organization,
  PlatformSettings,
  PlatformUser,
  SecurityPolicy,
  SupportTicket,
  SystemLog,
  TicketReply,
  User,
} from "./types";

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
  // Auth
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

  // Organizations
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
  updateOrgPlan: (id: string, plan: string) =>
    http.patch<{ message: string; organization: Organization }>(
      `/api/super/organizations/${id}/plan`,
      { plan },
    ),
  remove: (id: string) => http.delete(`/api/super/organizations/${id}`),
  createOrganization: async (payload: {
    name: string;
    ownerEmail?: string;
    phone?: string;
    plan?: string;
  }) => {
    const { data } = await http.post<Organization>("/api/super/organizations", payload);
    return data;
  },
  impersonate: async (id: string) => {
    const { data } = await http.post<{ message: string; redirectUrl?: string; user?: any }>(
      `/api/super/organizations/${id}/impersonate`,
    );
    return data;
  },

  // Platform Users
  users: async () => {
    const { data } = await http.get<PlatformUser[]>("/api/super/users");
    return data;
  },
  updateUser: async (
    id: string,
    payload: { name?: string; email?: string; roleName?: string; status?: string },
  ) => {
    const { data } = await http.patch<{ message: string; user: PlatformUser }>(
      `/api/super/users/${id}`,
      payload,
    );
    return data;
  },
  updateUserRole: async (id: string, roleName: string) => {
    const { data } = await http.patch<{ message: string; user: PlatformUser }>(
      `/api/super/users/${id}/role`,
      { roleName },
    );
    return data;
  },
  updateUserStatus: async (id: string, status: string) => {
    const { data } = await http.patch<{ message: string; user: PlatformUser }>(
      `/api/super/users/${id}/status`,
      { status },
    );
    return data;
  },
  deleteUser: async (id: string) => {
    const { data } = await http.delete<{ message: string; id: string }>(`/api/super/users/${id}`);
    return data;
  },

  // System Audit Logs
  logs: async (category?: string) => {
    const { data } = await http.get<SystemLog[]>("/api/super/logs", {
      params: category && category !== "all" ? { category } : undefined,
    });
    return data;
  },

  // Feature Flags
  flags: async () => {
    const { data } = await http.get<FeatureFlag[]>("/api/super/flags");
    return data;
  },
  toggleFlag: async (id: string, enabled: boolean) => {
    const { data } = await http.patch<{ message: string; flag: FeatureFlag }>(
      `/api/super/flags/${id}`,
      { enabled },
    );
    return data;
  },

  // Security Policies
  security: async () => {
    const { data } = await http.get<SecurityPolicy[]>("/api/super/security");
    return data;
  },
  toggleSecurity: async (id: string, enabled: boolean) => {
    const { data } = await http.patch<{ message: string; policy: SecurityPolicy }>(
      `/api/super/security/${id}`,
      { enabled },
    );
    return data;
  },

  // Platform Settings & API Keys
  settings: async () => {
    const { data } = await http.get<PlatformSettings>("/api/super/settings");
    return data;
  },
  updateSettings: async (payload: {
    platformName?: string;
    supportEmail?: string;
    defaultTimezone?: string;
    accentColor?: string;
  }) => {
    const { data } = await http.patch<{ message: string; settings: PlatformSettings }>(
      "/api/super/settings",
      payload,
    );
    return data;
  },
  generateApiKey: async () => {
    const { data } = await http.post<{ message: string; apiKey: string }>(
      "/api/super/settings/keys/generate",
    );
    return data;
  },
  revokeKey: async (keyType: "api_key" | "webhook") => {
    const { data } = await http.post<{ message: string; apiKey?: string; webhookSecret?: string }>(
      "/api/super/settings/keys/revoke",
      { keyType },
    );
    return data;
  },

  // Support Tickets
  tickets: async () => {
    const { data } = await http.get<SupportTicket[]>("/api/super/tickets");
    return data;
  },
  createTicket: async (payload: {
    title: string;
    organizationId: string;
    description?: string;
    priority?: string;
  }) => {
    const { data } = await http.post<SupportTicket>("/api/super/tickets", payload);
    return data;
  },
  updateTicket: async (id: string, payload: { status?: string; priority?: string }) => {
    const { data } = await http.patch<{ message: string; ticket: SupportTicket }>(
      `/api/super/tickets/${id}`,
      payload,
    );
    return data;
  },
  deleteTicket: async (id: string) => {
    const { data } = await http.delete<{ message: string; id: string }>(`/api/super/tickets/${id}`);
    return data;
  },
  ticketReplies: async (ticketId: string) => {
    const { data } = await http.get<TicketReply[]>(`/api/super/tickets/${ticketId}/replies`);
    return data;
  },
  createTicketReply: async (
    ticketId: string,
    payload: { message: string; senderName?: string; senderRole?: string },
  ) => {
    const { data } = await http.post<TicketReply>(`/api/super/tickets/${ticketId}/replies`, payload);
    return data;
  },

  // Billing & Invoices
  invoices: async () => {
    const { data } = await http.get<Invoice[]>("/api/super/invoices");
    return data;
  },
  createInvoice: async (payload: {
    organizationId: string;
    plan: string;
    amount: string;
    status?: string;
    date?: string;
  }) => {
    const { data } = await http.post<Invoice>("/api/super/invoices", payload);
    return data;
  },
  getInvoicePdfUrl: (invoiceId: string) => {
    return `${origin}/api/super/invoices/${invoiceId}/pdf?print=true`;
  },
};

export function apiErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    return (
      error.response?.data?.error?.message ||
      error.response?.data?.message ||
      error.message ||
      fallback
    );
  }
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return fallback;
}
