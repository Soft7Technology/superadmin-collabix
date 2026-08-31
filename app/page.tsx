"use client";

import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Ban,
  Building2,
  CheckCircle2,
  LogOut,
  Search,
  Shield,
  Trash2,
  Moon,
  Sun,
  Filter,
  X,
  ChevronRight,
  ArrowUpDown,
  Command,
  CheckSquare,
  Square,
  Eye,
  Activity,
  BarChart2,
  Layers,
  AlertTriangle,
  ExternalLink,
  RefreshCw,
  UserCheck,
  Sparkles,
  Server,
  Clock,
} from "lucide-react";
import { api, apiErrorMessage } from "../src/api";
import type { Organization, User } from "../src/types";

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
type OrgStatusFilter = "all" | "active" | "trial" | "suspended";

interface Invoice {
  orgName: string;
  plan: string;
  amount: string;
  date: string;
  status: string;
}

interface SupportTicket {
  id: string;
  title: string;
  orgName: string;
  openedAt: string;
}

interface SystemLog {
  id: string;
  category: "sec" | "info" | "sys";
  message: string;
  timestamp: string;
  ipAddress?: string;
  details?: string;
}

interface FeatureFlag {
  id: string;
  label: string;
  sub: string;
  enabled: boolean;
}

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

  // Feature 6: Dark/Light Mode Theme Switcher
  const [theme, setTheme] = useState<"light" | "dark">("light");

  // Feature 4: Filtering, Sorting & Bulk Selection State
  const [statusFilter, setStatusFilter] = useState<OrgStatusFilter>("all");
  const [sortField, setSortField] = useState<"name" | "createdAt">("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [selectedOrgIds, setSelectedOrgIds] = useState<string[]>([]);

  // Feature 3: Slide-Over Organization Detail Drawer
  const [drawerOrg, setDrawerOrg] = useState<Organization | null>(null);

  // Feature 2: Command Palette Modal
  const [isCmdOpen, setIsCmdOpen] = useState(false);
  const [cmdQuery, setCmdQuery] = useState("");

  // Feature 5: Active Impersonation Top Banner
  const [impersonatingOrg, setImpersonatingOrg] = useState<Organization | null>(null);

  // Feature 7: System Log Category Filter & Detail Modal
  const [logCategoryFilter, setLogCategoryFilter] = useState<"all" | "info" | "sec" | "sys">("all");
  const [selectedLog, setSelectedLog] = useState<SystemLog | null>(null);

  // Toast & Modals
  const [toastMsg, setToastMsg] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [orgToDelete, setOrgToDelete] = useState<Organization | null>(null);

  // Form Fields for "+ New Organization"
  const [newOrgName, setNewOrgName] = useState("");
  const [newOrgDomain, setNewOrgDomain] = useState("");
  const [newOrgPlan, setNewOrgPlan] = useState<"Starter" | "Pro" | "Enterprise">("Pro");
  const [newOrgEmail, setNewOrgEmail] = useState("");

  // Interactive UI states
  const [mockUsers, setMockUsers] = useState<
    { name: string; initials: string; org: string; role: string; status: string }[]
  >([]);
  const [featureFlags, setFeatureFlags] = useState<FeatureFlag[]>([]);
  const [securityFlags, setSecurityFlags] = useState<
    { id: string; label: string; sub: string; enabled: boolean }[]
  >([]);
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [systemLogs, setSystemLogs] = useState<SystemLog[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [apiKeys, setApiKeys] = useState<{ id: string; key: string }[]>([]);

  const [settingsTab, setSettingsTab] = useState<SettingsTabKey>("general");
  const [platformName, setPlatformName] = useState("SOFT7");
  const [supportEmail, setSupportEmail] = useState("support@soft7.in");
  const [defaultTimezone, setDefaultTimezone] = useState("IST — Asia/Kolkata");
  const [accentColor, setAccentColor] = useState("#D96B43");

  // Load theme preference on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem("superadmin_theme") as "light" | "dark" | null;
    if (savedTheme) {
      setTheme(savedTheme);
    }
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === "light" ? "dark" : "light";
      localStorage.setItem("superadmin_theme", next);
      return next;
    });
  };

  // Keyboard shortcut listener for Cmd + K / Ctrl + K (Command Palette)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsCmdOpen((prev) => !prev);
      } else if (e.key === "Escape") {
        setIsCmdOpen(false);
        setDrawerOrg(null);
        setSelectedLog(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Load backend data
  const loadOrganizations = useCallback(async () => {
    try {
      const data = await api.organizations();
      setOrganizations(data);
    } catch (e) {
      triggerToast("Failed to load organizations from database.");
    }
  }, []);

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
        await loadOrganizations();
      })
      .catch(() => setSession("guest"));
  }, [loadOrganizations]);

  // Helper to trigger toast notification
  const triggerToast = (msg: string) => {
    setToastMsg(msg);
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

  // Feature 4: Filter & Sort Organizations
  const filteredOrgs = useMemo(() => {
    let result = [...organizations];

    // Search query filter
    const term = searchQuery.trim().toLowerCase();
    if (term) {
      result = result.filter((org) =>
        [org.name, org.ownerName, org.ownerEmail, org.id]
          .filter(Boolean)
          .some((val) => val!.toLowerCase().includes(term)),
      );
    }

    // Status filter
    if (statusFilter === "active") {
      result = result.filter((org) => org.isApproved && org.subscriptionStatus === "active");
    } else if (statusFilter === "trial") {
      result = result.filter((org) => org.subscriptionStatus === "trial");
    } else if (statusFilter === "suspended") {
      result = result.filter((org) => org.subscriptionStatus === "revoked" || org.subscriptionStatus === "expired");
    }

    // Sorting
    result.sort((a, b) => {
      if (sortField === "createdAt") {
        const timeA = new Date(a.createdAt || 0).getTime();
        const timeB = new Date(b.createdAt || 0).getTime();
        return sortOrder === "asc" ? timeA - timeB : timeB - timeA;
      }
      const strA = (a.name || "").toLowerCase();
      const strB = (b.name || "").toLowerCase();
      if (strA < strB) return sortOrder === "asc" ? -1 : 1;
      if (strA > strB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [organizations, searchQuery, statusFilter, sortField, sortOrder]);

  // Bulk Operations
  const toggleSelectAllOrgs = () => {
    if (selectedOrgIds.length === filteredOrgs.length) {
      setSelectedOrgIds([]);
    } else {
      setSelectedOrgIds(filteredOrgs.map((o) => o.id));
    }
  };

  const toggleSelectOrg = (id: string) => {
    setSelectedOrgIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleBulkApprove = async () => {
    for (const id of selectedOrgIds) {
      try {
        await api.approve(id);
      } catch (e) {}
    }
    await loadOrganizations();
    triggerToast(`Approved ${selectedOrgIds.length} organizations.`);
    setSelectedOrgIds([]);
  };

  const handleBulkSuspend = async () => {
    for (const id of selectedOrgIds) {
      try {
        await api.revoke(id);
      } catch (e) {}
    }
    await loadOrganizations();
    triggerToast(`Suspended ${selectedOrgIds.length} organizations.`);
    setSelectedOrgIds([]);
  };

  // Search filtering users
  const filteredUsers = useMemo(() => {
    const term = searchQuery.trim().toLowerCase();
    if (!term) return mockUsers;
    return mockUsers.filter((u) =>
      [u.name, u.org, u.role].some((val) => val.toLowerCase().includes(term)),
    );
  }, [mockUsers, searchQuery]);

  // Search filtering support tickets
  const filteredTickets = useMemo(() => {
    const term = searchQuery.trim().toLowerCase();
    if (!term) return supportTickets;
    return supportTickets.filter((t) =>
      [t.title, t.orgName].some((val) => val.toLowerCase().includes(term)),
    );
  }, [supportTickets, searchQuery]);

  // Filtered System Logs
  const filteredLogs = useMemo(() => {
    let result = systemLogs;
    if (logCategoryFilter !== "all") {
      result = result.filter((l) => l.category === logCategoryFilter);
    }
    if (searchQuery.trim()) {
      const term = searchQuery.trim().toLowerCase();
      result = result.filter((l) => l.message.toLowerCase().includes(term));
    }
    return result;
  }, [systemLogs, logCategoryFilter, searchQuery]);

  // Create new organization handler
  const handleCreateOrg = () => {
    if (!newOrgName.trim()) {
      triggerToast("Organization Name is required");
      return;
    }
    const newOrg: Organization = {
      id: `org-${Date.now()}`,
      name: newOrgName.trim(),
      phone: "—",
      ownerName: newOrgEmail.trim() ? newOrgEmail.split("@")[0] : "New Owner",
      ownerEmail: newOrgEmail.trim() || "owner@example.com",
      subscriptionStatus: "trial",
      trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      isApproved: false,
      createdAt: new Date().toISOString(),
    };

    setOrganizations((prev) => [newOrg, ...prev]);
    setIsModalOpen(false);
    triggerToast(`"${newOrgName}" organization created!`);
    setNewOrgName("");
    setNewOrgDomain("");
    setNewOrgEmail("");
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
    (org) => org.isApproved && org.subscriptionStatus === "active",
  ).length;
  const trialSubscriptions = organizations.filter(
    (org) => org.subscriptionStatus === "trial",
  ).length;
  const suspendedCount = organizations.filter(
    (org) => org.subscriptionStatus === "revoked" || org.subscriptionStatus === "expired",
  ).length;

  return (
    <div className={`app ${theme}`}>
      {/* FEATURE 5: ACTIVE IMPERSONATION TOP BANNER */}
      {impersonatingOrg && (
        <div className="impersonation-banner">
          <div>
            ⚡ <strong>Impersonation Active:</strong> Currently viewing platform console as <strong>{impersonatingOrg.name}</strong> ({impersonatingOrg.id})
          </div>
          <button
            className="btn-exit"
            onClick={() => {
              setImpersonatingOrg(null);
              triggerToast("Exited organization impersonation.");
            }}
          >
            Exit Impersonation
          </button>
        </div>
      )}

      {/* SIDEBAR NAVIGATION */}
      <aside className="sidebar">
        <div className="brand">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 100 100"
            style={{ width: "32px", height: "32px", flexShrink: 0, color: "var(--terracotta)" }}
            fill="none"
          >
            <path
              d="M 12 76 h 76 a 4 4 0 0 1 4 4 v 1 a 2 2 0 0 1 -2 2 H 10 a 2 2 0 0 1 -2 -2 v -1 a 4 4 0 0 1 4 -4 Z"
              fill="currentColor"
            />
            <path
              d="M 40 76 h 20 v 3 a 1.5 1.5 0 0 1 -1.5 1.5 h -17 a 1.5 1.5 0 0 1 -1.5 -1.5 v -3 Z"
              fill="var(--paper, #FBF7F0)"
              opacity="0.6"
            />
            <rect
              x="18"
              y="30"
              width="64"
              height="44"
              rx="5"
              fill="none"
              stroke="currentColor"
              strokeWidth="7"
            />
            <path
              d="M 45 10 C 31 10 19 22 19 36 C 19 41.2 20.6 46 23.3 50 L 19 61.5 L 31 57.5 C 35.2 60 40 61.5 45 61.5 C 59 61.5 71 49.5 71 35.5 C 71 21.5 59 10 45 10 Z"
              fill="currentColor"
            />
            <path
              d="M 45 35.5 C 41.8 30.5 37 30.5 33.5 35.5 C 37 40.5 41.8 40.5 45 35.5 C 48.2 30.5 53 30.5 56.5 35.5 C 53 40.5 48.2 40.5 45 35.5 Z"
              fill="none"
              stroke="var(--paper, #FBF7F0)"
              strokeWidth="4.5"
              strokeLinecap="round"
              strokeLinejoin="round"
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

          {/* FEATURE 6: Theme Switcher Toggle */}
          <button
            className="theme-btn"
            onClick={toggleTheme}
            title={`Switch to ${theme === "light" ? "Dark" : "Light"} mode`}
          >
            {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
          </button>

          <button
            onClick={() => void api.logout().finally(() => setSession("guest"))}
            style={{ marginLeft: "auto", background: "none", border: "none", color: "#A39688", cursor: "pointer" }}
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
            {/* FEATURE 2: Command Palette Launcher Button */}
            <button
              className="cmd-trigger-btn"
              onClick={() => setIsCmdOpen(true)}
              title="Quick Search & Navigation (Ctrl+K)"
            >
              <Search size={14} />
              <span>Quick search...</span>
              <span className="cmd-kbd">⌘K</span>
            </button>

            <div className="search">
              <input
                type="text"
                placeholder="Search page..."
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

        {/* CONTENT CONTAINER */}
        <main className="content">

          {/* 1. OVERVIEW SCREEN */}
          <div className={`page ${activePage === "overview" ? "active" : ""}`}>
            <h1 className="page-title">Platform overview</h1>
            <p className="page-sub">Health, subscription stats, and system metrics across every organization on {platformName}.</p>

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

            {/* FEATURE 1: INTERACTIVE CHARTS & SYSTEM HEALTH METRICS */}
            <div className="charts-grid">
              <div className="chart-card">
                <h3>Organization Growth Trend</h3>
                <div style={{ height: "180px", width: "100%", position: "relative", marginTop: "10px" }}>
                  <svg viewBox="0 0 500 150" style={{ width: "100%", height: "100%", overflow: "visible" }}>
                    <defs>
                      <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--terracotta)" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="var(--terracotta)" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    {/* Area fill */}
                    <path
                      d="M 10,130 Q 100,110 180,85 T 350,50 T 490,20 L 490,140 L 10,140 Z"
                      fill="url(#chartGrad)"
                    />
                    {/* Trend Line */}
                    <path
                      d="M 10,130 Q 100,110 180,85 T 350,50 T 490,20"
                      fill="none"
                      stroke="var(--terracotta)"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                    {/* Grid lines */}
                    <line x1="0" y1="140" x2="500" y2="140" stroke="var(--line)" strokeDasharray="3 3" />
                    <line x1="0" y1="90" x2="500" y2="90" stroke="var(--line)" strokeDasharray="3 3" />
                    <line x1="0" y1="40" x2="500" y2="40" stroke="var(--line)" strokeDasharray="3 3" />
                    {/* Data Points */}
                    <circle cx="10" cy="130" r="4" fill="var(--surface)" stroke="var(--terracotta)" strokeWidth="2.5" />
                    <circle cx="180" cy="85" r="4" fill="var(--surface)" stroke="var(--terracotta)" strokeWidth="2.5" />
                    <circle cx="350" cy="50" r="4" fill="var(--surface)" stroke="var(--terracotta)" strokeWidth="2.5" />
                    <circle cx="490" cy="20" r="5" fill="var(--terracotta)" />
                  </svg>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "var(--muted)", marginTop: "6px" }}>
                    <span>Mar</span><span>Apr</span><span>May</span><span>Jun</span><span>Jul</span><span>Aug</span>
                  </div>
                </div>
              </div>

              <div className="chart-card">
                <h3>System Health</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginTop: "12px" }}>
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "4px" }}>
                      <span style={{ color: "var(--muted)" }}>PostgreSQL Pool</span>
                      <span style={{ fontWeight: 600, color: "var(--sage-text)" }}>Healthy (20/20)</span>
                    </div>
                    <div style={{ height: "6px", width: "100%", background: "var(--paper-2)", borderRadius: "4px", overflow: "hidden" }}>
                      <div style={{ width: "100%", height: "100%", background: "var(--sage)" }}></div>
                    </div>
                  </div>

                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "4px" }}>
                      <span style={{ color: "var(--muted)" }}>API Latency</span>
                      <span style={{ fontWeight: 600 }}>~ 42 ms</span>
                    </div>
                    <div style={{ height: "6px", width: "100%", background: "var(--paper-2)", borderRadius: "4px", overflow: "hidden" }}>
                      <div style={{ width: "25%", height: "100%", background: "var(--terracotta)" }}></div>
                    </div>
                  </div>

                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "4px" }}>
                      <span style={{ color: "var(--muted)" }}>Active Workspaces</span>
                      <span style={{ fontWeight: 600 }}>{activeSubscriptions} Active</span>
                    </div>
                    <div style={{ height: "6px", width: "100%", background: "var(--paper-2)", borderRadius: "4px", overflow: "hidden" }}>
                      <div
                        style={{
                          width: `${totalOrganizations ? Math.round((activeSubscriptions / totalOrganizations) * 100) : 0}%`,
                          height: "100%",
                          background: "var(--mustard)",
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="panel-head">
              <h2>Platform activity</h2>
            </div>
            <div className="card" style={{ padding: "2px 12px" }}>
              {systemLogs.slice(0, 4).map((log) => (
                <div className="log-row" key={log.id} onClick={() => setSelectedLog(log)}>
                  <span>
                    <span className={`log-tag ${log.category}`}>
                      {log.category === "info" ? "Org" : log.category === "sec" ? "Security" : "System"}
                    </span>
                    {log.message}
                  </span>
                  <span className="t">{log.timestamp}</span>
                </div>
              ))}
              {systemLogs.length === 0 && (
                <div style={{ padding: "20px", textAlign: "center", color: "var(--muted)" }}>
                  No recent platform activity.
                </div>
              )}
            </div>
          </div>

          {/* 2. ORGANIZATIONS SCREEN (Connected to Backend API with Filters, Sorting, Bulk Actions, Drawer) */}
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

            {/* FEATURE 4: STATUS FILTER PILLS */}
            <div className="filter-pills">
              <button
                className={`filter-pill ${statusFilter === "all" ? "active" : ""}`}
                onClick={() => setStatusFilter("all")}
              >
                All Organizations <span className="count">({totalOrganizations})</span>
              </button>
              <button
                className={`filter-pill ${statusFilter === "active" ? "active" : ""}`}
                onClick={() => setStatusFilter("active")}
              >
                Active <span className="count">({activeSubscriptions})</span>
              </button>
              <button
                className={`filter-pill ${statusFilter === "trial" ? "active" : ""}`}
                onClick={() => setStatusFilter("trial")}
              >
                On Trial <span className="count">({trialSubscriptions})</span>
              </button>
              <button
                className={`filter-pill ${statusFilter === "suspended" ? "active" : ""}`}
                onClick={() => setStatusFilter("suspended")}
              >
                Suspended <span className="count">({suspendedCount})</span>
              </button>
            </div>

            <div className="panel-head">
              <h2>All organizations</h2>
            </div>
            <div className="card">
              <table className="tbl">
                <thead>
                  <tr>
                    <th style={{ width: "40px" }}>
                      <input
                        type="checkbox"
                        checked={selectedOrgIds.length > 0 && selectedOrgIds.length === filteredOrgs.length}
                        onChange={toggleSelectAllOrgs}
                      />
                    </th>
                    {/* FEATURE 4: SORTABLE COLUMNS */}
                    <th
                      className="sortable"
                      onClick={() => {
                        if (sortField === "name") setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
                        else {
                          setSortField("name");
                          setSortOrder("asc");
                        }
                      }}
                    >
                      Organization {sortField === "name" && (sortOrder === "asc" ? "↑" : "↓")}
                    </th>
                    <th>Owner / Contact</th>
                    <th>Status</th>
                    <th
                      className="sortable"
                      onClick={() => {
                        if (sortField === "createdAt") setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
                        else {
                          setSortField("createdAt");
                          setSortOrder("desc");
                        }
                      }}
                    >
                      Trial Ends {sortField === "createdAt" && (sortOrder === "asc" ? "↑" : "↓")}
                    </th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrgs.map((org) => {
                    const initials = org.name
                      .split(" ")
                      .slice(0, 2)
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase();
                    const isSelected = selectedOrgIds.includes(org.id);

                    return (
                      <tr key={org.id} className="clickable-row">
                        <td onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectOrg(org.id)}
                          />
                        </td>
                        {/* FEATURE 3: Clicking Org Row opens Drawer */}
                        <td onClick={() => setDrawerOrg(org)}>
                          <div className="who-cell">
                            <div className="fb2">{initials}</div>
                            <div className="org-name-cell">
                              {org.name}
                              <span className="sub">{org.id}</span>
                            </div>
                          </div>
                        </td>
                        <td onClick={() => setDrawerOrg(org)}>
                          {org.ownerName || "—"}
                          <span style={{ display: "block", fontSize: "11px", color: "var(--muted)" }}>
                            {org.ownerEmail || "No email"}
                          </span>
                        </td>
                        <td onClick={() => setDrawerOrg(org)}>
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
                        <td onClick={() => setDrawerOrg(org)}>{new Date(org.trialEndsAt).toLocaleDateString()}</td>
                        <td>
                          <div className="action-buttons-group">
                            <button
                              className="row-action btn-impersonate"
                              disabled={busy === org.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                void runBackendAction(
                                  org.id,
                                  async () => {
                                    setImpersonatingOrg(org);
                                    try {
                                      const res = await api.impersonate(org.id);
                                      if (res?.redirectUrl) {
                                        window.open(res.redirectUrl, "_blank");
                                      }
                                    } catch (err) {
                                      console.warn("Impersonation active locally:", err);
                                    }
                                  },
                                  `Impersonating ${org.name}...`,
                                );
                              }}
                            >
                              <Eye size={13} />
                              Impersonate
                            </button>
                            {org.isApproved ? (
                              <button
                                className="row-action btn-suspend"
                                disabled={busy === org.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void runBackendAction(
                                    org.id,
                                    () => api.revoke(org.id),
                                    `Suspended ${org.name}`,
                                  );
                                }}
                              >
                                <Ban size={13} />
                                Suspend
                              </button>
                            ) : (
                              <button
                                className="row-action btn-approve"
                                disabled={busy === org.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void runBackendAction(
                                    org.id,
                                    () => api.approve(org.id),
                                    `Approved ${org.name}`,
                                  );
                                }}
                              >
                                <CheckCircle2 size={13} />
                                Approve
                              </button>
                            )}
                            <button
                              className="row-action danger"
                              disabled={busy === org.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                setOrgToDelete(org);
                                setIsDeleteModalOpen(true);
                              }}
                            >
                              <Trash2 size={13} />
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredOrgs.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: "center", padding: "24px", color: "var(--muted)" }}>
                        No organizations found matching filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* FEATURE 4: FLOATING BULK ACTIONS TOOLBAR */}
            {selectedOrgIds.length > 0 && (
              <div className="bulk-bar">
                <span className="count-badge">{selectedOrgIds.length} Selected</span>
                <button className="btn btn-sm btn-primary" onClick={handleBulkApprove}>
                  Approve All
                </button>
                <button className="btn btn-sm btn-danger" onClick={handleBulkSuspend}>
                  Suspend All
                </button>
                <button className="btn btn-sm" onClick={() => setSelectedOrgIds([])}>
                  Clear Selection
                </button>
              </div>
            )}
          </div>

          {/* 3. USERS SCREEN */}
          <div className={`page ${activePage === "users" ? "active" : ""}`}>
            <h1 className="page-title">Users</h1>
            <p className="page-sub">Search and manage every user account across all organizations.</p>

            <div className="card">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Organization</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u, i) => (
                    <tr key={i}>
                      <td>
                        <div className="who-cell">
                          <div className="fb2 round">{u.initials}</div>
                          {u.name}
                        </div>
                      </td>
                      <td>{u.org}</td>
                      <td>
                        <select
                          className="role-sel"
                          value={u.role}
                          onChange={(e) => {
                            const next = [...mockUsers];
                            next[i].role = e.target.value;
                            setMockUsers(next);
                            triggerToast(`Updated ${u.name} role to ${e.target.value}`);
                          }}
                        >
                          <option>Org admin</option>
                          <option>Manager</option>
                          <option>Employee</option>
                        </select>
                      </td>
                      <td>
                        <span className={`pill ${u.status === "Active" ? "pill-active" : "pill-suspended"}`}>
                          {u.status}
                        </span>
                      </td>
                      <td>
                        <button
                          className="row-action"
                          onClick={() => triggerToast(`Password reset link sent to ${u.name}`)}
                        >
                          Reset password
                        </button>
                        {u.status === "Active" ? (
                          <button
                            className="row-action danger"
                            onClick={() => {
                              const next = [...mockUsers];
                              next[i].status = "Suspended";
                              setMockUsers(next);
                              triggerToast(`Suspended ${u.name}`);
                            }}
                          >
                            Suspend
                          </button>
                        ) : (
                          <button
                            className="row-action"
                            style={{ color: "var(--sage-text)" }}
                            onClick={() => {
                              const next = [...mockUsers];
                              next[i].status = "Active";
                              setMockUsers(next);
                              triggerToast(`Reactivated ${u.name}`);
                            }}
                          >
                            Reactivate
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ textAlign: "center", padding: "24px", color: "var(--muted)" }}>
                        No users found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 4. PLANS SCREEN */}
          <div className={`page ${activePage === "plans" ? "active" : ""}`}>
            <h1 className="page-title">Available Workspace Plans</h1>
            <p className="page-sub">
              Choose the tier that matches your team size and workflow needs.
            </p>

            <div className="plans-grid">
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
                  onClick={() => triggerToast("Pro plan activated")}
                >
                  Upgrade / Activate
                </button>
              </div>

              {/* Enterprise Plan Card */}
              <div className="plan-card">
                <div className="badge-scale">Scale &amp;<br />Custom</div>
                <h3>Enterprise Plan</h3>
                <p className="plan-sub">For large organizations requiring custom controls &amp; scale.</p>
                <div className="plan-price">
                  ₹330 <span>/mo</span>
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
                  onClick={() => triggerToast("Enterprise plan selected")}
                >
                  Choose Enterprise Plan
                </button>
              </div>

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
                  onClick={() => triggerToast("Basic plan selected")}
                >
                  Choose Basic Plan
                </button>
              </div>
            </div>

            <div className="panel-head">
              <h2>Recent Invoices</h2>
            </div>
            {invoices.length > 0 ? (
              <div className="card" style={{ padding: "2px 12px" }}>
                {invoices.map((inv, idx) => (
                  <div className="log-row" key={idx}>
                    <span>{inv.orgName} — {inv.plan}</span>
                    <span className="t mono">{inv.amount} · {inv.date}</span>
                  </div>
                ))}
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

          {/* 5. FEATURE FLAGS SCREEN */}
          <div className={`page ${activePage === "flags" ? "active" : ""}`}>
            <h1 className="page-title">Feature flags</h1>
            <p className="page-sub">Turn modules on or off platform-wide, independent of plan.</p>

            {featureFlags.length === 0 ? (
              <div className="card" style={{ padding: "20px", textAlign: "center", color: "var(--muted)" }}>
                No feature flags configured.
              </div>
            ) : (
              <div className="flags-grid">
                <div className="card" style={{ padding: "4px 14px" }}>
                  {featureFlags.slice(0, Math.ceil(featureFlags.length / 2)).map((f) => (
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
                  {featureFlags.slice(Math.ceil(featureFlags.length / 2)).map((f) => (
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
            )}
          </div>

          {/* 6. SYSTEM LOGS SCREEN (WITH CATEGORY FILTERS & DETAIL MODAL) */}
          <div className={`page ${activePage === "logs" ? "active" : ""}`}>
            <h1 className="page-title">System logs</h1>
            <p className="page-sub">Platform-wide audit trail across all organizations.</p>

            {/* FEATURE 7: LOG CATEGORY FILTER PILLS */}
            <div className="filter-pills">
              <button
                className={`filter-pill ${logCategoryFilter === "all" ? "active" : ""}`}
                onClick={() => setLogCategoryFilter("all")}
              >
                All Logs <span className="count">({systemLogs.length})</span>
              </button>
              <button
                className={`filter-pill ${logCategoryFilter === "info" ? "active" : ""}`}
                onClick={() => setLogCategoryFilter("info")}
              >
                Organization <span className="count">({systemLogs.filter((l) => l.category === "info").length})</span>
              </button>
              <button
                className={`filter-pill ${logCategoryFilter === "sec" ? "active" : ""}`}
                onClick={() => setLogCategoryFilter("sec")}
              >
                Security <span className="count">({systemLogs.filter((l) => l.category === "sec").length})</span>
              </button>
              <button
                className={`filter-pill ${logCategoryFilter === "sys" ? "active" : ""}`}
                onClick={() => setLogCategoryFilter("sys")}
              >
                System <span className="count">({systemLogs.filter((l) => l.category === "sys").length})</span>
              </button>
            </div>

            <div className="card" style={{ padding: "2px 12px" }}>
              {filteredLogs.map((log) => (
                <div className="log-row" key={log.id} onClick={() => setSelectedLog(log)}>
                  <span>
                    <span className={`log-tag ${log.category}`}>
                      {log.category === "info" ? "Org" : log.category === "sec" ? "Security" : "System"}
                    </span>
                    {log.message}
                  </span>
                  <span className="t">{log.timestamp}</span>
                </div>
              ))}
              {filteredLogs.length === 0 && (
                <div style={{ padding: "20px", textAlign: "center", color: "var(--muted)" }}>
                  No system logs available matching filter.
                </div>
              )}
            </div>
          </div>

          {/* 7. SECURITY SCREEN */}
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
              {securityFlags.length === 0 && (
                <div style={{ padding: "20px", textAlign: "center", color: "var(--muted)" }}>
                  No security policies configured.
                </div>
              )}
            </div>
          </div>

          {/* 8. SUPPORT SCREEN */}
          <div className={`page ${activePage === "support" ? "active" : ""}`}>
            <h1 className="page-title">Support</h1>
            <p className="page-sub">Open tickets and org impersonation for troubleshooting.</p>

            <div className="panel-head">
              <h2>Open tickets</h2>
            </div>
            <div className="card" style={{ padding: "2px 12px" }}>
              {filteredTickets.map((t) => (
                <div className="ticket-row" key={t.id}>
                  <span>
                    {t.title}
                    <div className="ticket-org">{t.orgName} · Opened {t.openedAt}</div>
                  </span>
                  <button className="btn btn-sm" onClick={() => triggerToast(`Opening ticket #${t.id}...`)}>
                    Open
                  </button>
                </div>
              ))}
              {filteredTickets.length === 0 && (
                <div style={{ padding: "20px", textAlign: "center", color: "var(--muted)" }}>
                  No open tickets.
                </div>
              )}
            </div>
          </div>

          {/* 9. SETTINGS SCREEN */}
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
              <button className="btn btn-primary" onClick={() => triggerToast("Platform settings saved")}>
                Save changes
              </button>
            </div>

            {/* API Tab */}
            <div className={`settings-panel ${settingsTab === "api" ? "active" : ""}`}>
              {apiKeys.map((item) => (
                <div className="key-row" key={item.id}>
                  <span>{item.key}</span>
                  <button className="btn btn-sm" onClick={() => triggerToast("API Key copied to clipboard")}>
                    Copy
                  </button>
                  <button
                    className="btn btn-sm btn-danger"
                    onClick={() => {
                      setApiKeys((prev) => prev.filter((k) => k.id !== item.id));
                      triggerToast("Key revoked");
                    }}
                  >
                    Revoke
                  </button>
                </div>
              ))}
              {apiKeys.length === 0 && (
                <div style={{ padding: "12px 0", color: "var(--muted)", fontSize: "14px" }}>
                  No active API keys generated.
                </div>
              )}
              <button
                className="btn btn-primary"
                onClick={() => {
                  const newKey = {
                    id: `key-${Date.now()}`,
                    key: `pk_live_${Math.random().toString(36).substring(2, 18)}`,
                  };
                  setApiKeys((prev) => [...prev, newKey]);
                  triggerToast("New API key generated");
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
                      background: "#D96B43",
                      border: accentColor === "#D96B43" ? "2px solid var(--text)" : "none",
                    }}
                    onClick={() => setAccentColor("#D96B43")}
                  />
                  <button
                    className="swatch"
                    style={{
                      background: "#5E9E82",
                      border: accentColor === "#5E9E82" ? "2px solid var(--text)" : "none",
                    }}
                    onClick={() => setAccentColor("#5E9E82")}
                  />
                  <button
                    className="swatch"
                    style={{
                      background: "#D4A338",
                      border: accentColor === "#D4A338" ? "2px solid var(--text)" : "none",
                    }}
                    onClick={() => setAccentColor("#D4A338")}
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

      {/* FEATURE 2: COMMAND PALETTE OVERLAY MODAL */}
      <div className={`cmd-overlay ${isCmdOpen ? "open" : ""}`} onClick={() => setIsCmdOpen(false)}>
        <div className="cmd-modal" onClick={(e) => e.stopPropagation()}>
          <div className="cmd-input-wrap">
            <Search size={18} style={{ color: "var(--muted)" }} />
            <input
              type="text"
              placeholder="Type a command or search..."
              value={cmdQuery}
              onChange={(e) => setCmdQuery(e.target.value)}
              autoFocus
            />
            <span className="cmd-kbd">ESC</span>
          </div>
          <div className="cmd-list">
            <div className="cmd-group-title">Navigation</div>
            <div
              className="cmd-item"
              onClick={() => {
                setActivePage("overview");
                setIsCmdOpen(false);
              }}
            >
              <Activity size={16} /> Platform Overview
            </div>
            <div
              className="cmd-item"
              onClick={() => {
                setActivePage("orgs");
                setIsCmdOpen(false);
              }}
            >
              <Building2 size={16} /> Organizations Directory
            </div>
            <div
              className="cmd-item"
              onClick={() => {
                setActivePage("users");
                setIsCmdOpen(false);
              }}
            >
              <UserCheck size={16} /> User Accounts
            </div>
            <div
              className="cmd-item"
              onClick={() => {
                setActivePage("plans");
                setIsCmdOpen(false);
              }}
            >
              <BarChart2 size={16} /> Plans &amp; Billing
            </div>
            <div
              className="cmd-item"
              onClick={() => {
                setActivePage("logs");
                setIsCmdOpen(false);
              }}
            >
              <Clock size={16} /> System Audit Logs
            </div>

            <div className="cmd-group-title" style={{ marginTop: "8px" }}>Actions</div>
            <div
              className="cmd-item"
              onClick={() => {
                setIsCmdOpen(false);
                setIsModalOpen(true);
              }}
            >
              <Sparkles size={16} /> Create New Organization
            </div>
            <div
              className="cmd-item"
              onClick={() => {
                toggleTheme();
                setIsCmdOpen(false);
              }}
            >
              {theme === "light" ? <Moon size={16} /> : <Sun size={16} />} Switch Theme Mode
            </div>
          </div>
        </div>
      </div>

      {/* FEATURE 3: ORGANIZATION SLIDE-OVER DETAIL DRAWER */}
      <div className={`drawer-overlay ${drawerOrg ? "open" : ""}`} onClick={() => setDrawerOrg(null)} />
      <div className={`drawer-panel ${drawerOrg ? "open" : ""}`}>
        {drawerOrg && (
          <>
            <div className="drawer-header">
              <h3>{drawerOrg.name}</h3>
              <button
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)" }}
                onClick={() => setDrawerOrg(null)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="drawer-body">
              <div className="drawer-field">
                <div className="label">Organization ID</div>
                <div className="val mono">{drawerOrg.id}</div>
              </div>
              <div className="drawer-field">
                <div className="label">Owner Name</div>
                <div className="val">{drawerOrg.ownerName || "Unassigned"}</div>
              </div>
              <div className="drawer-field">
                <div className="label">Owner Email</div>
                <div className="val">{drawerOrg.ownerEmail || "No email registered"}</div>
              </div>
              <div className="drawer-field">
                <div className="label">Subscription Status</div>
                <div className="val" style={{ marginTop: "4px" }}>
                  <span
                    className={`pill ${
                      drawerOrg.isApproved && drawerOrg.subscriptionStatus === "active"
                        ? "pill-active"
                        : drawerOrg.subscriptionStatus === "trial"
                        ? "pill-trial"
                        : "pill-suspended"
                    }`}
                  >
                    {drawerOrg.isApproved && drawerOrg.subscriptionStatus === "active"
                      ? "Active"
                      : drawerOrg.subscriptionStatus === "trial"
                      ? "Trial"
                      : drawerOrg.subscriptionStatus}
                  </span>
                </div>
              </div>
              <div className="drawer-field">
                <div className="label">Trial Expiration Date</div>
                <div className="val">{new Date(drawerOrg.trialEndsAt).toLocaleDateString()}</div>
              </div>
              <div className="drawer-field">
                <div className="label">Registered Date</div>
                <div className="val">{new Date(drawerOrg.createdAt).toLocaleDateString()}</div>
              </div>
            </div>
            <div className="drawer-footer">
              <button
                className="btn btn-sm btn-primary"
                disabled={busy === drawerOrg.id}
                onClick={() =>
                  void runBackendAction(
                    drawerOrg.id,
                    async () => {
                      setImpersonatingOrg(drawerOrg);
                      try {
                        const res = await api.impersonate(drawerOrg.id);
                        if (res?.redirectUrl) {
                          window.open(res.redirectUrl, "_blank");
                        }
                      } catch (err) {
                        console.warn("Impersonation active locally:", err);
                      }
                    },
                    `Impersonating ${drawerOrg.name}...`,
                  )
                }
              >
                <Eye size={13} />
                Impersonate
              </button>
              {drawerOrg.isApproved ? (
                <button
                  className="btn btn-sm btn-danger"
                  disabled={busy === drawerOrg.id}
                  onClick={() =>
                    void runBackendAction(
                      drawerOrg.id,
                      () => api.revoke(drawerOrg.id),
                      `Suspended ${drawerOrg.name}`,
                    )
                  }
                >
                  Suspend
                </button>
              ) : (
                <button
                  className="btn btn-sm"
                  style={{ color: "var(--sage-text)" }}
                  disabled={busy === drawerOrg.id}
                  onClick={() =>
                    void runBackendAction(
                      drawerOrg.id,
                      () => api.approve(drawerOrg.id),
                      `Approved ${drawerOrg.name}`,
                    )
                  }
                >
                  Approve
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {/* FEATURE 7: LOG DETAIL MODAL */}
      <div className={`overlay ${selectedLog ? "open" : ""}`} onClick={() => setSelectedLog(null)}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <h3>System Audit Log Detail</h3>
          <p className="sub">Event ID: {selectedLog?.id}</p>
          {selectedLog && (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "13px" }}>
              <div>
                <strong>Category:</strong>{" "}
                <span className={`log-tag ${selectedLog.category}`}>
                  {selectedLog.category === "info" ? "Org" : selectedLog.category === "sec" ? "Security" : "System"}
                </span>
              </div>
              <div>
                <strong>Timestamp:</strong> <span className="mono">{selectedLog.timestamp}</span>
              </div>
              <div>
                <strong>Message:</strong>
                <div style={{ background: "var(--paper-2)", padding: "10px", borderRadius: "6px", marginTop: "4px" }}>
                  {selectedLog.message}
                </div>
              </div>
            </div>
          )}
          <div className="modal-foot">
            <button className="btn" onClick={() => setSelectedLog(null)}>
              Close
            </button>
          </div>
        </div>
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
            <button
              className="btn"
              onClick={() => {
                setIsDeleteModalOpen(false);
                setOrgToDelete(null);
              }}
            >
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

      {/* TOAST ALERT */}
      <div className={`toast ${showToast ? "show" : ""}`}>
        <span className="dot" />
        <span>{toastMsg}</span>
      </div>
    </div>
  );
}

// Subcomponents: Secure Login screen
function Login({ onLogin }: { onLogin: (user: User) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
        <label>
          Email
          <input
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <label>
          Password
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
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
      <Shield size={34} style={{ color: "var(--terracotta)" }} />
      <p>{label}</p>
      {action}
    </div>
  );
}
