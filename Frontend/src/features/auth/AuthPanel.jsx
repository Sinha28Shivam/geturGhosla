import { useState } from "react";
import { useAppContext } from "../../AppContext";
import { motion, AnimatePresence } from "framer-motion";

const MODES = [
  { id: "phone", label: "Phone OTP" },
  { id: "otp", label: "Email OTP" },
  { id: "login", label: "Password" },
  { id: "signup", label: "Sign up" },
];

export function AuthPanel() {
  const { api, announce, setToken, loadCurrentUser } = useAppContext();
  
  const [mode, setMode] = useState("phone");
  const [step, setStep] = useState("request");

  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const resetFormState = (newMode) => {
    setMode(newMode);
    setStep("request");
    setPhone("");
    setEmail("");
    setPassword("");
    setOtp("");
  };

  const handleRequestPhoneOtp = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    try {
      const result = await api.auth.requestPhoneOtp(phone);
      announce(result.message || "Phone OTP sent.");
      setStep("verify");
    } catch (error) {
      announce(`Phone OTP failed: ${error.message}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyPhoneOtp = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    try {
      const result = await api.auth.verifyPhoneOtp(phone, otp);
      setToken(result.access_token);
      await loadCurrentUser("auth");
      announce("Signed in with Phone OTP.");
    } catch (error) {
      announce(`Phone verification failed: ${error.message}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestEmailOtp = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    try {
      const result = await api.auth.requestOtp(email);
      announce(result.message || "Email OTP sent.");
      setStep("verify");
    } catch (error) {
      announce(`OTP request failed: ${error.message}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyEmailOtp = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    try {
      const result = await api.auth.verifyOtp(email, otp);
      setToken(result.access_token);
      await loadCurrentUser("auth");
      announce("Signed in with Email OTP.");
    } catch (error) {
      announce(`OTP verification failed: ${error.message}`, "error");
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

  return (
    <motion.div 
      className="auth-card"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
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

      <AnimatePresence mode="wait">
        {mode === "phone" && (
          <motion.div
            key="phone"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.2 }}
            className="auth-stack"
          >
            {step === "request" ? (
              <>
                <div className="section-copy">
                  <h2>Phone Authentication</h2>
                  <p>Enter your 10-digit mobile number for SMS OTP login.</p>
                </div>
                <form className="auth-form" onSubmit={handleRequestPhoneOtp}>
                  <label className="field">
                    <span>Phone Number</span>
                    <input
                      type="tel"
                      placeholder="e.g. +919876543210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                    />
                  </label>
                  <button type="submit" className="primary-button" disabled={isLoading}>
                    {isLoading ? "Sending OTP..." : "Send Phone OTP"}
                  </button>
                </form>
              </>
            ) : (
              <>
                <div className="section-copy">
                  <h2>Verify Phone OTP</h2>
                  <p>Enter 6-digit SMS code sent to <strong>{phone}</strong></p>
                  <button type="button" className="ghost-button" onClick={() => setStep("request")}>Change number</button>
                </div>
                <form className="auth-form" onSubmit={handleVerifyPhoneOtp}>
                  <label className="field">
                    <span>OTP Code</span>
                    <input
                      type="text"
                      maxLength="6"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      required
                      autoFocus
                    />
                  </label>
                  <button type="submit" className="primary-button" disabled={isLoading}>
                    {isLoading ? "Verifying..." : "Verify & Sign In"}
                  </button>
                </form>
              </>
            )}
          </motion.div>
        )}

        {mode === "otp" && (
          <motion.div
            key="otp"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.2 }}
            className="auth-stack"
          >
            {step === "request" ? (
              <>
                <div className="section-copy">
                  <h2>Welcome back</h2>
                  <p>Enter your email and we&apos;ll send a one-time code.</p>
                </div>
                <form className="auth-form" onSubmit={handleRequestEmailOtp}>
                  <label className="field">
                    <span>Email</span>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
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
                  <p>Enter the code sent to <strong>{email}</strong></p>
                </div>
                <form className="auth-form" onSubmit={handleVerifyEmailOtp}>
                  <label className="field">
                    <span>OTP Code</span>
                    <input
                      type="text"
                      maxLength="6"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      required
                    />
                  </label>
                  <button type="submit" className="primary-button" disabled={isLoading}>
                    {isLoading ? "Verifying..." : "Continue"}
                  </button>
                </form>
              </>
            )}
          </motion.div>
        )}

        {mode === "login" && (
          <motion.div
            key="login"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.2 }}
            className="auth-stack"
          >
            <div className="section-copy">
              <h2>Password Login</h2>
              <p>Sign in with email and password.</p>
            </div>
            <form className="auth-form" onSubmit={handleLogin}>
              <label className="field">
                <span>Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </label>
              <label className="field">
                <span>Password</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </label>
              <button type="submit" className="primary-button" disabled={isLoading}>
                {isLoading ? "Signing in..." : "Sign in"}
              </button>
            </form>
          </motion.div>
        )}

        {mode === "signup" && (
          <motion.div
            key="signup"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.2 }}
            className="auth-stack"
          >
            <div className="section-copy">
              <h2>Create Account</h2>
              <p>Sign up with email and password.</p>
            </div>
            <form className="auth-form" onSubmit={handleSignup}>
              <label className="field">
                <span>Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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
                  required
                />
              </label>
              <button type="submit" className="primary-button" disabled={isLoading}>
                {isLoading ? "Creating..." : "Create account"}
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
