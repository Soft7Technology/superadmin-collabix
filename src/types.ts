export interface User {
  id: string;
  name: string;
  email: string;
  isSuperAdmin?: boolean;
}

export interface Organization {
  id: string;
  name: string;
  phone?: string | null;
  ownerName?: string | null;
  ownerEmail?: string | null;
  subscriptionStatus: "trial" | "active" | "expired" | "revoked" | string;
  trialEndsAt: string;
  isApproved: boolean;
  plan?: "Starter" | "Basic" | "Pro" | "Enterprise" | string;
  memberCount?: number;
  createdAt: string;
}

export interface PlatformUser {
  id: string;
  name: string;
  email: string;
  status: string;
  avatarColor?: string;
  initials?: string;
  isSuperAdmin: boolean;
  createdAt: string;
  roleId?: string;
  roleName: string;
  organizationId?: string;
  organizationName: string;
  organizationPlan?: string;
  departmentName?: string;
}

export interface SystemLog {
  id: string;
  category: "sec" | "info" | "sys";
  message: string;
  timestamp: string;
}

export interface FeatureFlag {
  id: string;
  label: string;
  sub: string;
  enabled: boolean;
}

export interface SecurityPolicy {
  id: string;
  label: string;
  sub: string;
  enabled: boolean;
}

export interface PlatformSettings {
  platformName: string;
  supportEmail: string;
  defaultTimezone: string;
  accentColor: string;
  apiKey: string;
  webhookSecret: string;
}

export interface SupportTicket {
  id: string;
  ticketNumber?: string;
  title: string;
  description?: string;
  orgName?: string;
  organizationId?: string;
  status?: string;
  priority?: string;
  openedAt: string;
}

export interface Invoice {
  id?: string;
  invoiceNumber?: string;
  orgName: string;
  organizationId?: string;
  plan: string;
  amount: string;
  date: string;
  status: string;
}

export interface TicketReply {
  id: string;
  ticketId: string;
  senderId?: string | null;
  senderName: string;
  senderRole?: string;
  message: string;
  createdAt: string;
}

