import { useState } from "react";
import { PriceStamp } from "../common/PriceStamp";
import { useAppContext } from "../../AppContext";

export function RoomDetailPanel({
  room,
  onBack,
  onInterestSent,
}) {
  const { api, announce } = useAppContext();
  const [interestMessage, setInterestMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

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

  return (
    <section className="room-detail-page">
      <div className="gallery-panel">
        {heroImage ? (
          <img className="gallery-hero gallery-image" src={heroImage} alt={room.title} />
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
        <div className="availability-pill">Available now</div>
        <div className="divider" />
        <p className="detail-description">{room.description || "No description provided yet."}</p>
        <div className="owner-row">
          <div className="owner-avatar" aria-hidden="true" />
          <span>LISTED BY {(room.owner?.full_name || "OWNER").toUpperCase()}</span>
        </div>
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
            {isLoading ? "Sending..." : "Show Interest"}
          </button>
        </form>
        <p className="micro-copy">WE&apos;LL SHARE YOUR CONTACT BY EMAIL</p>
        <button type="button" className="text-button" onClick={onBack}>
          Back to browse
        </button>
      </aside>
    </section>
  );
}
