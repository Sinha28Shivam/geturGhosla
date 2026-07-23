import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from "react-leaflet";
import L from "leaflet";

// Fix default Leaflet marker icon URLs in React bundlers
const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const userLocationIcon = L.divIcon({
  className: "custom-user-pin",
  html: `<div style="background:#0f62fe; width:18px; height:18px; border-radius:50%; border:3px solid white; box-shadow:0 0 10px rgba(15,98,254,0.6);"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

function MapRecenter({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.setView(center, map.getZoom());
    }
  }, [center, map]);
  return null;
}

export function InteractiveRoomMap({
  userLat,
  userLng,
  radiusKm = 5,
  rooms = [],
  onSelectRoom,
}) {
  const centerPosition = useMemo(() => {
    const lat = parseFloat(userLat) || 26.4499;
    const lng = parseFloat(userLng) || 80.3319;
    return [lat, lng];
  }, [userLat, userLng]);

  return (
    <div style={{ width: "100%", height: "420px", borderRadius: "16px", overflow: "hidden", border: "1px solid var(--line)", boxShadow: "var(--shadow)" }}>
      <MapContainer
        center={centerPosition}
        zoom={13}
        scrollWheelZoom={false}
        style={{ width: "100%", height: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapRecenter center={centerPosition} />

        {/* User GPS Center Marker & Radius Circle */}
        <Marker position={centerPosition} icon={userLocationIcon}>
          <Popup>📍 Your Search Center Location</Popup>
        </Marker>
        <Circle
          center={centerPosition}
          radius={(parseFloat(radiusKm) || 5) * 1000}
          pathOptions={{ color: "var(--teal)", fillColor: "var(--teal)", fillOpacity: 0.1, weight: 1.5 }}
        />

        {/* Room Listing Markers */}
        {rooms.map((room) => {
          if (!room.lat || !room.lng) return null;
          const roomPos = [parseFloat(room.lat), parseFloat(room.lng)];
          return (
            <Marker key={room.id} position={roomPos} icon={defaultIcon}>
              <Popup>
                <div style={{ padding: 4, display: "grid", gap: 6, minWidth: 160 }}>
                  <strong style={{ fontSize: "0.95rem" }}>{room.title}</strong>
                  <span style={{ color: "var(--teal)", fontWeight: 700 }}>₹{room.monthly_rent}/month</span>
                  <span style={{ fontSize: "0.8rem", color: "#666" }}>
                    {room.distance_km ? `${Number(room.distance_km).toFixed(1)} km away` : room.locality || room.city}
                  </span>
                  <button
                    type="button"
                    style={{
                      background: "var(--teal)",
                      color: "#fff",
                      border: "none",
                      padding: "4px 8px",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "0.75rem",
                      fontWeight: 600
                    }}
                    onClick={() => onSelectRoom(room.id)}
                  >
                    View Listing
                  </button>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
