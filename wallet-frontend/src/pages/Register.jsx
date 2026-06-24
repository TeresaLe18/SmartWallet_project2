import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Shield,
  Wallet,
} from "lucide-react";
import { motion } from "framer-motion";
import { authAPI } from "../services/api";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useLanguage } from "../context/LanguageContext";
import "./Register.css";

const EMAIL_REGEX = /\S+@\S+\.\S+/;
const strengthClasses = ["", "weak", "fair", "good", "strong"];

export default function RegisterPage() {
  const navigate = useNavigate();
  const { t, lang } = useLanguage();
  const [form, setForm] = useState({ email: "", password: "", confirmPassword: "" });
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const features = [
    { icon: "🔒", text: t.login.featureSecure },
    { icon: "⚡", text: t.login.featureInstant },
    { icon: "🤖", text: t.login.featureAi },
  ];

  const strengthLabels = lang === "vi"
    ? ["", "Yếu", "Trung bình", "Khá", "Rất mạnh"]
    : ["", "Weak", "Fair", "Good", "Very Strong"];

  const updateForm = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const validate = () => {
    const errs = {};

    if (!form.email) {
      errs.email = lang === "vi" ? "Vui lòng nhập Email" : "Email is required";
    } else if (!EMAIL_REGEX.test(form.email)) {
      errs.email = t.login.invalidEmail;
    }

    if (!form.password) {
      errs.password = lang === "vi" ? "Vui lòng nhập Mật khẩu" : "Password is required";
    } else if (form.password.length < 8) {
      errs.password = t.login.passMinLength;
    }

    if (form.password !== form.confirmPassword) {
      errs.confirmPassword = t.login.passNotMatch;
    }

    return errs;
  };

  const passwordStrength = () => {
    const password = form.password;
    if (!password) return 0;

    let score = 0;
    if (password.length >= 8) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;

    return score;
  };

  const strength = passwordStrength();

  const handleRegister = async (e) => {
    e.preventDefault();

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});
    setLoading(true);

    try {
      const data = await authAPI.register(form.email, form.password);

      if (data.success) {
        localStorage.setItem("bw_pending_email", form.email);
        alert(
          lang === "vi"
            ? `Đăng ký tài khoản thành công! Mã OTP xác thực đã được gửi đến ${form.email}. Vui lòng kiểm tra hộp thư đến Gmail của bạn (bao gồm cả thư mục spam).`
            : `Account registered successfully! A verification OTP code has been sent to ${form.email}. Please check your Gmail inbox (including spam/junk folder).`
        );
        navigate("/verify-otp");
      } else {
        setErrors({ server: data.message || (lang === "vi" ? "Đăng ký tài khoản thất bại." : "Account registration failed.") });
      }
    } catch (err) {
      console.error("Register request error:", err);
      setErrors({
        server:
          err.response?.data?.message ||
          (lang === "vi" ? "Lỗi kết nối máy chủ. Vui lòng kiểm tra kết nối Node.js/CSDL." : "Server connection error. Please check your database/Node.js connection."),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-layout">
      <Navbar />

      <main className="register-page">
        <div className="register-shell">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="register-brand-panel"
          >
            <div className="register-bg-grid" />
            <div className="register-bg-glow" />

            <div className="register-logo-row">
              <div className="register-logo-icon">
                <Wallet size={22} color="white" />
              </div>
              <span className="register-logo-text">SmartWallet</span>
            </div>

            <div className="register-brand-content">
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.6 }}
                className="register-title-main"
              >
                {lang === "vi" ? "Tạo tài khoản" : "Create your"}
                <br />
                <span>SmartWallet.</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="register-brand-desc"
              >
                {t.login.brandDesc}
              </motion.p>

              <div className="register-features">
                {features.map((feature, index) => (
                  <motion.div
                    key={feature.text}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 + index * 0.1 }}
                    className="register-feature-item"
                  >
                    <span className="register-feature-icon">{feature.icon}</span>
                    <span className="register-feature-text">{feature.text}</span>
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="register-copyright">
              {t.login.copyright}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="register-form-panel"
          >
            <div className="register-form-wrap">
              <div className="register-mobile-logo">
                <div className="register-logo-icon mobile">
                  <Wallet size={20} color="white" />
                </div>
                <span className="register-logo-text mobile">SmartWallet</span>
              </div>

              <h2 className="register-heading">{t.login.registerTitle}</h2>
              <p className="register-subtitle">
                {t.login.haveAccount}{" "}
                <Link to="/login" className="register-link">
                  {t.login.loginNow}
                </Link>
              </p>

              {errors.server && <div className="register-error main">{errors.server}</div>}

              <form onSubmit={handleRegister} className="register-form">
                <div>
                  <label className="register-label">{t.login.emailLabel}</label>
                  <div className="register-input-wrap">
                    <Mail size={16} className="register-input-icon" />
                    <input
                      className={`register-input ${errors.email ? "invalid" : ""}`}
                      type="email"
                      placeholder="example@email.com"
                      value={form.email}
                      onChange={(e) => updateForm("email", e.target.value)}
                    />
                  </div>
                  {errors.email && <p className="register-field-error">{errors.email}</p>}
                </div>

                <div>
                  <label className="register-label">{t.login.passLabel}</label>
                  <div className="register-input-wrap">
                    <Lock size={16} className="register-input-icon" />
                    <input
                      className={`register-input password ${errors.password ? "invalid" : ""}`}
                      type={showPass ? "text" : "password"}
                      placeholder={lang === "vi" ? "Tối thiểu 8 ký tự" : "Minimum 8 characters"}
                      value={form.password}
                      onChange={(e) => updateForm("password", e.target.value)}
                    />
                    <button
                      type="button"
                      className="register-eye-btn"
                      onClick={() => setShowPass(!showPass)}
                    >
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>

                  {form.password && (
                    <div className={`register-strength ${strengthClasses[strength]}`}>
                      <div className="register-strength-bars">
                        {[1, 2, 3, 4].map((item) => (
                          <span key={item} className={item <= strength ? "active" : ""} />
                        ))}
                      </div>
                      <p>{strengthLabels[strength]}</p>
                    </div>
                  )}

                  {errors.password && <p className="register-field-error">{errors.password}</p>}
                </div>

                <div>
                  <label className="register-label">{t.login.confirmPassLabel}</label>
                  <div className="register-input-wrap">
                    <Lock size={16} className="register-input-icon" />
                    <input
                      className={`register-input password ${errors.confirmPassword ? "invalid" : ""}`}
                      type={showConfirm ? "text" : "password"}
                      placeholder={lang === "vi" ? "Nhập lại mật khẩu" : "Re-enter password"}
                      value={form.confirmPassword}
                      onChange={(e) => updateForm("confirmPassword", e.target.value)}
                    />
                    {form.confirmPassword && form.password === form.confirmPassword && (
                      <CheckCircle size={16} className="register-check-icon" />
                    )}
                    <button
                      type="button"
                      className="register-eye-btn"
                      onClick={() => setShowConfirm(!showConfirm)}
                    >
                      {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="register-field-error">{errors.confirmPassword}</p>
                  )}
                </div>

                <button type="submit" disabled={loading} className="register-submit-btn">
                  {loading ? (
                    <div className="register-loader" />
                  ) : (
                    <>
                      {lang === "vi" ? "Đăng ký & Xác thực Email" : "Register & Verify Email"} <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </form>

              <div className="register-security-box">
                <Shield size={16} className="register-security-icon" />
                <p>
                  {lang === "vi"
                    ? "Tài khoản của bạn được bảo vệ bằng xác thực OTP và bảo mật cấp ngân hàng."
                    : "Your account is protected with OTP verification and banking-grade security."}
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
