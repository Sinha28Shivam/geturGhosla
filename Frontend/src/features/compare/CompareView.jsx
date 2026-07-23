import { useState, useEffect } from "react";
import { useAppContext } from "../../AppContext";
import { RoomCard } from "../../components/rooms/RoomCard";
import { motion, AnimatePresence } from "framer-motion";
import { Layers, Trash2, MapPin } from "lucide-react";

export function CompareView({ onOpenRoom }) {
  const { api, announce } = useAppContext();
  const [rooms, setRooms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadCompareList = async () => {
    setIsLoading(true);
    try {
      const data = await api.compare.get();
      setRooms(data);
    } catch (err) {
      announce(`Failed to load compare set: ${err.message}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCompareList();
  }, []);

  const handleRemove = async (roomId) => {
    try {
      await api.compare.remove(roomId);
      setRooms((prev) => prev.filter((r) => r.id !== roomId));
      announce("Removed room from compare set");
    } catch (err) {
      announce(`Failed to remove: ${err.message}`, "error");
    }
  };

  const handleClear = async () => {
    try {
      await api.compare.clear();
      setRooms([]);
      announce("Cleared compare set");
    } catch (err) {
      announce(`Failed to clear: ${err.message}`, "error");
    }
  };

  return (
    <motion.section 
      className="page-section"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="section-copy" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1><Layers style={{ display: "inline", verticalAlign: "middle", marginRight: 10 }} /> Room Compare Matrix</h1>
          <p>Compare up to 4 rooms side-by-side (Price, Location, Type, Views).</p>
        </div>
        {rooms.length > 0 && (
          <button type="button" className="ghost-button danger-text" onClick={handleClear}>
            <Trash2 size={16} style={{ marginRight: 6, display: "inline", verticalAlign: "middle" }} /> Clear All
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="empty-panel">Loading compare set...</div>
      ) : rooms.length === 0 ? (
        <div className="empty-panel">Your compare set is empty. Add rooms from the browse page!</div>
      ) : (
        <div style={{ overflowX: "auto", paddingBottom: 16 }}>
          <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 16, textAlign: "left" }}>
            <thead>
              <tr>
                <th style={{ minWidth: 150 }}>Feature</th>
                {rooms.map((room) => (
                  <th key={room.id} style={{ minWidth: 260 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <strong style={{ fontSize: "1.1rem" }}>{room.title}</strong>
                      <button type="button" className="ghost-button small-btn" onClick={() => handleRemove(room.id)}>✕</button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Rent / Month</strong></td>
                {rooms.map((r) => (
                  <td key={r.id}><span className="price-stamp">₹{r.monthly_rent}</span></td>
                ))}
              </tr>
              <tr>
                <td><strong>Room Type</strong></td>
                {rooms.map((r) => (
                  <td key={r.id}><span className="availability-pill">{r.room_type.toUpperCase()}</span></td>
                ))}
              </tr>
              <tr>
                <td><strong>Location</strong></td>
                {rooms.map((r) => (
                  <td key={r.id}>{r.locality || r.city}, {r.city}</td>
                ))}
              </tr>
              <tr>
                <td><strong>Views Count</strong></td>
                {rooms.map((r) => (
                  <td key={r.id}>👁 {r.view_count || 0} views</td>
                ))}
              </tr>
              <tr>
                <td><strong>Action</strong></td>
                {rooms.map((r) => (
                  <td key={r.id}>
                    <button type="button" className="primary-button small-btn" onClick={() => onOpenRoom(r.id)}>
                      View Details
                    </button>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </motion.section>
  );
}
