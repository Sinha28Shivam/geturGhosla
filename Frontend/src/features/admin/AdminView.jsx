import { useEffect, useState } from "react";
import { RoomCard } from "../../components/rooms/RoomCard";
import { useAppContext } from "../../AppContext";

export function AdminView() {
  const { api, announce } = useAppContext();
  const [pendingRooms, setPendingRooms] = useState([]);
  const [moderationForm, setModerationForm] = useState({ room_id: "", status: "active", reason: "" });
  const [isLoading, setIsLoading] = useState(false);

  const loadPendingRooms = async () => {
    setIsLoading(true);
    try {
      const rooms = await api.admin.pendingRooms();
      setPendingRooms(rooms);
    } catch (error) {
      announce(`Could not load moderation queue: ${error.message}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPendingRooms();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmitModeration = async (event) => {
    event.preventDefault();
    try {
      await api.admin.updateRoomStatus(moderationForm.room_id, {
        status: moderationForm.status,
        reason: moderationForm.reason || null,
      });
      announce("Room moderation updated.");
      setModerationForm({ room_id: "", status: "active", reason: "" });
      loadPendingRooms();
    } catch (error) {
      announce(`Moderation update failed: ${error.message}`, "error");
    }
  };

  return (
    <section className="page-section admin-page">
      <div className="page-head">
        <h1>Pending reviews</h1>
        <button type="button" className="ghost-button" onClick={loadPendingRooms} disabled={isLoading}>
          {isLoading ? "Loading..." : "Refresh queue"}
        </button>
      </div>

      <div className="card-grid">
        {pendingRooms.length ? (
          pendingRooms.map((room) => (
            <RoomCard
              key={room.id}
              room={room}
              actionLabel="Use in moderation"
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
          <span>Status</span>
          <select
            value={moderationForm.status}
            onChange={(event) => setModerationForm((current) => ({ ...current, status: event.target.value }))}
          >
            <option value="active">Approve</option>
            <option value="inactive">Reject</option>
            <option value="flagged">Flag</option>
            <option value="pending_review">Return to pending</option>
            <option value="rented">Mark rented</option>
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
          Update room status
        </button>
      </form>
    </section>
  );
}
