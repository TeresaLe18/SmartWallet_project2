import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Login.css";
import Footer from "../components/Footer";
import Navbar from "../components/Navbar";

import {
  ArrowRight,
  CheckCircle,
  Eye,
  EyeOff,
  Lock,
  Mail,
  RefreshCw,
  Shield,
  Wallet,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { authAPI } from "../services/api";

const EMPTY_OTP = Array(6).fill("");
const EMAIL_REGEX = /\S+@\S+\.\S+/;

const features = [
  { icon: "🔒", text: "Multi-layer security with OTP authentication" },
  { icon: "⚡", text: "Instant transfers, no limits" },
  { icon: "🤖", text: "AI-powered spending analysis and advice" },
];

const fieldIconSize = 16;

export default function LoginPage() {
  const navigate = useNavigate();
  const forgotOtpRefs = useRef([]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [showForgot, setShowForgot] = useState(false);
  const [forgotStep, setForgotStep] = useState(1);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotOtp, setForgotOtp] = useState(EMPTY_OTP);
  const [forgotNewPassword, setForgotNewPassword] = useState("");
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState("");
  const [forgotShowPass, setForgotShowPass] = useState(false);
  const [forgotShowConfirmPass, setForgotShowConfirmPass] = useState(false);
  const [forgotError, setForgotError] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotCountdown, setForgotCountdown] = useState(60);
  const [forgotCanResend, setForgotCanResend] = useState(false);

  useEffect(() => {
    if (!showForgot || forgotStep !== 2) return undefined;

    if (forgotCountdown <= 0) {
      setForgotCanResend(true);
      return undefined;
    }

    const timer = setTimeout(() => {
      setForgotCountdown((countdown) => countdown - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [showForgot, forgotStep, forgotCountdown]);

  const resetForgotForm = () => {
    setForgotStep(1);
    setForgotEmail("");
    setForgotOtp(EMPTY_OTP);
    setForgotNewPassword("");
    setForgotConfirmPassword("");
    setForgotError("");
    setForgotCountdown(60);
    setForgotCanResend(false);
  };

  const openForgotModal = (e) => {
    e.preventDefault();
    setShowForgot(true);
    resetForgotForm();
  };

  const handleForgotOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...forgotOtp];
    newOtp[index] = value.slice(-1);
    setForgotOtp(newOtp);
    setForgotError("");

    if (value && index < 5) {
      forgotOtpRefs.current[index + 1]?.focus();
    }
  };

  const handleForgotKeyDown = (index, e) => {
    if (e.key === "Backspace" && !forgotOtp[index] && index > 0) {
      forgotOtpRefs.current[index - 1]?.focus();
    }
  };

  const validateForgotEmail = () => {
    if (!forgotEmail) return "Please enter your email.";
    if (!EMAIL_REGEX.test(forgotEmail)) return "Invalid email address.";
    return "";
  };

  const handleSendForgotOtp = async (e) => {
    e.preventDefault();
    setForgotError("");

    const emailError = validateForgotEmail();
    if (emailError) {
      setForgotError(emailError);
      return;
    }

    setForgotLoading(true);
    try {
      const res = await authAPI.forgotPassword(forgotEmail);
      if (!res.success) {
        setForgotError(res.message || "Unable to send OTP.");
        return;
      }

      setForgotStep(2);
      setForgotCountdown(60);
      setForgotCanResend(false);
      setForgotOtp(EMPTY_OTP);
      setForgotNewPassword("");
      setForgotConfirmPassword("");
    } catch (err) {
      setForgotError(err.response?.data?.message || "System error. Please try again.");
    } finally {
      setForgotLoading(false);
    }
  };

  const validateResetPassword = () => {
    const enteredOtp = forgotOtp.join("");

    if (enteredOtp.length < 6) return "Please enter the complete 6-digit OTP code.";
    if (!forgotNewPassword) return "Please enter a new password.";
    if (forgotNewPassword.length < 8) return "Password must be at least 8 characters.";
    if (forgotNewPassword !== forgotConfirmPassword) return "Passwords do not match.";

    return "";
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setForgotError("");

    const resetError = validateResetPassword();
    if (resetError) {
      setForgotError(resetError);
      return;
    }

    setForgotLoading(true);
    try {
      const res = await authAPI.resetPasswordWithOtp(
        forgotEmail,
        forgotOtp.join(""),
        forgotNewPassword
      );

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

  const saveAdminSession = (data) => {
    localStorage.removeItem("bw_token");
    localStorage.removeItem("bw_refresh_token");
    localStorage.removeItem("bw_user");
    localStorage.setItem("bw_admin_token", data.accessToken);
    localStorage.setItem("bw_refresh_token", data.refreshToken);
    localStorage.setItem(
      "bw_admin",
      JSON.stringify({
        email: data.user.email,
        name: "Administrator",
        role: data.user.role.toLowerCase(),
      })
    );
  };

  const saveClientSession = (data) => {
    const kycStatus = data.user?.kyc_status ?? "none";

    localStorage.removeItem("bw_admin_token");
    localStorage.removeItem("bw_admin");
    localStorage.setItem("bw_token", data.accessToken);
    localStorage.setItem("bw_refresh_token", data.refreshToken);
    localStorage.setItem(
      "bw_user",
      JSON.stringify({
        email: data.user.email,
        name: data.user.email.split("@")[0],
        kyc: kycStatus === "VERIFIED",
        kycStatus: (kycStatus || "none").toLowerCase(),
        phone: data.user.phone || null,
        status: data.user.status,
        id: data.user.id,
        has_pin: !!data.user.has_pin,
      })
    );
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
      const data = res.data;

      if (!res.success) {
        setError(data.message || "Login failed.");
        return;
      }

      if (data.user.role === "ADMIN") {
        saveAdminSession(data);
        navigate("/admin");
      } else {
        saveClientSession(data);
        navigate("/dashboard");
      }
    } catch (err) {
      console.error("Login request error:", err);
      setError(
        err.response?.data?.message ||
          "Server connection failed. Please check your XAMPP/Node.js connection."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-layout">
      <Navbar />

      <main className="login-main">
        <section className="login-page">
          <div className="login-shell">
        <motion.div
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="hidden lg:flex flex-col justify-between w-1/2 p-12 relative overflow-hidden login-brand-panel"
      >
        <div className="login-bg-grid" />
        <div className="login-bg-glow" />

        <div className="relative z-10 flex items-center gap-3">
          <div className="login-logo-icon">
            <Wallet size={22} color="white" />
          </div>
          <span className="login-logo-text">SmartWallet</span>
        </div>

        <div className="relative z-10">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="login-title-main"
          >
            Smarter financial
            <br />
            <span className="login-primary-text">management.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="login-brand-desc"
          >
            SmartWallet helps you track spending, send money instantly,
            and receive smart financial insights powered by AI.
          </motion.p>

          <div className="login-features">
            {features.map((feature, index) => (
              <motion.div
                key={feature.text}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + index * 0.1 }}
                className="login-feature-item"
              >
                <span className="login-feature-icon">{feature.icon}</span>
                <span className="login-feature-text">{feature.text}</span>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="relative z-10 login-copyright">
          © 2025 SmartWallet Wallet. All rights reserved.
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="flex-1 flex items-center justify-center p-8 login-form-panel"
      >
        <div className="login-form-wrap">
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="login-logo-icon mobile">
              <Wallet size={20} color="white" />
            </div>
            <span className="login-logo-text mobile">SmartWallet</span>
          </div>

          <h2 className="login-heading">Sign In</h2>
          <p className="login-subtitle">
            Don&apos;t have an account?{" "}
            <Link to="/register" className="login-link">
              Sign up now
            </Link>
          </p>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="login-error main"
            >
              {error}
            </motion.div>
          )}

          <form onSubmit={handleLogin} className="login-form">
            <div>
              <label className="login-label">Email</label>
              <div className="login-input-wrap">
                <Mail size={fieldIconSize} className="login-input-icon" />
                <input
                  className="login-input"
                  type="email"
                  placeholder="example@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="login-label">Password</label>
              <div className="login-input-wrap">
                <Lock size={fieldIconSize} className="login-input-icon" />
                <input
                  className="login-input password"
                  type={showPass ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="login-eye-btn"
                  onClick={() => setShowPass(!showPass)}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="login-forgot-row">
              <a href="#" onClick={openForgotModal} className="login-forgot-link">
                Forgot password?
              </a>
            </div>

            <button type="submit" disabled={loading} className="login-btn login-submit-btn">
              {loading ? (
                <div className="login-loader main" />
              ) : (
                <>
                  Sign In <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <div className="login-security-box">
            <Shield size={16} className="login-security-icon" />
            <p className="login-security-text">
              Your data is encrypted and secured by 256-bit SSL/TLS banking-grade standards.
            </p>
          </div>
        </div>
      </motion.div>

          </div>
        </section>
      </main>

      <AnimatePresence>
        {showForgot && (
          <div className="login-modal-overlay">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="login-modal"
            >
              <button className="login-close-btn" onClick={() => setShowForgot(false)}>
                <X size={20} />
              </button>

              {forgotStep === 1 && (
                <div>
                  <div className="login-modal-icon-box">
                    <Mail size={24} className="login-modal-icon" />
                  </div>
                  <h3 className="login-modal-title">Forgot Password?</h3>
                  <p className="login-modal-desc">
                    Enter your account email to receive an OTP verification code to reset your password.
                  </p>

                  {forgotError && <div className="login-error modal">{forgotError}</div>}

                  <form onSubmit={handleSendForgotOtp} className="login-modal-form">
                    <div>
                      <label className="login-label small">Registered Email</label>
                      <div className="login-input-wrap">
                        <Mail size={16} className="login-input-icon" />
                        <input
                          className="login-input"
                          type="email"
                          placeholder="example@email.com"
                          value={forgotEmail}
                          onChange={(e) => setForgotEmail(e.target.value)}
                        />
                      </div>
                    </div>

                    <button type="submit" disabled={forgotLoading} className="login-btn login-modal-btn">
                      {forgotLoading ? <div className="login-loader small" /> : "Send OTP"}
                    </button>
                  </form>
                </div>
              )}

              {forgotStep === 2 && (
                <div>
                  <h3 className="login-modal-title">Reset Password</h3>
                  <p className="login-modal-desc reset">
                    An OTP code has been sent to:{" "}
                    <strong className="login-primary-text">{forgotEmail}</strong>
                    <br />
                    <span style={{ fontSize: 12 }}>Please check your inbox (including Spam folder)</span>
                  </p>

                  {forgotError && <div className="login-error modal">{forgotError}</div>}

                  <form onSubmit={handleResetPassword} className="login-modal-form reset">
                    <div>
                      <label className="login-label small">OTP Verification Code</label>
                      <div className="login-otp-row">
                        {forgotOtp.map((digit, index) => (
                          <input
                            key={index}
                            ref={(el) => {
                              forgotOtpRefs.current[index] = el;
                            }}
                            className={`login-otp-input ${digit ? "filled" : ""}`}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            onChange={(e) => handleForgotOtpChange(index, e.target.value)}
                            onKeyDown={(e) => handleForgotKeyDown(index, e)}
                          />
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="login-label small">New Password</label>
                      <div className="login-input-wrap">
                        <Lock size={15} className="login-input-icon" />
                        <input
                          className="login-input small"
                          type={forgotShowPass ? "text" : "password"}
                          placeholder="Minimum 8 characters"
                          value={forgotNewPassword}
                          onChange={(e) => setForgotNewPassword(e.target.value)}
                        />
                        <button
                          type="button"
                          className="login-eye-btn"
                          onClick={() => setForgotShowPass(!forgotShowPass)}
                        >
                          {forgotShowPass ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="login-label small">Confirm New Password</label>
                      <div className="login-input-wrap">
                        <Lock size={15} className="login-input-icon" />
                        <input
                          className="login-input small"
                          type={forgotShowConfirmPass ? "text" : "password"}
                          placeholder="Re-enter password"
                          value={forgotConfirmPassword}
                          onChange={(e) => setForgotConfirmPassword(e.target.value)}
                        />
                        <button
                          type="button"
                          className="login-eye-btn"
                          onClick={() => setForgotShowConfirmPass(!forgotShowConfirmPass)}
                        >
                          {forgotShowConfirmPass ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                    </div>

                    <div className="login-resend-row">
                      {forgotCanResend ? (
                        <button type="button" onClick={handleSendForgotOtp} className="login-resend-btn">
                          <RefreshCw size={12} /> Resend code
                        </button>
                      ) : (
                        <span>Resend code in {forgotCountdown}s</span>
                      )}
                    </div>

                    <button type="submit" disabled={forgotLoading} className="login-btn login-modal-btn">
                      {forgotLoading ? <div className="login-loader small" /> : "Change Password"}
                    </button>
                  </form>
                </div>
              )}

              {forgotStep === 3 && (
                <div className="login-success">
                  <div className="login-success-icon-box">
                    <CheckCircle size={36} className="login-success-icon" />
                  </div>
                  <h3 className="login-modal-title">Success!</h3>
                  <p className="login-modal-desc">
                    Your password has been changed successfully. You can now use your new password to sign in.
                  </p>

                  <button className="login-btn login-modal-btn" onClick={() => setShowForgot(false)}>
                    Sign In Now
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <Footer />

    </div>
    
  );
}
