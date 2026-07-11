export function StatusBanner({ status }) {
  if (!status) return null;

  return (
    <div className={`toast-notification ${status.tone}`} role="status" aria-live="polite">
      {status.message}
    </div>
  );
}
