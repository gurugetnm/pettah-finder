export default function Loading() {
  return (
    <div className="shell section" role="status">
      <p className="mb-6">Finding your way around Pettah…</p>
      <div className="street-grid" aria-hidden="true">
        <div className="skeleton" />
        <div className="skeleton" />
        <div className="skeleton" />
      </div>
    </div>
  );
}
