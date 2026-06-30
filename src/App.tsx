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
} from "lucide-react";
import { api, apiErrorMessage } from "./api";
import type { Organization, User } from "./types";

type SessionState = "loading" | "guest" | "authenticated" | "forbidden";

export default function App() {
  const [session, setSession] = useState<SessionState>("loading");
  const [user, setUser] = useState<User | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const loadOrganizations = useCallback(async () => {
    setOrganizations(await api.organizations());
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

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return organizations;
    return organizations.filter((organization) =>
      [organization.name, organization.ownerName, organization.ownerEmail]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(term)),
    );
  }, [organizations, query]);

  const runAction = async (
    id: string,
    action: () => Promise<unknown>,
    success: string,
  ) => {
    setBusy(id);
    setMessage("");
    try {
      await action();
      await loadOrganizations();
      setMessage(success);
    } catch (error) {
      setMessage(apiErrorMessage(error, "The operation failed."));
    } finally {
      setBusy(null);
    }
  };

  if (session === "loading")
    return <Centered label="Restoring secure session…" />;
  if (session === "guest")
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
  if (session === "forbidden") {
    return (
      <Centered
        label="This portal is restricted to platform administrators."
        action={
          <button
            onClick={() => void api.logout().finally(() => setSession("guest"))}
          >
            Return to sign in
          </button>
        }
      />
    );
  }

  const active = organizations.filter(
    (organization) => organization.subscriptionStatus === "active",
  ).length;
  const pending = organizations.filter(
    (organization) => !organization.isApproved,
  ).length;

  return (
    <div className="app">
      <header>
        <div className="brand">
          <Shield size={22} />
          <span>Collabix Control</span>
        </div>
        <div className="header-actions">
          <span>{user?.email}</span>
          <button
            className="ghost"
            onClick={() => void api.logout().finally(() => setSession("guest"))}
          >
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </header>
      <main>
        <div className="title-row">
          <div>
            <p className="eyebrow">Platform operations</p>
            <h1>Organizations</h1>
          </div>
          <label className="search">
            <Search size={17} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search organizations"
            />
          </label>
        </div>
        <section className="metrics">
          <Metric
            icon={<Building2 />}
            label="Total organizations"
            value={organizations.length}
          />
          <Metric
            icon={<CheckCircle2 />}
            label="Active subscriptions"
            value={active}
          />
          <Metric icon={<Shield />} label="Pending approval" value={pending} />
        </section>
        {message && <div className="notice">{message}</div>}
        <section className="table-card">
          <table>
            <thead>
              <tr>
                <th>Organization</th>
                <th>Owner</th>
                <th>Subscription</th>
                <th>Trial ends</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((organization) => (
                <tr key={organization.id}>
                  <td>
                    <strong>{organization.name}</strong>
                    <small>{organization.id}</small>
                  </td>
                  <td>
                    {organization.ownerName || "—"}
                    <small>{organization.ownerEmail || "No email"}</small>
                  </td>
                  <td>
                    <span
                      className={`status ${organization.subscriptionStatus}`}
                    >
                      {organization.subscriptionStatus}
                    </span>
                  </td>
                  <td>
                    {new Date(organization.trialEndsAt).toLocaleDateString()}
                  </td>
                  <td className="actions">
                    {organization.isApproved ? (
                      <button
                        disabled={busy === organization.id}
                        onClick={() =>
                          void runAction(
                            organization.id,
                            () => api.revoke(organization.id),
                            `${organization.name} revoked.`,
                          )
                        }
                      >
                        <Ban size={15} /> Revoke
                      </button>
                    ) : (
                      <button
                        disabled={busy === organization.id}
                        onClick={() =>
                          void runAction(
                            organization.id,
                            () => api.approve(organization.id),
                            `${organization.name} approved.`,
                          )
                        }
                      >
                        <CheckCircle2 size={15} /> Approve
                      </button>
                    )}
                    <button
                      className="danger"
                      disabled={busy === organization.id}
                      onClick={() => {
                        if (
                          window.confirm(
                            `Permanently delete ${organization.name}?`,
                          )
                        ) {
                          void runAction(
                            organization.id,
                            () => api.remove(organization.id),
                            `${organization.name} deleted.`,
                          );
                        }
                      }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
              {!filtered.length && (
                <tr>
                  <td colSpan={5} className="empty">
                    No matching organizations.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      </main>
    </div>
  );
}

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
        <p className="eyebrow">Restricted portal</p>
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
        <button disabled={submitting}>
          {submitting ? "Signing in…" : "Sign in securely"}
        </button>
      </form>
    </div>
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <article className="metric">
      <div>{icon}</div>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function Centered({
  label,
  action,
}: {
  label: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="centered">
      <Shield size={34} />
      <p>{label}</p>
      {action}
    </div>
  );
}
