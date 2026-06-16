import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Wallet, Mail, Lock, ArrowRight, Shield, X, CheckCircle, RefreshCw, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { authAPI } from "../services/api";

// const ADMIN_ACCOUNTS = [
//   { email: "admin@smartwallet.com",   password: "Admin@123",  name: "Super Admin",  role: "superadmin" },
//   { email: "manager@smartwallet.com", password: "Manager@123", name: "Manager",      role: "manager" },
// ];

// const getUserBaseBalance = (email) => {
//   if (!email) return 0;
//   const lower = email.toLowerCase();
//   if (lower === "nva@email.com") return 12500000;
//   if (lower === "ttb@email.com") return 3200000;
//   if (lower === "lvc@email.com") return 0;
//   if (lower === "ptd@email.com") return 8750000;
//   if (lower === "hme@email.com") return 1000000;
//   return 0;
// };

// const getMockUserEmailByName = (name) => {
//   if (!name) return null;
//   const lower = name.toLowerCase();
//   if (lower.includes("nguyễn văn a")) return "nva@email.com";
//   if (lower.includes("trần thị b")) return "ttb@email.com";
//   if (lower.includes("lê văn c")) return "lvc@email.com";
//   if (lower.includes("phạm thị d")) return "ptd@email.com";
//   if (lower.includes("hoàng minh e")) return "hme@email.com";
//   return null;
// };

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Forgot Password States
  const [showForgot, setShowForgot] = useState(false);
  const [forgotStep, setForgotStep] = useState(1); // 1: Email, 2: OTP & New Pass, 3: Success
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotOtp, setForgotOtp] = useState(["", "", "", "", "", ""]);
  const [forgotNewPassword, setForgotNewPassword] = useState("");
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState("");
  const [forgotShowPass, setForgotShowPass] = useState(false);
  const [forgotShowConfirmPass, setForgotShowConfirmPass] = useState(false);
  const [forgotError, setForgotError] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotCountdown, setForgotCountdown] = useState(60);
  const [forgotCanResend, setForgotCanResend] = useState(false);
  const forgotOtpRefs = useRef([]);

  useEffect(() => {
    let timer;
    if (showForgot && forgotStep === 2 && forgotCountdown > 0) {
      timer = setTimeout(() => setForgotCountdown(c => c - 1), 1000);
    } else if (forgotCountdown === 0) {
      setForgotCanResend(true);
    }
    return () => clearTimeout(timer);
  }, [showForgot, forgotStep, forgotCountdown]);

  const handleForgotOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...forgotOtp];
    newOtp[index] = value.slice(-1);
    setForgotOtp(newOtp);
    setForgotError("");
    if (value && index < 5) forgotOtpRefs.current[index + 1]?.focus();
  };

  const handleForgotKeyDown = (index, e) => {
    if (e.key === "Backspace" && !forgotOtp[index] && index > 0) {
      forgotOtpRefs.current[index - 1]?.focus();
    }
  };

  const handleSendForgotOtp = async (e) => {
    e.preventDefault();
    setForgotError("");
    if (!forgotEmail) {
      setForgotError("Please enter your email.");
      return;
    }
    if (!/\S+@\S+\.\S+/.test(forgotEmail)) {
      setForgotError("Invalid email address.");
      return;
    }

    setForgotLoading(true);
    try {
      const res = await authAPI.forgotPassword(forgotEmail);
      if (res.success) {
        setForgotStep(2);
        setForgotCountdown(60);
        setForgotCanResend(false);
        setForgotOtp(["", "", "", "", "", ""]);
        setForgotNewPassword("");
        setForgotConfirmPassword("");
      } else {
        setForgotError(res.message || "Unable to send OTP.");
      }
    } catch (err) {
      setForgotError(err.response?.data?.message || "System error. Please try again.");
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setForgotError("");

    const enteredOtp = forgotOtp.join("");
    if (enteredOtp.length < 6) {
      setForgotError("Please enter the complete 6-digit OTP code.");
      return;
    }
    if (!forgotNewPassword) {
      setForgotError("Please enter a new password.");
      return;
    }
    if (forgotNewPassword.length < 8) {
      setForgotError("Password must be at least 8 characters.");
      return;
    }
    if (forgotNewPassword !== forgotConfirmPassword) {
      setForgotError("Passwords do not match.");
      return;
    }

    setForgotLoading(true);
    try {
      const res = await authAPI.resetPasswordWithOtp(forgotEmail, enteredOtp, forgotNewPassword);
      if (res.success) {
        setForgotStep(3);
      } else {
        setForgotError(res.message || "Password reset failed.");
      }
    } catch (err) {
      setForgotError(err.response?.data?.message || "System error. Please try again.");
    } finally {
      setForgotLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    if (!email || !password) {
      setError("Please fill in all required fields.");
      return;
    }
    setLoading(true);

    try {
      const res = await authAPI.login(email, password);
      const data = res.data
      setLoading(false);
      if (res.success) {
        if (data.user.role === "ADMIN") {
          // Admin account
          localStorage.removeItem("bw_token");
          localStorage.removeItem("bw_refresh_token");
          localStorage.removeItem("bw_user");
          localStorage.setItem("bw_admin_token", data.accessToken);
          localStorage.setItem("bw_refresh_token", data.refreshToken);

          localStorage.setItem("bw_admin", JSON.stringify({
            email: data.user.email,
            name: "Administrator",
            role: data.user.role.toLowerCase(),
          }));
          navigate("/admin");
        } else {
          // Regular client account
          localStorage.removeItem("bw_admin_token");
          localStorage.removeItem("bw_admin");
          localStorage.setItem("bw_token", data.accessToken);
          localStorage.setItem("bw_refresh_token", data.refreshToken);

          const kycStatus = data.user?.kyc_status ?? "none";
          const sessionUser = {
            email: data.user.email,
            name: data.user.email.split("@")[0],
            kyc: kycStatus === "VERIFIED",
            kycStatus: (kycStatus || "none").toLowerCase(),
            phone: data.user.phone || null,
            status: data.user.status,
            id: data.user.id,
            has_pin: !!data.user.has_pin,
          };

          localStorage.setItem("bw_user", JSON.stringify(sessionUser));
          navigate("/dashboard");
        }
      } else {
        setError(data.message || "Login failed.");
      }
      console.log("ADMIN TOKEN:", localStorage.getItem("bw_admin_token"));
    } catch (err) {
      setLoading(false);
      console.error("Login request error:", err);
      setError(
        err.response?.data?.message ||
        "Server connection failed. Please check your XAMPP/Node.js connection."
      );
    }
  };

  return (
    <div className="min-h-screen flex" style={{ background: "var(--bg-dark)" }}>
      {/* Left Panel - Branding */}
      <motion.div
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="hidden lg:flex flex-col justify-between w-1/2 p-12 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #0a0a0a 0%, #1a0208 50%, #0a0a0a 100%)" }}
      >
        {/* Background grid */}
        <div style={{
          position: "absolute", inset: 0, opacity: 0.05,
          backgroundImage: "linear-gradient(#2563eb 1px, transparent 1px), linear-gradient(90deg, #2563eb 1px, transparent 1px)",
          backgroundSize: "60px 60px"
        }} />

        {/* Red glow */}
        <div style={{
          position: "absolute", top: "30%", left: "20%",
          width: 400, height: 400,
          background: "radial-gradient(circle, rgba(37,99,235,0.15) 0%, transparent 70%)",
          borderRadius: "50%"
        }} />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
            display: "flex", alignItems: "center", justifyContent: "center"
          }}>
            <Wallet size={22} color="white" />
          </div>
          <span style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.5px", color: "#ffffff" }}>
            SmartWallet
          </span>
        </div>

        {/* Main content */}
        <div className="relative z-10">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            style={{ fontSize: 48, fontWeight: 800, lineHeight: 1.1, marginBottom: 20, color: "#ffffff" }}
          >
            Smarter financial
            <br />
            <span style={{ color: "#2563eb" }}>management.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            style={{ color: "rgba(255, 255, 255, 0.7)", fontSize: 16, lineHeight: 1.7, maxWidth: 400 }}
          >
            SmartWallet helps you track spending, send money instantly,
            and receive smart financial insights powered by AI.
          </motion.p>

          {/* Features */}
          <div style={{ marginTop: 40, display: "flex", flexDirection: "column", gap: 16 }}>
            {[
              { icon: "🔒", text: "Multi-layer security with OTP authentication" },
              { icon: "⚡", text: "Instant transfers, no limits" },
              { icon: "🤖", text: "AI-powered spending analysis and advice" },
            ].map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + i * 0.1 }}
                style={{ display: "flex", alignItems: "center", gap: 12 }}
              >
                <span style={{ fontSize: 20 }}>{f.icon}</span>
                <span style={{ color: "rgba(255, 255, 255, 0.7)", fontSize: 14 }}>{f.text}</span>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="relative z-10" style={{ color: "var(--text-muted)", fontSize: 13 }}>
          © 2025 SmartWallet Wallet. All rights reserved.
        </div>
      </motion.div>

      {/* Right Panel - Login Form */}
      <motion.div
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="flex-1 flex items-center justify-center p-8"
        style={{ background: "var(--bg-dark)" }}
      >
        <div style={{ width: "100%", maxWidth: 420 }}>
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
              display: "flex", alignItems: "center", justifyContent: "center"
            }}>
              <Wallet size={20} color="white" />
            </div>
            <span style={{ fontSize: 20, fontWeight: 800, color: "#ffffff" }}>
              SmartWallet
            </span>
          </div>

          <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Sign In</h2>
          <p style={{ color: "var(--text-secondary)", marginBottom: 32, fontSize: 14 }}>
            Don't have an account?{" "}
            <Link to="/register" style={{ color: "#2563eb", fontWeight: 600, textDecoration: "none" }}>
              Sign up now
            </Link>
          </p>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
                borderRadius: 10, padding: "12px 16px", marginBottom: 20,
                color: "#ef4444", fontSize: 14
              }}
            >
              {error}
            </motion.div>
          )}

          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Email */}
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 8, color: "var(--text-secondary)" }}>
                Email
              </label>
              <div style={{ position: "relative" }}>
                <Mail size={16} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                <input
                  type="email"
                  placeholder="example@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    width: "100%", background: "var(--bg-card2)", border: "1px solid var(--border)",
                    borderRadius: 10, padding: "12px 16px 12px 42px",
                    color: "#000000", fontSize: 14, outline: "none", transition: "all 0.3s"
                  }}
                  onFocus={(e) => { e.target.style.borderColor = "#2563eb"; e.target.style.boxShadow = "0 0 0 3px rgba(37,99,235,0.15)"; }}
                  onBlur={(e) => { e.target.style.borderColor = "var(--border)"; e.target.style.boxShadow = "none"; }}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 8, color: "var(--text-secondary)" }}>
                Password
              </label>
              <div style={{ position: "relative" }}>
                <Lock size={16} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                <input
                  type={showPass ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    width: "100%", background: "var(--bg-card2)", border: "1px solid var(--border)",
                    borderRadius: 10, padding: "12px 42px 12px 42px",
                    color: "#000000", fontSize: 14, outline: "none", transition: "all 0.3s"
                  }}
                  onFocus={(e) => { e.target.style.borderColor = "#2563eb"; e.target.style.boxShadow = "0 0 0 3px rgba(37,99,235,0.15)"; }}
                  onBlur={(e) => { e.target.style.borderColor = "var(--border)"; e.target.style.boxShadow = "none"; }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setShowForgot(true);
                  setForgotStep(1);
                  setForgotEmail("");
                  setForgotOtp(["", "", "", "", "", ""]);
                  setForgotNewPassword("");
                  setForgotConfirmPassword("");
                  setForgotError("");
                }}
                style={{ color: "#2563eb", fontSize: 13, textDecoration: "none", cursor: "pointer" }}
              >
                Forgot password?
              </a>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                background: loading ? "#3f3f46" : "linear-gradient(135deg, #2563eb, #1d4ed8)",
                color: "#000000", border: "none", borderRadius: 10,
                padding: "14px 24px", fontWeight: 700, fontSize: 15,
                cursor: loading ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                transition: "all 0.3s", marginTop: 4
              }}
              onMouseEnter={(e) => { if (!loading) e.target.style.boxShadow = "0 8px 25px rgba(37,99,235,0.4)"; }}
              onMouseLeave={(e) => { e.target.style.boxShadow = "none"; }}
            >
              {loading ? (
                <div style={{ width: 20, height: 20, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
              ) : (
                <>Sign In <ArrowRight size={16} /></>
              )}
            </button>
          </form>

          <div style={{ marginTop: 32, padding: "16px", background: "rgba(37,99,235,0.05)", border: "1px solid rgba(37,99,235,0.15)", borderRadius: 10, display: "flex", alignItems: "center", gap: 10 }}>
            <Shield size={16} style={{ color: "#2563eb", flexShrink: 0 }} />
            <p style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>
              Your data is encrypted and secured by 256-bit SSL/TLS banking-grade standards.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Forgot Password Modal */}
      <AnimatePresence>
        {showForgot && (
          <div style={{
            position: "fixed", inset: 0, zIndex: 100,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(0, 0, 0, 0.4)", backdropFilter: "blur(6px)",
            padding: 20
          }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", duration: 0.5 }}
              style={{
                width: "100%", maxWidth: 440,
                background: "var(--bg-card)", border: "1px solid var(--border)",
                borderRadius: 20, padding: 32, position: "relative",
                boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
              }}
            >
              {/* Close Button */}
              <button
                onClick={() => setShowForgot(false)}
                style={{
                  position: "absolute", right: 20, top: 20,
                  background: "none", border: "none", cursor: "pointer",
                  color: "var(--text-muted)", transition: "color 0.2s"
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = "var(--text-primary)"}
                onMouseLeave={(e) => e.currentTarget.style.color = "var(--text-muted)"}
              >
                <X size={20} />
              </button>

              {forgotStep === 1 && (
                <div>
                  <div style={{ width: 56, height: 56, background: "rgba(37,99,235,0.08)", borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
                    <Mail size={24} style={{ color: "var(--primary)" }} />
                  </div>
                  <h3 style={{ fontSize: 20, fontWeight: 800, color: "var(--text-primary)", marginBottom: 8 }}>Forgot Password?</h3>
                  <p style={{ color: "var(--text-secondary)", fontSize: 13, lineHeight: 1.5, marginBottom: 24 }}>
                    Enter your account email to receive an OTP verification code to reset your password.
                  </p>

                  {forgotError && (
                    <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 10, padding: "10px 14px", marginBottom: 16, color: "#ef4444", fontSize: 13 }}>
                      {forgotError}
                    </div>
                  )}

                  <form onSubmit={handleSendForgotOtp} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <div>
                      <label style={{ display: "block", fontSize: 12, fontWeight: 500, marginBottom: 8, color: "var(--text-secondary)" }}>Registered Email</label>
                      <div style={{ position: "relative" }}>
                        <Mail size={16} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                        <input
                          type="email"
                          placeholder="example@email.com"
                          value={forgotEmail}
                          onChange={(e) => setForgotEmail(e.target.value)}
                          style={{
                            width: "100%", background: "var(--bg-card2)", border: "1px solid var(--border)",
                            borderRadius: 10, padding: "12px 16px 12px 42px",
                            color: "#000000", fontSize: 14, outline: "none"
                          }}
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={forgotLoading}
                      style={{
                        width: "100%", background: "linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)",
                        color: "white", border: "none", borderRadius: 10, padding: "12px", fontWeight: 700, fontSize: 14,
                        cursor: forgotLoading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 8
                      }}
                    >
                      {forgotLoading ? (
                        <div style={{ width: 18, height: 18, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                      ) : "Send OTP"}
                    </button>
                  </form>
                </div>
              )}

              {forgotStep === 2 && (
                <div>
                  <h3 style={{ fontSize: 20, fontWeight: 800, color: "var(--text-primary)", marginBottom: 8 }}>Reset Password</h3>
                  <p style={{ color: "var(--text-secondary)", fontSize: 13, lineHeight: 1.5, marginBottom: 16 }}>
                    An OTP code has been sent to: <strong style={{ color: "var(--primary)" }}>{forgotEmail}</strong><br />
                    <span style={{ fontSize: 12 }}>Please check your inbox (including Spam folder)</span>
                  </p>

                  {forgotError && (
                    <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 10, padding: "10px 14px", marginBottom: 16, color: "#ef4444", fontSize: 13 }}>
                      {forgotError}
                    </div>
                  )}

                  <form onSubmit={handleResetPassword} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {/* OTP Boxes */}
                    <div>
                      <label style={{ display: "block", fontSize: 12, fontWeight: 500, marginBottom: 8, color: "var(--text-secondary)" }}>OTP Verification Code</label>
                      <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 6 }}>
                        {forgotOtp.map((digit, i) => (
                          <input
                            key={i}
                            ref={el => forgotOtpRefs.current[i] = el}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            onChange={(e) => handleForgotOtpChange(i, e.target.value)}
                            onKeyDown={(e) => handleForgotKeyDown(i, e)}
                            style={{
                              width: 44, height: 48, textAlign: "center", fontSize: 20, fontWeight: 700,
                              background: digit ? "rgba(37,99,235,0.08)" : "var(--bg-card2)",
                              border: `2px solid ${digit ? "var(--primary)" : "var(--border)"}`,
                              borderRadius: 10, color: "#000000", outline: "none"
                            }}
                          />
                        ))}
                      </div>
                    </div>

                    {/* New Password */}
                    <div>
                      <label style={{ display: "block", fontSize: 12, fontWeight: 500, marginBottom: 6, color: "var(--text-secondary)" }}>New Password</label>
                      <div style={{ position: "relative" }}>
                        <Lock size={15} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                        <input
                          type={forgotShowPass ? "text" : "password"}
                          placeholder="Minimum 8 characters"
                          value={forgotNewPassword}
                          onChange={(e) => setForgotNewPassword(e.target.value)}
                          style={{
                            width: "100%", background: "var(--bg-card2)", border: "1px solid var(--border)",
                            borderRadius: 10, padding: "11px 42px 11px 42px", color: "#000000", fontSize: 13, outline: "none"
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => setForgotShowPass(!forgotShowPass)}
                          style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}
                        >
                          {forgotShowPass ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                    </div>

                    {/* Confirm New Password */}
                    <div>
                      <label style={{ display: "block", fontSize: 12, fontWeight: 500, marginBottom: 6, color: "var(--text-secondary)" }}>Confirm New Password</label>
                      <div style={{ position: "relative" }}>
                        <Lock size={15} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                        <input
                          type={forgotShowConfirmPass ? "text" : "password"}
                          placeholder="Re-enter password"
                          value={forgotConfirmPassword}
                          onChange={(e) => setForgotConfirmPassword(e.target.value)}
                          style={{
                            width: "100%", background: "var(--bg-card2)", border: "1px solid var(--border)",
                            borderRadius: 10, padding: "11px 42px 11px 42px", color: "#000000", fontSize: 13, outline: "none"
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => setForgotShowConfirmPass(!forgotShowConfirmPass)}
                          style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}
                        >
                          {forgotShowConfirmPass ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                    </div>

                    {/* Resend Area */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
                      {forgotCanResend ? (
                        <button
                          type="button"
                          onClick={handleSendForgotOtp}
                          style={{ background: "none", border: "none", color: "var(--primary)", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
                        >
                          <RefreshCw size={12} /> Resend code
                        </button>
                      ) : (
                        <span>Resend code in {forgotCountdown}s</span>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={forgotLoading}
                      style={{
                        width: "100%", background: "linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)",
                        color: "white", border: "none", borderRadius: 10, padding: "12px", fontWeight: 700, fontSize: 14,
                        cursor: forgotLoading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 8
                      }}
                    >
                      {forgotLoading ? (
                        <div style={{ width: 18, height: 18, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                      ) : "Change Password"}
                    </button>
                  </form>
                </div>
              )}

              {forgotStep === 3 && (
                <div style={{ textAlign: "center", padding: "16px 0" }}>
                  <div style={{ width: 72, height: 72, background: "rgba(34,197,94,0.1)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
                    <CheckCircle size={36} style={{ color: "#22c55e" }} />
                  </div>
                  <h3 style={{ fontSize: 20, fontWeight: 800, color: "var(--text-primary)", marginBottom: 8 }}>Success!</h3>
                  <p style={{ color: "var(--text-secondary)", fontSize: 13, lineHeight: 1.5, marginBottom: 24 }}>
                    Your password has been changed successfully. You can now use your new password to sign in.
                  </p>

                  <button
                    onClick={() => setShowForgot(false)}
                    style={{
                      width: "100%", background: "linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)",
                      color: "white", border: "none", borderRadius: 10, padding: "12px", fontWeight: 700, fontSize: 14,
                      cursor: "pointer"
                    }}
                  >
                    Sign In Now
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
