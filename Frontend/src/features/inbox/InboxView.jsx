import { useEffect, useState } from "react";
import { formatDate } from "../../utils/format";
import { useAppContext } from "../../AppContext";
import { motion } from "framer-motion";
import { Heart, CheckCircle2, MessageCircle, AlertCircle, RefreshCw } from "lucide-react";

function InterestRows({ items, title, isReceived, onUpdateStatus }) {
  return (
    <section className="inbox-panel">
      <div className="panel-top" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h2>{title} ({items.length})</h2>
      </div>
      {items.length ? (
        items.map((item) => (
          <article key={item.id} className="interest-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16, flex: 1, minWidth: 260 }}>
              {item.seeker?.profile_photo_url ? (
                <img src={item.seeker.profile_photo_url} alt="Seeker profile" style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover" }} />
              ) : (
                <div className="interest-avatar" aria-hidden="true" style={{ width: 44, height: 44, borderRadius: "50%", background: "var(--teal-soft)", display: "grid", placeItems: "center" }}>
                  <Heart size={20} color="var(--teal)" />
                </div>
              )}
              <div className="interest-main">
                <strong style={{ fontSize: "1.05rem" }}>{item.seeker?.full_name || "Seeker"}</strong>
                <span className="mono-meta" style={{ display: "block" }}>Room: {item.room?.title || item.room_id}</span>
                <p style={{ margin: "4px 0 0" }}>{item.message || "No message"}</p>
                <time className="mono-meta" style={{ fontSize: "0.75rem" }}>Received {formatDate(item.created_at)}</time>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8 }}>
              <span className={`status-tag status-${item.status}`}>{item.status.toUpperCase()}</span>

              {isReceived && (
                <div style={{ display: "flex", gap: 6 }}>
                  {item.status !== "contacted" && (
                    <button
                      type="button"
                      className="ghost-button small-btn"
                      onClick={() => onUpdateStatus(item.id, "contacted")}
                      title="Mark Contacted"
                    >
                      <MessageCircle size={14} style={{ marginRight: 4 }} /> Contacted
                    </button>
                  )}
                  {item.status !== "closed" && (
                    <button
                      type="button"
                      className="ghost-button small-btn"
                      onClick={() => onUpdateStatus(item.id, "closed")}
                      title="Mark Closed"
                    >
                      <CheckCircle2 size={14} style={{ marginRight: 4 }} /> Close
                    </button>
                  )}
                  {item.status !== "spam" && (
                    <button
                      type="button"
                      className="ghost-button danger-text small-btn"
                      onClick={() => onUpdateStatus(item.id, "spam")}
                      title="Mark Spam"
                    >
                      <AlertCircle size={14} />
                    </button>
                  )}
                </div>
              )}
            </div>
          </article>
        ))
      ) : (
        <div className="empty-panel">No interests yet.</div>
      )}
    </section>
  );
}

export function InboxView() {
  const { api, announce } = useAppContext();
  
  const [sentInterests, setSentInterests] = useState([]);
  const [receivedInterests, setReceivedInterests] = useState([]);
  const [inboxTab, setInboxTab] = useState("received");
  const [isLoading, setIsLoading] = useState(false);

  const loadSent = async () => {
    setIsLoading(true);
    try {
      const items = await api.interests.sent();
      setSentInterests(items);
    } catch (error) {
      announce(`Could not load sent interests: ${error.message}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const loadReceived = async () => {
    setIsLoading(true);
    try {
      const items = await api.interests.received();
      setReceivedInterests(items);
    } catch (error) {
      announce(`Could not load received interests: ${error.message}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (inboxTab === "received") {
      loadReceived();
    } else {
      loadSent();
    }
  }, [inboxTab]);

  const handleUpdateStatusDirect = async (interestId, newStatus) => {
    try {
      await api.interests.updateStatus(interestId, newStatus);
      announce(`Interest updated to ${newStatus}.`);
      if (inboxTab === "received") loadReceived();
      else loadSent();
    } catch (error) {
      announce(`Status update failed: ${error.message}`, "error");
    }
  };

  const activeItems = inboxTab === "received" ? receivedInterests : sentInterests;

  return (
    <motion.section 
      className="page-section inbox-page"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="page-head">
        <h1>Your Interests & Inquiries</h1>
        <div className="button-row">
          <button type="button" className="ghost-button" onClick={inboxTab === "received" ? loadReceived : loadSent} disabled={isLoading}>
            <RefreshCw size={14} className={isLoading ? "spin" : ""} style={{ marginRight: 6 }} />
            {isLoading ? "Loading..." : "Refresh"}
          </button>
        </div>
      </div>
      <div className="tabs-bar">
        <button
          type="button"
          className={`tab ${inboxTab === "received" ? "active" : ""}`}
          onClick={() => setInboxTab("received")}
        >
          Received Inquiries
        </button>
        <button
          type="button"
          className={`tab ${inboxTab === "sent" ? "active" : ""}`}
          onClick={() => setInboxTab("sent")}
        >
          Sent Interests
        </button>
      </div>
      <InterestRows 
        items={activeItems} 
        title={inboxTab === "received" ? "Received Inquiries" : "Sent Interests"} 
        isReceived={inboxTab === "received"}
        onUpdateStatus={handleUpdateStatusDirect}
      />
    </motion.section>
  );
}
