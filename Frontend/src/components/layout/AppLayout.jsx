import { BrandStamp } from "../common/BrandStamp";
import { motion } from "framer-motion";
import { Layers, Bookmark, ShieldCheck, Heart, User, LogOut, Search, PlusCircle } from "lucide-react";

const PRIMARY_NAV = [
  { id: "browse", label: "Browse", icon: Search },
  { id: "compare", label: "Compare Set", icon: Layers },
  { id: "saved-searches", label: "Saved Alerts", icon: Bookmark },
  { id: "listing", label: "List your room", icon: PlusCircle },
  { id: "inbox", label: "Interests", icon: Heart },
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
      <motion.header 
        className="top-nav"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <button className="brand-button" type="button" onClick={() => setActiveView("browse")}>
          <BrandStamp />
        </button>
        <nav className="top-nav-links" aria-label="Primary">
          {PRIMARY_NAV.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                className={`nav-link ${activeView === item.id ? "active" : ""}`}
                onClick={() => setActiveView(item.id)}
              >
                <Icon size={16} style={{ marginRight: 6, display: "inline-block", verticalAlign: "middle" }} />
                {item.label}
              </button>
            );
          })}
        </nav>
        <div className="top-nav-utilities">
          <button
            type="button"
            className={`utility-link ${activeView === "profile" ? "active" : ""}`}
            onClick={() => setActiveView("profile")}
          >
            <User size={16} style={{ marginRight: 6, display: "inline-block", verticalAlign: "middle" }} />
            Profile
          </button>
          <div className="session-chip" aria-live="polite">
            <strong>{currentUser?.full_name || "Signed in"}</strong>
            <span>{currentUser?.email || currentUser?.phone || "Authenticated session"}</span>
          </div>
          <button type="button" className="utility-link" onClick={onLogout}>
            <LogOut size={16} style={{ marginRight: 4, display: "inline-block", verticalAlign: "middle" }} />
            Log out
          </button>
        </div>
      </motion.header>
      <main className="page-stage">{children}</main>
    </div>
  );
}
