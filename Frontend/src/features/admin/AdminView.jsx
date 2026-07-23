import { useEffect, useState } from "react";
import { RoomCard } from "../../components/rooms/RoomCard";
import { useAppContext } from "../../AppContext";
import { motion } from "framer-motion";
import { ShieldCheck, Flag, CheckCircle, XCircle } from "lucide-react";

export function AdminView() {
  const { api, announce } = useAppContext();
  const [activeTab, setActiveTab] = useState("pending");
  const [pendingRooms, setPendingRooms] = useState([]);
  const [reports, setReports] = useState([]);
  const [moderationForm, setModerationForm] = useState({ room_id: "", status: "active", reason: "" });
  const [isLoading, setIsLoading] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      if (activeTab === "pending") {
        const rooms = await api.admin.pendingRooms();
        setPendingRooms(rooms);
      } else if (activeTab === "reports") {
        const rep = await api.admin.reports();
        setReports(rep);
      }
    } catch (error) {
      announce(`Could not load admin data: ${error.message}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const handleSubmitModeration = async (event) => {
    event.preventDefault();
    try {
      await api.admin.updateRoomStatus(moderationForm.room_id, {
        status: moderationForm.status,
        reason: moderationForm.reason || null,
      });
      announce("Room moderation updated.");
      setModerationForm({ room_id: "", status: "active", reason: "" });
      loadData();
    } catch (error) {
      announce(`Moderation update failed: ${error.message}`, "error");
    }
  };

  const handleResolveReport = async (reportId, actionTaken) => {
    try {
      await api.admin.resolveReport(reportId, actionTaken);
      announce(`Report resolved with action: ${actionTaken}`);
      setReports((prev) => prev.filter((r) => r.id !== reportId));
    } catch (err) {
      announce(`Report resolution failed: ${err.message}`, "error");
    }
  };

  return (
    <motion.section 
      className="page-section admin-page"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="page-head" style={{ justifyContent: "space-between" }}>
        <h1><ShieldCheck style={{ display: "inline", verticalAlign: "middle", marginRight: 10 }} /> Admin Moderation Suite</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" className={`tab ${activeTab === "pending" ? "active" : ""}`} onClick={() => setActiveTab("pending")}>
            Pending Reviews
          </button>
          <button type="button" className={`tab ${activeTab === "reports" ? "active" : ""}`} onClick={() => setActiveTab("reports")}>
            Reports Queue
          </button>
        </div>
      </div>

      {activeTab === "pending" && (
        <>
          <div className="card-grid">
            {pendingRooms.length ? (
              pendingRooms.map((room) => (
                <RoomCard
                  key={room.id}
                  room={room}
                  actionLabel="Select for moderation"
                  onSelect={() => setModerationForm((current) => ({ ...current, room_id: room.id }))}
                />
              ))
            ) : (
              <div className="empty-panel">No pending rooms currently returned.</div>
            )}
          </div>

          <form className="moderation-form" onSubmit={handleSubmitModeration}>
            <label className="field">
              <span>Room ID</span>
              <input
                value={moderationForm.room_id}
                onChange={(event) => setModerationForm((current) => ({ ...current, room_id: event.target.value }))}
                required
              />
            </label>
            <label className="field">
              <span>Status Action</span>
              <select
                value={moderationForm.status}
                onChange={(event) => setModerationForm((current) => ({ ...current, status: event.target.value }))}
              >
                <option value="active">Approve Listing</option>
                <option value="inactive">Reject Listing</option>
                <option value="flagged">Flag Listing</option>
              </select>
            </label>
            <label className="field">
              <span>Reason</span>
              <input
                value={moderationForm.reason}
                onChange={(event) => setModerationForm((current) => ({ ...current, reason: event.target.value }))}
              />
            </label>
            <button type="submit" className="primary-button fit-button">
              Update status
            </button>
          </form>
        </>
      )}

      {activeTab === "reports" && (
        <div style={{ display: "grid", gap: 16 }}>
          {reports.length === 0 ? (
            <div className="empty-panel">No reports currently pending review.</div>
          ) : (
            reports.map((rep) => (
              <div key={rep.id} className="inbox-panel" style={{ padding: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Flag size={18} color="var(--danger)" />
                    <strong>Room ID: {rep.room_id}</strong>
                  </div>
                  <p style={{ margin: "6px 0 0" }}>Reason: {rep.reason}</p>
                  <span className="mono-meta">Status: {rep.status.toUpperCase()}</span>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button type="button" className="ghost-button small-btn" onClick={() => handleResolveReport(rep.id, "dismissed")}>
                    Dismiss
                  </button>
                  <button type="button" className="ghost-button danger-text small-btn" onClick={() => handleResolveReport(rep.id, "room_flagged")}>
                    Flag Room
                  </button>
                  <button type="button" className="primary-button small-btn danger-text" onClick={() => handleResolveReport(rep.id, "room_removed")}>
                    Remove Room
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </motion.section>
  );
}
