export function RoomSkeletonCard() {
  return (
    <div className="skeleton-card">
      <div className="skeleton-box" style={{ height: 180, width: "100%" }} />
      <div className="skeleton-box" style={{ height: 24, width: "70%" }} />
      <div className="skeleton-box" style={{ height: 16, width: "40%" }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="skeleton-box" style={{ height: 28, width: "30%" }} />
        <div className="skeleton-box" style={{ height: 36, width: "35%" }} />
      </div>
    </div>
  );
}
