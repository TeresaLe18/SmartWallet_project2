import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Mail, RefreshCw, CheckCircle, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { authAPI } from "../services/api";
import { useLanguage } from "../context/LanguageContext";
import "./VerifyOtp.css";

export default function VerifyOtpPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, lang } = useLanguage();
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const inputRefs = useRef([]);
  const email = typeof window !== "undefined" ? localStorage.getItem("bw_pending_email") || "your@email.com" : "your@email.com";

  useEffect(() => {
    if (location.state?.message) {
      setInfoMessage(location.state.message);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [countdown]);

  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    setError("");
    setInfoMessage("");
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const paste = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    const newOtp = [...otp];
    paste.split("").forEach((ch, i) => { newOtp[i] = ch; });
    setOtp(newOtp);
    setError("");
    setInfoMessage("");
    inputRefs.current[Math.min(paste.length, 5)]?.focus();
  };

  const handleVerify = async () => {
    const code = otp.join("");
    if (code.length < 6) {
      setError(t.login.enterOtp);
      return;
    }
    setLoading(true);
    setError("");
    setInfoMessage("");
    try {
      const res = await authAPI.verifyOtp(email, code);
      if (res.success) {
        setSuccess(true);
        setTimeout(() => {
          localStorage.removeItem("bw_pending_email");
          navigate("/login", {
            state: {
              message:
                lang === "vi"
                  ? "Xác thực email thành công! Bạn có thể đăng nhập ngay bây giờ."
                  : "Email verified successfully! You can sign in now.",
            },
          });
        }, 2000);
      } else {
        setError(res.message || t.login.otpExpiredAlert);
      }
    } catch (err) {
      console.error("OTP verification request error:", err);
      setError(err.response?.data?.message || t.login.otpExpiredAlert);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setCountdown(60);
    setCanResend(false);
    setOtp(["", "", "", "", "", ""]);
    setError("");
    setInfoMessage("");
    setResending(true);
    inputRefs.current[0]?.focus();

    try {
      const res = await authAPI.resendOtp(email);
      if (res.success) {
        setInfoMessage(
          lang === "vi"
            ? `Mã OTP mới đã được gửi đến ${email}. Vui lòng kiểm tra hộp thư của bạn (kể cả thư mục spam).`
            : `A new OTP code has been sent to ${email}. Please check your inbox (including spam/junk folder).`
        );
      } else {
        setError(res.message || (lang === "vi" ? "Gửi lại OTP thất bại." : "Failed to resend OTP."));
      }
    } catch (err) {
      console.error("OTP resend request error:", err);
      setError(
        err.response?.data?.message ||
          (lang === "vi" ? "Lỗi hệ thống khi gửi lại mã OTP." : "System error while resending OTP code.")
      );
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="verify-otp-page">
      <div className="verify-otp-bg" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="verify-otp-shell"
      >
        {success ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="verify-otp-success-card"
          >
            <div className="verify-otp-success-icon-wrap">
              <CheckCircle size={40} className="verify-otp-success-icon" />
            </div>
            <h2>{lang === "vi" ? "Xác thực thành công!" : "Verification Successful!"}</h2>
            <p>
              {lang === "vi"
                ? "Tài khoản của bạn đã được kích hoạt. Đang chuyển đến trang đăng nhập..."
                : "Your account has been activated. Redirecting to sign in..."}
            </p>
          </motion.div>
        ) : (
          <>
            <button type="button" className="verify-otp-back" onClick={() => navigate(-1)}>
              <ArrowLeft size={16} /> {lang === "vi" ? "Quay lại" : "Go Back"}
            </button>

            <div className="verify-otp-card">
              <div className="verify-otp-icon-wrap">
                <Mail size={32} className="verify-otp-mail-icon" />
              </div>

              <h1>{lang === "vi" ? "Xác thực Email" : "Email Verification"}</h1>
              <p className="verify-otp-desc">
                {lang === "vi" ? "Chúng tôi đã gửi mã OTP 6 chữ số đến" : "We've sent a 6-digit OTP code to"}
                <br />
                <strong>{email}</strong>
              </p>

              {infoMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="verify-otp-info"
                >
                  <CheckCircle size={18} />
                  <span>{infoMessage}</span>
                </motion.div>
              )}

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="verify-otp-error"
                >
                  {error}
                </motion.div>
              )}

              <div className="verify-otp-inputs">
                {otp.map((digit, i) => (
                  <motion.input
                    key={i}
                    ref={(el) => { inputRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    onPaste={handlePaste}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.07 }}
                    className={`verify-otp-input ${digit ? "filled" : ""} ${error ? "invalid" : ""}`}
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={handleVerify}
                disabled={loading}
                className="verify-otp-submit"
              >
                {loading ? <div className="verify-otp-spinner" /> : (lang === "vi" ? "Xác nhận OTP" : "Verify OTP")}
              </button>

              <div className="verify-otp-resend">
                {canResend ? (
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resending}
                    className="verify-otp-resend-btn"
                  >
                    <RefreshCw size={14} className={resending ? "spinning" : ""} />
                    {resending
                      ? (lang === "vi" ? "Đang gửi..." : "Sending...")
                      : (lang === "vi" ? "Gửi lại OTP" : "Resend OTP")}
                  </button>
                ) : (
                  <span>
                    {lang === "vi" ? "Gửi lại sau" : "Resend in"}{" "}
                    <strong>
                      {String(Math.floor(countdown / 60)).padStart(2, "0")}:{String(countdown % 60).padStart(2, "0")}
                    </strong>
                  </span>
                )}
              </div>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
