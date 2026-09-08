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


