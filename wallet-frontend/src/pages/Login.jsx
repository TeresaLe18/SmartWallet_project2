import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "./Login.css";
import Footer from "../components/Footer";
import Navbar from "../components/Navbar";
import { useLanguage } from "../context/LanguageContext";

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

const fieldIconSize = 16;

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, lang } = useLanguage();
  const forgotOtpRefs = useRef([]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [infoMessage, setInfoMessage] = useState("");

  useEffect(() => {
    if (location.state?.message) {
      setInfoMessage(location.state.message);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]);

  const features = [
    { icon: "🔒", text: t.login.featureSecure },
    { icon: "⚡", text: t.login.featureInstant },
    { icon: "🤖", text: t.login.featureAi },
  ];

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
    if (!forgotEmail) return t.login.enterEmail;
    if (!EMAIL_REGEX.test(forgotEmail)) return t.login.invalidEmail;
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
        setForgotError(res.message || (lang === "vi" ? "Không thể gửi OTP." : "Unable to send OTP."));
        return;
      }

      setForgotStep(2);
      setForgotCountdown(60);
      setForgotCanResend(false);
      setForgotOtp(EMPTY_OTP);
      setForgotNewPassword("");
      setForgotConfirmPassword("");
    } catch (err) {
      setForgotError(err.response?.data?.message || (lang === "vi" ? "Lỗi hệ thống. Vui lòng thử lại sau." : "System error. Please try again."));
    } finally {
      setForgotLoading(false);
    }
  };

  const validateResetPassword = () => {
    const enteredOtp = forgotOtp.join("");

    if (enteredOtp.length < 6) return t.login.enterOtp;
    if (!forgotNewPassword) return t.login.enterNewPass;
    if (forgotNewPassword.length < 8) return t.login.passMinLength;
    if (forgotNewPassword !== forgotConfirmPassword) return t.login.passNotMatch;

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
        setForgotError(res.message || (lang === "vi" ? "Đặt lại mật khẩu thất bại." : "Password reset failed."));
      }
    } catch (err) {
      setForgotError(err.response?.data?.message || (lang === "vi" ? "Lỗi hệ thống. Vui lòng thử lại sau." : "System error. Please try again."));
    } finally {
      setForgotLoading(false);
    }
  };

  const saveAdminSession = (data) => {
    localStorage.removeItem("bw_token");
    localStorage.removeItem("bw_user");
    localStorage.setItem("bw_admin_token", data.accessToken);
    localStorage.setItem(
      "bw_admin",
      JSON.stringify({
        email: data.user.email,
        name: lang === "vi" ? "Quản trị viên" : "Administrator",
        role: data.user.role.toLowerCase(),
      })
    );
  };

  const saveClientSession = (data) => {
    const kycStatus = data.user?.kyc_status ?? "none";

    localStorage.removeItem("bw_admin_token");
    localStorage.removeItem("bw_admin");
    localStorage.setItem("bw_token", data.accessToken);
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
      setError(t.login.fillRequired);
      return;
    }

    setLoading(true);
    try {
      const res = await authAPI.login(email, password);
      const data = res.data;

      if (!res.success) {
        setError(data.message || t.login.loginFailed);
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
        err.response?.data?.message || t.login.serverError
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
            {t.login.brandTitle1}
            <br />
            <span className="login-primary-text">{t.login.brandTitle2}</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="login-brand-desc"
          >
            {t.login.brandDesc}
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
          {t.login.copyright}
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

          <h2 className="login-heading">{t.login.title}</h2>
          <p className="login-subtitle">
            {t.login.needAccount}{" "}
            <Link to="/register" className="login-link">
              {t.login.registerNow}
            </Link>
          </p>

          {infoMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                background: "rgba(34,197,94,0.08)",
                border: "1px solid rgba(34,197,94,0.2)",
                borderRadius: 10,
                padding: "10px 14px",
                marginBottom: 16,
                color: "#22c55e",
                fontSize: 13,
              }}
            >
              {infoMessage}
            </motion.div>
          )}

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
              <label className="login-label">{t.login.emailLabel}</label>
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
              <label className="login-label">{t.login.passLabel}</label>
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
                {t.login.forgotPass}
              </a>
            </div>

            <button type="submit" disabled={loading} className="login-btn login-submit-btn">
              {loading ? (
                <div className="login-loader main" />
              ) : (
                <>
                  {t.login.loginBtn} <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <div className="login-security-box">
            <Shield size={16} className="login-security-icon" />
            <p className="login-security-text">
              {t.login.securityDesc}
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
                  <h3 className="login-modal-title">{t.login.forgotModalTitle}</h3>
                  <p className="login-modal-desc">
                    {t.login.forgotModalDesc}
                  </p>

                  {forgotError && <div className="login-error modal">{forgotError}</div>}

                  <form onSubmit={handleSendForgotOtp} className="login-modal-form">
                    <div>
                      <label className="login-label small">{t.login.emailLabel}</label>
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
                      {forgotLoading ? <div className="login-loader small" /> : t.login.sendOtp}
                    </button>
                  </form>
                </div>
              )}

              {forgotStep === 2 && (
                <div>
                  <h3 className="login-modal-title">{t.login.resetPassTitle}</h3>
                  <p className="login-modal-desc reset">
                    {lang === "vi" ? "Mã OTP đã được gửi tới:" : "An OTP code has been sent to:"}{" "}
                    <strong className="login-primary-text">{forgotEmail}</strong>
                    <br />
                    <span style={{ fontSize: 12 }}>{lang === "vi" ? "Kiểm tra hộp thư đến (bao gồm cả thư mục Spam)" : "Check your inbox (including Spam folder)"}</span>
                  </p>

                  {forgotError && <div className="login-error modal">{forgotError}</div>}

                  <form onSubmit={handleResetPassword} className="login-modal-form reset">
                    <div>
                      <label className="login-label small">{lang === "vi" ? "Mã xác thực OTP" : "OTP Verification Code"}</label>
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
                      <label className="login-label small">{t.login.newPassLabel}</label>
                      <div className="login-input-wrap">
                        <Lock size={15} className="login-input-icon" />
                        <input
                          className="login-input small"
                          type={forgotShowPass ? "text" : "password"}
                          placeholder={lang === "vi" ? "Tối thiểu 8 ký tự" : "Minimum 8 characters"}
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
                      <label className="login-label small">{t.login.confirmPassLabel}</label>
                      <div className="login-input-wrap">
                        <Lock size={15} className="login-input-icon" />
                        <input
                          className="login-input small"
                          type={forgotShowConfirmPass ? "text" : "password"}
                          placeholder={lang === "vi" ? "Nhập lại mật khẩu" : "Re-enter password"}
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
                          <RefreshCw size={12} /> {t.login.resendOtp}
                        </button>
                      ) : (
                        <span>
                          {lang === "vi"
                            ? `Gửi lại mã sau ${forgotCountdown} giây`
                            : `Resend code in ${forgotCountdown}s`}
                        </span>
                      )}
                    </div>

                    <button type="submit" disabled={forgotLoading} className="login-btn login-modal-btn">
                      {forgotLoading ? <div className="login-loader small" /> : t.login.resetBtn}
                    </button>
                  </form>
                </div>
              )}

              {forgotStep === 3 && (
                <div className="login-success">
                  <div className="login-success-icon-box">
                    <CheckCircle size={36} className="login-success-icon" />
                  </div>
                  <h3 className="login-modal-title">{lang === "vi" ? "Thành công!" : "Success!"}</h3>
                  <p className="login-modal-desc">
                    {lang === "vi"
                      ? "Mật khẩu của bạn đã được thay đổi thành công. Bạn có thể đăng nhập bằng mật khẩu mới."
                      : "Your password has been changed successfully. You can now use your new password to sign in."}
                  </p>

                  <button className="login-btn login-modal-btn" onClick={() => setShowForgot(false)}>
                    {t.login.loginNow}
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
