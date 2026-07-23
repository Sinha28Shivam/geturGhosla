import { useState, useEffect } from "react";
import { useAppContext } from "../../AppContext";
import { motion } from "framer-motion";
import { Bookmark, Plus, Trash2, Bell } from "lucide-react";

export function SavedSearchesView() {
  const { api, announce } = useAppContext();
  const [searches, setSearches] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form State
  const [city, setCity] = useState("");
  const [roomType, setRoomType] = useState("1bhk");
  const [maxRent, setMaxRent] = useState("");

  const loadSavedSearches = async () => {
    setIsLoading(true);
    try {
      const data = await api.savedSearches.list();
      setSearches(data);
    } catch (err) {
      announce(`Failed to load saved searches: ${err.message}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSavedSearches();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const created = await api.savedSearches.create({
        city: city || null,
        room_type: roomType || null,
        max_rent: maxRent ? parseFloat(maxRent) : null,
      });
      setSearches((prev) => [created, ...prev]);
      setCity("");
      setMaxRent("");
      announce("Saved search alert created!");
    } catch (err) {
      announce(`Failed to save search: ${err.message}`, "error");
    }
  };

  const handleRemove = async (id) => {
    try {
      await api.savedSearches.remove(id);
      setSearches((prev) => prev.filter((s) => s.id !== id));
      announce("Search alert removed.");
    } catch (err) {
      announce(`Failed to delete search: ${err.message}`, "error");
    }
  };

  return (
    <motion.section 
      className="page-section"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="section-copy">
        <h1><Bookmark style={{ display: "inline", verticalAlign: "middle", marginRight: 10 }} /> Saved Search Alerts</h1>
        <p>Save your preferred search criteria to get instant notifications when new matching listings are approved.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 32, alignItems: "start" }}>
        <form className="auth-card" onSubmit={handleCreate}>
          <div className="card-header">
            <h2>New Search Alert</h2>
          </div>
          <label className="field">
            <span>Target City</span>
            <input 
              type="text" 
              placeholder="e.g. Kanpur, Lucknow" 
              value={city} 
              onChange={(e) => setCity(e.target.value)} 
            />
          </label>
          <label className="field">
            <span>Room Type</span>
            <select value={roomType} onChange={(e) => setRoomType(e.target.value)}>
              <option value="single">Single</option>
              <option value="shared">Shared</option>
              <option value="1rk">1RK</option>
              <option value="1bhk">1BHK</option>
              <option value="2bhk">2BHK</option>
              <option value="3bhk_plus">3BHK+</option>
              <option value="pg">PG</option>
            </select>
          </label>
          <label className="field">
            <span>Max Monthly Rent (₹)</span>
            <input 
              type="number" 
              placeholder="e.g. 10000" 
              value={maxRent} 
              onChange={(e) => setMaxRent(e.target.value)} 
            />
          </label>
          <button type="submit" className="primary-button">
            <Plus size={16} style={{ marginRight: 6, display: "inline", verticalAlign: "middle" }} /> Create Alert
          </button>
        </form>

        <div>
          {isLoading ? (
            <div className="empty-panel">Loading saved alerts...</div>
          ) : searches.length === 0 ? (
            <div className="empty-panel">No saved search alerts configured yet.</div>
          ) : (
            <div style={{ display: "grid", gap: 16 }}>
              {searches.map((s) => (
                <div key={s.id} className="inbox-panel" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 20 }}>
                  <div style={{ display: "grid", gap: 4 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Bell size={18} color="var(--mustard)" />
                      <strong style={{ fontSize: "1.1rem" }}>{s.city || "All Cities"} — {s.room_type ? s.room_type.toUpperCase() : "Any Type"}</strong>
                    </div>
                    <span className="mono-meta">Max Rent: {s.max_rent ? `₹${s.max_rent}` : "No Limit"}</span>
                  </div>
                  <button type="button" className="ghost-button danger-text" onClick={() => handleRemove(s.id)}>
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.section>
  );
}
