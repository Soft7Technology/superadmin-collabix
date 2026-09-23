"use client";

import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Activity,
  ArrowUpDown,
  Ban,
  BarChart2,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  Database,
  Download,
  Eye,
  EyeOff,
  FileText,
  Filter,
  HardDrive,
  LogOut,
  Pencil,
  Printer,
  RefreshCw,
  Search,
  Server,
  Shield,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { api, apiErrorMessage } from "../src/api";
import type { Organization, PlatformUser, SystemLog, User } from "../src/types";

type SessionState = "loading" | "guest" | "authenticated" | "forbidden";
type PageKey = "overview" | "orgs" | "users" | "plans" | "flags" | "logs" | "security" | "support" | "settings";
type SettingsTabKey = "general" | "api" | "branding";

interface Invoice {
  id?: string;
  orgName: string;
  plan: string;
  amount: string;
  date: string;
  status: "Paid" | "Pending" | "Overdue";
  billingEmail?: string;
}

interface SupportTicket {
  id: string;
  title: string;
  orgName: string;
  openedAt: string;
  status?: "Open" | "In Progress" | "Resolved";
  priority?: "Low" | "Medium" | "High";
  description?: string;
  lastReply?: string;
}

interface FeatureFlag {
  id: string;
  label: string;
  sub: string;
  enabled: boolean;
}

const safeFormatDateInput = (val?: string | null): string => {
  if (!val) return "";
  try {
    const d = new Date(val);
    return isNaN(d.getTime()) ? "" : d.toISOString().split("T")[0];
  } catch {
    return "";
  }
};

const safeFormatDisplayDate = (val?: string | null, fallback: string = "—"): string => {
  if (!val) return fallback;
  try {
    const d = new Date(val);
    return isNaN(d.getTime()) ? fallback : d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  } catch {
    return fallback;
  }
};

const handleDownloadInvoice = (inv: Invoice) => {
  if (typeof window === "undefined") return;
  const printWindow = window.open("", "_blank", "width=850,height=950");
  if (!printWindow) {
    alert("Popup window blocked. Please allow popups to print/download invoice.");
    return;
  }
  const subtotal = inv.amount.replace(/[^0-9]/g, "");
  const numSubtotal = Number(subtotal) || 450;
  const gst = Math.round(numSubtotal * 0.18);
  const total = numSubtotal + gst;
  const invId = inv.id || `INV-${Date.now().toString().slice(-6)}`;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <title>Invoice - ${invId} - ${inv.orgName}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 40px; color: #2D2520; background: #FFFFFF; }
          .invoice-box { max-width: 720px; margin: auto; border: 1px solid #E8DFD3; padding: 36px; border-radius: 12px; background: #FFFFFF; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #D96B43; padding-bottom: 22px; margin-bottom: 24px; }
          .brand-title { font-size: 26px; font-weight: 800; color: #D96B43; letter-spacing: -0.02em; }
          .brand-sub { font-size: 12px; color: #7A6F64; margin-top: 4px; font-weight: 500; }
          .inv-meta { text-align: right; }
          .inv-id { font-size: 17px; font-weight: 700; color: #2D2520; font-family: monospace; }
          .inv-date { font-size: 12px; color: #7A6F64; margin-top: 4px; }
          .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-bottom: 24px; }
          .detail-card { background: #FAF6EE; padding: 14px 16px; border-radius: 8px; border: 1px solid #E8DFD3; }
          .detail-card h4 { margin-bottom: 6px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #7A6F64; font-weight: 700; }
          .detail-card p { font-size: 13.5px; font-weight: 600; color: #2D2520; }
          .detail-card .sub { font-size: 12px; color: #7A6F64; margin-top: 3px; font-weight: normal; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
          th { background: #FAF6EE; text-align: left; padding: 11px 14px; font-size: 11.5px; text-transform: uppercase; letter-spacing: 0.04em; color: #7A6F64; border-bottom: 1px solid #E8DFD3; }
          td { padding: 13px 14px; border-bottom: 1px solid #E8DFD3; font-size: 13px; }
          .totals { margin-left: auto; width: 280px; margin-bottom: 24px; }
          .total-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; color: #7A6F64; }
          .total-row.grand { border-top: 2px solid #2D2520; margin-top: 6px; padding-top: 10px; font-size: 16px; font-weight: 800; color: #D96B43; }
          .badge { display: inline-block; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; text-transform: uppercase; }
          .badge-paid { background: #E8F5E9; color: #2E7D32; border: 1px solid #C8E6C9; }
          .badge-pending { background: #FFF8E1; color: #F57F17; border: 1px solid #FFE082; }
          .badge-overdue { background: #FFEBEE; color: #C62828; border: 1px solid #FFCDD2; }
          .footer { margin-top: 28px; text-align: center; font-size: 11.5px; color: #7A6F64; border-top: 1px solid #E8DFD3; padding-top: 18px; line-height: 1.5; }
          @media print {
            body { padding: 0; }
            .invoice-box { border: none; padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="invoice-box">
          <div class="header">
            <div>
              <div class="brand-title">Collabrix</div>
              <div class="brand-sub">Platform Subscription &amp; Cloud Workspace Billing</div>
            </div>
            <div class="inv-meta">
              <div class="inv-id">${invId}</div>
              <div class="inv-date">Issued: ${inv.date}</div>
              <div style="margin-top: 8px;">
                <span class="badge ${inv.status.toLowerCase() === 'paid' ? 'badge-paid' : inv.status.toLowerCase() === 'pending' ? 'badge-pending' : 'badge-overdue'}">${inv.status}</span>
              </div>
            </div>
          </div>
          <div class="details-grid">
            <div class="detail-card">
              <h4>Billed To:</h4>
              <p>${inv.orgName}</p>
              <div class="sub">${inv.billingEmail || 'billing@workspace.com'}</div>
            </div>
            <div class="detail-card">
              <h4>Issued By:</h4>
              <p>Collabrix Cloud Inc.</p>
              <div class="sub">support@collabix.com</div>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th>Plan Tier</th>
                <th>Cycle</th>
                <th style="text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Collabrix Workspace Platform</strong><br><span style="font-size: 11.5px; color: #7A6F64;">All core modules, task boards, team management &amp; cloud storage.</span></td>
                <td><span style="font-weight: 600;">${inv.plan}</span></td>
                <td>Monthly</td>
                <td style="text-align: right; font-weight: 600;">₹${numSubtotal}</td>
              </tr>
            </tbody>
          </table>
          <div class="totals">
            <div class="total-row">
              <span>Subtotal</span>
              <span style="font-weight: 600; color: #2D2520;">₹${numSubtotal}</span>
            </div>
            <div class="total-row">
              <span>GST / Taxes (18%)</span>
              <span style="font-weight: 600; color: #2D2520;">₹${gst}</span>
            </div>
            <div class="total-row grand">
              <span>Total Amount</span>
              <span>₹${total}</span>
            </div>
          </div>
          <div class="footer">
            Thank you for building on Collabrix. For any billing support or enterprise SLA agreements, please contact <strong>support@collabix.com</strong>.
          </div>
        </div>
        <script>
          window.onload = function() {
            setTimeout(function() { window.print(); }, 350);
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
};

export default function App() {
  // Session & Authentication
  const [session, setSession] = useState<SessionState>("loading");
  const [user, setUser] = useState<User | null>(null);

  // Live Backend Data
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  
  // Navigation & Search
  const [activePage, setActivePage] = useState<PageKey>("overview");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Toast & Modals
  const [toastMsg, setToastMsg] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [orgToDelete, setOrgToDelete] = useState<Organization | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [planModalOrg, setPlanModalOrg] = useState<{ id: string; name: string; currentPlan: string } | null>(null);
  const [selectedPlanTier, setSelectedPlanTier] = useState<"Basic" | "Pro" | "Enterprise">("Pro");

  // Open Plan popup modal helper
  const openPlanModal = (orgId: string, orgName: string, currentPlan?: string) => {
    let norm: "Basic" | "Pro" | "Enterprise" = "Pro";
    if (currentPlan) {
      const lower = currentPlan.toLowerCase();
      if (lower === "basic" || lower === "starter") norm = "Basic";
      else if (lower === "enterprise") norm = "Enterprise";
      else norm = "Pro";
    }
    setPlanModalOrg({ id: orgId, name: orgName, currentPlan: norm });
    setSelectedPlanTier(norm);
    setIsPlanModalOpen(true);
  };

  // Form Fields for "+ New Organization" (Local mock creation)
  const [newOrgName, setNewOrgName] = useState("");
  const [newOrgDomain, setNewOrgDomain] = useState("");
  const [newOrgPlan, setNewOrgPlan] = useState<"Basic" | "Pro" | "Enterprise">("Pro");
  const [newOrgEmail, setNewOrgEmail] = useState("");

  // Users — loaded from backend
  const [platformUsers, setPlatformUsers] = useState<PlatformUser[]>([]);

  // Edit User Modal state
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<PlatformUser | null>(null);
  const [editUserName, setEditUserName] = useState("");
  const [editUserEmail, setEditUserEmail] = useState("");
  const [editUserRole, setEditUserRole] = useState("Teammates");
  const [editUserStatus, setEditUserStatus] = useState("ACTIVE");

  const openEditUserModal = (u: PlatformUser) => {
    setUserToEdit(u);
    setEditUserName(u.name || "");
    setEditUserEmail(u.email || "");
    setEditUserRole(u.roleName || "Teammates");
    setEditUserStatus(u.status || "ACTIVE");
    setIsEditUserModalOpen(true);
  };

  // Edit Organization Modal state
  const [isEditOrgModalOpen, setIsEditOrgModalOpen] = useState(false);
  const [orgToEdit, setOrgToEdit] = useState<Organization | null>(null);
  const [editOrgName, setEditOrgName] = useState("");
  const [editOrgPhone, setEditOrgPhone] = useState("");
  const [editOrgStatus, setEditOrgStatus] = useState("active");
  const [editOrgPlan, setEditOrgPlan] = useState("Pro");
  const [editOrgTrialDate, setEditOrgTrialDate] = useState("");

  const openEditOrgModal = (org: Organization) => {
    setOrgToEdit(org);
    setEditOrgName(org.name || "");
    setEditOrgPhone(org.phone || "");
    setEditOrgStatus(org.subscriptionStatus || "active");
    setEditOrgPlan(org.plan || "Pro");
    setEditOrgTrialDate(safeFormatDateInput(org.trialEndsAt));
    setIsEditOrgModalOpen(true);
  };



  // Quick View Slide-Over Drawer state
  const [drawerItem, setDrawerItem] = useState<{ type: "org"; data: Organization } | { type: "user"; data: PlatformUser } | null>(null);

  // Org Filters, Sorting & Pagination
  const [orgStatusFilter, setOrgStatusFilter] = useState("all");
  const [orgPlanFilter, setOrgPlanFilter] = useState("all");
  const [orgSortField, setOrgSortField] = useState<"name" | "owner" | "plan" | "status" | "trial" | "createdAt">("createdAt");
  const [orgSortAsc, setOrgSortAsc] = useState(false);
  const [orgPage, setOrgPage] = useState(1);
  const [orgPageSize, setOrgPageSize] = useState(10);

  // User Filters, Sorting & Pagination
  const [userOrgFilter, setUserOrgFilter] = useState("all");
  const [userRoleFilter, setUserRoleFilter] = useState("all");
  const [userStatusFilter, setUserStatusFilter] = useState("all");
  const [userSortField, setUserSortField] = useState<"name" | "org" | "role" | "status" | "createdAt">("createdAt");
  const [userSortAsc, setUserSortAsc] = useState(false);
  const [userPage, setUserPage] = useState(1);
  const [userPageSize, setUserPageSize] = useState(10);

  // System Logs Pagination
  const [logsPage, setLogsPage] = useState(1);
  const [logsPageSize, setLogsPageSize] = useState(15);

  const [featureFlags, setFeatureFlags] = useState<FeatureFlag[]>([
    { id: "mon", label: "Screen monitoring", sub: "Enable tracking module for all orgs", enabled: true },
    { id: "kan", label: "Kanban board", sub: "Drag-and-drop task board", enabled: true },
    { id: "cal", label: "Calendar sync", sub: "Two-way Google Calendar sync", enabled: false },
    { id: "ai", label: "AI task suggestions", sub: "Beta — auto-suggest task breakdowns", enabled: false },
    { id: "brand", label: "Custom branding", sub: "Org-level logo and color overrides", enabled: true },
    { id: "api", label: "API access", sub: "Public API and webhooks", enabled: true },
  ]);

  const [securityFlags, setSecurityFlags] = useState([
    { id: "2fa", label: "Enforce 2FA for all org admins", sub: "Applies across every organization", enabled: true },
    { id: "sso", label: "Require SSO for Enterprise plan", sub: "Google Workspace / Okta / Azure AD", enabled: false },
    { id: "ip", label: "IP allow-listing", sub: "Restrict platform admin console by IP", enabled: false },
    { id: "auto", label: "Auto-suspend on repeated breach attempts", sub: "Lock org after 5 failed admin logins", enabled: true },
  ]);

  // Support tickets — SLA requests & customer assistance
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([
    { id: "TICK-401", title: "SSO SAML configuration assistance for Azure AD", orgName: "Apex Digital Systems", openedAt: "Today, 10:30 AM", status: "Open", priority: "High", description: "Requesting guidance on mapping user claims and configuring entity ID in Microsoft Azure AD enterprise apps." },
    { id: "TICK-402", title: "Storage quota upgrade request for video assets", orgName: "Brookvale Media", openedAt: "Yesterday, 4:15 PM", status: "In Progress", priority: "Medium", description: "Our production team is uploading raw screen recordings and reaching our 50GB storage limit. Please upgrade our workspace quota." },
    { id: "TICK-403", title: "Custom webhook signature validation error (401)", orgName: "Horizon Labs", openedAt: "2 days ago", status: "Resolved", priority: "Low", description: "Resolved after rotating webhook secret in platform settings.", lastReply: "Secret regenerated and webhook ping confirmed successful." },
  ]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [ticketReplyText, setTicketReplyText] = useState("");
  const [ticketStatusFilter, setTicketStatusFilter] = useState<"all" | "Open" | "In Progress" | "Resolved">("all");
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  // System logs — loaded from backend
  const [systemLogs, setSystemLogs] = useState<SystemLog[]>([]);
  const [logCategoryFilter, setLogCategoryFilter] = useState<"all" | "info" | "sec" | "sys">("all");

  // Invoices — loaded from backend or generated from live workspaces
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<"all" | "Paid" | "Pending" | "Overdue">("all");

  const [settingsTab, setSettingsTab] = useState<SettingsTabKey>("general");
  const [platformName, setPlatformName] = useState("Collabix");
  const [supportEmail, setSupportEmail] = useState("support@collabix.com");
  const [defaultTimezone, setDefaultTimezone] = useState("IST — Asia/Kolkata");
  const [accentColor, setAccentColor] = useState("#D96B43");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Load backend data
  const loadOrganizations = useCallback(async () => {
    try {
      const data = await api.organizations();
      setOrganizations(data);
    } catch (e) {
      triggerToast("Failed to load organizations from database.");
    }
  }, []);

  const loadUsers = useCallback(async () => {
    try {
      const data = await api.users();
      setPlatformUsers(data);
    } catch (e) {
      triggerToast("Failed to load platform users from database.");
    }
  }, []);

  const loadLogs = useCallback(async () => {
    try {
      const data = await api.logs();
      setSystemLogs(data);
    } catch (e) {
      triggerToast("Failed to load system logs from database.");
    }
  }, []);

  // Debounced Refresh handler
  const handleRefreshData = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      await Promise.all([loadOrganizations(), loadUsers(), loadLogs()]);
      triggerToast("Platform data refreshed successfully!");
    } catch (error) {
      triggerToast("Failed to refresh platform data.");
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, loadOrganizations, loadUsers, loadLogs]);

  useEffect(() => {
    api
      .session()
      .then(async (currentUser) => {
        if (!currentUser.isSuperAdmin) {
          setSession("forbidden");
          return;
        }
        setUser(currentUser);
        setSession("authenticated");
        await Promise.all([loadOrganizations(), loadUsers(), loadLogs()]);
      })
      .catch(() => setSession("guest"));
  }, [loadOrganizations, loadUsers, loadLogs]);

  // Helper to trigger toast notification
  const triggerToast = (msg: unknown) => {
    let cleanMsg = "";
    if (typeof msg === "string") {
      cleanMsg = msg;
    } else if (msg instanceof Error) {
      cleanMsg = msg.message;
    } else if (msg && typeof msg === "object" && "message" in msg) {
      cleanMsg = String((msg as any).message);
    } else {
      cleanMsg = "Action processed";
    }
    setToastMsg(cleanMsg);
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
    }, 2400);
  };

  // Run backend action helper
  const runBackendAction = async (
    id: string,
    action: () => Promise<unknown>,
    successMessage: string,
  ) => {
    setBusy(id);
    try {
      await action();
      await loadOrganizations();
      triggerToast(successMessage);
    } catch (error) {
      triggerToast(apiErrorMessage(error, "Operation failed."));
    } finally {
      setBusy(null);
    }
  };

  // Filtering live Organizations (with Multi-filter & Sort)
  const processedOrgs = useMemo(() => {
    const term = searchQuery.trim().toLowerCase();
    const res = organizations.filter((org) => {
      const matchesSearch = !term || [org.name, org.ownerName, org.ownerEmail, org.id, org.phone]
        .filter(Boolean)
        .some((val) => val!.toLowerCase().includes(term));
      const matchesStatus = orgStatusFilter === "all" || (org.subscriptionStatus || "").toLowerCase() === orgStatusFilter.toLowerCase();
      const matchesPlan = orgPlanFilter === "all" || (org.plan || "Pro").toLowerCase() === orgPlanFilter.toLowerCase();
      return matchesSearch && matchesStatus && matchesPlan;
    });

    res.sort((a, b) => {
      let vA: any = "";
      let vB: any = "";
      if (orgSortField === "name") { vA = a.name.toLowerCase(); vB = b.name.toLowerCase(); }
      else if (orgSortField === "owner") { vA = (a.ownerName || "").toLowerCase(); vB = (b.ownerName || "").toLowerCase(); }
      else if (orgSortField === "plan") { vA = (a.plan || "Pro").toLowerCase(); vB = (b.plan || "Pro").toLowerCase(); }
      else if (orgSortField === "status") { vA = (a.subscriptionStatus || "").toLowerCase(); vB = (b.subscriptionStatus || "").toLowerCase(); }
      else if (orgSortField === "trial") { vA = new Date(a.trialEndsAt || 0).getTime(); vB = new Date(b.trialEndsAt || 0).getTime(); }
      else { vA = new Date(a.createdAt || 0).getTime(); vB = new Date(b.createdAt || 0).getTime(); }

      if (vA < vB) return orgSortAsc ? -1 : 1;
      if (vA > vB) return orgSortAsc ? 1 : -1;
      return 0;
    });
    return res;
  }, [organizations, searchQuery, orgStatusFilter, orgPlanFilter, orgSortField, orgSortAsc]);

  const totalOrgPages = Math.max(1, Math.ceil(processedOrgs.length / orgPageSize));
  const paginatedOrgs = useMemo(() => {
    const start = (orgPage - 1) * orgPageSize;
    return processedOrgs.slice(start, start + orgPageSize);
  }, [processedOrgs, orgPage, orgPageSize]);

  // Search, Multi-Filter & Sort Users
  const processedUsers = useMemo(() => {
    const term = searchQuery.trim().toLowerCase();
    const res = platformUsers.filter((u) => {
      const matchesSearch = !term || [u.name, u.email, u.organizationName, u.roleName, u.departmentName, u.id]
        .filter(Boolean)
        .some((val) => val!.toLowerCase().includes(term));
      const matchesOrg = userOrgFilter === "all" || u.organizationId === userOrgFilter || u.organizationName === userOrgFilter;
      const matchesRole = userRoleFilter === "all" || (u.roleName || "").toLowerCase() === userRoleFilter.toLowerCase();
      const matchesStatus = userStatusFilter === "all" || (u.status || "").toUpperCase() === userStatusFilter.toUpperCase();
      return matchesSearch && matchesOrg && matchesRole && matchesStatus;
    });

    res.sort((a, b) => {
      let vA: any = "";
      let vB: any = "";
      if (userSortField === "name") { vA = a.name.toLowerCase(); vB = b.name.toLowerCase(); }
      else if (userSortField === "org") { vA = (a.organizationName || "").toLowerCase(); vB = (b.organizationName || "").toLowerCase(); }
      else if (userSortField === "role") { vA = (a.roleName || "").toLowerCase(); vB = (b.roleName || "").toLowerCase(); }
      else if (userSortField === "status") { vA = (a.status || "").toLowerCase(); vB = (b.status || "").toLowerCase(); }
      else { vA = new Date(a.createdAt || 0).getTime(); vB = new Date(b.createdAt || 0).getTime(); }

      if (vA < vB) return userSortAsc ? -1 : 1;
      if (vA > vB) return userSortAsc ? 1 : -1;
      return 0;
    });
    return res;
  }, [platformUsers, searchQuery, userOrgFilter, userRoleFilter, userStatusFilter, userSortField, userSortAsc]);

  const totalUserPages = Math.max(1, Math.ceil(processedUsers.length / userPageSize));
  const paginatedUsers = useMemo(() => {
    const start = (userPage - 1) * userPageSize;
    return processedUsers.slice(start, start + userPageSize);
  }, [processedUsers, userPage, userPageSize]);

  // Search and status filtering support tickets
  const filteredTickets = useMemo(() => {
    const term = searchQuery.trim().toLowerCase();
    return supportTickets.filter((t) => {
      const matchesStatus = ticketStatusFilter === "all" || (t.status || "Open") === ticketStatusFilter;
      const matchesSearch = !term || [t.title, t.orgName, t.id, t.description]
        .filter(Boolean)
        .some((val) => val!.toLowerCase().includes(term));
      return matchesStatus && matchesSearch;
    });
  }, [supportTickets, ticketStatusFilter, searchQuery]);

  // Search and category filtering system logs
  const filteredLogs = useMemo(() => {
    const term = searchQuery.trim().toLowerCase();
    return systemLogs.filter((log) => {
      const matchesCategory = logCategoryFilter === "all" || log.category === logCategoryFilter;
      const matchesSearch = !term || log.message.toLowerCase().includes(term) || log.category.toLowerCase().includes(term);
      return matchesCategory && matchesSearch;
    });
  }, [systemLogs, searchQuery, logCategoryFilter]);

  const totalLogPages = Math.max(1, Math.ceil(filteredLogs.length / logsPageSize));
  const paginatedLogs = useMemo(() => {
    const start = (logsPage - 1) * logsPageSize;
    return filteredLogs.slice(start, start + logsPageSize);
  }, [filteredLogs, logsPage, logsPageSize]);

  // Search and status filtering for Invoices
  const allInvoices = useMemo<Invoice[]>(() => {
    if (invoices && invoices.length > 0) {
      return invoices;
    }
    if (!organizations || organizations.length === 0) {
      return [
        { id: "INV-2026-101", orgName: "Apex Digital Systems", plan: "Enterprise", amount: "₹999", date: "Sep 01, 2026", status: "Paid", billingEmail: "finance@apexdigital.io" },
        { id: "INV-2026-102", orgName: "Brookvale Media", plan: "Pro", amount: "₹450", date: "Sep 05, 2026", status: "Paid", billingEmail: "billing@brookvale.co" },
        { id: "INV-2026-103", orgName: "Horizon Labs", plan: "Basic", amount: "₹200", date: "Sep 12, 2026", status: "Pending", billingEmail: "accounts@horizonlabs.dev" },
        { id: "INV-2026-104", orgName: "Zenith Studio", plan: "Pro", amount: "₹450", date: "Sep 18, 2026", status: "Overdue", billingEmail: "hello@zenith.studio" },
      ];
    }
    return organizations.map((org, idx) => {
      const plan = org.plan || "Pro";
      const amount = plan.toLowerCase() === "enterprise" ? "₹999" : plan.toLowerCase() === "basic" ? "₹200" : "₹450";
      const status: "Paid" | "Pending" | "Overdue" =
        org.isApproved && (org.subscriptionStatus || "").toLowerCase() === "active"
          ? "Paid"
          : org.subscriptionStatus === "trial"
          ? "Pending"
          : "Overdue";
      const date = org.createdAt ? safeFormatDisplayDate(org.createdAt, "Sep 01, 2026") : `Sep ${String((idx % 28) + 1).padStart(2, "0")}, 2026`;
      return {
        id: `INV-2026-${String(idx + 101).padStart(3, "0")}`,
        orgName: org.name,
        plan: plan,
        amount: amount,
        date: date,
        status: status,
        billingEmail: org.ownerEmail || `billing@${org.name.toLowerCase().replace(/[^a-z0-9]/g, "")}.com`,
      };
    });
  }, [invoices, organizations]);

  const filteredInvoices = useMemo(() => {
    const term = searchQuery.trim().toLowerCase();
    return allInvoices.filter((inv) => {
      const matchesStatus = invoiceStatusFilter === "all" || inv.status === invoiceStatusFilter;
      const matchesSearch = !term || [inv.id, inv.orgName, inv.plan, inv.billingEmail, inv.amount]
        .filter(Boolean)
        .some((val) => val!.toLowerCase().includes(term));
      return matchesStatus && matchesSearch;
    });
  }, [allInvoices, invoiceStatusFilter, searchQuery]);

  // Create new organization handler — calls backend API
  const handleCreateOrg = async () => {
    const trimmedName = newOrgName.trim();
    if (!trimmedName) {
      triggerToast("Organization Name is required");
      return;
    }
    const trimmedEmail = newOrgEmail.trim();
    if (trimmedEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedEmail)) {
        triggerToast("Please enter a valid owner email address");
        return;
      }
    }
    await runBackendAction(
      "create-org",
      async () => {
        await api.createOrganization({
          name: trimmedName,
          ownerEmail: trimmedEmail || undefined,
          plan: newOrgPlan,
        });
        await Promise.all([loadOrganizations(), loadUsers(), loadLogs()]);
      },
      `"${trimmedName}" organization created!`,
    );
    setIsModalOpen(false);
    setNewOrgName("");
    setNewOrgDomain("");
    setNewOrgEmail("");
    setNewOrgPlan("Pro");
  };

  // Change organization plan handler — calls backend API
  const handleUpdatePlan = async () => {
    if (!planModalOrg) return;
    await runBackendAction(
      `plan-${planModalOrg.id}`,
      async () => {
        await api.updateOrgPlan(planModalOrg.id, selectedPlanTier);
        await Promise.all([loadOrganizations(), loadUsers(), loadLogs()]);
      },
      `"${planModalOrg.name}" plan updated to ${selectedPlanTier}!`,
    );
    setIsPlanModalOpen(false);
    setPlanModalOrg(null);
  };

  // Edit organization details handler — calls backend API
  const handleSaveEditOrg = async (e: FormEvent) => {
    e.preventDefault();
    if (!orgToEdit) return;
    const trimmedName = editOrgName.trim();
    if (!trimmedName) {
      triggerToast("Organization name is required.");
      return;
    }
    let validTrialEndsAt: string | undefined = undefined;
    if (editOrgTrialDate && editOrgTrialDate.trim()) {
      const parsed = new Date(editOrgTrialDate);
      if (!isNaN(parsed.getTime())) {
        validTrialEndsAt = parsed.toISOString();
      }
    }
    await runBackendAction(
      `edit-org-${orgToEdit.id}`,
      async () => {
        await api.updateOrganization(orgToEdit.id, {
          name: trimmedName,
          phone: editOrgPhone.trim() || undefined,
          subscriptionStatus: editOrgStatus,
          plan: editOrgPlan,
          trialEndsAt: validTrialEndsAt,
          isApproved: editOrgStatus === "active",
        });
        await Promise.all([loadOrganizations(), loadUsers(), loadLogs()]);
      },
      `Updated organization "${trimmedName}"!`,
    );
    setIsEditOrgModalOpen(false);
    setOrgToEdit(null);
  };

  // Edit user details handler — calls backend API
  const handleSaveEditUser = async (e: FormEvent) => {
    e.preventDefault();
    if (!userToEdit) return;
    if (!editUserName.trim() || !editUserEmail.trim()) {
      triggerToast("Name and email are required.");
      return;
    }
    await runBackendAction(
      `edit-user-${userToEdit.id}`,
      async () => {
        await api.updateUser(userToEdit.id, {
          name: editUserName.trim(),
          email: editUserEmail.trim(),
          roleName: editUserRole,
          status: editUserStatus,
        });
        await Promise.all([loadUsers(), loadLogs()]);
      },
      `Updated user details for ${editUserName.trim()}!`,
    );
    setIsEditUserModalOpen(false);
    setUserToEdit(null);
  };

  if (session === "loading") {
    return <Centered label="Restoring secure admin session…" />;
  }

  if (session === "guest") {
    return (
      <Login
        onLogin={(nextUser) => {
          if (!nextUser.isSuperAdmin) {
            setSession("forbidden");
            return;
          }
          setUser(nextUser);
          setSession("authenticated");
          void loadOrganizations();
          void loadUsers();
          void loadLogs();
        }}
      />
    );
  }

  if (session === "forbidden") {
    return (
      <Centered
        label="This portal is restricted to platform administrators."
        action={
          <button
            className="btn btn-primary"
            onClick={() => void api.logout().finally(() => setSession("guest"))}
          >
            Return to sign in
          </button>
        }
      />
    );
  }

  // Calculated Stats
  const now = new Date();
  const totalOrganizations = organizations.length;
  const activeSubscriptions = organizations.filter(
    (org) => org.isApproved && (org.subscriptionStatus || "").toLowerCase() === "active",
  ).length;
  const trialSubscriptions = organizations.filter((org) => {
    const status = (org.subscriptionStatus || "").toLowerCase();
    const isTrial = status === "trial" || status === "trialing";
    const notExpired = !org.trialEndsAt || new Date(org.trialEndsAt) >= now;
    return isTrial && notExpired;
  }).length;
  const suspendedCount = organizations.filter((org) => {
    const status = (org.subscriptionStatus || "").toLowerCase();
    const isExplicitlySuspended = status === "revoked" || status === "expired" || status === "suspended";
    const isExpiredTrial = (status === "trial" || status === "trialing") && org.trialEndsAt && new Date(org.trialEndsAt) < now;
    return isExplicitlySuspended || isExpiredTrial;
  }).length;

  return (
    <div className="app">
      {/* SIDEBAR NAVIGATION */}
      <aside className="sidebar">
        <div className="brand">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 32 32"
            style={{ width: "30px", height: "30px", flexShrink: 0 }}
            fill="none"
          >
            {/* Laptop Base / Chassis in Terracotta */}
            <path
              d="M2 23.5h28v1.5a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-1.5z"
              fill="#D96B43"
            />
            {/* Trackpad notch */}
            <path
              d="M12 23.5h8V24a1 1 0 0 1-1 1h-6a1 1 0 0 1-1-1v-.5z"
              fill="#B8532F"
            />
            {/* Laptop Screen frame in Terracotta */}
            <rect
              x="4"
              y="7"
              width="24"
              height="16.5"
              rx="2"
              fill="none"
              stroke="#D96B43"
              strokeWidth="2.5"
            />
            {/* Laptop Screen inside (dark/translucent area) */}
            <rect
              x="5.5"
              y="8.5"
              width="21"
              height="13.5"
              fill="#1f2937"
              rx="0.5"
              opacity="0.05"
            />

            {/* Terracotta Speech Bubble */}
            <circle cx="21.5" cy="8.5" r="5.5" fill="#D96B43" />
            <path
              d="M18.5 12.5l2-3.5 3 1.5z"
              fill="#D96B43"
            />

            {/* White Infinity Symbol inside Bubble */}
            <path
              d="M21.5 9.2c-.4-.5-.9-.8-1.5-.8a1.2 1.2 0 1 0 0 2.4c.6 0 1.1-.3 1.5-.8.4.5.9.8 1.5.8a1.2 1.2 0 1 0 0-2.4c-.6 0-1.1.3-1.5.8z"
              fill="white"
            />
          </svg>
          <div>
            <div className="brand-name">{platformName}</div>
            <div className="brand-sub">Platform console</div>
          </div>
        </div>
        <div className="tier-badge">Super admin</div>

        <nav style={{ display: "flex", flexDirection: "column", width: "100%" }}>
          <button
            className={`nav-item ${activePage === "overview" ? "active" : ""}`}
            onClick={() => setActivePage("overview")}
          >
            <span className="nav-icon">◈</span>Overview
          </button>
          <button
            className={`nav-item ${activePage === "orgs" ? "active" : ""}`}
            onClick={() => setActivePage("orgs")}
          >
            <span className="nav-icon">▣</span>Organizations
          </button>
          <button
            className={`nav-item ${activePage === "users" ? "active" : ""}`}
            onClick={() => setActivePage("users")}
          >
            <span className="nav-icon">☰</span>Users
          </button>
          <button
            className={`nav-item ${activePage === "plans" ? "active" : ""}`}
            onClick={() => setActivePage("plans")}
          >
            <span className="nav-icon">◍</span>Plans &amp; billing
          </button>
          <button
            className={`nav-item ${activePage === "flags" ? "active" : ""}`}
            onClick={() => setActivePage("flags")}
          >
            <span className="nav-icon">⚑</span>Feature flags
          </button>
          <button
            className={`nav-item ${activePage === "logs" ? "active" : ""}`}
            onClick={() => setActivePage("logs")}
          >
            <span className="nav-icon">◧</span>System logs
          </button>
          <button
            className={`nav-item ${activePage === "security" ? "active" : ""}`}
            onClick={() => setActivePage("security")}
          >
            <span className="nav-icon">⚿</span>Security
          </button>
          <button
            className={`nav-item ${activePage === "support" ? "active" : ""}`}
            onClick={() => setActivePage("support")}
          >
            <span className="nav-icon">◐</span>Support
          </button>
          <button
            className={`nav-item ${activePage === "settings" ? "active" : ""}`}
            onClick={() => setActivePage("settings")}
          >
            <span className="nav-icon">✎</span>Platform settings
          </button>
        </nav>

        <div className="sidebar-foot">
          <div className="avatar-ring">
            <div className="fallback">SA</div>
            <div className="pulse"></div>
          </div>
          <div className="who">
            {user?.name || "Collabix Admin"}
            <span>Super admin</span>
          </div>
          <button
            onClick={() => void api.logout().finally(() => setSession("guest"))}
            style={{ marginLeft: "auto", background: "none", border: "none", color: "#8688A0", cursor: "pointer" }}
            title="Sign Out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* MAIN CONTAINER */}
      <div className="main">
        {/* TOPBAR HEADER */}
        <header className="topbar">
          <div className="crumbs">
            Platform / <b style={{ textTransform: "capitalize" }}>{activePage === "orgs" ? "organizations" : activePage}</b>
          </div>
          <div className="top-actions">
            <div className="search" style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <Search size={14} style={{ position: "absolute", left: "12px", color: "var(--muted)", pointerEvents: "none" }} />
              <input
                type="text"
                placeholder={
                  activePage === "orgs"
                    ? "Search organizations by name, owner, email..."
                    : activePage === "users"
                    ? "Search users by name, email, role, department..."
                    : activePage === "plans"
                    ? "Search plans & billing invoices..."
                    : activePage === "logs"
                    ? "Search system & security audit logs..."
                    : activePage === "support"
                    ? "Search support tickets..."
                    : activePage === "overview"
                    ? "Search recent activity..."
                    : "Search platform..."
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ paddingLeft: "34px", paddingRight: searchQuery ? "28px" : "12px" }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  style={{
                    position: "absolute",
                    right: "8px",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--muted)",
                    padding: "2px",
                    display: "flex",
                    alignItems: "center",
                  }}
                  title="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            <button
              className="btn btn-secondary"
              onClick={() => void handleRefreshData()}
              disabled={isRefreshing}
              style={{ display: "flex", alignItems: "center", gap: "6px" }}
              title="Refresh Platform Data"
            >
              <RefreshCw size={14} className={isRefreshing ? "spin-animation" : ""} />
              <span>{isRefreshing ? "Refreshing..." : "Refresh"}</span>
            </button>
            {activePage === "orgs" && (
              <button
                className="btn btn-primary"
                onClick={() => setIsModalOpen(true)}
              >
                + New organization
              </button>
            )}
          </div>
        </header>

        {/* SYSTEM MAINTENANCE WARNING BANNER */}
        {maintenanceMode && (
          <div style={{ background: "#FEF3C7", borderBottom: "1px solid #F59E0B", color: "#92400E", padding: "10px 24px", fontSize: "13px", fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span>⚠️</span>
              <span><strong>System Maintenance Mode is Active:</strong> Only Superadmins can access the console. Tenant logins and public signups are paused.</span>
            </div>
            <button
              className="btn btn-sm"
              style={{ background: "#F59E0B", color: "#FFFFFF", borderColor: "#D97706", height: "26px", fontSize: "11px", fontWeight: 700 }}
              onClick={() => {
                setMaintenanceMode(false);
                triggerToast("System maintenance mode deactivated.");
              }}
            >
              Disable Maintenance
            </button>
          </div>
        )}

        {/* CONTENT CONTENT CONTAINER */}
        <main className="content">
          
          {/* 1. OVERVIEW SCREEN */}
          <div className={`page ${activePage === "overview" ? "active" : ""}`}>
            <h1 className="page-title">Platform overview</h1>
            <p className="page-sub">Health and growth across every organization on {platformName}.</p>
            
            <div className="stats">
              <div className="stat-card">
                <div className="stat-num">{totalOrganizations}</div>
                <div className="stat-label">Total Organizations</div>
                <div className="stat-delta up">Live database</div>
              </div>
              <div className="stat-card">
                <div className="stat-num">{activeSubscriptions}</div>
                <div className="stat-label">Active Workspaces</div>
                <div className="stat-delta up">Approved &amp; active</div>
              </div>
              <div className="stat-card">
                <div className="stat-num">{trialSubscriptions}</div>
                <div className="stat-label">On Free Trial</div>
                <div className="stat-delta up">Trial status</div>
              </div>
              <div className="stat-card">
                <div className="stat-num">{suspendedCount}</div>
                <div className="stat-label">Suspended / Expired</div>
                <div className="stat-delta down">Requires review</div>
              </div>
            </div>

            <div className="panel-head">
              <h2>Recent Platform Activity</h2>
              {searchQuery && (
                <span style={{ fontSize: "12px", color: "var(--muted)" }}>
                  Filtering by "{searchQuery}"
                </span>
              )}
            </div>
            {processedOrgs.length > 0 ? (
              <div className="card" style={{ padding: "4px 14px" }}>
                {processedOrgs.slice(0, 5).map((org) => (
                  <div className="log-row" key={org.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid var(--line)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span className={`log-tag ${org.isApproved ? "info" : "sec"}`}>
                        {org.isApproved ? "Active" : "Trial"}
                      </span>
                      <span
                        className="clickable-row-name"
                        style={{ fontWeight: 600, color: "var(--ink)" }}
                        onClick={() => setDrawerItem({ type: "org", data: org })}
                      >
                        {org.name}
                      </span>
                      <span style={{ fontSize: "12px", color: "var(--muted)" }}>({org.ownerEmail || org.id})</span>
                    </div>
                    <span className="t" style={{ fontSize: "12px", color: "var(--muted)" }}>
                      {org.createdAt ? new Date(org.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : "Recently added"}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-invoices-card">
                <div className="empty-invoices-icon">
                  <Building2 size={20} />
                </div>
                <div className="empty-invoices-title">No matching activity</div>
                <div className="empty-invoices-sub">
                  {searchQuery ? `No organizations matched "${searchQuery}".` : "When new organizations sign up or update their subscriptions, their events will appear here in real-time."}
                </div>
              </div>
            )}
          </div>

          {/* 2. ORGANIZATIONS SCREEN (Connected to Backend API) */}
          <div className={`page ${activePage === "orgs" ? "active" : ""}`}>
            <h1 className="page-title">Organizations</h1>
            <p className="page-sub">Every workspace running on the platform.</p>

            <div className="stats">
              <div className="stat-card">
                <div className="stat-num">{totalOrganizations}</div>
                <div className="stat-label">Total organizations</div>
              </div>
              <div className="stat-card">
                <div className="stat-num">{activeSubscriptions}</div>
                <div className="stat-label">Active</div>
              </div>
              <div className="stat-card">
                <div className="stat-num">{trialSubscriptions}</div>
                <div className="stat-label">On trial</div>
              </div>
              <div className="stat-card">
                <div className="stat-num">{suspendedCount}</div>
                <div className="stat-label">Suspended</div>
              </div>
            </div>

            {/* TABLE TOOLBAR: FILTERS & CONTROLS */}
            <div className="table-toolbar">
              <div className="table-filters">
                <span style={{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--muted)", display: "flex", alignItems: "center", gap: "4px" }}>
                  <Filter size={12} /> Filters:
                </span>
                <select
                  className="filter-select"
                  value={orgStatusFilter}
                  onChange={(e) => {
                    setOrgStatusFilter(e.target.value);
                    setOrgPage(1);
                  }}
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="trial">Trial</option>
                  <option value="expired">Expired</option>
                  <option value="revoked">Suspended</option>
                </select>

                <select
                  className="filter-select"
                  value={orgPlanFilter}
                  onChange={(e) => {
                    setOrgPlanFilter(e.target.value);
                    setOrgPage(1);
                  }}
                >
                  <option value="all">All Plans</option>
                  <option value="Basic">Basic</option>
                  <option value="Pro">Pro</option>
                  <option value="Enterprise">Enterprise</option>
                </select>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "var(--muted)" }}>
                <span>Per page:</span>
                <select
                  className="page-size-select"
                  value={orgPageSize}
                  onChange={(e) => {
                    setOrgPageSize(Number(e.target.value));
                    setOrgPage(1);
                  }}
                >
                  <option value="5">5</option>
                  <option value="10">10</option>
                  <option value="25">25</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </select>
              </div>
            </div>

            <div className="card">
              <table className="tbl">
                <thead>
                  <tr>
                    <th
                      className="sortable"
                      onClick={() => {
                        if (orgSortField === "name") setOrgSortAsc(!orgSortAsc);
                        else { setOrgSortField("name"); setOrgSortAsc(true); }
                      }}
                    >
                      Organization
                      {orgSortField === "name" && (
                        <span className="sort-indicator">{orgSortAsc ? "↑" : "↓"}</span>
                      )}
                    </th>
                    <th
                      className="sortable"
                      onClick={() => {
                        if (orgSortField === "owner") setOrgSortAsc(!orgSortAsc);
                        else { setOrgSortField("owner"); setOrgSortAsc(true); }
                      }}
                    >
                      Owner / Contact
                      {orgSortField === "owner" && (
                        <span className="sort-indicator">{orgSortAsc ? "↑" : "↓"}</span>
                      )}
                    </th>
                    <th
                      className="sortable"
                      onClick={() => {
                        if (orgSortField === "plan") setOrgSortAsc(!orgSortAsc);
                        else { setOrgSortField("plan"); setOrgSortAsc(true); }
                      }}
                    >
                      Plan
                      {orgSortField === "plan" && (
                        <span className="sort-indicator">{orgSortAsc ? "↑" : "↓"}</span>
                      )}
                    </th>
                    <th
                      className="sortable"
                      onClick={() => {
                        if (orgSortField === "status") setOrgSortAsc(!orgSortAsc);
                        else { setOrgSortField("status"); setOrgSortAsc(true); }
                      }}
                    >
                      Status
                      {orgSortField === "status" && (
                        <span className="sort-indicator">{orgSortAsc ? "↑" : "↓"}</span>
                      )}
                    </th>
                    <th
                      className="sortable"
                      onClick={() => {
                        if (orgSortField === "trial") setOrgSortAsc(!orgSortAsc);
                        else { setOrgSortField("trial"); setOrgSortAsc(true); }
                      }}
                    >
                      Trial Ends
                      {orgSortField === "trial" && (
                        <span className="sort-indicator">{orgSortAsc ? "↑" : "↓"}</span>
                      )}
                    </th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedOrgs.map((org) => {
                    const initials = org.name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
                    return (
                      <tr key={org.id}>
                        <td>
                          <div className="who-cell">
                            <div className="fb2">{initials}</div>
                            <div className="org-name-cell">
                              <span
                                className="clickable-row-name"
                                style={{ fontWeight: 600, color: "var(--ink)" }}
                                onClick={() => setDrawerItem({ type: "org", data: org })}
                                title="Click to view details"
                              >
                                {org.name}
                              </span>
                              <span className="sub">{org.id}</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          {org.ownerName || "—"}
                          <span style={{ display: "block", fontSize: "11px", color: "var(--muted)" }}>
                            {org.ownerEmail || (org.phone ? `📞 ${org.phone}` : "No email")}
                          </span>
                        </td>
                        <td>
                          <span className="pill pill-trial" style={{ textTransform: "capitalize", fontWeight: 600 }}>
                            {org.plan || "Pro"}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`pill ${
                              org.isApproved && org.subscriptionStatus === "active"
                                ? "pill-active"
                                : org.subscriptionStatus === "trial"
                                ? "pill-trial"
                                : "pill-suspended"
                            }`}
                          >
                            {org.isApproved && org.subscriptionStatus === "active"
                              ? "Active"
                              : org.subscriptionStatus === "trial"
                              ? "Trial"
                              : org.subscriptionStatus}
                          </span>
                        </td>
                        <td>{safeFormatDisplayDate(org.trialEndsAt, "No trial date")}</td>
                        <td>
                          <div className="action-buttons-group">
                            <button
                              className="row-action"
                              disabled={busy === org.id}
                              title={`Edit organization details for ${org.name}`}
                              onClick={() => openEditOrgModal(org)}
                            >
                              <Pencil size={12} /> Edit
                            </button>
                            <button
                              className="row-action btn-impersonate"
                              disabled={busy === org.id}
                              title="Impersonate & log in to this workspace"
                              onClick={async () => {
                                setBusy(org.id);
                                triggerToast(`Impersonating ${org.name}...`);
                                try {
                                  const res = await api.impersonate(org.id);
                                  triggerToast(`Workspace opened in new tab!`);
                                  const redirectTarget = res.redirectUrl || process.env.NEXT_PUBLIC_APP_URL || (typeof window !== "undefined" ? window.location.origin.replace(":8000", ":8001").replace(":3001", ":3000") : "http://localhost:8001");
                                  window.open(redirectTarget, "_blank");
                                } catch (error) {
                                  triggerToast(apiErrorMessage(error, "Impersonation failed."));
                                } finally {
                                  setBusy(null);
                                }
                              }}
                            >
                              <Eye size={12} /> Impersonate
                            </button>
                            <button
                              className="row-action"
                              disabled={busy === org.id}
                              title="Change workspace subscription plan"
                              onClick={() => openPlanModal(org.id, org.name, org.plan)}
                            >
                              <Sparkles size={12} /> Plan
                            </button>
                            {org.isApproved ? (
                              <button
                                className="row-action btn-suspend danger"
                                disabled={busy === org.id}
                                title="Suspend organization access"
                                onClick={() =>
                                  void runBackendAction(
                                    org.id,
                                    () => api.revoke(org.id),
                                    `Suspended ${org.name}`,
                                  )
                                }
                              >
                                <Ban size={12} /> Suspend
                              </button>
                            ) : (
                              <button
                                className="row-action btn-approve"
                                disabled={busy === org.id}
                                title="Approve organization"
                                onClick={() =>
                                  void runBackendAction(
                                    org.id,
                                    () => api.approve(org.id),
                                    `Approved ${org.name}`,
                                  )
                                }
                              >
                                <CheckCircle2 size={12} /> Approve
                              </button>
                            )}
                            <button
                              className="row-action danger"
                              disabled={busy === org.id}
                              title="Delete organization"
                              onClick={() => {
                                setOrgToDelete(org);
                                setDeleteConfirmName("");
                                setIsDeleteModalOpen(true);
                              }}
                            >
                              <Trash2 size={12} /> Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {processedOrgs.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: "center", padding: "24px", color: "var(--muted)" }}>
                        No organizations found matching the selected filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* PAGINATION BAR FOR ORGS */}
              {processedOrgs.length > 0 && (
                <div className="pagination-bar">
                  <div>
                    Showing <b style={{ color: "var(--ink)" }}>{(orgPage - 1) * orgPageSize + 1}</b> to{" "}
                    <b style={{ color: "var(--ink)" }}>{Math.min(orgPage * orgPageSize, processedOrgs.length)}</b> of{" "}
                    <b style={{ color: "var(--ink)" }}>{processedOrgs.length}</b> organizations
                  </div>
                  <div className="pagination-controls">
                    <button
                      className="page-nav-btn"
                      disabled={orgPage <= 1}
                      onClick={() => setOrgPage((p) => Math.max(1, p - 1))}
                    >
                      <ChevronLeft size={14} /> Prev
                    </button>
                    <span style={{ fontSize: "12px", fontWeight: 600, padding: "0 6px" }}>
                      Page {orgPage} of {totalOrgPages}
                    </span>
                    <button
                      className="page-nav-btn"
                      disabled={orgPage >= totalOrgPages}
                      onClick={() => setOrgPage((p) => Math.min(totalOrgPages, p + 1))}
                    >
                      Next <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 3. USERS SCREEN (Connected to Backend API) */}
          <div className={`page ${activePage === "users" ? "active" : ""}`}>
            <h1 className="page-title">Users</h1>
            <p className="page-sub">Search and manage every user account across all organizations.</p>

            <div className="stats">
              <div className="stat-card">
                <div className="stat-num">{platformUsers.length}</div>
                <div className="stat-label">Total users</div>
              </div>
              <div className="stat-card">
                <div className="stat-num">{platformUsers.filter((u) => u.status === "ACTIVE").length}</div>
                <div className="stat-label">Active users</div>
              </div>
              <div className="stat-card">
                <div className="stat-num">{platformUsers.filter((u) => u.roleName === "Admin").length}</div>
                <div className="stat-label">Org admins</div>
              </div>
              <div className="stat-card">
                <div className="stat-num">{platformUsers.filter((u) => u.status !== "ACTIVE").length}</div>
                <div className="stat-label">Suspended / Inactive</div>
              </div>
            </div>

            {/* TABLE TOOLBAR: MULTI-FILTERS & CONTROLS */}
            <div className="table-toolbar">
              <div className="table-filters">
                <span style={{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--muted)", display: "flex", alignItems: "center", gap: "4px" }}>
                  <Filter size={12} /> Filters:
                </span>

                {/* Filter by Organization */}
                <select
                  className="filter-select"
                  value={userOrgFilter}
                  onChange={(e) => {
                    setUserOrgFilter(e.target.value);
                    setUserPage(1);
                  }}
                >
                  <option value="all">All Organizations</option>
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name}
                    </option>
                  ))}
                </select>

                {/* Filter by Role */}
                <select
                  className="filter-select"
                  value={userRoleFilter}
                  onChange={(e) => {
                    setUserRoleFilter(e.target.value);
                    setUserPage(1);
                  }}
                >
                  <option value="all">All Roles</option>
                  <option value="admin">Admin</option>
                  <option value="manager">Manager</option>
                  <option value="team leader">Team leader</option>
                  <option value="hr">Hr</option>
                  <option value="teammates">Teammates</option>
                </select>

                {/* Filter by Status */}
                <select
                  className="filter-select"
                  value={userStatusFilter}
                  onChange={(e) => {
                    setUserStatusFilter(e.target.value);
                    setUserPage(1);
                  }}
                >
                  <option value="all">All Statuses</option>
                  <option value="ACTIVE">Active</option>
                  <option value="SUSPENDED">Suspended</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "var(--muted)" }}>
                <span>Per page:</span>
                <select
                  className="page-size-select"
                  value={userPageSize}
                  onChange={(e) => {
                    setUserPageSize(Number(e.target.value));
                    setUserPage(1);
                  }}
                >
                  <option value="5">5</option>
                  <option value="10">10</option>
                  <option value="25">25</option>
                  <option value="50">50</option>
                </select>
              </div>
            </div>

            <div className="card">
              <table className="tbl">
                <thead>
                  <tr>
                    <th
                      className="sortable"
                      onClick={() => {
                        if (userSortField === "name") setUserSortAsc(!userSortAsc);
                        else { setUserSortField("name"); setUserSortAsc(true); }
                      }}
                    >
                      User
                      {userSortField === "name" && (
                        <span className="sort-indicator">{userSortAsc ? "↑" : "↓"}</span>
                      )}
                    </th>
                    <th
                      className="sortable"
                      onClick={() => {
                        if (userSortField === "org") setUserSortAsc(!userSortAsc);
                        else { setUserSortField("org"); setUserSortAsc(true); }
                      }}
                    >
                      Organization
                      {userSortField === "org" && (
                        <span className="sort-indicator">{userSortAsc ? "↑" : "↓"}</span>
                      )}
                    </th>
                    <th
                      className="sortable"
                      onClick={() => {
                        if (userSortField === "role") setUserSortAsc(!userSortAsc);
                        else { setUserSortField("role"); setUserSortAsc(true); }
                      }}
                    >
                      Role
                      {userSortField === "role" && (
                        <span className="sort-indicator">{userSortAsc ? "↑" : "↓"}</span>
                      )}
                    </th>
                    <th
                      className="sortable"
                      onClick={() => {
                        if (userSortField === "status") setUserSortAsc(!userSortAsc);
                        else { setUserSortField("status"); setUserSortAsc(true); }
                      }}
                    >
                      Status
                      {userSortField === "status" && (
                        <span className="sort-indicator">{userSortAsc ? "↑" : "↓"}</span>
                      )}
                    </th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedUsers.map((u) => {
                    const initials = u.initials || u.name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase() || "U";
                    const isActive = u.status === "ACTIVE";
                    return (
                      <tr key={u.id}>
                        <td>
                          <div className="who-cell">
                            <div className="fb2 round" style={{ background: u.avatarColor || undefined }}>
                              {initials}
                            </div>
                            <div className="org-name-cell">
                              <span
                                className="clickable-row-name"
                                style={{ fontWeight: 600, color: "var(--ink)" }}
                                onClick={() => setDrawerItem({ type: "user", data: u })}
                                title="Click to view details"
                              >
                                {u.name}
                              </span>
                              <span className="sub">{u.email}</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span
                            className="clickable-row-name"
                            style={{ fontWeight: 500 }}
                            onClick={() => {
                              const matchOrg = organizations.find((o) => o.id === u.organizationId);
                              if (matchOrg) setDrawerItem({ type: "org", data: matchOrg });
                            }}
                          >
                            {u.organizationName}
                          </span>
                          {u.departmentName && (
                            <span style={{ display: "block", fontSize: "11px", color: "var(--muted)" }}>
                              {u.departmentName}
                            </span>
                          )}
                        </td>
                        <td>
                          {u.isSuperAdmin ? (
                            <span className="tier-badge" style={{ margin: 0 }}>Super admin</span>
                          ) : (
                            <select
                              className="role-sel"
                              value={u.roleName}
                              disabled={busy === u.id}
                              onChange={async (e) => {
                                const newRole = e.target.value;
                                setBusy(u.id);
                                try {
                                  await api.updateUserRole(u.id, newRole);
                                  await loadUsers();
                                  triggerToast(`Updated ${u.name}'s role to ${newRole}`);
                                } catch (err) {
                                  triggerToast(apiErrorMessage(err, "Failed to update role."));
                                } finally {
                                  setBusy(null);
                                }
                              }}
                            >
                              <option value="Admin">Admin</option>
                              <option value="Manager">Manager</option>
                              <option value="Team leader">Team leader</option>
                              <option value="Hr">Hr</option>
                              <option value="Teammates">Teammates</option>
                            </select>
                          )}
                        </td>
                        <td>
                          <span className={`pill ${isActive ? "pill-active" : "pill-suspended"}`}>
                            {u.status}
                          </span>
                        </td>
                        <td>
                          <div className="action-buttons-group">
                            {!u.isSuperAdmin && (
                              <>
                                <button
                                  className="row-action"
                                  disabled={busy === u.id}
                                  title={`Edit details for ${u.name}`}
                                  onClick={() => openEditUserModal(u)}
                                >
                                  <Pencil size={12} /> Edit
                                </button>
                                <button
                                  className={`row-action ${isActive ? "danger" : ""}`}
                                  disabled={busy === u.id}
                                  onClick={async () => {
                                    const nextStatus = isActive ? "SUSPENDED" : "ACTIVE";
                                    setBusy(u.id);
                                    try {
                                      await api.updateUserStatus(u.id, nextStatus);
                                      await loadUsers();
                                      triggerToast(`${nextStatus === "ACTIVE" ? "Reactivated" : "Suspended"} ${u.name}`);
                                    } catch (err) {
                                      triggerToast(apiErrorMessage(err, "Failed to update status."));
                                    } finally {
                                      setBusy(null);
                                    }
                                  }}
                                >
                                  {isActive ? (
                                    <>
                                      <Ban size={12} /> Suspend
                                    </>
                                  ) : (
                                    <>
                                      <CheckCircle2 size={12} /> Reactivate
                                    </>
                                  )}
                                </button>
                                {u.organizationId && (
                                  <button
                                    className="row-action"
                                    disabled={busy === u.id}
                                    title={`Change workspace plan for ${u.organizationName}`}
                                    onClick={() => openPlanModal(u.organizationId!, u.organizationName, u.organizationPlan)}
                                  >
                                    <Sparkles size={12} /> Plan
                                  </button>
                                )}
                                <button
                                  className="row-action danger"
                                  disabled={busy === u.id}
                                  title="Delete user"
                                  onClick={async () => {
                                    if (!confirm(`Are you sure you want to delete ${u.name} (${u.email})?`)) return;
                                    setBusy(u.id);
                                    try {
                                      await api.deleteUser(u.id);
                                      await loadUsers();
                                      triggerToast(`Deleted ${u.name}`);
                                    } catch (err) {
                                      triggerToast(apiErrorMessage(err, "Failed to delete user."));
                                    } finally {
                                      setBusy(null);
                                    }
                                  }}
                                >
                                  <Trash2 size={12} /> Delete
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {processedUsers.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ textAlign: "center", padding: "24px", color: "var(--muted)" }}>
                        No users found matching the selected filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* PAGINATION BAR FOR USERS */}
              {processedUsers.length > 0 && (
                <div className="pagination-bar">
                  <div>
                    Showing <b style={{ color: "var(--ink)" }}>{(userPage - 1) * userPageSize + 1}</b> to{" "}
                    <b style={{ color: "var(--ink)" }}>{Math.min(userPage * userPageSize, processedUsers.length)}</b> of{" "}
                    <b style={{ color: "var(--ink)" }}>{processedUsers.length}</b> users
                  </div>
                  <div className="pagination-controls">
                    <button
                      className="page-nav-btn"
                      disabled={userPage <= 1}
                      onClick={() => setUserPage((p) => Math.max(1, p - 1))}
                    >
                      <ChevronLeft size={14} /> Prev
                    </button>
                    <span style={{ fontSize: "12px", fontWeight: 600, padding: "0 6px" }}>
                      Page {userPage} of {totalUserPages}
                    </span>
                    <button
                      className="page-nav-btn"
                      disabled={userPage >= totalUserPages}
                      onClick={() => setUserPage((p) => Math.min(totalUserPages, p + 1))}
                    >
                      Next <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 4. PLANS SCREEN */}
          <div className={`page ${activePage === "plans" ? "active" : ""}`}>
            <h1 className="page-title">Available Workspace Plans</h1>
            <p className="page-sub">
              Compare features and choose the tier that matches your team size and workflow needs.
            </p>

            <div className="plans-grid">
              {/* Basic Plan Card */}
              <div className="plan-card">
                <h3>Basic Plan</h3>
                <p className="plan-sub">For small teams getting started with essential task tracking.</p>
                <div className="plan-price">
                  ₹200 <span>/mo</span>
                </div>
                <hr className="plan-divider" />
                <div className="plan-features-list">
                  <div className="plan-feat-check">
                    <CheckCircle2 size={14} /> Up to 5 team members
                  </div>
                  <div className="plan-feat-check">
                    <CheckCircle2 size={14} /> Up to 3 projects
                  </div>
                  <div className="plan-feat-check">
                    <CheckCircle2 size={14} /> Unlimited tasks
                  </div>
                  <div className="plan-feat-check">
                    <CheckCircle2 size={14} /> Kanban Board
                  </div>
                  <div className="plan-feat-check">
                    <CheckCircle2 size={14} /> Basic task management
                  </div>
                </div>
                <button
                  className="btn"
                  style={{
                    width: "100%",
                    height: "36px",
                    borderRadius: "8px",
                    fontWeight: 600,
                    fontSize: "13px",
                    marginTop: "auto",
                    background: "var(--paper-2)",
                    borderColor: "var(--line)",
                  }}
                  onClick={() => triggerToast("Basic plan tier is ₹200/mo")}
                >
                  Choose Basic Plan
                </button>
              </div>

              {/* Pro Plan Card (Featured) */}
              <div className="plan-card featured">
                <span className="badge-featured">Most Popular</span>
                <h3>Pro Plan</h3>
                <p className="plan-sub">For growing teams with advanced management features.</p>
                <div className="plan-price">
                  ₹450 <span>/mo</span>
                </div>
                <hr className="plan-divider" />
                <div className="plan-features-list">
                  <div className="plan-feat-check">
                    <CheckCircle2 size={14} /> Up to 50 team members
                  </div>
                  <div className="plan-feat-check">
                    <CheckCircle2 size={14} /> Unlimited projects
                  </div>
                  <div className="plan-feat-check">
                    <CheckCircle2 size={14} /> Screenshot monitoring
                  </div>
                  <div className="plan-feat-check">
                    <CheckCircle2 size={14} /> Time tracking
                  </div>
                  <div className="plan-feat-check">
                    <CheckCircle2 size={14} /> Departments
                  </div>
                </div>
                <button
                  className="btn btn-primary"
                  style={{ width: "100%", height: "36px", borderRadius: "8px", fontWeight: 600, marginTop: "auto", fontSize: "13px" }}
                  onClick={() => triggerToast("Pro plan tier is ₹450/mo")}
                >
                  Upgrade / Activate Pro
                </button>
              </div>

              {/* Enterprise Plan Card */}
              <div className="plan-card">
                <div className="badge-scale">Scale &amp;<br />Custom</div>
                <h3>Enterprise Plan</h3>
                <p className="plan-sub">For large organizations requiring custom controls &amp; scale.</p>
                <div className="plan-price">
                  ₹999 <span>/mo</span>
                </div>
                <hr className="plan-divider" />
                <div className="plan-features-list">
                  <div className="plan-feat-check">
                    <CheckCircle2 size={14} /> Unlimited team members
                  </div>
                  <div className="plan-feat-check">
                    <CheckCircle2 size={14} /> Unlimited projects
                  </div>
                  <div className="plan-feat-check">
                    <CheckCircle2 size={14} /> White Label
                  </div>
                  <div className="plan-feat-check">
                    <CheckCircle2 size={14} /> Custom Domain
                  </div>
                  <div className="plan-feat-check">
                    <CheckCircle2 size={14} /> API Access &amp; Webhooks
                  </div>
                  <div className="plan-feat-check">
                    <CheckCircle2 size={14} /> 24/7 Priority Support
                  </div>
                </div>
                <button
                  className="btn"
                  style={{
                    width: "100%",
                    height: "36px",
                    borderRadius: "8px",
                    fontWeight: 600,
                    fontSize: "13px",
                    marginTop: "auto",
                    background: "var(--paper-2)",
                    borderColor: "var(--line)",
                  }}
                  onClick={() => triggerToast("Enterprise plan tier is ₹999/mo")}
                >
                  Choose Enterprise Plan
                </button>
              </div>
            </div>

            {/* INVOICES MANAGEMENT */}
            <div className="panel-head" style={{ marginTop: "16px" }}>
              <div>
                <h2>Platform Invoices &amp; Billing Statements</h2>
                <p style={{ fontSize: "12.5px", color: "var(--muted)", margin: "3px 0 0" }}>
                  Automated monthly subscription statements and tax invoices across all active organizations.
                </p>
              </div>
              {searchQuery && (
                <span style={{ fontSize: "12px", color: "var(--muted)" }}>
                  Filtering by "{searchQuery}"
                </span>
              )}
            </div>

            {/* INVOICE FILTER TABS */}
            <div className="filter-pills" style={{ marginBottom: "16px" }}>
              <button
                className={`filter-pill ${invoiceStatusFilter === "all" ? "active" : ""}`}
                onClick={() => setInvoiceStatusFilter("all")}
              >
                All Invoices <span className="count">{allInvoices.length}</span>
              </button>
              <button
                className={`filter-pill ${invoiceStatusFilter === "Paid" ? "active" : ""}`}
                onClick={() => setInvoiceStatusFilter("Paid")}
              >
                Paid <span className="count">{allInvoices.filter((i) => i.status === "Paid").length}</span>
              </button>
              <button
                className={`filter-pill ${invoiceStatusFilter === "Pending" ? "active" : ""}`}
                onClick={() => setInvoiceStatusFilter("Pending")}
              >
                Pending <span className="count">{allInvoices.filter((i) => i.status === "Pending").length}</span>
              </button>
              <button
                className={`filter-pill ${invoiceStatusFilter === "Overdue" ? "active" : ""}`}
                onClick={() => setInvoiceStatusFilter("Overdue")}
              >
                Overdue <span className="count">{allInvoices.filter((i) => i.status === "Overdue").length}</span>
              </button>
            </div>

            {filteredInvoices.length > 0 ? (
              <div className="card">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Invoice ID</th>
                      <th>Organization / Client</th>
                      <th>Plan Tier</th>
                      <th>Amount (INR)</th>
                      <th>Billing Date</th>
                      <th>Status</th>
                      <th style={{ textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInvoices.map((inv) => (
                      <tr key={inv.id || inv.orgName}>
                        <td>
                          <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, fontSize: "12px" }}>
                            {inv.id || "INV-2026-001"}
                          </span>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: "var(--ink)" }}>{inv.orgName}</div>
                          <div style={{ fontSize: "11px", color: "var(--muted)" }}>{inv.billingEmail}</div>
                        </td>
                        <td>
                          <span className="pill pill-trial" style={{ fontWeight: 600 }}>
                            {inv.plan}
                          </span>
                        </td>
                        <td style={{ fontWeight: 600, color: "var(--ink)" }}>
                          {inv.amount}
                        </td>
                        <td style={{ fontSize: "12.5px" }}>{inv.date}</td>
                        <td>
                          <span
                            className={`pill ${
                              inv.status === "Paid"
                                ? "pill-active"
                                : inv.status === "Pending"
                                ? "pill-trial"
                                : "pill-suspended"
                            }`}
                          >
                            {inv.status}
                          </span>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <button
                            className="row-action"
                            style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}
                            title="Print or download official PDF invoice"
                            onClick={() => handleDownloadInvoice(inv)}
                          >
                            <Printer size={12} /> Download PDF
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-invoices-card">
                <div className="empty-invoices-icon">
                  <FileText size={20} />
                </div>
                <div className="empty-invoices-title">No matching invoices found</div>
                <div className="empty-invoices-sub">
                  {searchQuery || invoiceStatusFilter !== "all"
                    ? "No billing records match the current filter or search criteria."
                    : "Billing statements and payment receipts for subscribed organizations will automatically appear here."}
                </div>
              </div>
            )}
          </div>

          {/* 5. FEATURE FLAGS SCREEN (Mock client side) */}
          <div className={`page ${activePage === "flags" ? "active" : ""}`}>
            <h1 className="page-title">Feature flags</h1>
            <p className="page-sub">Turn modules on or off platform-wide, independent of plan.</p>

            <div className="flags-grid">
              <div className="card" style={{ padding: "4px 14px" }}>
                {featureFlags.slice(0, 3).map((f) => (
                  <div className="flag-row" key={f.id}>
                    <div>
                      <div className="lbl">{f.label}</div>
                      <div className="sub">{f.sub}</div>
                    </div>
                    <button
                      className={`switch ${f.enabled ? "on" : ""}`}
                      onClick={() => {
                        setFeatureFlags((prev) =>
                          prev.map((flag) => (flag.id === f.id ? { ...flag, enabled: !flag.enabled } : flag)),
                        );
                        triggerToast(`${f.label} flag toggled`);
                      }}
                    >
                      <div className="knob"></div>
                    </button>
                  </div>
                ))}
              </div>

              <div className="card" style={{ padding: "4px 14px" }}>
                {featureFlags.slice(3, 6).map((f) => (
                  <div className="flag-row" key={f.id}>
                    <div>
                      <div className="lbl">{f.label}</div>
                      <div className="sub">{f.sub}</div>
                    </div>
                    <button
                      className={`switch ${f.enabled ? "on" : ""}`}
                      onClick={() => {
                        setFeatureFlags((prev) =>
                          prev.map((flag) => (flag.id === f.id ? { ...flag, enabled: !flag.enabled } : flag)),
                        );
                        triggerToast(`${f.label} flag toggled`);
                      }}
                    >
                      <div className="knob"></div>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 6. SYSTEM LOGS SCREEN (Connected to Backend API) */}
          <div className={`page ${activePage === "logs" ? "active" : ""}`}>
            <h1 className="page-title">System logs</h1>
            <p className="page-sub">Platform-wide audit trail and real-time event stream across all organizations.</p>

            <div className="stats">
              <div className="stat-card">
                <div className="stat-num">{systemLogs.length}</div>
                <div className="stat-label">Total audit logs</div>
              </div>
              <div className="stat-card">
                <div className="stat-num">{systemLogs.filter((l) => l.category === "info").length}</div>
                <div className="stat-label">Workspace events</div>
              </div>
              <div className="stat-card">
                <div className="stat-num">{systemLogs.filter((l) => l.category === "sec").length}</div>
                <div className="stat-label">Security &amp; user events</div>
              </div>
              <div className="stat-card">
                <div className="stat-num">{systemLogs.filter((l) => l.category === "sys").length}</div>
                <div className="stat-label">System activity</div>
              </div>
            </div>

            <div className="filter-pills">
              <button
                className={`filter-pill ${logCategoryFilter === "all" ? "active" : ""}`}
                onClick={() => setLogCategoryFilter("all")}
              >
                All events <span className="count">{systemLogs.length}</span>
              </button>
              <button
                className={`filter-pill ${logCategoryFilter === "info" ? "active" : ""}`}
                onClick={() => setLogCategoryFilter("info")}
              >
                Workspaces <span className="count">{systemLogs.filter((l) => l.category === "info").length}</span>
              </button>
              <button
                className={`filter-pill ${logCategoryFilter === "sec" ? "active" : ""}`}
                onClick={() => setLogCategoryFilter("sec")}
              >
                Security &amp; Auth <span className="count">{systemLogs.filter((l) => l.category === "sec").length}</span>
              </button>
              <button
                className={`filter-pill ${logCategoryFilter === "sys" ? "active" : ""}`}
                onClick={() => setLogCategoryFilter("sys")}
              >
                Platform activity <span className="count">{systemLogs.filter((l) => l.category === "sys").length}</span>
              </button>
            </div>

            <div className="panel-head">
              <h2>Audit stream</h2>
              <button
                className="btn btn-sm"
                onClick={() => {
                  void loadLogs();
                  triggerToast("Logs refreshed");
                }}
              >
                Refresh logs
              </button>
            </div>

            {filteredLogs.length > 0 ? (
              <div className="card">
                <div style={{ padding: "4px 14px" }}>
                  {paginatedLogs.map((log) => {
                    let formattedDate = log.timestamp;
                    try {
                      const d = new Date(log.timestamp);
                      if (!isNaN(d.getTime())) {
                        formattedDate = d.toLocaleString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        });
                      }
                    } catch {
                      formattedDate = log.timestamp;
                    }
                    return (
                      <div className="log-row" key={log.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid var(--line)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <span className={`log-tag ${log.category}`}>
                            {log.category === "info" ? "Workspace" : log.category === "sec" ? "Security" : "Activity"}
                          </span>
                          <span style={{ fontSize: "13px", color: "var(--ink)", fontWeight: 500 }}>{log.message}</span>
                        </div>
                        <span className="t" style={{ fontSize: "12px", color: "var(--muted)", whiteSpace: "nowrap" }}>{formattedDate}</span>
                      </div>
                    );
                  })}
                </div>

                {/* PAGINATION BAR FOR SYSTEM LOGS */}
                <div className="pagination-bar">
                  <div>
                    Showing <b style={{ color: "var(--ink)" }}>{(logsPage - 1) * logsPageSize + 1}</b> to{" "}
                    <b style={{ color: "var(--ink)" }}>{Math.min(logsPage * logsPageSize, filteredLogs.length)}</b> of{" "}
                    <b style={{ color: "var(--ink)" }}>{filteredLogs.length}</b> events
                  </div>
                  <div className="pagination-controls">
                    <button
                      className="page-nav-btn"
                      disabled={logsPage <= 1}
                      onClick={() => setLogsPage((p) => Math.max(1, p - 1))}
                    >
                      <ChevronLeft size={14} /> Prev
                    </button>
                    <span style={{ fontSize: "12px", fontWeight: 600, padding: "0 6px" }}>
                      Page {logsPage} of {totalLogPages}
                    </span>
                    <button
                      className="page-nav-btn"
                      disabled={logsPage >= totalLogPages}
                      onClick={() => setLogsPage((p) => Math.min(totalLogPages, p + 1))}
                    >
                      Next <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="empty-invoices-card">
                <div className="empty-invoices-icon">
                  <Shield size={20} />
                </div>
                <div className="empty-invoices-title">No system logs found</div>
                <div className="empty-invoices-sub">
                  Platform security events, workspace registrations, and user activities will automatically stream here.
                </div>
              </div>
            )}
          </div>

          {/* 7. SECURITY SCREEN (Mock client side) */}
          <div className={`page ${activePage === "security" ? "active" : ""}`}>
            <h1 className="page-title">Security</h1>
            <p className="page-sub">Platform-wide authentication and access policies.</p>

            <div className="card" style={{ padding: "4px 14px", maxWidth: "600px" }}>
              {securityFlags.map((sec) => (
                <div className="flag-row" key={sec.id}>
                  <div>
                    <div className="lbl">{sec.label}</div>
                    <div className="sub">{sec.sub}</div>
                  </div>
                  <button
                    className={`switch ${sec.enabled ? "on" : ""}`}
                    onClick={() => {
                      setSecurityFlags((prev) =>
                        prev.map((s) => (s.id === sec.id ? { ...s, enabled: !s.enabled } : s)),
                      );
                      triggerToast(`${sec.label} policy updated`);
                    }}
                  >
                    <div className="knob"></div>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* 8. SUPPORT SCREEN */}
          <div className={`page ${activePage === "support" ? "active" : ""}`}>
            <h1 className="page-title">Support Tickets</h1>
            <p className="page-sub">Client assistance inquiries, enterprise SLA tickets, and platform escalation requests.</p>

            <div className="panel-head">
              <div>
                <h2>Customer Service Requests</h2>
              </div>
              {searchQuery && (
                <span style={{ fontSize: "12px", color: "var(--muted)" }}>
                  Filtering by "{searchQuery}"
                </span>
              )}
            </div>

            {/* TICKET STATUS FILTER TABS */}
            <div className="filter-pills" style={{ marginBottom: "16px" }}>
              <button
                className={`filter-pill ${ticketStatusFilter === "all" ? "active" : ""}`}
                onClick={() => setTicketStatusFilter("all")}
              >
                All Tickets <span className="count">{supportTickets.length}</span>
              </button>
              <button
                className={`filter-pill ${ticketStatusFilter === "Open" ? "active" : ""}`}
                onClick={() => setTicketStatusFilter("Open")}
              >
                Open <span className="count">{supportTickets.filter((t) => (t.status || "Open") === "Open").length}</span>
              </button>
              <button
                className={`filter-pill ${ticketStatusFilter === "In Progress" ? "active" : ""}`}
                onClick={() => setTicketStatusFilter("In Progress")}
              >
                In Progress <span className="count">{supportTickets.filter((t) => t.status === "In Progress").length}</span>
              </button>
              <button
                className={`filter-pill ${ticketStatusFilter === "Resolved" ? "active" : ""}`}
                onClick={() => setTicketStatusFilter("Resolved")}
              >
                Resolved <span className="count">{supportTickets.filter((t) => t.status === "Resolved").length}</span>
              </button>
            </div>

            {filteredTickets.length > 0 ? (
              <div className="card">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Ticket ID</th>
                      <th>Subject &amp; Details</th>
                      <th>Organization</th>
                      <th>Priority</th>
                      <th>Status</th>
                      <th>Opened</th>
                      <th style={{ textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTickets.map((t) => (
                      <tr key={t.id}>
                        <td>
                          <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, fontSize: "12px" }}>
                            {t.id}
                          </span>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: "var(--ink)" }}>{t.title}</div>
                          <div style={{ fontSize: "11.5px", color: "var(--muted)", maxWidth: "340px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {t.description || "No additional description"}
                          </div>
                        </td>
                        <td>
                          <span style={{ fontWeight: 500 }}>{t.orgName}</span>
                        </td>
                        <td>
                          <span
                            className={`pill ${
                              t.priority === "High"
                                ? "pill-suspended"
                                : t.priority === "Medium"
                                ? "pill-trial"
                                : "pill-active"
                            }`}
                            style={{ fontWeight: 700 }}
                          >
                            {t.priority || "Medium"}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`pill ${
                              t.status === "Resolved"
                                ? "pill-active"
                                : t.status === "In Progress"
                                ? "pill-trial"
                                : "pill-suspended"
                            }`}
                          >
                            {t.status || "Open"}
                          </span>
                        </td>
                        <td style={{ fontSize: "12px", color: "var(--muted)", whiteSpace: "nowrap" }}>
                          {t.openedAt}
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <button
                            className="row-action"
                            onClick={() => {
                              setSelectedTicket(t);
                              setTicketReplyText(t.lastReply || "");
                              setIsTicketModalOpen(true);
                            }}
                          >
                            <Pencil size={12} /> View &amp; Reply
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-invoices-card">
                <div className="empty-invoices-icon">
                  <Shield size={20} />
                </div>
                <div className="empty-invoices-title">No support tickets found</div>
                <div className="empty-invoices-sub">
                  {searchQuery || ticketStatusFilter !== "all"
                    ? "No support tickets match the current filter or search criteria."
                    : "Customer support inquiries, SLA tickets, and escalated assistance requests will appear here."}
                </div>
              </div>
            )}
          </div>

          {/* 9. SETTINGS SCREEN (Mock client side) */}
          <div className={`page ${activePage === "settings" ? "active" : ""}`}>
            <h1 className="page-title">Platform settings</h1>
            <p className="page-sub">Global configuration for the entire {platformName} platform.</p>

            <div className="tabs">
              <button
                className={`tab ${settingsTab === "general" ? "active" : ""}`}
                onClick={() => setSettingsTab("general")}
              >
                General
              </button>
              <button
                className={`tab ${settingsTab === "api" ? "active" : ""}`}
                onClick={() => setSettingsTab("api")}
              >
                API &amp; webhooks
              </button>
              <button
                className={`tab ${settingsTab === "branding" ? "active" : ""}`}
                onClick={() => setSettingsTab("branding")}
              >
                Default branding
              </button>
            </div>

            {/* General Tab */}
            <div className={`settings-panel ${settingsTab === "general" ? "active" : ""}`}>
              <div className="field">
                <label>Platform name</label>
                <input
                  type="text"
                  value={platformName}
                  onChange={(e) => setPlatformName(e.target.value)}
                />
              </div>
              <div className="field">
                <label>Support email</label>
                <input
                  type="text"
                  value={supportEmail}
                  onChange={(e) => setSupportEmail(e.target.value)}
                />
              </div>
              <div className="field">
                <label>Default time zone for new orgs</label>
                <select
                  value={defaultTimezone}
                  onChange={(e) => setDefaultTimezone(e.target.value)}
                >
                  <option>UTC</option>
                  <option>IST — Asia/Kolkata</option>
                  <option>PST — America/Los_Angeles</option>
                </select>
              </div>

              {/* Maintenance Mode Switch */}
              <div style={{ background: "var(--paper-2)", border: "1px solid var(--line)", borderRadius: "8px", padding: "14px 16px", margin: "18px 0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "14px", color: "var(--ink)" }}>
                      System Maintenance Mode
                    </div>
                    <div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "2px" }}>
                      When active, blocks non-superadmin users and displays a system upgrade notice.
                    </div>
                  </div>
                  <button
                    className={`switch ${maintenanceMode ? "on" : ""}`}
                    onClick={() => {
                      const next = !maintenanceMode;
                      setMaintenanceMode(next);
                      triggerToast(next ? "System maintenance mode ACTIVATED" : "System maintenance mode DEACTIVATED");
                    }}
                  >
                    <div className="knob"></div>
                  </button>
                </div>
              </div>

              <button className="btn btn-primary" onClick={() => triggerToast("Platform settings saved successfully!")}>
                Save changes
              </button>
            </div>

            {/* API Tab */}
            <div className={`settings-panel ${settingsTab === "api" ? "active" : ""}`}>
              <div className="key-row">
                <span>pk_live_51H8x••••••••••••••••e93A</span>
                <button className="btn btn-sm" onClick={() => triggerToast("API Key copied to clipboard")}>
                  Copy
                </button>
                <button className="btn btn-sm btn-danger" onClick={() => triggerToast("Key revoked")}>
                  Revoke
                </button>
              </div>
              <div className="key-row">
                <span>whsec_9F2b••••••••••••••••c71Z</span>
                <button className="btn btn-sm" onClick={() => triggerToast("Webhook secret copied to clipboard")}>
                  Copy
                </button>
                <button className="btn btn-sm btn-danger" onClick={() => triggerToast("Webhook secret revoked")}>
                  Revoke
                </button>
              </div>
              <button className="btn btn-primary" onClick={() => triggerToast("New API key generated")}>
                Generate new key
              </button>
            </div>

            {/* Branding Tab */}
            <div className={`settings-panel ${settingsTab === "branding" ? "active" : ""}`}>
              <div className="field">
                <label>Default accent color for new orgs</label>
                <div style={{ display: "flex", gap: "8px", marginTop: "6px" }}>
                  <button
                    className="swatch"
                    style={{
                      background: "#3cdb73",
                      border: accentColor === "#3cdb73" ? "2px solid var(--text)" : "none",
                    }}
                    onClick={() => setAccentColor("#3cdb73")}
                  />
                  <button
                    className="swatch"
                    style={{
                      background: "#2F8F80",
                      border: accentColor === "#2F8F80" ? "2px solid var(--text)" : "none",
                    }}
                    onClick={() => setAccentColor("#2F8F80")}
                  />
                  <button
                    className="swatch"
                    style={{
                      background: "#C98A2C",
                      border: accentColor === "#C98A2C" ? "2px solid var(--text)" : "none",
                    }}
                    onClick={() => setAccentColor("#C98A2C")}
                  />
                </div>
              </div>
              <button className="btn btn-primary" onClick={() => triggerToast("Default branding saved")}>
                Save changes
              </button>
            </div>
          </div>

        </main>
      </div>

      {/* NEW ORGANIZATION MODAL OVERLAY */}
      <div className={`overlay ${isModalOpen ? "open" : ""}`}>
        <div className="modal">
          <h3>New organization</h3>
          <p className="sub">Create a workspace on behalf of a new client.</p>
          <div className="field">
            <label htmlFor="oname">Organization name</label>
            <input
              type="text"
              id="oname"
              placeholder="e.g. Brookvale Studio"
              value={newOrgName}
              onChange={(e) => setNewOrgName(e.target.value)}
            />
          </div>
          <div className="row2">
            <div className="field">
              <label htmlFor="odomain">Domain</label>
              <input
                type="text"
                id="odomain"
                placeholder="company.com"
                value={newOrgDomain}
                onChange={(e) => setNewOrgDomain(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="oplan">Plan</label>
              <select
                id="oplan"
                value={newOrgPlan}
                onChange={(e) => setNewOrgPlan(e.target.value as "Basic" | "Pro" | "Enterprise")}
              >
                <option value="Basic">Basic Plan</option>
                <option value="Pro">Pro Plan</option>
                <option value="Enterprise">Enterprise Plan</option>
              </select>
            </div>
          </div>
          <div className="field">
            <label htmlFor="oemail">Owner email</label>
            <input
              type="text"
              id="oemail"
              placeholder="owner@company.com"
              value={newOrgEmail}
              onChange={(e) => setNewOrgEmail(e.target.value)}
            />
          </div>
          <div className="modal-foot">
            <button className="btn" onClick={() => setIsModalOpen(false)}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleCreateOrg}>
              Create organization
            </button>
          </div>
        </div>
      </div>

      {/* DELETE CONFIRMATION MODAL OVERLAY */}
      <div className={`overlay ${isDeleteModalOpen ? "open" : ""}`}>
        <div className="modal">
          <h3 style={{ color: "var(--red)" }}>Delete organization</h3>
          <p className="sub" style={{ marginTop: "8px", marginBottom: "14px" }}>
            Are you sure you want to permanently delete <strong>{orgToDelete?.name}</strong>? This action is irreversible and all workspace data will be removed.
          </p>
          <div style={{ marginBottom: "18px" }}>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted)", marginBottom: "6px" }}>
              Type <span style={{ color: "var(--red)", fontWeight: 700 }}>{orgToDelete?.name}</span> to confirm:
            </label>
            <input
              type="text"
              value={deleteConfirmName}
              onChange={(e) => setDeleteConfirmName(e.target.value)}
              placeholder={`Type exact name "${orgToDelete?.name || ""}"`}
              style={{
                width: "100%",
                padding: "9px 12px",
                borderRadius: "6px",
                border: "1px solid var(--line)",
                background: "var(--paper)",
                color: "var(--ink)",
                fontSize: "13.5px",
                outline: "none",
              }}
            />
          </div>
          <div className="modal-foot">
            <button className="btn" onClick={() => {
              setIsDeleteModalOpen(false);
              setOrgToDelete(null);
              setDeleteConfirmName("");
            }}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              style={{
                background: "var(--red)",
                borderColor: "var(--red)",
                opacity: (busy === orgToDelete?.id || deleteConfirmName.trim() !== (orgToDelete?.name || "").trim()) ? 0.5 : 1,
                cursor: (busy === orgToDelete?.id || deleteConfirmName.trim() !== (orgToDelete?.name || "").trim()) ? "not-allowed" : "pointer",
              }}
              disabled={busy === orgToDelete?.id || deleteConfirmName.trim() !== (orgToDelete?.name || "").trim()}
              onClick={() => {
                if (orgToDelete && deleteConfirmName.trim() === orgToDelete.name.trim()) {
                  void runBackendAction(
                    orgToDelete.id,
                    () => api.remove(orgToDelete.id),
                    `Deleted ${orgToDelete.name}`,
                  );
                }
                setIsDeleteModalOpen(false);
                setOrgToDelete(null);
                setDeleteConfirmName("");
              }}
            >
              {busy === orgToDelete?.id ? "Deleting..." : "Delete permanently"}
            </button>
          </div>
        </div>
      </div>

      {/* CHANGE PLAN MODAL OVERLAY */}
      <div className={`overlay ${isPlanModalOpen ? "open" : ""}`}>
        <div className="modal" style={{ maxWidth: "620px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
            <div>
              <h3>Change Workspace Plan</h3>
              <p className="sub" style={{ marginBottom: "8px", marginTop: "4px" }}>
                Select a subscription tier for <strong>{planModalOrg?.name}</strong>.
              </p>
            </div>
            {planModalOrg?.currentPlan && (
              <span className="pill pill-trial" style={{ textTransform: "uppercase", fontSize: "11px" }}>
                Current: {planModalOrg.currentPlan}
              </span>
            )}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", margin: "18px 0" }}>
            {/* Basic Plan */}
            <div
              onClick={() => setSelectedPlanTier("Basic")}
              style={{
                border: selectedPlanTier === "Basic" ? "2px solid var(--terracotta)" : "1px solid var(--line)",
                background: selectedPlanTier === "Basic" ? "var(--terracotta-dim)" : "var(--surface)",
                borderRadius: "10px",
                padding: "16px 14px",
                cursor: "pointer",
                transition: "all 0.15s ease",
                display: "flex",
                flexDirection: "column",
                position: "relative",
              }}
            >
              {selectedPlanTier === "Basic" && (
                <div style={{ position: "absolute", top: "10px", right: "10px", color: "var(--terracotta)" }}>
                  <CheckCircle2 size={16} />
                </div>
              )}
              <h4 style={{ margin: "0 0 2px", fontSize: "15px", color: "var(--ink)", fontWeight: 700 }}>Basic</h4>
              <div style={{ fontSize: "18px", fontWeight: 700, color: "var(--ink)", marginBottom: "8px" }}>
                ₹200<span style={{ fontSize: "11px", color: "var(--muted)", fontWeight: 500 }}>/mo</span>
              </div>
              <ul style={{ margin: 0, padding: 0, listStyle: "none", fontSize: "11.5px", color: "var(--muted)", display: "flex", flexDirection: "column", gap: "4px" }}>
                <li>✓ Up to 5 members</li>
                <li>✓ 3 projects</li>
                <li>✓ Kanban board</li>
              </ul>
            </div>

            {/* Pro Plan */}
            <div
              onClick={() => setSelectedPlanTier("Pro")}
              style={{
                border: selectedPlanTier === "Pro" ? "2px solid var(--terracotta)" : "1px solid var(--line)",
                background: selectedPlanTier === "Pro" ? "var(--terracotta-dim)" : "var(--surface)",
                borderRadius: "10px",
                padding: "16px 14px",
                cursor: "pointer",
                transition: "all 0.15s ease",
                display: "flex",
                flexDirection: "column",
                position: "relative",
              }}
            >
              <span style={{ position: "absolute", top: "-9px", right: "12px", background: "var(--terracotta)", color: "#fff", fontSize: "9px", fontWeight: 700, padding: "2px 6px", borderRadius: "10px" }}>
                Popular
              </span>
              <h4 style={{ margin: "0 0 2px", fontSize: "15px", color: "var(--ink)", fontWeight: 700 }}>Pro</h4>
              <div style={{ fontSize: "18px", fontWeight: 700, color: "var(--ink)", marginBottom: "8px" }}>
                ₹450<span style={{ fontSize: "11px", color: "var(--muted)", fontWeight: 500 }}>/mo</span>
              </div>
              <ul style={{ margin: 0, padding: 0, listStyle: "none", fontSize: "11.5px", color: "var(--muted)", display: "flex", flexDirection: "column", gap: "4px" }}>
                <li>✓ Up to 50 members</li>
                <li>✓ Unlimited projects</li>
                <li>✓ Screen monitoring</li>
                <li>✓ Time tracking</li>
              </ul>
            </div>

            {/* Enterprise Plan */}
            <div
              onClick={() => setSelectedPlanTier("Enterprise")}
              style={{
                border: selectedPlanTier === "Enterprise" ? "2px solid var(--terracotta)" : "1px solid var(--line)",
                background: selectedPlanTier === "Enterprise" ? "var(--terracotta-dim)" : "var(--surface)",
                borderRadius: "10px",
                padding: "16px 14px",
                cursor: "pointer",
                transition: "all 0.15s ease",
                display: "flex",
                flexDirection: "column",
                position: "relative",
              }}
            >
              {selectedPlanTier === "Enterprise" && (
                <div style={{ position: "absolute", top: "10px", right: "10px", color: "var(--terracotta)" }}>
                  <CheckCircle2 size={16} />
                </div>
              )}
              <h4 style={{ margin: "0 0 2px", fontSize: "15px", color: "var(--ink)", fontWeight: 700 }}>Enterprise</h4>
              <div style={{ fontSize: "18px", fontWeight: 700, color: "var(--ink)", marginBottom: "8px" }}>
                ₹999<span style={{ fontSize: "11px", color: "var(--muted)", fontWeight: 500 }}>/mo</span>
              </div>
              <ul style={{ margin: 0, padding: 0, listStyle: "none", fontSize: "11.5px", color: "var(--muted)", display: "flex", flexDirection: "column", gap: "4px" }}>
                <li>✓ Unlimited members</li>
                <li>✓ Unlimited projects</li>
                <li>✓ White Label &amp; Custom Domain</li>
                <li>✓ 24/7 Priority support</li>
              </ul>
            </div>
          </div>

          <div className="modal-foot">
            <button className="btn" onClick={() => {
              setIsPlanModalOpen(false);
              setPlanModalOrg(null);
            }}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              disabled={busy === `plan-${planModalOrg?.id}`}
              onClick={handleUpdatePlan}
            >
              {busy === `plan-${planModalOrg?.id}` ? "Updating plan…" : `Activate ${selectedPlanTier} Plan`}
            </button>
          </div>
        </div>
      </div>

      {/* 4. EDIT USER MODAL (Matching site aesthetic & user requirements) */}
      <div
        className={`overlay ${isEditUserModalOpen ? "open" : ""}`}
        onClick={() => {
          setIsEditUserModalOpen(false);
          setUserToEdit(null);
        }}
      >
        <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "460px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" }}>
            <div>
              <h3 style={{ margin: 0, fontSize: "19px", color: "var(--ink)", fontWeight: 700 }}>Edit User</h3>
              <p className="sub" style={{ margin: "3px 0 0", fontSize: "12.5px", color: "var(--muted)" }}>
                Editing {userToEdit?.name || "user account"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsEditUserModalOpen(false);
                setUserToEdit(null);
              }}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--muted)",
                cursor: "pointer",
                padding: "4px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "4px",
              }}
              title="Close modal"
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSaveEditUser}>
            <div className="field" style={{ marginBottom: "14px" }}>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted)", marginBottom: "6px" }}>
                Full Name *
              </label>
              <input
                type="text"
                required
                value={editUserName}
                onChange={(e) => setEditUserName(e.target.value)}
                placeholder="User name"
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  borderRadius: "6px",
                  border: "1px solid var(--line)",
                  background: "var(--paper)",
                  color: "var(--ink)",
                  fontSize: "13.5px",
                  outline: "none",
                }}
              />
            </div>

            <div className="field" style={{ marginBottom: "14px" }}>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted)", marginBottom: "6px" }}>
                Email Address *
              </label>
              <input
                type="email"
                required
                value={editUserEmail}
                onChange={(e) => setEditUserEmail(e.target.value)}
                placeholder="user@organization.com"
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  borderRadius: "6px",
                  border: "1px solid var(--line)",
                  background: "var(--paper)",
                  color: "var(--ink)",
                  fontSize: "13.5px",
                  outline: "none",
                }}
              />
            </div>

            <div
              style={{
                background: "var(--paper-2)",
                border: "1px solid var(--line)",
                borderRadius: "8px",
                padding: "10px 14px",
                marginBottom: "14px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <span style={{ fontSize: "10.5px", color: "var(--muted)", display: "block", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.04em" }}>
                  Workspace
                </span>
                <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--ink)" }}>
                  {userToEdit?.organizationName || "Platform"}
                </span>
              </div>
              {userToEdit?.departmentName && (
                <div style={{ textAlign: "right" }}>
                  <span style={{ fontSize: "10.5px", color: "var(--muted)", display: "block", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.04em" }}>
                    Department
                  </span>
                  <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--ink)" }}>
                    {userToEdit.departmentName}
                  </span>
                </div>
              )}
            </div>

            <div className="row2" style={{ marginBottom: "16px" }}>
              <div className="field">
                <label style={{ display: "block", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted)", marginBottom: "6px" }}>
                  Role *
                </label>
                <select
                  value={editUserRole}
                  onChange={(e) => setEditUserRole(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: "6px",
                    border: "1px solid var(--line)",
                    background: "var(--paper)",
                    color: "var(--ink)",
                    fontSize: "13px",
                    outline: "none",
                  }}
                >
                  <option value="Admin">Admin</option>
                  <option value="Manager">Manager</option>
                  <option value="Team leader">Team leader</option>
                  <option value="Hr">Hr</option>
                  <option value="Teammates">Teammates</option>
                </select>
              </div>

              <div className="field">
                <label style={{ display: "block", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted)", marginBottom: "6px" }}>
                  Status *
                </label>
                <select
                  value={editUserStatus}
                  onChange={(e) => setEditUserStatus(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: "6px",
                    border: "1px solid var(--line)",
                    background: "var(--paper)",
                    color: "var(--ink)",
                    fontSize: "13px",
                    outline: "none",
                  }}
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="SUSPENDED">Suspended</option>
                </select>
              </div>
            </div>

            <div className="modal-foot">
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setIsEditUserModalOpen(false);
                  setUserToEdit(null);
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={busy === `edit-user-${userToEdit?.id}`}
              >
                {busy === `edit-user-${userToEdit?.id}` ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* 5. QUICK VIEW SLIDE-OVER DRAWER */}
      <div
        className={`drawer-overlay ${drawerItem ? "open" : ""}`}
        onClick={() => setDrawerItem(null)}
      />
      <div className={`drawer-panel ${drawerItem ? "open" : ""}`}>
        {drawerItem && (
          <>
            <div className="drawer-header">
              <div>
                <span style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.05em" }}>
                  {drawerItem.type === "org" ? "Workspace Overview" : "User Profile"}
                </span>
                <h3 style={{ margin: "2px 0 0" }}>
                  {drawerItem.type === "org" ? drawerItem.data.name : drawerItem.data.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDrawerItem(null)}
                style={{ background: "transparent", border: "none", color: "var(--muted)", cursor: "pointer", padding: "4px" }}
                title="Close drawer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="drawer-body">
              {drawerItem.type === "org" && (
                <>
                  <div className="drawer-field">
                    <div className="label">Subscription Status</div>
                    <div className="val">
                      <span
                        className={`pill ${
                          drawerItem.data.isApproved && drawerItem.data.subscriptionStatus === "active"
                            ? "pill-active"
                            : drawerItem.data.subscriptionStatus === "trial"
                            ? "pill-trial"
                            : "pill-suspended"
                        }`}
                      >
                        {drawerItem.data.isApproved && drawerItem.data.subscriptionStatus === "active"
                          ? "Active"
                          : drawerItem.data.subscriptionStatus === "trial"
                          ? "Trial"
                          : drawerItem.data.subscriptionStatus}
                      </span>
                    </div>
                  </div>

                  <div className="drawer-field">
                    <div className="label">Current Plan Tier</div>
                    <div className="val">
                      <span className="pill pill-trial" style={{ fontWeight: 700 }}>
                        {drawerItem.data.plan || "Pro"} Plan
                      </span>
                    </div>
                  </div>

                  <div className="drawer-field">
                    <div className="label">Owner / Main Contact</div>
                    <div className="val" style={{ fontWeight: 600 }}>
                      {drawerItem.data.ownerName || "No contact specified"}
                    </div>
                    <div style={{ fontSize: "12.5px", color: "var(--muted)", marginTop: "2px" }}>
                      {drawerItem.data.ownerEmail || "No email"}
                    </div>
                    {drawerItem.data.phone && (
                      <div style={{ fontSize: "12.5px", color: "var(--muted)", marginTop: "2px" }}>
                        📞 {drawerItem.data.phone}
                      </div>
                    )}
                  </div>

                  <div className="drawer-field">
                    <div className="label">Total Workspace Members</div>
                    <div className="val">
                      {drawerItem.data.memberCount !== undefined ? `${drawerItem.data.memberCount} users` : `${platformUsers.filter(u => u.organizationId === drawerItem.data.id).length} users`}
                    </div>
                  </div>

                  <div className="drawer-field">
                    <div className="label">Trial Expiration</div>
                    <div className="val">
                      {safeFormatDisplayDate(drawerItem.data.trialEndsAt, "No trial expiration")}
                    </div>
                  </div>

                  <div className="drawer-field">
                    <div className="label">Workspace ID</div>
                    <div className="val" style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--muted)" }}>
                      {drawerItem.data.id}
                    </div>
                  </div>
                </>
              )}

              {drawerItem.type === "user" && (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
                    <div className="fb2 round" style={{ background: drawerItem.data.avatarColor || undefined, width: "44px", height: "44px", fontSize: "16px" }}>
                      {drawerItem.data.initials || "U"}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "16px", color: "var(--ink)" }}>{drawerItem.data.name}</div>
                      <div style={{ fontSize: "12.5px", color: "var(--muted)" }}>{drawerItem.data.email}</div>
                    </div>
                  </div>

                  <div className="drawer-field">
                    <div className="label">Account Status</div>
                    <div className="val">
                      <span className={`pill ${drawerItem.data.status === "ACTIVE" ? "pill-active" : "pill-suspended"}`}>
                        {drawerItem.data.status}
                      </span>
                    </div>
                  </div>

                  <div className="drawer-field">
                    <div className="label">Assigned Role</div>
                    <div className="val" style={{ fontWeight: 600 }}>
                      {drawerItem.data.roleName || "Teammates"}
                    </div>
                  </div>

                  <div className="drawer-field">
                    <div className="label">Organization / Workspace</div>
                    <div className="val" style={{ fontWeight: 600 }}>
                      {drawerItem.data.organizationName}
                    </div>
                    {drawerItem.data.departmentName && (
                      <div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "2px" }}>
                        Department: {drawerItem.data.departmentName}
                      </div>
                    )}
                  </div>

                  <div className="drawer-field">
                    <div className="label">User ID</div>
                    <div className="val" style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--muted)" }}>
                      {drawerItem.data.id}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="drawer-footer">
              {drawerItem.type === "org" && (
                <>
                  <button
                    className="btn btn-primary"
                    style={{ flex: 1 }}
                    onClick={() => {
                      const org = drawerItem.data;
                      setDrawerItem(null);
                      openEditOrgModal(org);
                    }}
                  >
                    <Pencil size={12} /> Edit Details
                  </button>
                  <button
                    className="btn"
                    onClick={() => {
                      const org = drawerItem.data;
                      setDrawerItem(null);
                      openPlanModal(org.id, org.name, org.plan);
                    }}
                  >
                    <Sparkles size={12} /> Change Plan
                  </button>
                </>
              )}
              {drawerItem.type === "user" && (
                <button
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                  onClick={() => {
                    const u = drawerItem.data;
                    setDrawerItem(null);
                    openEditUserModal(u);
                  }}
                >
                  <Pencil size={12} /> Edit User Details
                </button>
              )}
              <button className="btn" onClick={() => setDrawerItem(null)}>
                Close
              </button>
            </div>
          </>
        )}
      </div>

      {/* 6. EDIT ORGANIZATION MODAL (A1 - Matching user's website theme & screenshot) */}
      <div
        className={`overlay ${isEditOrgModalOpen ? "open" : ""}`}
        onClick={() => {
          setIsEditOrgModalOpen(false);
          setOrgToEdit(null);
        }}
      >
        <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "480px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" }}>
            <div>
              <h3 style={{ margin: 0, fontSize: "19px", color: "var(--ink)", fontWeight: 700 }}>Edit Company</h3>
              <p className="sub" style={{ margin: "3px 0 0", fontSize: "12.5px", color: "var(--muted)" }}>
                Editing {orgToEdit?.name || "company details"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsEditOrgModalOpen(false);
                setOrgToEdit(null);
              }}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--muted)",
                cursor: "pointer",
                padding: "4px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "4px",
              }}
              title="Close modal"
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSaveEditOrg}>
            {/* COMPANY NAME */}
            <div className="field" style={{ marginBottom: "14px" }}>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted)", marginBottom: "6px" }}>
                Company Name *
              </label>
              <input
                type="text"
                required
                value={editOrgName}
                onChange={(e) => setEditOrgName(e.target.value)}
                placeholder="e.g. Acme Corporation"
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  borderRadius: "6px",
                  border: "1px solid var(--line)",
                  background: "var(--paper)",
                  color: "var(--ink)",
                  fontSize: "13.5px",
                  outline: "none",
                }}
              />
            </div>

            {/* OWNER EMAIL INFO CARD */}
            <div className="field" style={{ marginBottom: "14px" }}>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted)", marginBottom: "6px" }}>
                Owner / Contact Email
              </label>
              <input
                type="text"
                disabled
                value={orgToEdit?.ownerEmail || "No registered email"}
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  borderRadius: "6px",
                  border: "1px solid var(--line)",
                  background: "var(--paper-2)",
                  color: "var(--muted)",
                  fontSize: "13px",
                  outline: "none",
                }}
              />
            </div>

            {/* PHONE NUMBER */}
            <div className="field" style={{ marginBottom: "14px" }}>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted)", marginBottom: "6px" }}>
                Phone Number
              </label>
              <input
                type="text"
                value={editOrgPhone}
                onChange={(e) => setEditOrgPhone(e.target.value)}
                placeholder="+91 98765 43210"
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  borderRadius: "6px",
                  border: "1px solid var(--line)",
                  background: "var(--paper)",
                  color: "var(--ink)",
                  fontSize: "13.5px",
                  outline: "none",
                }}
              />
            </div>

            <div className="row2" style={{ marginBottom: "14px" }}>
              {/* PLAN SELECTION */}
              <div className="field">
                <label style={{ display: "block", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted)", marginBottom: "6px" }}>
                  Plan Tier *
                </label>
                <select
                  value={editOrgPlan}
                  onChange={(e) => setEditOrgPlan(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: "6px",
                    border: "1px solid var(--line)",
                    background: "var(--paper)",
                    color: "var(--ink)",
                    fontSize: "13px",
                    outline: "none",
                  }}
                >
                  <option value="Basic">Basic Plan</option>
                  <option value="Pro">Pro Plan</option>
                  <option value="Enterprise">Enterprise Plan</option>
                </select>
              </div>

              {/* STATUS SELECTION */}
              <div className="field">
                <label style={{ display: "block", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted)", marginBottom: "6px" }}>
                  Status *
                </label>
                <select
                  value={editOrgStatus}
                  onChange={(e) => setEditOrgStatus(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: "6px",
                    border: "1px solid var(--line)",
                    background: "var(--paper)",
                    color: "var(--ink)",
                    fontSize: "13px",
                    outline: "none",
                  }}
                >
                  <option value="active">Active</option>
                  <option value="trial">Trial</option>
                  <option value="suspended">Suspended</option>
                  <option value="expired">Expired</option>
                </select>
              </div>
            </div>

            {/* TRIAL END DATE */}
            <div className="field" style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted)", marginBottom: "6px" }}>
                Trial End Date
              </label>
              <input
                type="date"
                value={editOrgTrialDate}
                onChange={(e) => setEditOrgTrialDate(e.target.value)}
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  borderRadius: "6px",
                  border: "1px solid var(--line)",
                  background: "var(--paper)",
                  color: "var(--ink)",
                  fontSize: "13px",
                  outline: "none",
                }}
              />
            </div>

            <div className="modal-foot">
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setIsEditOrgModalOpen(false);
                  setOrgToEdit(null);
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={busy === `edit-org-${orgToEdit?.id}`}
              >
                {busy === `edit-org-${orgToEdit?.id}` ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* 7. SUPPORT TICKET DETAILS & REPLY MODAL */}
      <div
        className={`overlay ${isTicketModalOpen ? "open" : ""}`}
        onClick={() => {
          setIsTicketModalOpen(false);
          setSelectedTicket(null);
          setTicketReplyText("");
        }}
      >
        <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "540px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" }}>
            <div>
              <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted)" }}>
                Ticket #{selectedTicket?.id} · {selectedTicket?.orgName}
              </span>
              <h3 style={{ margin: "2px 0 0", fontSize: "18px", color: "var(--ink)", fontWeight: 700 }}>
                {selectedTicket?.title}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsTicketModalOpen(false);
                setSelectedTicket(null);
                setTicketReplyText("");
              }}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--muted)",
                cursor: "pointer",
                padding: "4px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              title="Close modal"
            >
              <X size={18} />
            </button>
          </div>

          <div style={{ background: "var(--paper-2)", border: "1px solid var(--line)", borderRadius: "8px", padding: "12px 14px", marginBottom: "16px" }}>
            <div style={{ fontSize: "11px", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.04em", color: "var(--muted)", marginBottom: "4px" }}>
              Inquiry / Request Details
            </div>
            <div style={{ fontSize: "13px", color: "var(--ink)", lineHeight: 1.5 }}>
              {selectedTicket?.description || "No additional description provided."}
            </div>
            {selectedTicket?.lastReply && (
              <div style={{ marginTop: "10px", paddingTop: "10px", borderTop: "1px solid var(--line)", fontSize: "12.5px", color: "var(--muted)" }}>
                <strong style={{ color: "var(--ink)" }}>Last Superadmin Note:</strong> {selectedTicket.lastReply}
              </div>
            )}
          </div>

          <div className="row2" style={{ marginBottom: "14px" }}>
            <div className="field">
              <label style={{ display: "block", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted)", marginBottom: "6px" }}>
                Update Status
              </label>
              <select
                value={selectedTicket?.status || "Open"}
                onChange={(e) => {
                  if (selectedTicket) {
                    const newStatus = e.target.value as "Open" | "In Progress" | "Resolved";
                    setSelectedTicket({ ...selectedTicket, status: newStatus });
                  }
                }}
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  borderRadius: "6px",
                  border: "1px solid var(--line)",
                  background: "var(--paper)",
                  color: "var(--ink)",
                  fontSize: "13px",
                  outline: "none",
                }}
              >
                <option value="Open">Open</option>
                <option value="In Progress">In Progress</option>
                <option value="Resolved">Resolved</option>
              </select>
            </div>

            <div className="field">
              <label style={{ display: "block", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted)", marginBottom: "6px" }}>
                Priority Level
              </label>
              <select
                value={selectedTicket?.priority || "Medium"}
                onChange={(e) => {
                  if (selectedTicket) {
                    const newPriority = e.target.value as "Low" | "Medium" | "High";
                    setSelectedTicket({ ...selectedTicket, priority: newPriority });
                  }
                }}
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  borderRadius: "6px",
                  border: "1px solid var(--line)",
                  background: "var(--paper)",
                  color: "var(--ink)",
                  fontSize: "13px",
                  outline: "none",
                }}
              >
                <option value="Low">Low Priority</option>
                <option value="Medium">Medium Priority</option>
                <option value="High">High Priority</option>
              </select>
            </div>
          </div>

          <div className="field" style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted)", marginBottom: "6px" }}>
              Superadmin Reply / Resolution Note
            </label>
            <textarea
              rows={3}
              value={ticketReplyText}
              onChange={(e) => setTicketReplyText(e.target.value)}
              placeholder="Type resolution update or response to client..."
              style={{
                width: "100%",
                padding: "9px 12px",
                borderRadius: "6px",
                border: "1px solid var(--line)",
                background: "var(--paper)",
                color: "var(--ink)",
                fontSize: "13px",
                fontFamily: "inherit",
                outline: "none",
                resize: "vertical",
              }}
            />
          </div>

          <div className="modal-foot">
            <button
              type="button"
              className="btn"
              onClick={() => {
                setIsTicketModalOpen(false);
                setSelectedTicket(null);
                setTicketReplyText("");
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                if (selectedTicket) {
                  const updated = supportTickets.map((t) =>
                    t.id === selectedTicket.id
                      ? {
                          ...t,
                          status: selectedTicket.status,
                          priority: selectedTicket.priority,
                          lastReply: ticketReplyText.trim() || t.lastReply,
                        }
                      : t,
                  );
                  setSupportTickets(updated);
                  triggerToast(`Ticket #${selectedTicket.id} updated!`);
                }
                setIsTicketModalOpen(false);
                setSelectedTicket(null);
                setTicketReplyText("");
              }}
            >
              Save Response &amp; Update
            </button>
          </div>
        </div>
      </div>

      <div className={`toast ${showToast ? "show" : ""}`}>
        <span className="dot" />
        <span>{toastMsg}</span>
      </div>
    </div>
  );
}

// Subcomponents: Secure Login screen (retaining functional authentication API mapping)
function Login({ onLogin }: { onLogin: (user: User) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      onLogin(await api.login(email, password));
    } catch (loginError) {
      setError(apiErrorMessage(loginError, "Unable to sign in."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-shell">
      <form className="login-card" onSubmit={submit}>
        <div className="mark">
          <Shield />
        </div>
        <p className="eyebrow" style={{ marginTop: "14px", marginBottom: "4px" }}>Restricted portal</p>
        <h1>Platform administration</h1>
        <div className="field">
          <label htmlFor="admin-email">Email</label>
          <input
            id="admin-email"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="admin-password">Password</label>
          <div className="password-input-wrap">
            <input
              id="admin-password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <button
              type="button"
              className="password-toggle-btn"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowPassword((prev) => !prev);
              }}
              aria-label={showPassword ? "Hide password" : "Show password"}
              title={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>
        {error && <div className="error">{error}</div>}
        <button className="btn btn-primary" disabled={submitting} style={{ width: "100%", marginTop: "12px" }}>
          {submitting ? "Signing in…" : "Sign in securely"}
        </button>
      </form>
    </div>
  );
}

// Subcomponents: Loading/Forbidden Centered Screen
function Centered({
  label,
  action,
}: {
  label: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="centered">
      <Shield size={34} style={{ color: "var(--violet)" }} />
      <p>{label}</p>
      {action}
    </div>
  );
}
