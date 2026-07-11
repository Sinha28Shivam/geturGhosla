import { compactDistance } from "../../utils/format";
import { PriceStamp } from "../common/PriceStamp";

export function RoomCard({ room, onSelect, actionLabel = "View details" }) {
  return (
    <article className="room-card">
      <div className="room-card-media" aria-hidden="true" />
      <div className="room-card-body">
        <div className="room-card-head">
          <h3>{room.title}</h3>
          <PriceStamp amount={room.monthly_rent} />
        </div>
        <p className="mono-meta">
          {compactDistance(room)} {room.rating ? `  *  ${room.rating}` : ""}
        </p>
        <div className="availability-pill">Available now</div>
      </div>
      <button type="button" className="ghost-button" onClick={onSelect}>
        {actionLabel}
      </button>
    </article>
  );
}
