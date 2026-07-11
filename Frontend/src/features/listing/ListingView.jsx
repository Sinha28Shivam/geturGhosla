import { useState, useEffect } from "react";
import { useAppContext } from "../../AppContext";

const ROOM_TYPE_OPTIONS = [
  ["single", "Single"],
  ["shared", "Shared"],
  ["1rk", "1RK"],
  ["1bhk", "1BHK"],
  ["2bhk", "2BHK"],
  ["3bhk_plus", "3BHK+"],
  ["pg", "PG"],
];

const DEFAULT_ROOM_FORM = {
  title: "",
  description: "",
  room_type: "single",
  monthly_rent: "",
  security_deposit: "0",
  address_line: "",
  locality: "",
  city: "",
  state: "",
  pincode: "",
  lat: "",
  lng: "",
};

export function ListingView() {
  const { api, announce } = useAppContext();

  const [roomForm, setRoomForm] = useState(DEFAULT_ROOM_FORM);
  const [manageRoomId, setManageRoomId] = useState("");
  const [imageForm, setImageForm] = useState({ room_id: "", is_primary: "false" });
  const [imageResult, setImageResult] = useState(null);
  const [managedImages, setManagedImages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("create"); // 'create' | 'manage'
  const [myRooms, setMyRooms] = useState([]);

  useEffect(() => {
    if (activeTab === "manage") {
      loadMyRooms();
    }
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadMyRooms = async () => {
    setIsLoading(true);
    try {
      const rooms = await api.rooms.myRooms();
      setMyRooms(rooms);
    } catch (err) {
      announce(`Failed to load your rooms: ${err.message}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGeocodeAddress = async () => {
    const { address_line, locality, city, state, pincode } = roomForm;
    
    // Try multiple levels of specificity
    const queriesToTry = [
      [address_line, locality, city, state, pincode].filter(Boolean).join(", "),
      [locality, city, state, pincode].filter(Boolean).join(", "),
      [city, state, pincode].filter(Boolean).join(", "),
      [pincode, city, state].filter(Boolean).join(", ")
    ].filter(q => q.length > 0);
    
    if (queriesToTry.length === 0) {
      announce("Please enter at least a city or pincode to generate coordinates.", "error");
      return;
    }

    setIsLoading(true);
    let found = false;

    for (const query of queriesToTry) {
      if (found) break;
      try {
        const q = encodeURIComponent(query);
        const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`);
        const data = await response.json();

        if (data && data.length > 0) {
          setRoomForm((current) => ({
            ...current,
            lat: data[0].lat,
            lng: data[0].lon,
          }));
          announce("Coordinates generated successfully!");
          found = true;
        }
      } catch (error) {
        console.error("Geocoding step failed", error);
      }
    }

    setIsLoading(false);
    if (!found) {
      announce("Could not find coordinates for this address. Please try standardizing the city or pincode.", "error");
    }
  };

  const handleCreateRoom = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    try {
      const payload = {
        ...roomForm,
        monthly_rent: Number(roomForm.monthly_rent),
        security_deposit: Number(roomForm.security_deposit || 0),
        lat: Number(roomForm.lat),
        lng: Number(roomForm.lng),
      };
      const room = await api.rooms.create(payload);
      setImageForm((current) => ({ ...current, room_id: room.id }));
      setManageRoomId(room.id);
      setRoomForm(DEFAULT_ROOM_FORM);
      setManagedImages([]);
      setActiveTab("manage");
      announce(`Room created successfully! Now you can upload photos.`);
    } catch (error) {
      announce(`Room creation failed: ${error.message}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateRoom = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    try {
      const payload = {
        ...roomForm,
        monthly_rent: roomForm.monthly_rent ? Number(roomForm.monthly_rent) : undefined,
        security_deposit: roomForm.security_deposit ? Number(roomForm.security_deposit) : undefined,
        lat: roomForm.lat ? Number(roomForm.lat) : undefined,
        lng: roomForm.lng ? Number(roomForm.lng) : undefined,
      };
      Object.keys(payload).forEach((key) => payload[key] === "" && delete payload[key]);
      const room = await api.rooms.update(manageRoomId, payload);
      announce(`Room updated successfully!`);
    } catch (error) {
      announce(`Room update failed: ${error.message}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadRoomIntoForm = async () => {
    if (!manageRoomId) {
      announce("Please enter a Room ID to load.", "error");
      return;
    }
    setIsLoading(true);
    try {
      const room = await api.rooms.detail(manageRoomId);
      setRoomForm({
        title: room.title || "",
        description: room.description || "",
        room_type: room.room_type || "single",
        monthly_rent: room.monthly_rent?.toString?.() || "",
        security_deposit: room.security_deposit?.toString?.() || "0",
        address_line: room.address_line || "",
        locality: room.locality || "",
        city: room.city || "",
        state: room.state || "",
        pincode: room.pincode || "",
        lat: room.lat?.toString?.() || "",
        lng: room.lng?.toString?.() || "",
      });
      setImageForm((current) => ({ ...current, room_id: manageRoomId }));
      await loadManagedImages(manageRoomId);
      announce("Room loaded into the form.");
    } catch (error) {
      announce(`Could not load room: ${error.message}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteRoom = async () => {
    if (!manageRoomId) return;
    setIsLoading(true);
    try {
      await api.rooms.remove(manageRoomId);
      setRoomForm(DEFAULT_ROOM_FORM);
      setManageRoomId("");
      setImageForm({ room_id: "", is_primary: "false" });
      setManagedImages([]);
      announce("Room deleted successfully.");
    } catch (error) {
      announce(`Room delete failed: ${error.message}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmImage = async (event) => {
    event.preventDefault();
    if (!imageForm.room_id) {
      announce("Please provide a Room ID for the image.", "error");
      return;
    }
    setIsLoading(true);
    try {
      const uploadMeta = await api.rooms.requestImageUpload(imageForm.room_id);
      const image = await api.rooms.confirmImage(
        imageForm.room_id,
        uploadMeta.file_url,
        imageForm.is_primary
      );
      setImageResult(image);
      await loadManagedImages(imageForm.room_id);
      announce("Photo successfully added.");
    } catch (error) {
      announce(`Photo upload failed: ${error.message}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const loadManagedImages = async (roomId) => {
    const images = await api.rooms.listImages(roomId);
    setManagedImages(images);
    return images;
  };

  const handleDeleteImage = async (imageId) => {
    try {
      await api.rooms.deleteImage(imageForm.room_id || manageRoomId, imageId);
      await loadManagedImages(imageForm.room_id || manageRoomId);
      announce("Image deleted.");
    } catch (error) {
      announce(`Image delete failed: ${error.message}`, "error");
    }
  };

  const handleSetPrimaryImage = async (imageId) => {
    try {
      await api.rooms.setPrimaryImage(imageForm.room_id || manageRoomId, imageId);
      await loadManagedImages(imageForm.room_id || manageRoomId);
      announce("Primary image updated.");
    } catch (error) {
      announce(`Set primary failed: ${error.message}`, "error");
    }
  };

  const handleReorderImages = async (imageIds) => {
    try {
      await api.rooms.reorderImages(imageForm.room_id || manageRoomId, imageIds);
      await loadManagedImages(imageForm.room_id || manageRoomId);
      announce("Image order updated.");
    } catch (error) {
      announce(`Image reorder failed: ${error.message}`, "error");
    }
  };

  return (
    <section className="page-section listing-page">
      <div className="listing-header">
        <h1>List your room.</h1>
        <div className="tab-row">
          <button
            type="button"
            className={activeTab === "create" ? "tab-button active" : "tab-button"}
            onClick={() => setActiveTab("create")}
          >
            Create New Listing
          </button>
          <button
            type="button"
            className={activeTab === "manage" ? "tab-button active" : "tab-button"}
            onClick={() => setActiveTab("manage")}
          >
            Manage Existing
          </button>
        </div>
      </div>

      <div className="listing-wrapper">
        {activeTab === "manage" && (
          <div className="auth-card full-width-card">
            <div className="card-header">
              <h2>Load Listing</h2>
              <p className="mono-meta">Enter your Room ID to edit details and manage photos.</p>
            </div>
            <div className="management-actions">
              <label className="field" style={{ flex: 1 }}>
                <span>Select a Room to Manage</span>
                <select 
                  value={manageRoomId} 
                  onChange={(event) => setManageRoomId(event.target.value)} 
                >
                  <option value="">-- Choose a Room --</option>
                  {myRooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.title} ({r.city}) - {r.status}
                    </option>
                  ))}
                </select>
              </label>
              <div className="button-group">
                <button type="button" className="ghost-button" onClick={handleLoadRoomIntoForm} disabled={isLoading || !manageRoomId}>
                  Load Room
                </button>
                <button type="button" className="ghost-button danger" onClick={handleDeleteRoom} disabled={isLoading || !manageRoomId}>
                  Delete Room
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="auth-card full-width-card">
          <div className="card-header">
            <h2>Step 1: Room Details</h2>
            <p className="mono-meta">{activeTab === "manage" ? "Update your room information below." : "Fill out the details of your room to generate a listing ID."}</p>
          </div>
          <form className="listing-form" onSubmit={activeTab === "create" ? handleCreateRoom : handleUpdateRoom}>
            <label className="field full-span">
              <span>Title</span>
              <input
                value={roomForm.title}
                onChange={(event) => setRoomForm((current) => ({ ...current, title: event.target.value }))}
                required
                placeholder="e.g. Spacious 2BHK near University"
              />
            </label>
            <label className="field full-span">
              <span>Description</span>
              <textarea
                rows="4"
                value={roomForm.description}
                onChange={(event) => setRoomForm((current) => ({ ...current, description: event.target.value }))}
                placeholder="Describe the amenities, rules, and vibe of the place."
              />
            </label>
            <label className="field">
              <span>Room type</span>
              <select
                value={roomForm.room_type}
                onChange={(event) => setRoomForm((current) => ({ ...current, room_type: event.target.value }))}
              >
                {ROOM_TYPE_OPTIONS.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Monthly rent</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={roomForm.monthly_rent}
                onChange={(event) =>
                  setRoomForm((current) => ({ ...current, monthly_rent: event.target.value }))
                }
                required
                placeholder="₹"
              />
            </label>
            <label className="field">
              <span>Security Deposit</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={roomForm.security_deposit}
                onChange={(event) =>
                  setRoomForm((current) => ({ ...current, security_deposit: event.target.value }))
                }
                placeholder="₹"
              />
            </label>
            <label className="field full-span">
              <span>Address Line</span>
              <input
                value={roomForm.address_line}
                onChange={(event) => setRoomForm((current) => ({ ...current, address_line: event.target.value }))}
                required
                placeholder="House No., Street Name"
              />
            </label>
            <label className="field">
              <span>Locality</span>
              <input
                value={roomForm.locality}
                onChange={(event) => setRoomForm((current) => ({ ...current, locality: event.target.value }))}
                placeholder="e.g. Kakadeo"
              />
            </label>
            <label className="field">
              <span>City</span>
              <input
                value={roomForm.city}
                onChange={(event) => setRoomForm((current) => ({ ...current, city: event.target.value }))}
                required
              />
            </label>
            <label className="field">
              <span>State</span>
              <input
                value={roomForm.state}
                onChange={(event) => setRoomForm((current) => ({ ...current, state: event.target.value }))}
              />
            </label>
            <label className="field">
              <span>Pincode</span>
              <input
                value={roomForm.pincode}
                onChange={(event) => setRoomForm((current) => ({ ...current, pincode: event.target.value }))}
              />
            </label>
            <div className="full-span" style={{ display: "flex", alignItems: "flex-end", gap: "16px", marginTop: "8px" }}>
              <div style={{ flex: 1, display: "flex", gap: "16px" }}>
                <label className="field" style={{ flex: 1 }}>
                  <span>Latitude</span>
                  <input
                    type="number"
                    step="any"
                    value={roomForm.lat}
                    onChange={(event) => setRoomForm((current) => ({ ...current, lat: event.target.value }))}
                    required
                  />
                </label>
                <label className="field" style={{ flex: 1 }}>
                  <span>Longitude</span>
                  <input
                    type="number"
                    step="any"
                    value={roomForm.lng}
                    onChange={(event) => setRoomForm((current) => ({ ...current, lng: event.target.value }))}
                    required
                  />
                </label>
              </div>
              <button 
                type="button" 
                className="ghost-button" 
                onClick={handleGeocodeAddress}
                disabled={isLoading}
                style={{ height: "42px" }}
              >
                📍 Auto-fill from address
              </button>
            </div>
            
            <div className="full-span" style={{ marginTop: "16px" }}>
              <button type="submit" className="primary-button fit-button" disabled={isLoading}>
                {isLoading ? "Saving..." : (activeTab === "create" ? "Create Listing" : "Update Listing")}
              </button>
            </div>
          </form>
        </div>

        {imageForm.room_id && (
          <div className="auth-card full-width-card upload-section">
            <div className="card-header">
              <h2>Step 2: Upload Photos</h2>
              <p className="mono-meta">Add photos to showcase your room (Room ID: {imageForm.room_id}).</p>
            </div>
            
            <form className="image-confirm-form" onSubmit={handleConfirmImage}>
              <div className="management-actions">
                <label className="field">
                  <span>Is this the primary image?</span>
                  <select
                    value={imageForm.is_primary}
                    onChange={(event) => setImageForm((current) => ({ ...current, is_primary: event.target.value }))}
                  >
                    <option value="false">No</option>
                    <option value="true">Yes</option>
                  </select>
                </label>
                <button type="submit" className="primary-button fit-button" disabled={isLoading}>
                  {isLoading ? "Uploading..." : "Upload Photo"}
                </button>
              </div>
            </form>

            {!!managedImages.length && (
              <div className="managed-images">
                <h3>Managed Images</h3>
                <div className="image-list">
                  {managedImages.map((image, index) => (
                    <article key={image.id} className="managed-image-row">
                      <div className="managed-image-meta">
                        <strong>{image.is_primary ? "Primary Image" : `Image ${index + 1}`}</strong>
                        <span className="mono-meta">{image.id}</span>
                      </div>
                      <div className="button-group">
                        <button type="button" className="ghost-button small-btn" onClick={() => handleSetPrimaryImage(image.id)}>
                          Make Primary
                        </button>
                        <button type="button" className="ghost-button danger small-btn" onClick={() => handleDeleteImage(image.id)}>
                          Delete
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
                <button
                  type="button"
                  className="ghost-button fit-button"
                  onClick={() => handleReorderImages([...managedImages].map((image) => image.id).reverse())}
                  style={{ marginTop: "12px" }}
                >
                  Reverse Image Order
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
