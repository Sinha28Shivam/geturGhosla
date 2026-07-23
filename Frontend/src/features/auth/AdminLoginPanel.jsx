import { useState } from "react";
import { useAppContext } from "../../AppContext";

export function AdminLoginPanel({ onSuccess }) {
  const { api, announce, setToken, setSessionRole } = useAppContext();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("Admin@123");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    try {
      const result = await api.auth.adminLogin(username, password);
      setSessionRole("admin");
      setToken(result.access_token);
      announce("Admin session started.");
      onSuccess?.();
    } catch (error) {
      announce(`Admin login failed: ${error.message}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-card">
      <div className="section-copy">
        <h2>Admin access</h2>
        <p>Use the dedicated moderation credentials. This panel is not shown in normal user navigation.</p>
      </div>
      <form className="auth-form" onSubmit={handleSubmit}>
        <label className="field">
          <span>Username</span>
          <input value={username} onChange={(event) => setUsername(event.target.value)} required />
        </label>
        <label className="field">
          <span>Password</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>
        <button type="submit" className="primary-button" disabled={isLoading}>
          {isLoading ? "Signing in..." : "Enter admin"}
        </button>
      </form>
      <p className="micro-copy">DEFAULT: admin / Admin@123</p>
    </div>
  );
}
