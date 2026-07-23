import { motion, AnimatePresence } from "framer-motion";
import { X, SlidersHorizontal, Check } from "lucide-react";

const AMENITIES = ["WiFi", "Air Conditioning", "Food Included", "Parking", "Attached Washroom", "Power Backup"];
const ROOM_TYPES = [
  { id: "single", label: "Single Room" },
  { id: "shared", label: "Shared Room" },
  { id: "1bhk", label: "1 BHK" },
  { id: "2bhk", label: "2 BHK" },
  { id: "pg", label: "PG / Hostel" },
];

export function FilterDrawer({
  isOpen,
  onClose,
  maxRent,
  setMaxRent,
  selectedTypes,
  setSelectedTypes,
  selectedAmenities,
  setSelectedAmenities,
  onApply,
}) {
  if (!isOpen) return null;

  const toggleType = (id) => {
    setSelectedTypes((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };

  const toggleAmenity = (name) => {
    setSelectedAmenities((prev) =>
      prev.includes(name) ? prev.filter((a) => a !== name) : [...prev, name]
    );
  };

  return (
    <AnimatePresence>
      <div className="overlay-backdrop" onClick={onClose}>
        <motion.div
          className="filter-drawer"
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2><SlidersHorizontal size={20} style={{ verticalAlign: "middle", marginRight: 8 }} /> Filter Rooms</h2>
            <button type="button" className="ghost-button" onClick={onClose} style={{ borderRadius: "50%", padding: 6 }}>
              <X size={18} />
            </button>
          </div>

          <div style={{ display: "grid", gap: 20, flex: 1 }}>
            {/* Price Slider */}
            <div className="field">
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Max Monthly Rent</span>
                <strong>₹{maxRent}</strong>
              </div>
              <input
                type="range"
                min="2000"
                max="30000"
                step="500"
                value={maxRent}
                onChange={(e) => setMaxRent(e.target.value)}
                style={{ width: "100%", accentColor: "var(--teal)" }}
              />
            </div>

            {/* Room Types Checkboxes */}
            <div className="field">
              <span>Room & Property Type</span>
              <div style={{ display: "grid", gap: 10, marginTop: 6 }}>
                {ROOM_TYPES.map((type) => (
                  <label key={type.id} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={selectedTypes.includes(type.id)}
                      onChange={() => toggleType(type.id)}
                      style={{ width: 18, height: 18, accentColor: "var(--teal)" }}
                    />
                    <span>{type.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Amenities Checkboxes */}
            <div className="field">
              <span>Amenities & Features</span>
              <div style={{ display: "grid", gap: 10, marginTop: 6 }}>
                {AMENITIES.map((amenity) => (
                  <label key={amenity} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={selectedAmenities.includes(amenity)}
                      onChange={() => toggleAmenity(amenity)}
                      style={{ width: 18, height: 18, accentColor: "var(--teal)" }}
                    />
                    <span>{amenity}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <button
            type="button"
            className="primary-button"
            onClick={() => {
              onApply();
              onClose();
            }}
          >
            Apply Filters
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
