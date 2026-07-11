import { useState, useEffect } from "react";
import { RoomCard } from "../../components/rooms/RoomCard";
import { useAppContext } from "../../AppContext";

const DEFAULT_FILTERS = [
  "Under ₹8k",
  "1BHK",
  "PG",
  "Verified",
];

const DEFAULT_NEARBY = { lat: "26.4499", lng: "80.3319", radius_km: "5", limit: "12" };

export function BrowseView({ onOpenRoom }) {
  const { api, announce } = useAppContext();
  
  const [nearbyForm, setNearbyForm] = useState(DEFAULT_NEARBY);
  const [rooms, setRooms] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [locationName, setLocationName] = useState("Kanpur, UP");

  useEffect(() => {
    // Initial fetch
    let isMounted = true;
    api.rooms
      .nearby(DEFAULT_NEARBY)
      .then((results) => {
        if (isMounted) setRooms(results);
      })
      .catch(() => {});
    return () => { isMounted = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = async (event, overrideForm = null) => {
    if (event) event.preventDefault();
    setIsLoading(true);
    const formToUse = overrideForm || nearbyForm;
    try {
      const results = await api.rooms.nearby(formToUse);
      setRooms(results);
      announce(`Loaded ${results.length} rooms.`);
    } catch (error) {
      setRooms([]);
      announce(`Nearby search failed: ${error.message}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      announce("Geolocation is not supported by your browser.", "error");
      return;
    }
    
    setIsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const newForm = {
          ...nearbyForm,
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
              setLocationName("you");
            }
          })
          .catch(() => setLocationName("you"));

        handleSearch(null, newForm);
      },
      (error) => {
        setIsLoading(false);
        announce(`Geolocation failed: ${error.message}`, "error");
      },
      { timeout: 10000 }
    );
  };

  return (
    <section className="page-section">
      <div className="search-area">
        <p className="location-kicker">📍 NEAR — {locationName.toUpperCase()}</p>
        <h1>Rooms near {locationName}.</h1>
        <h2 className="mobile-heading">Rooms near {locationName}.</h2>
        
        <div style={{ marginBottom: "16px" }}>
          <button type="button" className="ghost-button" onClick={handleGetLocation} disabled={isLoading}>
             📍 Use my current location
          </button>
        </div>

        <form className="search-row" onSubmit={handleSearch}>
          <div className="search-box">
            <span aria-hidden="true">⌕</span>
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
          <div className="empty-panel">{isLoading ? "Searching..." : "No active rooms returned yet for this search."}</div>
        )}
      </div>
    </section>
  );
}
