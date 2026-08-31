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
  subscriptionStatus: "trial" | "active" | "expired" | "revoked";
  trialEndsAt: string;
  isApproved: boolean;
  createdAt: string;
}
