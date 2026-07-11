import { useEffect, useState } from "react";
import { formatDate } from "../../utils/format";
import { useAppContext } from "../../AppContext";

function InterestRows({ items, title }) {
  return (
    <section className="inbox-panel">
      <div className="panel-top">
        <h2>{title}</h2>
      </div>
      {items.length ? (
        items.map((item) => (
          <article key={item.id} className="interest-row">
            <div className="interest-avatar" aria-hidden="true" />
            <div className="interest-main">
              <strong>{item.seeker?.full_name || "Interest"}</strong>
              <span>{item.room?.title || item.room_id}</span>
              <p>{item.message || "No message"}</p>
            </div>
            <span className={`status-tag status-${item.status}`}>{item.status}</span>
            <time>{formatDate(item.created_at)}</time>
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
  const [interestStatusForm, setInterestStatusForm] = useState({ interest_id: "", status: "pending" });
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inboxTab]);

  const handleUpdateStatus = async (event) => {
    event.preventDefault();
    try {
      await api.interests.updateStatus(interestStatusForm.interest_id, interestStatusForm.status);
      announce("Interest status updated.");
      if (inboxTab === "received") loadReceived();
      else loadSent();
    } catch (error) {
      announce(`Interest status update failed: ${error.message}`, "error");
    }
  };

  const activeItems = inboxTab === "received" ? receivedInterests : sentInterests;

  return (
    <section className="page-section inbox-page">
      <div className="page-head">
        <h1>Your interests.</h1>
        <div className="button-row">
          <button type="button" className="ghost-button" onClick={inboxTab === "received" ? loadReceived : loadSent} disabled={isLoading}>
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
          Received
        </button>
        <button
          type="button"
          className={`tab ${inboxTab === "sent" ? "active" : ""}`}
          onClick={() => setInboxTab("sent")}
        >
          Sent
        </button>
      </div>
      <InterestRows items={activeItems} title={inboxTab === "received" ? "Received" : "Sent"} />
      
      {inboxTab === "received" && (
        <form className="status-form" onSubmit={handleUpdateStatus}>
          <label className="field">
            <span>Interest ID</span>
            <input
              value={interestStatusForm.interest_id}
              onChange={(event) =>
                setInterestStatusForm((current) => ({ ...current, interest_id: event.target.value }))
              }
              required
            />
          </label>
          <label className="field">
            <span>Status</span>
            <select
              value={interestStatusForm.status}
              onChange={(event) =>
                setInterestStatusForm((current) => ({ ...current, status: event.target.value }))
              }
            >
              <option value="pending">Pending</option>
              <option value="contacted">Contacted</option>
              <option value="closed">Closed</option>
              <option value="spam">Spam</option>
            </select>
          </label>
          <button type="submit" className="primary-button fit-button">
            Update status
          </button>
        </form>
      )}
    </section>
  );
}
