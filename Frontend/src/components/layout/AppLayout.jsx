import { BrandStamp } from "../common/BrandStamp";

const PRIMARY_NAV = [
  { id: "browse", label: "Browse" },
  { id: "listing", label: "List your room" },
  { id: "inbox", label: "Interests" },
];

const UTILITY_NAV = [
  { id: "profile", label: "Profile" },
  { id: "admin", label: "Admin" },
];

export function AppLayout({
  activeView,
  setActiveView,
  currentUser,
  onLogout,
  children,
}) {
  return (
    <div className="app-shell">
      <header className="top-nav">
        <button className="brand-button" type="button" onClick={() => setActiveView("browse")}>
          <BrandStamp />
        </button>
        <nav className="top-nav-links" aria-label="Primary">
          {PRIMARY_NAV.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`nav-link ${activeView === item.id ? "active" : ""}`}
              onClick={() => setActiveView(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <div className="top-nav-utilities">
          {UTILITY_NAV.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`utility-link ${activeView === item.id ? "active" : ""}`}
              onClick={() => setActiveView(item.id)}
            >
              {item.label}
            </button>
          ))}
          <div className="session-chip" aria-live="polite">
            <strong>{currentUser?.full_name || "Signed in"}</strong>
            <span>{currentUser?.email || "Authenticated session"}</span>
          </div>
          <button type="button" className="utility-link" onClick={onLogout}>
            Log out
          </button>
        </div>
      </header>
      <main className="page-stage">{children}</main>
    </div>
  );
}
