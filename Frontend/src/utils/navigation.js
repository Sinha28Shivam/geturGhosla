const DEFAULT_VIEW = "browse";

export function parseHash(hashValue) {
  const raw = (hashValue || "").replace(/^#/, "");
  if (!raw) return { view: DEFAULT_VIEW, roomId: null };

  const [view, roomId] = raw.split("/");
  return {
    view: view || DEFAULT_VIEW,
    roomId: roomId || null,
  };
}

export function buildHash(view, roomId = null) {
  if (view === "detail" && roomId) {
    return `#detail/${roomId}`;
  }

  return `#${view || DEFAULT_VIEW}`;
}

export { DEFAULT_VIEW };
