import { useState, useEffect } from "react";
import { PriceStamp } from "../common/PriceStamp";
import { useAppContext } from "../../AppContext";
import { motion } from "framer-motion";
import { Flag, Star, ShieldCheck, Heart, ArrowLeft, MessageSquare } from "lucide-react";

export function RoomDetailPanel({
  room,
  onBack,
  onInterestSent,
}) {
  const { api, announce, currentUser } = useAppContext();
  const [interestMessage, setInterestMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Phase 2 / Phase 3 state
  const [reportReason, setReportReason] = useState("");
  const [showReportForm, setShowReportForm] = useState(false);

  const [reviews, setReviews] = useState([]);
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState("");

  const isOwner = currentUser && room && String(room.owner_id) === String(currentUser.id);

  useEffect(() => {
    if (room?.id) {
      api.rooms.getReviews(room.id)
        .then(setReviews)
        .catch(() => {});
    }
  }, [room?.id]);

  if (!room) return null;
  const galleryImages = room.images?.length ? room.images : [];
  const heroImage = room.primary_image_url || galleryImages[0]?.image_url;

  const handleSubmitInterest = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    try {
      const result = await api.rooms.expressInterest(room.id, {
        message: interestMessage || null,
      });
      announce(`Interest created: ${result.id}`);
      if (onInterestSent) onInterestSent();
    } catch (error) {
      announce(`Interest failed: ${error.message}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReport = async (e) => {
    e.preventDefault();
    try {
      await api.rooms.report(room.id, { reason: reportReason });
      announce("Report submitted to moderation queue.");
      setShowReportForm(false);
      setReportReason("");
    } catch (err) {
      announce(`Report failed: ${err.message}`, "error");
    }
  };

  const handleToggleAvailability = async () => {
    try {
      const newStatus = room.status === "active" ? "rented" : "active";
      await api.rooms.toggleAvailability(room.id, newStatus);
      announce(`Room status updated to ${newStatus}`);
      room.status = newStatus;
    } catch (err) {
      announce(`Failed to toggle availability: ${err.message}`, "error");
    }
  };

  const handleRenew = async () => {
    try {
      await api.rooms.renew(room.id);
      announce("Room listing renewed!");
    } catch (err) {
      announce(`Renew failed: ${err.message}`, "error");
    }
  };

  const handleAddReview = async (e) => {
    e.preventDefault();
    try {
      const rev = await api.rooms.addReview(room.id, {
        rating: parseInt(newRating),
        comment: newComment || null,
      });
      setReviews((prev) => [rev, ...prev]);
      setNewComment("");
      announce("Review posted!");
    } catch (err) {
      announce(`Review failed: ${err.message}`, "error");
    }
  };

  return (
    <motion.section 
      className="room-detail-page"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="gallery-panel">
        {heroImage ? (
          <img className="gallery-hero gallery-image" src={heroImage} alt={room.title} style={{ objectFit: "cover", width: "100%", borderRadius: 16 }} />
        ) : (
          <div className="gallery-hero" aria-hidden="true" />
        )}
        <div className="gallery-strip">
          {galleryImages.length ? (
            galleryImages.slice(0, 4).map((image) => (
              <img
                key={image.id}
                className="gallery-thumb gallery-image"
                src={image.image_url}
                alt={`${room.title} view`}
                style={{ objectFit: "cover", borderRadius: 8 }}
              />
            ))
          ) : (
            <>
              <div className="gallery-thumb" />
              <div className="gallery-thumb" />
              <div className="gallery-thumb" />
              <div className="gallery-thumb" />
            </>
          )}
        </div>

        {/* Phase 3 Reviews Section */}
        <div style={{ marginTop: 32 }} className="inbox-panel">
          <h2><Star size={18} color="var(--mustard)" style={{ verticalAlign: "middle", marginRight: 8 }} /> Tenant Reviews ({reviews.length})</h2>
          
          <form onSubmit={handleAddReview} style={{ marginTop: 16, display: "grid", gap: 12 }}>
            <label className="field">
              <span>Rating (1 - 5 Stars)</span>
              <select value={newRating} onChange={(e) => setNewRating(e.target.value)}>
                <option value="5">⭐⭐⭐⭐⭐ (5 Stars)</option>
                <option value="4">⭐⭐⭐⭐ (4 Stars)</option>
                <option value="3">⭐⭐⭐ (3 Stars)</option>
                <option value="2">⭐⭐ (2 Stars)</option>
                <option value="1">⭐ (1 Star)</option>
              </select>
            </label>
            <label className="field">
              <span>Review Comment</span>
              <textarea 
                rows="2" 
                placeholder="Share your experience staying here or visiting this listing..."
                value={newComment} 
                onChange={(e) => setNewComment(e.target.value)} 
              />
            </label>
            <button type="submit" className="primary-button small-btn">Submit Review</button>
          </form>

          <div style={{ marginTop: 24, display: "grid", gap: 16 }}>
            {reviews.map((rev) => (
              <div key={rev.id} style={{ padding: 12, border: "1px solid var(--line)", borderRadius: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <strong>{"⭐".repeat(rev.rating)}</strong>
                  {rev.is_verified && <span className="availability-pill"><ShieldCheck size={12} style={{ marginRight: 4 }} /> Verified Seeker</span>}
                </div>
                <p style={{ margin: "8px 0 0" }}>{rev.comment || "No comment left."}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <aside className="detail-card">
        <div className="detail-card-head">
          <h2>{room.title}</h2>
          <PriceStamp amount={room.monthly_rent} />
        </div>
        <p className="mono-meta">
          {room.distance_km ? `${Number(room.distance_km).toFixed(1)} KM AWAY` : "CITY LISTING"} {"  •  "}
          {room.city?.toUpperCase()}
        </p>
        
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div className="availability-pill">{room.status ? room.status.toUpperCase() : "ACTIVE"}</div>
          <span className="mono-meta">👁 {room.view_count || 0} views</span>
        </div>

        {isOwner && (
          <div style={{ background: "var(--surface-soft)", padding: 12, borderRadius: 12, display: "grid", gap: 8 }}>
            <strong>Owner Quick Controls</strong>
            <button type="button" className="ghost-button small-btn" onClick={handleToggleAvailability}>
              Toggle Status ({room.status === "active" ? "Mark Rented" : "Mark Active"})
            </button>
            <button type="button" className="ghost-button small-btn" onClick={handleRenew}>
              Renew Listing (Reset Expiry)
            </button>
          </div>
        )}

        <div className="divider" />
        <p className="detail-description">{room.description || "No description provided yet."}</p>
        
        <div className="owner-row">
          <div className="owner-avatar" aria-hidden="true" />
          <span>LISTED BY {(room.owner?.full_name || "OWNER").toUpperCase()}</span>
        </div>

        {!isOwner && (
          <form className="interest-form" onSubmit={handleSubmitInterest}>
            <label className="field">
              <span>Message</span>
              <textarea
                rows="4"
                maxLength="500"
                value={interestMessage}
                onChange={(event) => setInterestMessage(event.target.value)}
                placeholder="Hi, is this still available? I can visit this weekend."
              />
            </label>
            <button type="submit" className="primary-button detail-cta" disabled={isLoading}>
              {isLoading ? "Sending..." : "Express Interest"}
            </button>
          </form>
        )}

        {/* Phase 2 Moderation / Report action */}
        {!isOwner && (
          <div>
            {!showReportForm ? (
              <button type="button" className="text-button danger-text" onClick={() => setShowReportForm(true)}>
                <Flag size={14} style={{ marginRight: 6, display: "inline", verticalAlign: "middle" }} /> Report Fraud / Spam
              </button>
            ) : (
              <form onSubmit={handleReport} style={{ display: "grid", gap: 8, marginTop: 12 }}>
                <label className="field">
                  <span>Report Reason</span>
                  <input type="text" placeholder="Spam, fraud, misleading..." value={reportReason} onChange={(e) => setReportReason(e.target.value)} required />
                </label>
                <div style={{ display: "flex", gap: 8 }}>
                  <button type="submit" className="primary-button small-btn">Submit Report</button>
                  <button type="button" className="ghost-button small-btn" onClick={() => setShowReportForm(false)}>Cancel</button>
                </div>
              </form>
            )}
          </div>
        )}

        <button type="button" className="text-button" onClick={onBack}>
          <ArrowLeft size={16} style={{ marginRight: 6, display: "inline", verticalAlign: "middle" }} /> Back to browse
        </button>
      </aside>
    </motion.section>
  );
}
