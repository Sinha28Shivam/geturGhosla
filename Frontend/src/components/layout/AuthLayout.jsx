import { BrandStamp } from "../common/BrandStamp";

export function AuthLayout({ children, apiBase, setApiBase }) {
  return (
    <div className="auth-screen">
      <section className="auth-hero-panel">
        <BrandStamp />
        <div className="auth-hero-copy">
          <h1>Find your next room, without the agent fee.</h1>
          <p>
            Search rooms near you, browse real photos, and contact owners directly - no
            middlemen.
          </p>
        </div>
      </section>
      <section className="auth-form-panel">

        {children}
      </section>
    </div>
  );
}
