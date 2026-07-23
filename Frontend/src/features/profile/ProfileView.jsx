import { useState, useEffect, useRef } from "react";
import { formatDate } from "../../utils/format";
import { useAppContext } from "../../AppContext";
import { Upload, Camera, Trash2 } from "lucide-react";

export function ProfileView() {
  const { currentUser, loadCurrentUser, api, announce } = useAppContext();
  const [profileForm, setProfileForm] = useState({ full_name: "", profile_photo_url: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (currentUser) {
      setProfileForm({
        full_name: currentUser.full_name || "",
        profile_photo_url: currentUser.profile_photo_url || "",
      });
    }
  }, [currentUser]);

  const processFile = (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      announce("Please select an image file.", "error");
      return;
    }
    // Limit to 5MB
    if (file.size > 5 * 1024 * 1024) {
      announce("Image file size should be less than 5MB.", "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      setProfileForm((prev) => ({ ...prev, profile_photo_url: dataUrl }));
      announce("Profile photo loaded!");
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    processFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    processFile(file);
  };

  const handleSaveProfile = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    try {
      await api.users.updateMe({
        full_name: profileForm.full_name || null,
        profile_photo_url: profileForm.profile_photo_url || null,
      });
      await loadCurrentUser("users");
      announce("Profile updated successfully!");
    } catch (error) {
      announce(`Profile update failed: ${error.message}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemovePhoto = () => {
    setProfileForm((prev) => ({ ...prev, profile_photo_url: "" }));
  };

  return (
    <section className="page-section profile-page">
      <div className="page-head">
        <h1>Profile</h1>
      </div>

      <div className="profile-card" style={{ padding: 24, display: "flex", gap: 20, alignItems: "center" }}>
        <div 
          style={{
            width: 80,
            height: 80,
            borderRadius: "50%",
            overflow: "hidden",
            background: "var(--teal-soft)",
            display: "grid",
            placeItems: "center",
            flexShrink: 0
          }}
        >
          {profileForm.profile_photo_url ? (
            <img src={profileForm.profile_photo_url} alt="Profile preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <Camera size={36} color="var(--teal)" />
          )}
        </div>
        <div>
          <h2>{currentUser?.full_name || "Unnamed user"}</h2>
          <p>{currentUser?.email || currentUser?.phone || "No contact info"}</p>
          <p className="mono-meta">Member since {formatDate(currentUser?.created_at)}</p>
        </div>
      </div>

      <form className="profile-form" onSubmit={handleSaveProfile} style={{ display: "grid", gap: 20 }}>
        <label className="field">
          <span>Full name</span>
          <input
            value={profileForm.full_name}
            onChange={(event) => setProfileForm((current) => ({ ...current, full_name: event.target.value }))}
            placeholder="Your full name"
          />
        </label>

        <div className="field">
          <span>Profile Photo</span>
          <input 
            type="file" 
            accept="image/*" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            style={{ display: "none" }} 
          />

          <div 
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${isDragging ? "var(--teal)" : "var(--line)"}`,
              background: isDragging ? "var(--teal-soft)" : "var(--surface)",
              padding: "32px 20px",
              borderRadius: "14px",
              textAlign: "center",
              cursor: "pointer",
              transition: "all 0.2s ease",
              display: "grid",
              gap: 8,
              placeItems: "center"
            }}
          >
            <Upload size={28} color="var(--teal)" />
            <strong>Drag and drop photo here, or click to browse</strong>
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Supports PNG, JPG, WEBP (Max 5MB)</span>
          </div>

          {profileForm.profile_photo_url && (
            <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 12 }}>
              <span className="mono-meta">Photo loaded</span>
              <button type="button" className="ghost-button danger-text small-btn" onClick={handleRemovePhoto}>
                <Trash2 size={14} style={{ marginRight: 4 }} /> Remove photo
              </button>
            </div>
          )}
        </div>

        <button type="submit" className="primary-button fit-button" disabled={isLoading}>
          {isLoading ? "Saving..." : "Save profile"}
        </button>
      </form>
    </section>
  );
}
