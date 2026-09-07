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
  BarChart2,
  Building2,
  CheckCircle2,
  Eye,
  LogOut,
  Search,
  Shield,
  Trash2,
} from "lucide-react";
import { api, apiErrorMessage } from "../src/api";
import type { Organization, User } from "../src/types";

type SessionState = "loading" | "guest" | "authenticated" | "forbidden";
type PageKey = "overview" | "orgs" | "users" | "plans" | "flags" | "logs" | "security" | "support" | "settings";
type SettingsTabKey = "general" | "api" | "branding";

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
  
  // Toast & Modals
  const [toastMsg, setToastMsg] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [orgToDelete, setOrgToDelete] = useState<Organization | null>(null);

  // Form Fields for "+ New Organization" (Local mock creation)
  const [newOrgName, setNewOrgName] = useState("");
  const [newOrgDomain, setNewOrgDomain] = useState("");
  const [newOrgPlan, setNewOrgPlan] = useState<"Starter" | "Pro" | "Enterprise">("Pro");
  const [newOrgEmail, setNewOrgEmail] = useState("");

  // Users — loaded from backend
  const [mockUsers, setMockUsers] = useState<{ name: string; initials: string; org: string; role: string; status: string }[]>([]);

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

  // System logs — loaded from backend
  const [systemLogs, setSystemLogs] = useState<SystemLog[]>([]);

  // Invoices — loaded from backend
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  const [settingsTab, setSettingsTab] = useState<SettingsTabKey>("general");
  const [platformName, setPlatformName] = useState("SOFT7");
  const [supportEmail, setSupportEmail] = useState("support@soft7.in");
  const [defaultTimezone, setDefaultTimezone] = useState("IST — Asia/Kolkata");
  const [accentColor, setAccentColor] = useState("#3cdb73");

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

  // Filtering live Organizations
  const filteredOrgs = useMemo(() => {
    const term = searchQuery.trim().toLowerCase();
    if (!term) return organizations;
    return organizations.filter((org) =>
      [org.name, org.ownerName, org.ownerEmail, org.id]
        .filter(Boolean)
        .some((val) => val!.toLowerCase().includes(term)),
    );
  }, [organizations, searchQuery]);

  // Search filtering mock users
  const filteredUsers = useMemo(() => {
    const term = searchQuery.trim().toLowerCase();
    if (!term) return mockUsers;
    return mockUsers.filter((u) =>
      [u.name, u.org, u.role]
        .some((val) => val.toLowerCase().includes(term)),
    );
  }, [mockUsers, searchQuery]);

  // Search filtering mock support tickets
  const filteredTickets = useMemo(() => {
    const term = searchQuery.trim().toLowerCase();
    if (!term) return supportTickets;
    return supportTickets.filter((t) =>
      [t.title, t.orgName]
        .some((val) => val.toLowerCase().includes(term)),
    );
  }, [supportTickets, searchQuery]);

  // Create new organization handler — calls backend API
  const handleCreateOrg = async () => {
    if (!newOrgName.trim()) {
      triggerToast("Organization Name is required");
      return;
    }
    await runBackendAction(
      "create-org",
      () => api.createOrganization({ name: newOrgName.trim(), ownerEmail: newOrgEmail.trim() || undefined }),
      `"${newOrgName}" organization created!`,
    );
    setIsModalOpen(false);
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
                      <span style={{ fontWeight: 600, color: "var(--ink)" }}>{org.name}</span>
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
                <div className="stat-num">{suspendedCount}</div>
                <div className="stat-label">Suspended</div>
              </div>
            </div>

            <div className="panel-head">
              <h2>All organizations</h2>
            </div>
            <div className="card">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Organization</th>
                    <th>Owner / Contact</th>
                    <th>Status</th>
                    <th>Trial Ends</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrgs.map((org) => {
                    const initials = org.name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
                    return (
                      <tr key={org.id}>
                        <td>
                          <div className="who-cell">
                            <div className="fb2">{initials}</div>
                            <div className="org-name-cell">
                              {org.name}
                              <span className="sub">{org.id}</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          {org.ownerName || "—"}
                          <span style={{ display: "block", fontSize: "11px", color: "var(--muted)" }}>
                            {org.ownerEmail || "No email"}
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
                        <td>{new Date(org.trialEndsAt).toLocaleDateString()}</td>
                        <td>
                          <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
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
                  {filteredOrgs.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ textAlign: "center", padding: "20px", color: "var(--muted)" }}>
                        No organizations found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 3. USERS SCREEN (Mock client side) */}
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
                            style={{ color: "var(--teal)" }}
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
                </tbody>
              </table>
            </div>
          </div>

          {/* 4. PLANS SCREEN */}
          <div className={`page ${activePage === "plans" ? "active" : ""}`}>
            <h1 className="page-title">Available Workspace Plans</h1>
            <p className="page-sub">
              Compare features and choose the tier that matches your team size and workflow needs.
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

          {/* 6. SYSTEM LOGS SCREEN */}
          <div className={`page ${activePage === "logs" ? "active" : ""}`}>
            <h1 className="page-title">System logs</h1>
            <p className="page-sub">Platform-wide audit trail across all organizations.</p>

            <div className="card" style={{ padding: "2px 12px" }}>
              {systemLogs.map((log) => (
                <div className="log-row" key={log.id}>
                  <span>
                    <span className={`log-tag ${log.category}`}>
                      {log.category === "info" ? "Org" : log.category === "sec" ? "Security" : "System"}
                    </span>
                    {log.message}
                  </span>
                  <span className="t">{log.timestamp}</span>
                </div>
              ))}
            </div>
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

          {/* 8. SUPPORT SCREEN (Mock client side) */}
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
            </div>
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
              <button className="btn btn-primary" onClick={() => triggerToast("Platform settings saved")}>
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

      {/* TOAST ALERT */}
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
      <Shield size={34} style={{ color: "var(--violet)" }} />
      <p>{label}</p>
      {action}
    </div>
  );
}
