import { useState } from "react";
import { useAppContext } from "../../AppContext";

const MODES = [
  { id: "otp", label: "Email OTP" },
  { id: "login", label: "Password" },
  { id: "signup", label: "Sign up" },
];

export function AuthPanel() {
  const { api, announce, setToken, loadCurrentUser } = useAppContext();
  
  const [mode, setMode] = useState("otp");
  
  // "request" | "verify" step for OTP and Signup flows
  const [step, setStep] = useState("request");

  // Form State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const resetFormState = (newMode) => {
    setMode(newMode);
    setStep("request");
    setEmail("");
    setPassword("");
    setOtp("");
  };

  // HANDLERS
  const handleRequestOtp = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    try {
      const result = await api.auth.requestOtp(email);
      announce(result.message || "OTP sent.");
      setStep("verify");
    } catch (error) {
      announce(`OTP request failed: ${error.message}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    try {
      const result = await api.auth.verifyOtp(email, otp);
      setToken(result.access_token);
      await loadCurrentUser("auth");
      announce("Signed in with OTP.");
    } catch (error) {
      announce(`OTP verification failed: ${error.message}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    try {
      const result = await api.auth.signup({ email, password });
      announce(result.message || "Account created. Please verify OTP.");
      setStep("verify");
    } catch (error) {
      announce(`Signup failed: ${error.message}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifySignup = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    try {
      const result = await api.auth.verifySignup(email, otp);
      announce(result.message || "Account activated. Please sign in.");
      // Auto switch to login after activation
      resetFormState("login");
      // Keep email populated for convenience
      setEmail(email); 
    } catch (error) {
      announce(`Activation failed: ${error.message}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    try {
      const result = await api.auth.login(email, password);
      setToken(result.access_token);
      await loadCurrentUser("auth");
      announce("Signed in successfully.");
    } catch (error) {
      announce(`Login failed: ${error.message}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-card">
      <div className="segmented-control" role="tablist" aria-label="Authentication mode">
        {MODES.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={mode === item.id}
            className={`segment ${mode === item.id ? "active" : ""}`}
            onClick={() => resetFormState(item.id)}
            disabled={isLoading}
          >
            {item.label}
          </button>
        ))}
      </div>

      {mode === "otp" && (
        <div className="auth-stack">
          {step === "request" ? (
            <>
              <div className="section-copy">
                <h2>Welcome back</h2>
                <p>Enter your email and we&apos;ll send a one-time code, no password needed.</p>
              </div>
              <form className="auth-form" onSubmit={handleRequestOtp}>
                <label className="field">
                  <span>Email</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                  />
                </label>
                <button type="submit" className="primary-button" disabled={isLoading}>
                  {isLoading ? "Sending..." : "Send OTP"}
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="section-copy">
                <h2>Verify Email</h2>
                <p>Enter the 6-digit code sent to <strong>{email}</strong></p>
                <button 
                  type="button" 
                  className="ghost-button" 
                  style={{ padding: 0, height: 'auto', textDecoration: 'underline', marginTop: '0.5rem' }} 
                  onClick={() => setStep("request")}
                >
                  Change email address
                </button>
              </div>
              <form className="auth-form" onSubmit={handleVerifyOtp}>
                <label className="field">
                  <span>OTP Code</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength="6"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    required
                    autoFocus
                  />
                </label>
                <button type="submit" className="primary-button" disabled={isLoading}>
                   {isLoading ? "Verifying..." : "Continue with Email"}
                </button>
              </form>
            </>
          )}
        </div>
      )}

      {mode === "login" && (
        <div className="auth-stack">
          <div className="section-copy">
            <h2>Sign in</h2>
            <p>Use your password to sign in to your account.</p>
          </div>
          <form className="auth-form" onSubmit={handleLogin}>
            <label className="field">
              <span>Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </label>
            <label className="field">
              <span>Password</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </label>
            <button type="submit" className="primary-button" disabled={isLoading}>
              {isLoading ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </div>
      )}

      {mode === "signup" && (
        <div className="auth-stack">
          {step === "request" ? (
            <>
              <div className="section-copy">
                <h2>Create account</h2>
                <p>Create a password account, then activate it using the email OTP route.</p>
              </div>
              <form className="auth-form" onSubmit={handleSignup}>
                <label className="field">
                  <span>Email</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                  />
                </label>
                <label className="field">
                  <span>Password</span>
                  <input
                    type="password"
                    minLength="8"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                  />
                </label>
                <button type="submit" className="primary-button" disabled={isLoading}>
                  {isLoading ? "Creating..." : "Create account"}
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="section-copy">
                <h2>Activate account</h2>
                <p>Enter the 6-digit code sent to <strong>{email}</strong> to activate your account.</p>
              </div>
              <form className="auth-form" onSubmit={handleVerifySignup}>
                <label className="field">
                  <span>OTP Code</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength="6"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    required
                    autoFocus
                  />
                </label>
                <button type="submit" className="primary-button" disabled={isLoading}>
                  {isLoading ? "Activating..." : "Activate account"}
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </div>
  );
}
