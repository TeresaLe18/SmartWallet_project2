import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Wallet, Mail, RefreshCw, CheckCircle, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { authAPI } from "../services/api";

export default function VerifyOtpPage() {
  const navigate = useNavigate();
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const inputRefs = useRef([]);
  const email = typeof window !== "undefined" ? localStorage.getItem("bw_pending_email") || "your@email.com" : "your@email.com";

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
    inputRefs.current[Math.min(paste.length, 5)]?.focus();
  };

  const handleVerify = async () => {
    const code = otp.join("");
    if (code.length < 6) { setError("Vui lòng nhập đủ 6 số OTP"); return; }
    setLoading(true);
    setError("");
    try {
      const res = await authAPI.verifyOtp(email, code);
      setLoading(false);
      if (res.success) {
        setSuccess(true);
        setTimeout(() => {
          localStorage.removeItem("bw_pending_email");
          navigate("/login");
        }, 2000);
      } else {
        setError(res.message || "Xác thực OTP không thành công.");
      }
    } catch (err) {
      setLoading(false);
      console.error("OTP verification request error:", err);
      setError(err.response?.data?.message || "Mã OTP không hợp lệ hoặc đã hết hạn.");
    }
  };

  const handleResend = async () => {
    setCountdown(60);
    setCanResend(false);
    setOtp(["", "", "", "", "", ""]);
    setError("");
    inputRefs.current[0]?.focus();
    
    try {
      const res = await authAPI.resendOtp(email);
      if (res.success) {
        alert(`Mã OTP mới đã được gửi tới email ${email} của bạn. Vui lòng kiểm tra hòm thư.`);
      } else {
        setError(res.message || "Gửi lại OTP không thành công.");
      }
    } catch (err) {
      console.error("OTP resend request error:", err);
      setError(err.response?.data?.message || "Lỗi hệ thống khi gửi lại mã OTP.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "var(--bg-dark)" }}>
      <div style={{ position: "fixed", inset: 0, zIndex: 0 }}>
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 700, height: 700, background: "radial-gradient(circle, rgba(37,99,235,0.07) 0%, transparent 70%)", borderRadius: "50%" }} />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        style={{ width: "100%", maxWidth: 440, position: "relative", zIndex: 1 }}
      >
        {success ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ textAlign: "center", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 20, padding: 48 }}
          >
            <div style={{ width: 80, height: 80, background: "rgba(34,197,94,0.15)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
              <CheckCircle size={40} style={{ color: "#22c55e" }} />
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Xác thực thành công!</h2>
            <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>Tài khoản của bạn đã được kích hoạt. Đang chuyển hướng...</p>
          </motion.div>
        ) : (
          <>
            {/* Back button */}
            <button
              onClick={() => navigate(-1)}
              style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", fontSize: 14, marginBottom: 24 }}
            >
              <ArrowLeft size={16} /> Quay lại
            </button>

            {/* Card */}
            <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 20, padding: 40, textAlign: "center" }}>
              {/* Icon */}
              <div style={{ width: 72, height: 72, background: "linear-gradient(135deg, rgba(37,99,235,0.2), rgba(29,78,216,0.1))", border: "1px solid rgba(37,99,235,0.2)", borderRadius: 20, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
                <Mail size={32} style={{ color: "#2563eb" }} />
              </div>

              <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Xác thực Email</h1>
              <p style={{ color: "var(--text-secondary)", fontSize: 14, lineHeight: 1.6, marginBottom: 32 }}>
                Chúng tôi đã gửi mã OTP 6 số đến<br />
                <strong style={{ color: "var(--text-secondary)" }}>{email}</strong>
              </p>

              {/* OTP Inputs */}
              <div style={{ display: "flex", gap: 10, justifyContent: "center", marginBottom: 24 }}>
                {otp.map((digit, i) => (
                  <motion.input
                    key={i}
                    ref={el => inputRefs.current[i] = el}
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
                    style={{
                      width: 52, height: 60, textAlign: "center", fontSize: 24, fontWeight: 700,
                      background: digit ? "rgba(37,99,235,0.1)" : "var(--bg-card2)",
                      border: `2px solid ${digit ? "#2563eb" : (error ? "#ef4444" : "var(--border)")}`,
                      borderRadius: 12, color: "#000000", outline: "none", transition: "all 0.2s"
                    }}
                    onFocus={(e) => { e.target.style.borderColor = "#2563eb"; e.target.style.boxShadow = "0 0 0 3px rgba(37,99,235,0.15)"; }}
                    onBlur={(e) => { e.target.style.boxShadow = "none"; if (!digit) e.target.style.borderColor = error ? "#ef4444" : "var(--border)"; }}
                  />
                ))}
              </div>

              {error && (
                <p style={{ color: "#ef4444", fontSize: 13, marginBottom: 16 }}>{error}</p>
              )}

              {/* Verify button */}
              <button
                onClick={handleVerify}
                disabled={loading}
                style={{
                  width: "100%",
                  background: loading ? "#3f3f46" : "linear-gradient(135deg, #2563eb, #1d4ed8)",
                  color: "#000000", border: "none", borderRadius: 10,
                  padding: "14px", fontWeight: 700, fontSize: 15,
                  cursor: loading ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  transition: "all 0.3s", marginBottom: 20
                }}
              >
                {loading ? (
                  <div style={{ width: 20, height: 20, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                ) : "Xác nhận OTP"}
              </button>

              {/* Resend */}
              <div style={{ color: "var(--text-muted)", fontSize: 14 }}>
                {canResend ? (
                  <button
                    onClick={handleResend}
                    style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "#2563eb", cursor: "pointer", fontWeight: 600, fontSize: 14 }}
                  >
                    <RefreshCw size={14} /> Gửi lại mã OTP
                  </button>
                ) : (
                  <span>
                    Gửi lại sau{" "}
                    <span style={{ color: "#2563eb", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                      {String(Math.floor(countdown / 60)).padStart(2, "0")}:{String(countdown % 60).padStart(2, "0")}
                    </span>
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
