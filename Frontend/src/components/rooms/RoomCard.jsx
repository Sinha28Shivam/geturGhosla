import { compactDistance } from "../../utils/format";
import { PriceStamp } from "../common/PriceStamp";
import { motion } from "framer-motion";
import { Layers, Eye, MapPin } from "lucide-react";
import { useAppContext } from "../../AppContext";

export function RoomCard({ room, onSelect, actionLabel = "View details" }) {
  const { api, announce } = useAppContext();

  const handleAddToCompare = async (e) => {
    e.stopPropagation();
    try {
      await api.compare.add(room.id);
      announce(`Added ${room.title} to compare set!`);
    } catch (err) {
      announce(`Compare error: ${err.message}`, "error");
    }
  };

  return (
    <motion.article 
      className="room-card"
      whileHover={{ y: -6, transition: { duration: 0.2 } }}
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="room-card-media" style={{ overflow: "hidden", position: "relative" }}>
        {room.primary_image_url ? (
          <img 
            src={room.primary_image_url} 
            alt={room.title} 
            style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "16px" }} 
          />
        ) : (
          <div style={{ height: "100%", display: "grid", placeItems: "center", background: "#e2ded4", borderRadius: "16px", color: "#8c8577" }}>
            <MapPin size={32} />
          </div>
        )}
        <button 
          type="button" 
          className="ghost-button" 
          style={{ position: "absolute", top: 12, right: 12, padding: 8, borderRadius: "50%", background: "rgba(255,255,255,0.9)", backdropFilter: "blur(4px)" }}
          title="Add to compare"
          onClick={handleAddToCompare}
        >
          <Layers size={16} color="var(--teal)" />
        </button>
      </div>
      <div className="room-card-body">
        <div className="room-card-head">
          <h3>{room.title}</h3>
          <PriceStamp amount={room.monthly_rent} />
        </div>
        <p className="mono-meta">
          📍 {room.locality || room.city} • {compactDistance(room)}
        </p>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
          <div className="availability-pill">{room.status ? room.status.toUpperCase() : "ACTIVE"}</div>
          <span className="mono-meta"><Eye size={14} style={{ verticalAlign: "middle", marginRight: 4 }} /> {room.view_count || 0}</span>
        </div>
      </div>
      <button type="button" className="ghost-button" onClick={onSelect}>
        {actionLabel}
      </button>
    </motion.article>
  );
}
