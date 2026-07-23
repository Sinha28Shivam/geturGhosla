import { useState, useEffect, useCallback } from "react";
import { RoomCard } from "../../components/rooms/RoomCard";
import { useAppContext } from "../../AppContext";
import { motion } from "framer-motion";
import { MapPin, RefreshCw, Search } from "lucide-react";

const DEFAULT_FILTERS = [
  "Under ₹8k",
  "1BHK",
  "PG",
  "Verified",
];

const FALLBACK_NEARBY = { lat: "26.4499", lng: "80.3319", radius_km: "5", limit: "12" };

export function BrowseView({ onOpenRoom }) {
  const { api, announce } = useAppContext();
  
  const [nearbyForm, setNearbyForm] = useState(FALLBACK_NEARBY);
  const [rooms, setRooms] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [locationName, setLocationName] = useState("Detecting Location...");

  const fetchRoomsForLocation = useCallback(async (formToUse) => {
    setIsLoading(true);
    try {
      const results = await api.rooms.nearby(formToUse);
      setRooms(results);
    } catch (error) {
      setRooms([]);
      announce(`Nearby search failed: ${error.message}`, "error");
    } finally {
      setIsLoading(false);
    }
  }, [api.rooms, announce]);

  const handleGetLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationName("Kanpur, UP");
      fetchRoomsForLocation(FALLBACK_NEARBY);
      return;
    }
    
    setIsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const newForm = {
          ...FALLBACK_NEARBY,
          lat: latitude.toString(),
          lng: longitude.toString(),
        };
        setNearbyForm(newForm);
        
        fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`)
          .then((res) => res.json())
          .then((data) => {
            if (data.city) {
              const state = data.principalSubdivisionCode ? data.principalSubdivisionCode.split("-").pop() : "";
              setLocationName(`${data.city}${state ? `, ${state}` : ""}`);
            } else {
              setLocationName("Your Location");
            }
          })
          .catch(() => setLocationName("Your Location"));

        fetchRoomsForLocation(newForm);
      },
      () => {
        // Geolocation denied or error -> fallback to default Kanpur coordinates gracefully
        setLocationName("Kanpur, UP");
        fetchRoomsForLocation(FALLBACK_NEARBY);
      },
      { timeout: 8000 }
    );
  }, [fetchRoomsForLocation]);

  useEffect(() => {
    // Automatically trigger location detection on mount
    handleGetLocation();
  }, [handleGetLocation]);

  const handleSearch = async (event) => {
    if (event) event.preventDefault();
    fetchRoomsForLocation(nearbyForm);
  };

  return (
    <motion.section 
      className="page-section"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="search-area">
        <p className="location-kicker">📍 NEAR — {locationName.toUpperCase()}</p>
        <h1>Rooms near {locationName}.</h1>

        <form className="search-row" onSubmit={handleSearch}>
          <div className="search-box">
            <MapPin size={18} color="var(--teal)" />
            <input
              type="text"
              value={`${nearbyForm.lat}, ${nearbyForm.lng}`}
              readOnly
              aria-label="Current search coordinates"
            />
          </div>
          {DEFAULT_FILTERS.map((chip) => (
            <button type="button" className="filter-chip" key={chip}>
              {chip}
            </button>
          ))}
          <button type="button" className="ghost-button" onClick={handleGetLocation} disabled={isLoading} title="Re-detect location">
            <RefreshCw size={16} className={isLoading ? "spin" : ""} style={{ marginRight: 6, display: "inline-block", verticalAlign: "middle" }} />
            Detect Again
          </button>
          <button type="submit" className="primary-button" disabled={isLoading}>
            {isLoading ? "Searching..." : "Refresh"}
          </button>
        </form>

        <div className="search-controls">
          <label className="field">
            <span>Latitude</span>
            <input
              type="number"
              step="any"
              value={nearbyForm.lat}
              onChange={(event) => setNearbyForm((current) => ({ ...current, lat: event.target.value }))}
            />
          </label>
          <label className="field">
            <span>Longitude</span>
            <input
              type="number"
              step="any"
              value={nearbyForm.lng}
              onChange={(event) => setNearbyForm((current) => ({ ...current, lng: event.target.value }))}
            />
          </label>
          <label className="field">
            <span>Radius (km)</span>
            <input
              type="number"
              min="1"
              max="25"
              value={nearbyForm.radius_km}
              onChange={(event) =>
                setNearbyForm((current) => ({ ...current, radius_km: event.target.value }))
              }
            />
          </label>
          <label className="field">
            <span>Limit</span>
            <input
              type="number"
              min="1"
              max="50"
              value={nearbyForm.limit}
              onChange={(event) => setNearbyForm((current) => ({ ...current, limit: event.target.value }))}
            />
          </label>
        </div>
      </div>

      <div className="card-grid">
        {rooms.length ? (
          rooms.map((room) => <RoomCard key={room.id} room={room} onSelect={() => onOpenRoom(room.id)} />)
        ) : (
          <div className="empty-panel">{isLoading ? "Searching rooms near your location..." : "No active rooms returned for this area."}</div>
        )}
      </div>
    </motion.section>
  );
}
