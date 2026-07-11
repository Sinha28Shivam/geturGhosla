import { useState, useEffect } from "react";
import { formatDate } from "../../utils/format";
import { useAppContext } from "../../AppContext";

export function ProfileView() {
  const { currentUser, loadCurrentUser, api, announce } = useAppContext();
  const [profileForm, setProfileForm] = useState({ full_name: "", profile_photo_url: "" });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (currentUser) {
      setProfileForm({
        full_name: currentUser.full_name || "",
        profile_photo_url: currentUser.profile_photo_url || "",
      });
    }
  }, [currentUser]);

  const handleSaveProfile = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    try {
      await api.users.updateMe({
        full_name: profileForm.full_name || null,
        profile_photo_url: profileForm.profile_photo_url || null,
      });
      await loadCurrentUser("users");
      announce("Profile updated.");
    } catch (error) {
      announce(`Profile update failed: ${error.message}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadAuthMe = async () => {
    try {
      await loadCurrentUser("auth");
      announce("Loaded /auth/me.");
    } catch (error) {
      announce(`Could not load /auth/me: ${error.message}`, "error");
    }
  };

  const handleLoadUserMe = async () => {
    try {
      await loadCurrentUser("users");
      announce("Loaded /users/me.");
    } catch (error) {
      announce(`Could not load /users/me: ${error.message}`, "error");
    }
  };

  return (
    <section className="page-section profile-page">
      <div className="page-head">
        <h1>Profile</h1>
        <div className="button-row">
          <button type="button" className="ghost-button" onClick={handleLoadAuthMe}>
            Refresh from Auth
          </button>
          <button type="button" className="ghost-button" onClick={handleLoadUserMe}>
            Refresh from Users
          </button>
        </div>
      </div>

      <div className="profile-card">
        <div className="profile-avatar" aria-hidden="true" />
        <div>
          <h2>{currentUser?.full_name || "Unnamed user"}</h2>
          <p>{currentUser?.email || "No email loaded"}</p>
          <p className="mono-meta">Created {formatDate(currentUser?.created_at)}</p>
        </div>
      </div>

      <form className="profile-form" onSubmit={handleSaveProfile}>
        <label className="field">
          <span>Full name</span>
          <input
            value={profileForm.full_name}
            onChange={(event) => setProfileForm((current) => ({ ...current, full_name: event.target.value }))}
          />
        </label>
        <label className="field">
          <span>Profile photo URL</span>
          <input
            type="url"
            value={profileForm.profile_photo_url}
            onChange={(event) =>
              setProfileForm((current) => ({ ...current, profile_photo_url: event.target.value }))
            }
          />
        </label>
        <button type="submit" className="primary-button fit-button" disabled={isLoading}>
          {isLoading ? "Saving..." : "Save profile"}
        </button>
      </form>
    </section>
  );
}
