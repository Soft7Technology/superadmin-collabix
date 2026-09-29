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
  Eye,
  EyeOff,
  FileText,
  Filter,
  HardDrive,
  LogOut,
  Pencil,
  RefreshCw,
  Search,
  Server,
  Shield,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { api, apiErrorMessage } from "../src/api";
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
} from "../src/types";

type SessionState = "loading" | "guest" | "authenticated" | "forbidden";
type PageKey =
  | "overview"
  | "orgs"
  | "users"
  | "plans"
  | "flags"
  | "logs"
  | "security"
  | "support"
  | "settings";
type SettingsTabKey = "general" | "api" | "branding";

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
  const [newOrgPlan, setNewOrgPlan] = useState<"Starter" | "Pro" | "Enterprise">("Pro");
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
    setEditOrgTrialDate(org.trialEndsAt ? new Date(org.trialEndsAt).toISOString().split("T")[0] : "");
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

  // Support tickets — loaded from backend
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [activeTicket, setActiveTicket] = useState<SupportTicket | null>(null);
  const [ticketRepliesList, setTicketRepliesList] = useState<TicketReply[]>([]);
  const [newTicketReplyText, setNewTicketReplyText] = useState("");
  const [isCreateTicketModalOpen, setIsCreateTicketModalOpen] = useState(false);
  const [newTicketTitle, setNewTicketTitle] = useState("");
  const [newTicketOrgId, setNewTicketOrgId] = useState("");
  const [newTicketPriority, setNewTicketPriority] = useState("medium");
  const [newTicketDesc, setNewTicketDesc] = useState("");

  // System logs — loaded from backend
  const [systemLogs, setSystemLogs] = useState<SystemLog[]>([]);
  const [logCategoryFilter, setLogCategoryFilter] = useState<"all" | "info" | "sec" | "sys">("all");

  // Invoices — loaded from backend
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isAddInvoiceModalOpen, setIsAddInvoiceModalOpen] = useState(false);
  const [newInvoiceOrgId, setNewInvoiceOrgId] = useState("");
  const [newInvoicePlan, setNewInvoicePlan] = useState("Pro");
  const [newInvoiceAmount, setNewInvoiceAmount] = useState("₹450 /mo");
  const [newInvoiceStatus, setNewInvoiceStatus] = useState("paid");

  const [settingsTab, setSettingsTab] = useState<SettingsTabKey>("general");
  const [platformName, setPlatformName] = useState("SOFT7");
  const [supportEmail, setSupportEmail] = useState("support@soft7.in");
  const [defaultTimezone, setDefaultTimezone] = useState("IST — Asia/Kolkata");
  const [accentColor, setAccentColor] = useState("#3cdb73");
  const [apiKey, setApiKey] = useState("pk_live_51H8x••••••••••••••••e93A");
  const [webhookSecret, setWebhookSecret] = useState("whsec_9F2b••••••••••••••••c71Z");

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

  const loadFlags = useCallback(async () => {
    try {
      const data = await api.flags();
      setFeatureFlags(data);
    } catch (e) {
      // Keep existing default state if error
    }
  }, []);

  const loadSecurity = useCallback(async () => {
    try {
      const data = await api.security();
      setSecurityFlags(data);
    } catch (e) {
      // Keep existing default state if error
    }
  }, []);

  const loadSettings = useCallback(async () => {
    try {
      const data = await api.settings();
      if (data.platformName) setPlatformName(data.platformName);
      if (data.supportEmail) setSupportEmail(data.supportEmail);
      if (data.defaultTimezone) setDefaultTimezone(data.defaultTimezone);
      if (data.accentColor) setAccentColor(data.accentColor);
      if (data.apiKey) setApiKey(data.apiKey);
      if (data.webhookSecret) setWebhookSecret(data.webhookSecret);
    } catch (e) {
      // Keep existing default state if error
    }
  }, []);

  const loadTickets = useCallback(async () => {
    try {
      const data = await api.tickets();
      setSupportTickets(data);
    } catch (e) {
      // Keep existing default state if error
    }
  }, []);

  const handleOpenTicketDrawer = async (t: SupportTicket) => {
    setActiveTicket(t);
    setNewTicketReplyText("");
    try {
      const replies = await api.ticketReplies(t.id);
      setTicketRepliesList(replies);
    } catch {
      setTicketRepliesList([]);
    }
  };

  const handleSendTicketReply = async (e: FormEvent) => {
    e.preventDefault();
    if (!activeTicket || !newTicketReplyText.trim()) return;
    setBusy("ticket-reply");
    try {
      const newRep = await api.createTicketReply(activeTicket.id, {
        message: newTicketReplyText.trim(),
        senderName: user?.name || "Super Admin",
        senderRole: "Super Admin",
      });
      setTicketRepliesList((prev) => [...prev, newRep]);
      setNewTicketReplyText("");
      triggerToast("Reply posted to ticket thread.");
    } catch (err) {
      triggerToast(apiErrorMessage(err, "Failed to post reply."));
    } finally {
      setBusy(null);
    }
  };

  const handleUpdateTicketStatus = async (newStatus: string) => {
    if (!activeTicket) return;
    setBusy(`ticket-status-${activeTicket.id}`);
    try {
      await api.updateTicket(activeTicket.id, { status: newStatus });
      setActiveTicket((prev) => (prev ? { ...prev, status: newStatus } : null));
      await loadTickets();
      triggerToast(`Ticket #${activeTicket.ticketNumber || activeTicket.id.slice(0, 8)} status updated to ${newStatus.toUpperCase()}`);
    } catch (err) {
      triggerToast(apiErrorMessage(err, "Failed to update ticket status."));
    } finally {
      setBusy(null);
    }
  };

  const handleCreateTicket = async (e: FormEvent) => {
    e.preventDefault();
    if (!newTicketTitle.trim() || !newTicketOrgId) {
      triggerToast("Please fill in title and select workspace.");
      return;
    }
    setBusy("create-ticket");
    try {
      await api.createTicket({
        title: newTicketTitle.trim(),
        organizationId: newTicketOrgId,
        description: newTicketDesc.trim() || undefined,
        priority: newTicketPriority,
      });
      await loadTickets();
      setIsCreateTicketModalOpen(false);
      setNewTicketTitle("");
      setNewTicketDesc("");
      triggerToast("Support ticket opened successfully.");
    } catch (err) {
      triggerToast(apiErrorMessage(err, "Failed to open support ticket."));
    } finally {
      setBusy(null);
    }
  };

  const loadInvoices = useCallback(async () => {
    try {
      const data = await api.invoices();
      setInvoices(data);
    } catch (e) {
      // Keep existing default state if error
    }
  }, []);

  const handleCreateInvoice = async (e: FormEvent) => {
    e.preventDefault();
    if (!newInvoiceOrgId) {
      triggerToast("Please select an organization.");
      return;
    }
    setBusy("create-invoice");
    try {
      await api.createInvoice({
        organizationId: newInvoiceOrgId,
        plan: newInvoicePlan,
        amount: newInvoiceAmount,
        status: newInvoiceStatus,
      });
      await loadInvoices();
      setIsAddInvoiceModalOpen(false);
      triggerToast("Invoice successfully generated and recorded.");
    } catch (err) {
      triggerToast(apiErrorMessage(err, "Failed to create invoice."));
    } finally {
      setBusy(null);
    }
  };

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
        await Promise.all([
          loadOrganizations(),
          loadUsers(),
          loadLogs(),
          loadFlags(),
          loadSecurity(),
          loadSettings(),
          loadTickets(),
          loadInvoices(),
        ]);
      })
      .catch(() => setSession("guest"));
  }, [
    loadOrganizations,
    loadUsers,
    loadLogs,
    loadFlags,
    loadSecurity,
    loadSettings,
    loadTickets,
    loadInvoices,
  ]);

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

  // Search filtering support tickets
  const filteredTickets = useMemo(() => {
    const term = searchQuery.trim().toLowerCase();
    if (!term) return supportTickets;
    return supportTickets.filter((t) =>
      [t.title, t.orgName, t.description, t.ticketNumber]
        .filter(Boolean)
        .some((val) => val!.toLowerCase().includes(term)),
    );
  }, [supportTickets, searchQuery]);

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

  // Create new organization handler — calls backend API
  const handleCreateOrg = async () => {
    if (!newOrgName.trim()) {
      triggerToast("Organization Name is required");
      return;
    }
    await runBackendAction(
      "create-org",
      async () => {
        await api.createOrganization({
          name: newOrgName.trim(),
          ownerEmail: newOrgEmail.trim() || undefined,
          plan: newOrgPlan,
        });
        await Promise.all([loadOrganizations(), loadUsers(), loadLogs()]);
      },
      `"${newOrgName}" organization created!`,
    );
    setIsModalOpen(false);
    setNewOrgName("");
    setNewOrgDomain("");
    setNewOrgEmail("");
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
    if (!editOrgName.trim()) {
      triggerToast("Organization name is required.");
      return;
    }
    await runBackendAction(
      `edit-org-${orgToEdit.id}`,
      async () => {
        await api.updateOrganization(orgToEdit.id, {
          name: editOrgName.trim(),
          phone: editOrgPhone.trim() || undefined,
          subscriptionStatus: editOrgStatus,
          plan: editOrgPlan,
          trialEndsAt: editOrgTrialDate ? new Date(editOrgTrialDate).toISOString() : undefined,
          isApproved: editOrgStatus !== "suspended" && editOrgStatus !== "revoked",
        });
        await Promise.all([loadOrganizations(), loadUsers(), loadLogs()]);
      },
      `Updated organization "${editOrgName.trim()}"!`,
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
  const totalOrganizations = organizations.length;
  const activeSubscriptions = organizations.filter(
    (org) => org.isApproved && (org.subscriptionStatus === "active" || !org.subscriptionStatus) && (!org.trialEndsAt || new Date(org.trialEndsAt).getTime() > Date.now()),
  ).length;
  const trialSubscriptions = organizations.filter(
    (org) => org.subscriptionStatus === "trial" && (!org.trialEndsAt || new Date(org.trialEndsAt).getTime() > Date.now()),
  ).length;
  const expiredCount = organizations.filter(
    (org) => org.subscriptionStatus === "expired" || (org.trialEndsAt && new Date(org.trialEndsAt).getTime() <= Date.now() && org.subscriptionStatus !== "revoked"),
  ).length;
  const suspendedCount = organizations.filter(
    (org) => org.subscriptionStatus === "revoked" || !org.isApproved,
  ).length;

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
            {/* Laptop Base / Chassis in Green */}
            <path
              d="M2 23.5h28v1.5a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-1.5z"
              fill="#3cdb73"
            />
            {/* Trackpad notch */}
            <path
              d="M12 23.5h8V24a1 1 0 0 1-1 1h-6a1 1 0 0 1-1-1v-.5z"
              fill="#1fa652"
            />
            {/* Laptop Screen frame in Green */}
            <rect
              x="4"
              y="7"
              width="24"
              height="16.5"
              rx="2"
              fill="none"
              stroke="#3cdb73"
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

            {/* Green Speech Bubble */}
            <circle cx="21.5" cy="8.5" r="5.5" fill="#3cdb73" />
            <path
              d="M18.5 12.5l2-3.5 3 1.5z"
              fill="#3cdb73"
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
            {user?.name || "Soft7 Admin"}
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
            <div className="search">
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
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
            </div>
            {organizations.length > 0 ? (
              <div className="card" style={{ padding: "4px 14px" }}>
                {organizations.slice(0, 5).map((org) => (
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
                <div className="empty-invoices-title">No platform activity yet</div>
                <div className="empty-invoices-sub">
                  When new organizations sign up or update their subscriptions, their events will appear here in real-time.
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
                <div className="stat-num">{expiredCount}</div>
                <div className="stat-label">Expired</div>
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
                  <option value="Starter">Starter</option>
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
                          {(() => {
                            const isExpired = org.subscriptionStatus === "expired" || (org.trialEndsAt && new Date(org.trialEndsAt).getTime() <= Date.now());
                            const isRevoked = org.subscriptionStatus === "revoked" || !org.isApproved;
                            if (isRevoked) {
                              return <span className="pill pill-suspended">Revoked</span>;
                            }
                            if (isExpired) {
                              return <span className="pill pill-suspended">Expired</span>;
                            }
                            if (org.subscriptionStatus === "trial") {
                              return <span className="pill pill-trial">Trial</span>;
                            }
                            return <span className="pill pill-active">Active</span>;
                          })()}
                        </td>
                        <td>{new Date(org.trialEndsAt).toLocaleDateString()}</td>
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
                                  window.open(res.redirectUrl || "http://localhost:8001", "_blank");
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
                            {(() => {
                              const isExpired = org.subscriptionStatus === "expired" || (org.trialEndsAt && new Date(org.trialEndsAt).getTime() <= Date.now());
                              const isRevoked = org.subscriptionStatus === "revoked" || !org.isApproved;
                              if (!isRevoked && !isExpired) {
                                return (
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
                                );
                              } else {
                                return (
                                  <button
                                    className="row-action btn-approve"
                                    disabled={busy === org.id}
                                    title={isExpired ? "Renew subscription (extends 30 days)" : "Approve organization"}
                                    onClick={() =>
                                      void runBackendAction(
                                        org.id,
                                        () => api.approve(org.id),
                                        isExpired ? `Renewed subscription for ${org.name}` : `Approved ${org.name}`,
                                      )
                                    }
                                  >
                                    <CheckCircle2 size={12} /> {isExpired ? "Renew" : "Approve"}
                                  </button>
                                );
                              }
                            })()}
                            <button
                              className="row-action danger"
                              disabled={busy === org.id}
                              title="Delete organization"
                              onClick={() => {
                                setOrgToDelete(org);
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

          {/* 4. PLANS & BILLING SCREEN */}
          <div className={`page ${activePage === "plans" ? "active" : ""}`}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
              <div>
                <h1 className="page-title">Workspace Plans &amp; Revenue Reports</h1>
                <p className="page-sub">
                  Live distribution of organizations, tier feature limits, and revenue generation across plans.
                </p>
              </div>
            </div>

            {/* Plan Distribution Stats Banner */}
            {(() => {
              const basicCount = organizations.filter((o) => (o.plan || "Basic").toLowerCase() === "basic" || (o.plan || "").toLowerCase() === "starter").length;
              const proCount = organizations.filter((o) => (o.plan || "").toLowerCase() === "pro").length;
              const entCount = organizations.filter((o) => (o.plan || "").toLowerCase() === "enterprise").length;
              const estMmr = (basicCount * 200) + (proCount * 450) + (entCount * 999);

              return (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "24px" }}>
                  <div className="card" style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "4px" }}>
                    <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>Estimated MRR</span>
                    <span style={{ fontSize: "24px", fontWeight: 800, color: "var(--ink)" }}>₹{estMmr.toLocaleString("en-IN")}</span>
                    <span style={{ fontSize: "12px", color: "var(--terracotta)" }}>Monthly subscription run-rate</span>
                  </div>
                  <div className="card" style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "4px" }}>
                    <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>Pro Subscribers</span>
                    <span style={{ fontSize: "24px", fontWeight: 800, color: "var(--ink)" }}>{proCount}</span>
                    <span style={{ fontSize: "12px", color: "var(--muted)" }}>₹450 /mo per workspace</span>
                  </div>
                  <div className="card" style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "4px" }}>
                    <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>Enterprise Tier</span>
                    <span style={{ fontSize: "24px", fontWeight: 800, color: "var(--ink)" }}>{entCount}</span>
                    <span style={{ fontSize: "12px", color: "var(--muted)" }}>₹999 /mo per workspace</span>
                  </div>
                  <div className="card" style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "4px" }}>
                    <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>Basic Tier</span>
                    <span style={{ fontSize: "24px", fontWeight: 800, color: "var(--ink)" }}>{basicCount}</span>
                    <span style={{ fontSize: "12px", color: "var(--muted)" }}>₹200 /mo per workspace</span>
                  </div>
                </div>
              );
            })()}

            <div className="plans-grid">
              {/* Pro Plan Card (Featured) */}
              {(() => {
                const count = organizations.filter((o) => (o.plan || "").toLowerCase() === "pro").length;
                return (
                  <div className="plan-card featured">
                    <span className="badge-featured">Most Popular</span>
                    <h3>Pro Plan</h3>
                    <p className="plan-sub">For growing teams with advanced management features.</p>
                    <div className="plan-price">
                      ₹450 <span>/mo</span>
                    </div>
                    <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--terracotta)", marginBottom: "8px" }}>
                      📊 {count} {count === 1 ? "organization" : "organizations"} currently active
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
                      onClick={() => {
                        setOrgPlanFilter("Pro");
                        setOrgPage(1);
                        setActivePage("orgs");
                        triggerToast(`Filtered organizations on Pro plan (${count} found)`);
                      }}
                    >
                      View {count} Pro {count === 1 ? "Workspace" : "Workspaces"} →
                    </button>
                  </div>
                );
              })()}

              {/* Enterprise Plan Card */}
              {(() => {
                const count = organizations.filter((o) => (o.plan || "").toLowerCase() === "enterprise").length;
                return (
                  <div className="plan-card">
                    <div className="badge-scale">Scale &amp;<br />Custom</div>
                    <h3>Enterprise Plan</h3>
                    <p className="plan-sub">For large organizations requiring custom controls &amp; scale.</p>
                    <div className="plan-price">
                      ₹999 <span>/mo</span>
                    </div>
                    <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--ink)", marginBottom: "8px" }}>
                      📊 {count} {count === 1 ? "organization" : "organizations"} currently active
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
                        <CheckCircle2 size={14} /> API Access
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
                      onClick={() => {
                        setOrgPlanFilter("Enterprise");
                        setOrgPage(1);
                        setActivePage("orgs");
                        triggerToast(`Filtered organizations on Enterprise plan (${count} found)`);
                      }}
                    >
                      View {count} Enterprise {count === 1 ? "Workspace" : "Workspaces"} →
                    </button>
                  </div>
                );
              })()}

              {/* Basic Plan Card */}
              {(() => {
                const count = organizations.filter((o) => (o.plan || "Basic").toLowerCase() === "basic" || (o.plan || "").toLowerCase() === "starter").length;
                return (
                  <div className="plan-card">
                    <h3>Basic Plan</h3>
                    <p className="plan-sub">For small teams getting started with essential task tracking.</p>
                    <div className="plan-price">
                      ₹200 <span>/mo</span>
                    </div>
                    <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--muted)", marginBottom: "8px" }}>
                      📊 {count} {count === 1 ? "organization" : "organizations"} currently active
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
                      onClick={() => {
                        setOrgPlanFilter("Basic");
                        setOrgPage(1);
                        setActivePage("orgs");
                        triggerToast(`Filtered organizations on Basic plan (${count} found)`);
                      }}
                    >
                      View {count} Basic {count === 1 ? "Workspace" : "Workspaces"} →
                    </button>
                  </div>
                );
              })()}
            </div>

            <div className="panel-head" style={{ marginTop: "32px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2>Recent Invoices &amp; Receipts</h2>
              <button
                className="btn btn-primary"
                style={{ height: "34px", fontSize: "12.5px", borderRadius: "6px", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "6px" }}
                onClick={() => {
                  if (organizations.length > 0) setNewInvoiceOrgId(organizations[0].id);
                  setIsAddInvoiceModalOpen(true);
                }}
              >
                + Record Invoice
              </button>
            </div>
            {invoices.length > 0 ? (
              <div className="card" style={{ padding: "8px 16px" }}>
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Invoice #</th>
                      <th>Organization</th>
                      <th>Plan</th>
                      <th>Amount</th>
                      <th>Date</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((inv, idx) => (
                      <tr key={inv.id || idx}>
                        <td className="mono" style={{ fontWeight: 600 }}>{inv.invoiceNumber || `INV-${idx + 1}`}</td>
                        <td style={{ fontWeight: 500 }}>{inv.orgName}</td>
                        <td><span className="tier-badge" style={{ margin: 0 }}>{inv.plan}</span></td>
                        <td className="mono">{inv.amount}</td>
                        <td style={{ fontSize: "12px", color: "var(--muted)" }}>{inv.date}</td>
                        <td>
                          <span className={`pill ${inv.status.toLowerCase() === "paid" ? "pill-active" : "pill-suspended"}`}>
                            {inv.status.toUpperCase()}
                          </span>
                        </td>
                        <td>
                          {inv.id && (
                            <a
                              href={api.getInvoicePdfUrl(inv.id)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="row-action"
                              style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "4px" }}
                            >
                              <FileText size={12} /> Print PDF
                            </a>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-invoices-card">
                <div className="empty-invoices-icon">
                  <BarChart2 size={20} />
                </div>
                <div className="empty-invoices-title">No recent invoices generated</div>
                <div className="empty-invoices-sub">
                  Billing statements and payment receipts for subscribed organizations will automatically appear here.
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
                      onClick={async () => {
                        const nextVal = !f.enabled;
                        try {
                          await api.toggleFlag(f.id, nextVal);
                          setFeatureFlags((prev) =>
                            prev.map((flag) => (flag.id === f.id ? { ...flag, enabled: nextVal } : flag)),
                          );
                          triggerToast(`${f.label} flag ${nextVal ? "enabled" : "disabled"}`);
                        } catch (err) {
                          triggerToast(apiErrorMessage(err, "Failed to toggle flag"));
                        }
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
                      onClick={async () => {
                        const nextVal = !f.enabled;
                        try {
                          await api.toggleFlag(f.id, nextVal);
                          setFeatureFlags((prev) =>
                            prev.map((flag) => (flag.id === f.id ? { ...flag, enabled: nextVal } : flag)),
                          );
                          triggerToast(`${f.label} flag ${nextVal ? "enabled" : "disabled"}`);
                        } catch (err) {
                          triggerToast(apiErrorMessage(err, "Failed to toggle flag"));
                        }
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

          {/* 7. SECURITY SCREEN (Connected to Backend API) */}
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
                    onClick={async () => {
                      const nextVal = !sec.enabled;
                      try {
                        await api.toggleSecurity(sec.id, nextVal);
                        setSecurityFlags((prev) =>
                          prev.map((s) => (s.id === sec.id ? { ...s, enabled: nextVal } : s)),
                        );
                        triggerToast(`${sec.label} policy ${nextVal ? "activated" : "deactivated"}`);
                      } catch (err) {
                        triggerToast(apiErrorMessage(err, "Failed to update security policy"));
                      }
                    }}
                  >
                    <div className="knob"></div>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* 8. SUPPORT SCREEN (Connected to Backend API) */}
          <div className={`page ${activePage === "support" ? "active" : ""}`}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
              <div>
                <h1 className="page-title">Support &amp; Helpdesk</h1>
                <p className="page-sub">Client issue tickets, 1-click workspace impersonation, and live threaded resolution.</p>
              </div>
              <button
                className="btn btn-primary"
                style={{ height: "34px", fontSize: "12.5px", borderRadius: "6px", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "6px" }}
                onClick={() => {
                  if (organizations.length > 0) setNewTicketOrgId(organizations[0].id);
                  setIsCreateTicketModalOpen(true);
                }}
              >
                + Open Ticket
              </button>
            </div>

            <div className="panel-head">
              <h2>Active Support Queue ({filteredTickets.length})</h2>
            </div>
            {filteredTickets.length > 0 ? (
              <div className="card" style={{ padding: "8px 16px" }}>
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Ticket #</th>
                      <th>Subject / Issue</th>
                      <th>Workspace</th>
                      <th>Priority</th>
                      <th>Status</th>
                      <th>Opened</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTickets.map((t) => {
                      const isClosed = t.status === "closed" || t.status === "resolved";
                      return (
                        <tr key={t.id}>
                          <td className="mono" style={{ fontWeight: 600 }}>{t.ticketNumber || `TICK-${t.id.slice(0, 4)}`}</td>
                          <td>
                            <span
                              className="clickable-row-name"
                              style={{ fontWeight: 600, color: "var(--ink)", display: "block" }}
                              onClick={() => handleOpenTicketDrawer(t)}
                            >
                              {t.title}
                            </span>
                            {t.description && (
                              <span style={{ fontSize: "12px", color: "var(--muted)", display: "block", marginTop: "2px", maxWidth: "340px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {t.description}
                              </span>
                            )}
                          </td>
                          <td style={{ fontWeight: 500 }}>{t.orgName || "Workspace"}</td>
                          <td>
                            <span style={{
                              display: "inline-block",
                              padding: "2px 8px",
                              borderRadius: "4px",
                              fontSize: "11px",
                              fontWeight: 700,
                              textTransform: "uppercase",
                              background: t.priority === "urgent" ? "#fee2e2" : t.priority === "high" ? "#ffedd5" : "var(--paper-2)",
                              color: t.priority === "urgent" ? "#991b1b" : t.priority === "high" ? "#9a3412" : "var(--muted)"
                            }}>
                              {t.priority || "medium"}
                            </span>
                          </td>
                          <td>
                            <span className={`pill ${isClosed ? "pill-active" : "pill-suspended"}`}>
                              {(t.status || "open").toUpperCase()}
                            </span>
                          </td>
                          <td style={{ fontSize: "12px", color: "var(--muted)" }}>
                            {t.openedAt ? new Date(t.openedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : "Recently"}
                          </td>
                          <td>
                            <button
                              className="row-action"
                              style={{ fontWeight: 600, color: "var(--terracotta)" }}
                              onClick={() => handleOpenTicketDrawer(t)}
                            >
                              View &amp; Reply →
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-invoices-card">
                <div className="empty-invoices-icon">
                  <Shield size={20} />
                </div>
                <div className="empty-invoices-title">No active support tickets</div>
                <div className="empty-invoices-sub">
                  Customer help requests and escalated issues will automatically appear here.
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
              <button
                className="btn btn-primary"
                onClick={async () => {
                  try {
                    await api.updateSettings({
                      platformName,
                      supportEmail,
                      defaultTimezone,
                    });
                    triggerToast("Platform settings saved successfully");
                  } catch (err) {
                    triggerToast(apiErrorMessage(err, "Failed to save settings"));
                  }
                }}
              >
                Save changes
              </button>
            </div>

            {/* API Tab */}
            <div className={`settings-panel ${settingsTab === "api" ? "active" : ""}`}>
              <div className="key-row">
                <span style={{ fontFamily: "monospace", fontSize: "12px" }}>
                  {apiKey.length > 20 ? `${apiKey.slice(0, 10)}••••••••••••••••${apiKey.slice(-4)}` : apiKey}
                </span>
                <button
                  className="btn btn-sm"
                  onClick={() => {
                    navigator.clipboard?.writeText(apiKey);
                    triggerToast("API Key copied to clipboard");
                  }}
                >
                  Copy
                </button>
                <button
                  className="btn btn-sm btn-danger"
                  onClick={async () => {
                    try {
                      const res = await api.revokeKey("api_key");
                      if (res.apiKey) setApiKey(res.apiKey);
                      triggerToast("API Key revoked and new key generated");
                    } catch (err) {
                      triggerToast(apiErrorMessage(err, "Failed to revoke key"));
                    }
                  }}
                >
                  Revoke
                </button>
              </div>
              <div className="key-row">
                <span style={{ fontFamily: "monospace", fontSize: "12px" }}>
                  {webhookSecret.length > 20
                    ? `${webhookSecret.slice(0, 10)}••••••••••••••••${webhookSecret.slice(-4)}`
                    : webhookSecret}
                </span>
                <button
                  className="btn btn-sm"
                  onClick={() => {
                    navigator.clipboard?.writeText(webhookSecret);
                    triggerToast("Webhook secret copied to clipboard");
                  }}
                >
                  Copy
                </button>
                <button
                  className="btn btn-sm btn-danger"
                  onClick={async () => {
                    try {
                      const res = await api.revokeKey("webhook");
                      if (res.webhookSecret) setWebhookSecret(res.webhookSecret);
                      triggerToast("Webhook secret revoked and rotated");
                    } catch (err) {
                      triggerToast(apiErrorMessage(err, "Failed to revoke webhook secret"));
                    }
                  }}
                >
                  Revoke
                </button>
              </div>
              <button
                className="btn btn-primary"
                onClick={async () => {
                  try {
                    const res = await api.generateApiKey();
                    if (res.apiKey) setApiKey(res.apiKey);
                    triggerToast("New API key generated successfully");
                  } catch (err) {
                    triggerToast(apiErrorMessage(err, "Failed to generate key"));
                  }
                }}
              >
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
              <button
                className="btn btn-primary"
                onClick={async () => {
                  try {
                    await api.updateSettings({ accentColor });
                    triggerToast("Default branding saved successfully");
                  } catch (err) {
                    triggerToast(apiErrorMessage(err, "Failed to save branding"));
                  }
                }}
              >
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
                onChange={(e) => setNewOrgPlan(e.target.value as "Starter" | "Pro" | "Enterprise")}
              >
                <option>Starter</option>
                <option>Pro</option>
                <option>Enterprise</option>
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
          <p className="sub" style={{ marginTop: "8px", marginBottom: "18px" }}>
            Are you sure you want to permanently delete <strong>{orgToDelete?.name}</strong>? This action is irreversible and all workspace data will be removed.
          </p>
          <div className="modal-foot">
            <button className="btn" onClick={() => {
              setIsDeleteModalOpen(false);
              setOrgToDelete(null);
            }}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              style={{ background: "var(--red)", borderColor: "var(--red)" }}
              disabled={busy === orgToDelete?.id}
              onClick={() => {
                if (orgToDelete) {
                  void runBackendAction(
                    orgToDelete.id,
                    () => api.remove(orgToDelete.id),
                    `Deleted ${orgToDelete.name}`,
                  );
                }
                setIsDeleteModalOpen(false);
                setOrgToDelete(null);
              }}
            >
              Delete permanently
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
                ₹330<span style={{ fontSize: "11px", color: "var(--muted)", fontWeight: 500 }}>/mo</span>
              </div>
              <ul style={{ margin: 0, padding: 0, listStyle: "none", fontSize: "11.5px", color: "var(--muted)", display: "flex", flexDirection: "column", gap: "4px" }}>
                <li>✓ Unlimited members</li>
                <li>✓ Unlimited projects</li>
                <li>✓ White Label</li>
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

      {/* 5. ADD INVOICE MODAL */}
      <div
        className={`overlay ${isAddInvoiceModalOpen ? "open" : ""}`}
        onClick={() => setIsAddInvoiceModalOpen(false)}
      >
        <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "460px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" }}>
            <div>
              <h3 style={{ margin: 0, fontSize: "19px", color: "var(--ink)", fontWeight: 700 }}>Record New Invoice</h3>
              <p className="sub" style={{ margin: "3px 0 0", fontSize: "12.5px", color: "var(--muted)" }}>
                Create and store a billing transaction receipt for a workspace
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsAddInvoiceModalOpen(false)}
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

          <form onSubmit={handleCreateInvoice}>
            <div className="field" style={{ marginBottom: "14px" }}>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted)", marginBottom: "6px" }}>
                Target Workspace *
              </label>
              <select
                required
                value={newInvoiceOrgId}
                onChange={(e) => setNewInvoiceOrgId(e.target.value)}
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
              >
                {organizations.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name} ({o.plan || "Pro"})
                  </option>
                ))}
              </select>
            </div>

            <div className="row2" style={{ marginBottom: "14px" }}>
              <div className="field">
                <label style={{ display: "block", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted)", marginBottom: "6px" }}>
                  Plan Tier *
                </label>
                <select
                  value={newInvoicePlan}
                  onChange={(e) => {
                    const plan = e.target.value;
                    setNewInvoicePlan(plan);
                    if (plan === "Basic") setNewInvoiceAmount("₹200 /mo");
                    else if (plan === "Pro") setNewInvoiceAmount("₹450 /mo");
                    else if (plan === "Enterprise") setNewInvoiceAmount("₹999 /mo");
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
                  <option value="Basic">Basic (₹200)</option>
                  <option value="Pro">Pro (₹450)</option>
                  <option value="Enterprise">Enterprise (₹999)</option>
                </select>
              </div>

              <div className="field">
                <label style={{ display: "block", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted)", marginBottom: "6px" }}>
                  Payment Status *
                </label>
                <select
                  value={newInvoiceStatus}
                  onChange={(e) => setNewInvoiceStatus(e.target.value)}
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
                  <option value="paid">Paid</option>
                  <option value="pending">Pending</option>
                  <option value="failed">Failed</option>
                </select>
              </div>
            </div>

            <div className="field" style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted)", marginBottom: "6px" }}>
                Billed Amount *
              </label>
              <input
                type="text"
                required
                value={newInvoiceAmount}
                onChange={(e) => setNewInvoiceAmount(e.target.value)}
                placeholder="e.g. ₹450 /mo"
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
              <button
                type="button"
                className="btn"
                onClick={() => setIsAddInvoiceModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={busy === "create-invoice"}
              >
                {busy === "create-invoice" ? "Recording…" : "Create & Record Invoice"}
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
                      {(() => {
                        const isExpired = drawerItem.data.subscriptionStatus === "expired" || (drawerItem.data.trialEndsAt && new Date(drawerItem.data.trialEndsAt).getTime() <= Date.now());
                        const isRevoked = drawerItem.data.subscriptionStatus === "revoked" || !drawerItem.data.isApproved;
                        if (isRevoked) {
                          return <span className="pill pill-suspended">Revoked</span>;
                        }
                        if (isExpired) {
                          return <span className="pill pill-suspended">Expired</span>;
                        }
                        if (drawerItem.data.subscriptionStatus === "trial") {
                          return <span className="pill pill-trial">Trial</span>;
                        }
                        return <span className="pill pill-active">Active</span>;
                      })()}
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
                      {new Date(drawerItem.data.trialEndsAt).toLocaleDateString(undefined, {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
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
                  <option value="Starter">Starter</option>
                  <option value="Basic">Basic</option>
                  <option value="Pro">Pro</option>
                  <option value="Enterprise">Enterprise</option>
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
      {/* 7. CREATE TICKET MODAL */}
      <div
        className={`overlay ${isCreateTicketModalOpen ? "open" : ""}`}
        onClick={() => setIsCreateTicketModalOpen(false)}
      >
        <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "480px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" }}>
            <div>
              <h3 style={{ margin: 0, fontSize: "19px", color: "var(--ink)", fontWeight: 700 }}>Open Support Ticket</h3>
              <p className="sub" style={{ margin: "3px 0 0", fontSize: "12.5px", color: "var(--muted)" }}>
                Log a new support or troubleshooting ticket for a client
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsCreateTicketModalOpen(false)}
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

          <form onSubmit={handleCreateTicket}>
            <div className="field" style={{ marginBottom: "14px" }}>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted)", marginBottom: "6px" }}>
                Target Workspace *
              </label>
              <select
                required
                value={newTicketOrgId}
                onChange={(e) => setNewTicketOrgId(e.target.value)}
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
              >
                {organizations.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="field" style={{ marginBottom: "14px" }}>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted)", marginBottom: "6px" }}>
                Ticket Subject / Issue Title *
              </label>
              <input
                type="text"
                required
                value={newTicketTitle}
                onChange={(e) => setNewTicketTitle(e.target.value)}
                placeholder="e.g. Domain setup assistance or CSV import error"
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
                Priority Level *
              </label>
              <select
                value={newTicketPriority}
                onChange={(e) => setNewTicketPriority(e.target.value)}
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
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div className="field" style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted)", marginBottom: "6px" }}>
                Issue Description
              </label>
              <textarea
                rows={3}
                value={newTicketDesc}
                onChange={(e) => setNewTicketDesc(e.target.value)}
                placeholder="Optional details about the client's request or technical error..."
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  borderRadius: "6px",
                  border: "1px solid var(--line)",
                  background: "var(--paper)",
                  color: "var(--ink)",
                  fontSize: "13px",
                  outline: "none",
                  resize: "vertical",
                }}
              />
            </div>

            <div className="modal-foot">
              <button
                type="button"
                className="btn"
                onClick={() => setIsCreateTicketModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={busy === "create-ticket"}
              >
                {busy === "create-ticket" ? "Opening…" : "Open Support Ticket"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* 8. TICKET CONVERSATION THREAD SLIDE-OVER DRAWER */}
      <div
        className={`drawer-overlay ${activeTicket ? "open" : ""}`}
        onClick={() => setActiveTicket(null)}
      />
      <div className={`drawer-panel ${activeTicket ? "open" : ""}`} style={{ maxWidth: "520px" }}>
        {activeTicket && (
          <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
            <div className="drawer-header" style={{ paddingBottom: "16px", borderBottom: "1px solid var(--line)" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                  <span className="mono" style={{ fontSize: "12px", fontWeight: 700, color: "var(--terracotta)" }}>
                    #{activeTicket.ticketNumber || activeTicket.id.slice(0, 8)}
                  </span>
                  <span style={{
                    fontSize: "10.5px",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    padding: "2px 6px",
                    borderRadius: "4px",
                    background: activeTicket.priority === "urgent" ? "#fee2e2" : activeTicket.priority === "high" ? "#ffedd5" : "var(--paper-2)",
                    color: activeTicket.priority === "urgent" ? "#991b1b" : activeTicket.priority === "high" ? "#9a3412" : "var(--muted)",
                  }}>
                    {activeTicket.priority}
                  </span>
                </div>
                <h3 style={{ margin: "2px 0 0", fontSize: "16px", fontWeight: 700, color: "var(--ink)" }}>
                  {activeTicket.title}
                </h3>
                <span style={{ fontSize: "12.5px", color: "var(--muted)" }}>
                  {activeTicket.orgName} · Opened {activeTicket.openedAt ? new Date(activeTicket.openedAt).toLocaleDateString() : "Recently"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveTicket(null)}
                style={{ background: "transparent", border: "none", color: "var(--muted)", cursor: "pointer", padding: "4px" }}
                title="Close ticket drawer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Quick Status Bar & Actions */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid var(--line)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontSize: "12px", color: "var(--muted)", fontWeight: 600 }}>Status:</span>
                <select
                  value={activeTicket.status || "open"}
                  onChange={(e) => handleUpdateTicketStatus(e.target.value)}
                  style={{
                    padding: "4px 8px",
                    borderRadius: "6px",
                    border: "1px solid var(--line)",
                    background: "var(--paper)",
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "var(--ink)",
                    outline: "none",
                  }}
                >
                  <option value="open">OPEN</option>
                  <option value="in_progress">IN PROGRESS</option>
                  <option value="resolved">RESOLVED</option>
                  <option value="closed">CLOSED</option>
                </select>
              </div>

              {activeTicket.organizationId && (
                <button
                  className="row-action"
                  style={{ fontSize: "12px", padding: "4px 8px", color: "var(--terracotta)", fontWeight: 600 }}
                  onClick={async () => {
                    triggerToast(`Impersonating workspace...`);
                    try {
                      const res = await api.impersonate(activeTicket.organizationId!);
                      triggerToast(`Workspace opened in new tab!`);
                      window.open(res.redirectUrl || "http://localhost:8001", "_blank");
                    } catch (error) {
                      triggerToast(apiErrorMessage(error, "Impersonation failed."));
                    }
                  }}
                >
                  <Eye size={12} /> Impersonate Workspace
                </button>
              )}
            </div>

            {/* Ticket Description */}
            {activeTicket.description && (
              <div style={{ padding: "12px", background: "var(--paper-2)", borderRadius: "8px", margin: "14px 0 6px", fontSize: "13px", color: "var(--ink)" }}>
                <strong>Issue Details:</strong> {activeTicket.description}
              </div>
            )}

            {/* Conversation Thread History */}
            <div style={{ flex: 1, overflowY: "auto", padding: "12px 0", display: "flex", flexDirection: "column", gap: "12px" }}>
              <span style={{ fontSize: "11px", textTransform: "uppercase", fontWeight: 700, color: "var(--muted)", letterSpacing: "0.05em" }}>
                Conversation History ({ticketRepliesList.length})
              </span>

              {ticketRepliesList.length === 0 ? (
                <div style={{ textAlign: "center", padding: "24px 0", color: "var(--muted)", fontSize: "12.5px" }}>
                  No messages yet. Send a reply below to start the thread.
                </div>
              ) : (
                ticketRepliesList.map((rep) => (
                  <div
                    key={rep.id}
                    style={{
                      padding: "10px 14px",
                      borderRadius: "8px",
                      background: rep.senderRole === "Super Admin" ? "var(--terracotta-dim)" : "var(--paper-2)",
                      border: rep.senderRole === "Super Admin" ? "1px solid var(--terracotta)" : "1px solid var(--line)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                      <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--ink)" }}>
                        {rep.senderName} <span style={{ fontWeight: 500, color: "var(--muted)" }}>({rep.senderRole || "Support"})</span>
                      </span>
                      <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                        {rep.createdAt ? new Date(rep.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Just now"}
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: "13px", color: "var(--ink)", whiteSpace: "pre-wrap" }}>
                      {rep.message}
                    </p>
                  </div>
                ))
              )}
            </div>

            {/* Reply Input Box */}
            <form onSubmit={handleSendTicketReply} style={{ marginTop: "auto", paddingTop: "12px", borderTop: "1px solid var(--line)" }}>
              <textarea
                rows={3}
                required
                value={newTicketReplyText}
                onChange={(e) => setNewTicketReplyText(e.target.value)}
                placeholder="Type your response to the client..."
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "6px",
                  border: "1px solid var(--line)",
                  background: "var(--paper)",
                  color: "var(--ink)",
                  fontSize: "13px",
                  outline: "none",
                  resize: "none",
                  boxSizing: "border-box",
                }}
              />
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "8px" }}>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={busy === "ticket-reply"}
                  style={{ height: "34px", padding: "0 16px", fontSize: "13px", fontWeight: 600 }}
                >
                  {busy === "ticket-reply" ? "Sending…" : "Send Reply"}
                </button>
              </div>
            </form>
          </div>
        )}
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
