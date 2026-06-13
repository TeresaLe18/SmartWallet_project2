import { useState, useRef, useEffect } from "react";
import { User, Camera, Phone, Mail, Lock, CheckCircle, RefreshCw, AlertCircle, Eye, EyeOff, ShieldCheck, X, Send } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { authAPI } from "../../services/api";

export default function ProfilePage() {
  // 1. Fetch current logged-in user from localStorage
  const [user, setUser] = useState({
    avatar: "",
    email: "",
    phone: "",
  });

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await authAPI.getProfile();
        setUser(res.data);
      } catch (err) {
        console.log("Loi;", err);
      }
    };

    loadProfile();
  }, []);

  // Avatar states
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [avatarSuccess, setAvatarSuccess] = useState(false);
  const fileInputRef = useRef(null);

  // Email & Phone update states
  const [emailForm, setEmailForm] = useState({
    email: user.email || "",
    phone: user.phone || ""
  });
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpInputs, setOtpInputs] = useState(["", "", "", "", "", ""]);
  const [otpError, setOtpError] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [emailPhoneSuccess, setEmailPhoneSuccess] = useState(false);
  const otpRefs = useRef([]);

  // Password change states
  const [passForm, setPassForm] = useState({
    currentPass: "",
    newPass: "",
    confirmPass: ""
  });
  const [showPassCurrent, setShowPassCurrent] = useState(false);
  const [showPassNew, setShowPassNew] = useState(false);
  const [showPassConfirm, setShowPassConfirm] = useState(false);
  const [passError, setPassError] = useState("");
  const [passSuccess, setPassSuccess] = useState(false);
  const [passLoading, setPassLoading] = useState(false);

  // Modal mode: "profile" = update email/phone, "password" = change password
  const [otpModalMode, setOtpModalMode] = useState("profile");

  // Resend OTP Countdown
  useEffect(() => {
    let timer;
    if (showOtpModal && countdown > 0) {
      timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    } else if (countdown === 0) {
      setCanResend(true);
    }
    return () => clearTimeout(timer);
  }, [showOtpModal, countdown]);

  // Handle Avatar selection & base64 conversion
  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("Kích thước ảnh phải < 2MB");
      return;
    }

    setAvatarLoading(true);

    try {
      const res = await userService.updateAvatar(file);

      // backend trả avatar mới
      const updatedUser = {
        ...user,
        avatar: res.data.avatar,
      };

      setUser(updatedUser);

      setAvatarSuccess(true);
      setTimeout(() => setAvatarSuccess(false), 2000);
    } catch (err) {
      console.log(err);
      alert("Upload avatar thất bại");
    } finally {
      setAvatarLoading(false);
    }
  };
  //-------------------------------------

  // ─── Email & Phone OTP Logic (Real Email) ────────────────────────────────────
  const handleRequestEmailPhoneChange = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setOtpError("");

    if (!emailForm.email) {
      setOtpError("Email không được để trống.");
      return;
    }
    if (!/\S+@\S+\.\S+/.test(emailForm.email)) {
      setOtpError("Email không hợp lệ.");
      return;
    }

    setOtpSending(true);

    try {
      const res = await authAPI.requestChangeContact({
        newEmail: emailForm.email,
        newPhone: emailForm.phone,
      });

      if (res.success) {
        setOtpModalMode("profile");
        setShowOtpModal(true);
        setCountdown(60);
        setCanResend(false);
        setOtpInputs(["", "", "", "", "", ""]);
      } else {
        setOtpError(res.message || "Gửi OTP thất bại.");
      }
    } catch (err) {
      setOtpError(
        err.response?.data?.message || "Không thể gửi OTP. Vui lòng thử lại."
      );
    } finally {
      setOtpSending(false);
    }
  };

  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otpInputs];
    newOtp[index] = value.slice(-1);
    setOtpInputs(newOtp);
    setOtpError("");
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otpInputs[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyEmailPhoneChange = async () => {
    const entered = otpInputs.join("");

    if (entered.length < 6) {
      setOtpError("Vui lòng nhập đủ 6 chữ số mã OTP.");
      return;
    }

    setOtpLoading(true);
    setOtpError("");

    try {
      const res = await authAPI.verifyChangeContact({
        otp: entered,
        email: emailForm.email !== user.email ? emailForm.email : undefined,
        phone: emailForm.phone !== user.phone ? emailForm.phone : undefined,
      });

      if (res.success) {
        const updatedUser = {
          ...user,
          email: res.data?.email || emailForm.email,
          phone: res.data?.phone || emailForm.phone,
        };

        setUser(updatedUser);
        setShowOtpModal(false);

        setEmailPhoneSuccess(true);
        setTimeout(() => setEmailPhoneSuccess(false), 3000);

        window.dispatchEvent(new Event("kyc_updated"));
      } else {
        setOtpError(res.message || "Mã OTP không chính xác.");
      }
    } catch (err) {
      setOtpError(
        err.response?.data?.message || "Xác thực thất bại. Vui lòng thử lại."
      );
    } finally {
      setOtpLoading(false);
    }
  };

  // ─── Password Change Logic (with Real OTP) ───────────────────────────────────
  const handleChangePasswordSubmit = async (e) => {
    e.preventDefault();
    setPassError("");
    setPassSuccess(false);

    if (!passForm.currentPass) {
      setPassError("Vui lòng nhập mật khẩu hiện tại.");
      return;
    }
    if (!passForm.newPass || !passForm.confirmPass) {
      setPassError("Vui lòng điền đầy đủ mật khẩu mới.");
      return;
    }
    if (passForm.newPass.length < 8) {
      setPassError("Mật khẩu mới phải tối thiểu 8 ký tự.");
      return;
    }
    if (passForm.newPass !== passForm.confirmPass) {
      setPassError("Mật khẩu xác nhận mới không khớp.");
      return;
    }

    setPassLoading(true);
    setPassError("");

    try {
      // gọi backend password endpoint
      const res = await authAPI.changePassword({
        oldPassword: passForm.currentPass,
        newPassword: passForm.newPass,
      });

      if (res.success) {
        setPassSuccess(true);
        setPassForm({
          currentPass: "",
          newPass: "",
          confirmPass: "",
        });

        setTimeout(() => setPassSuccess(false), 3000);
      } else {
        setPassError(res.message || "Không thể đổi mật khẩu.");
      }
    } catch (err) {
      setPassError(
        err.response?.data?.message || "Lỗi hệ thống. Vui lòng thử lại."
      );
    } finally {
      setPassLoading(false);
    }
  };

  const handleVerifyPasswordChange = async () => {
    const entered = otpInputs.join("");
    if (entered.length < 6) {
      setOtpError("Vui lòng nhập đủ 6 chữ số mã OTP.");
      return;
    }

    setOtpLoading(true);
    setOtpError("");
    try {
      const res = await authAPI.verifyProfileOtp(
        entered,
        undefined,
        undefined,
        passForm.newPass,
        passForm.currentPass
      );
      if (res.success) {
        setShowOtpModal(false);
        setPassSuccess(true);
        setPassForm({ currentPass: "", newPass: "", confirmPass: "" });
        setTimeout(() => setPassSuccess(false), 3000);
      } else {
        setOtpError(res.message || "Mã OTP không chính xác.");
      }
    } catch (err) {
      setOtpError(err.response?.data?.message || "Xác thực thất bại. Vui lòng thử lại.");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResendOtp = () => {
    if (otpModalMode === "password") {
      // Re-request OTP for password change
      authAPI.sendProfileOtp({ newPassword: passForm.newPass, currentPassword: passForm.currentPass })
        .then(() => {
          setCountdown(60);
          setCanResend(false);
          setOtpInputs(["", "", "", "", "", ""]);
          setOtpError("");
        })
        .catch((err) => setOtpError(err.response?.data?.message || "Gửi lại OTP thất bại."));
    } else {
      // Re-request OTP for profile update
      authAPI.sendProfileOtp({ newEmail: emailForm.email, newPhone: emailForm.phone })
        .then(() => {
          setCountdown(60);
          setCanResend(false);
          setOtpInputs(["", "", "", "", "", ""]);
          setOtpError("");
        })
        .catch((err) => setOtpError(err.response?.data?.message || "Gửi lại OTP thất bại."));
    }
  };

  // KYC Verification label
  const isKycVerified = user.kyc === true || user.kyc === "verified" || user.kycStatus === "verified";
  const isKycPending = !isKycVerified && (user.kycStatus === "pending" || user.kyc === "pending");

  return (
    <div style={{ maxWidth: 640, display: "flex", flexDirection: "column", gap: 24, paddingBottom: 40 }}>
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>Cài đặt tài khoản</h1>
        <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>Quản lý ảnh đại diện, thông tin liên lạc và mật khẩu bảo mật của bạn.</p>
      </div>

      {/* CARD 1: UPDATE AVATAR */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          background: "var(--bg-card)", border: "1px solid var(--border)",
          borderRadius: 16, padding: 24, boxShadow: "0 4px 20px rgba(0, 0, 0, 0.01)"
        }}
      >
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>1. Ảnh đại diện</h3>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ position: "relative", cursor: "pointer" }} onClick={handleAvatarClick}>
            <div style={{
              width: 80, height: 80, borderRadius: "50%",
              background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
              display: "flex", alignItems: "center", justifyContent: "center",
              overflow: "hidden", border: "2px solid var(--border)"
            }}>
              {user.avatar ? (
                <img src={user.avatar} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <User size={36} color="white" />
              )}
            </div>
            {avatarLoading ? (
              <div style={{
                position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)",
                borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center"
              }}>
                <div style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
              </div>
            ) : (
              <button style={{
                position: "absolute", bottom: -2, right: -2, width: 26, height: 26,
                borderRadius: "50%", background: "var(--bg-card2)", border: "2px solid var(--border)",
                display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer"
              }}>
                <Camera size={12} style={{ color: "var(--text-secondary)" }} />
              </button>
            )}
          </div>

          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>{user.name || "Người dùng"}</p>
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{user.email}</p>

            {/* Status indicator */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}>
              {isKycVerified ? (
                <span style={{ fontSize: 11, color: "#22c55e", background: "rgba(34,197,94,0.08)", padding: "3px 8px", borderRadius: 20, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <ShieldCheck size={12} /> Đã KYC
                </span>
              ) : isKycPending ? (
                <span style={{ fontSize: 11, color: "#f59e0b", background: "rgba(245,158,11,0.06)", padding: "3px 8px", borderRadius: 20, fontWeight: 600 }}>
                  ⏳ Chờ duyệt KYC
                </span>
              ) : (
                <span style={{ fontSize: 11, color: "#ef4444", background: "rgba(239,68,68,0.08)", padding: "3px 8px", borderRadius: 20, fontWeight: 600 }}>
                  ⚠️ Chưa xác thực KYC
                </span>
              )}
            </div>
          </div>

          <div>
            <input type="file" ref={fileInputRef} onChange={handleAvatarChange} accept="image/*" style={{ display: "none" }} />
            <button
              onClick={handleAvatarClick}
              style={{
                background: "var(--bg-card2)", border: "1px solid var(--border)",
                borderRadius: 10, padding: "8px 16px", color: "var(--text-primary)",
                fontSize: 13, fontWeight: 600, cursor: "pointer"
              }}
            >
              Chọn ảnh
            </button>
          </div>
        </div>

        {avatarSuccess && (
          <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} style={{ color: "#22c55e", fontSize: 12, marginTop: 12, display: "flex", alignItems: "center", gap: 4 }}>
            ✓ Ảnh đại diện đã được cập nhật thành công!
          </motion.div>
        )}
      </motion.div>

      {/* CARD 2: UPDATE EMAIL & PHONE */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        style={{
          background: "var(--bg-card)", border: "1px solid var(--border)",
          borderRadius: 16, padding: 24, boxShadow: "0 4px 20px rgba(0, 0, 0, 0.01)"
        }}
      >
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>2. Email & Số điện thoại</h3>
        <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 16 }}>
          Mã OTP xác thực sẽ được gửi tới email hiện tại: <strong>{user.email}</strong>
        </p>

        {emailPhoneSuccess && (
          <div style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 10, padding: "10px 14px", marginBottom: 16, color: "#22c55e", fontSize: 13 }}>
            ✓ Cập nhật Email và Số điện thoại thành công!
          </div>
        )}

        {otpError && !showOtpModal && (
          <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, padding: "10px 14px", marginBottom: 16, color: "#ef4444", fontSize: 13 }}>
            {otpError}
          </div>
        )}

        <form onSubmit={handleRequestEmailPhoneChange} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {/* Email */}
            <div>
              <label style={{ fontSize: 12, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>Email mới</label>
              <div style={{ position: "relative" }}>
                <Mail size={15} style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                <input
                  type="email"
                  value={emailForm.email}
                  onChange={(e) => setEmailForm({ ...emailForm, email: e.target.value })}
                  style={{ width: "100%", background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius: 10, padding: "11px 14px 11px 38px", color: "#000000", fontSize: 13, outline: "none" }}
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label style={{ fontSize: 12, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>Số điện thoại</label>
              <div style={{ position: "relative" }}>
                <Phone size={15} style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                <input
                  type="tel"
                  placeholder="Chưa cập nhật"
                  value={emailForm.phone}
                  onChange={(e) => setEmailForm({ ...emailForm, phone: e.target.value })}
                  style={{ width: "100%", background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius: 10, padding: "11px 14px 11px 38px", color: "#000000", fontSize: 13, outline: "none" }}
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={otpSending}
            style={{
              alignSelf: "flex-end", background: "linear-gradient(135deg,#2563eb,#1d4ed8)",
              color: "white", border: "none", borderRadius: 10, padding: "10px 20px",
              fontWeight: 700, fontSize: 13, cursor: otpSending ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", gap: 8, transition: "all 0.2s"
            }}
          >
            {otpSending ? (
              <div style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
            ) : <Send size={14} />}
            {otpSending ? "Đang gửi OTP..." : "Cập nhật & nhận OTP qua email"}
          </button>
        </form>
      </motion.div>

      {/* CARD 3: CHANGE PASSWORD */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        style={{
          background: "var(--bg-card)", border: "1px solid var(--border)",
          borderRadius: 16, padding: 24, boxShadow: "0 4px 20px rgba(0, 0, 0, 0.01)"
        }}
      >
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>3. Thay đổi mật khẩu</h3>
        <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 16 }}>
          Mã OTP xác thực sẽ được gửi tới email: <strong>{user.email}</strong>
        </p>

        {passError && (
          <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, padding: "10px 14px", marginBottom: 16, color: "#ef4444", fontSize: 13 }}>
            {passError}
          </div>
        )}

        {passSuccess && (
          <div style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 10, padding: "10px 14px", marginBottom: 16, color: "#22c55e", fontSize: 13 }}>
            ✓ Mật khẩu đã được cập nhật thành công!
          </div>
        )}

        <form onSubmit={handleChangePasswordSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Current Password */}
          <div>
            <label style={{ fontSize: 12, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>Mật khẩu hiện tại</label>
            <div style={{ position: "relative" }}>
              <Lock size={15} style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
              <input
                type={showPassCurrent ? "text" : "password"}
                placeholder="Nhập mật khẩu hiện tại"
                value={passForm.currentPass}
                onChange={(e) => setPassForm({ ...passForm, currentPass: e.target.value })}
                style={{ width: "100%", background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius: 10, padding: "11px 42px 11px 38px", color: "#000000", fontSize: 13, outline: "none" }}
              />
              <button
                type="button"
                onClick={() => setShowPassCurrent(!showPassCurrent)}
                style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}
              >
                {showPassCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {/* New Password */}
            <div>
              <label style={{ fontSize: 12, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>Mật khẩu mới</label>
              <div style={{ position: "relative" }}>
                <Lock size={15} style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                <input
                  type={showPassNew ? "text" : "password"}
                  placeholder="Tối thiểu 8 ký tự"
                  value={passForm.newPass}
                  onChange={(e) => setPassForm({ ...passForm, newPass: e.target.value })}
                  style={{ width: "100%", background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius: 10, padding: "11px 42px 11px 38px", color: "#000000", fontSize: 13, outline: "none" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassNew(!showPassNew)}
                  style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}
                >
                  {showPassNew ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label style={{ fontSize: 12, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>Xác nhận mật khẩu mới</label>
              <div style={{ position: "relative" }}>
                <Lock size={15} style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                <input
                  type={showPassConfirm ? "text" : "password"}
                  placeholder="Nhập lại mật khẩu mới"
                  value={passForm.confirmPass}
                  onChange={(e) => setPassForm({ ...passForm, confirmPass: e.target.value })}
                  style={{ width: "100%", background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius: 10, padding: "11px 42px 11px 38px", color: "#000000", fontSize: 13, outline: "none" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassConfirm(!showPassConfirm)}
                  style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}
                >
                  {showPassConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={passLoading}
            style={{
              alignSelf: "flex-end", background: "linear-gradient(135deg,#2563eb,#1d4ed8)",
              color: "white", border: "none", borderRadius: 10, padding: "10px 20px",
              fontWeight: 700, fontSize: 13, cursor: passLoading ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", gap: 8, transition: "all 0.2s", marginTop: 4
            }}
          >
            {passLoading ? (
              <div style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
            ) : "Đổi mật khẩu"}
          </button>
        </form>
      </motion.div>

      {/* ─── OTP CONFIRMATION MODAL (shared for profile & password) ─────────── */}
      <AnimatePresence>
        {showOtpModal && (
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
              {/* Close button */}
              <button
                onClick={() => setShowOtpModal(false)}
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

              <div style={{ textAlign: "center" }}>
                <div style={{ width: 56, height: 56, background: "rgba(37,99,235,0.08)", borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
                  <Mail size={24} style={{ color: "var(--primary)" }} />
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: "var(--text-primary)", marginBottom: 8 }}>
                  {otpModalMode === "password" ? "Xác minh đổi mật khẩu" : "Xác minh thông tin mới"}
                </h3>
                <p style={{ color: "var(--text-secondary)", fontSize: 13, lineHeight: 1.6, marginBottom: 20 }}>
                  Mã OTP đã được gửi tới email đăng ký của bạn:<br />
                  <strong style={{ color: "var(--primary)" }}>{user.email}</strong>
                  <br /><span style={{ fontSize: 12 }}>Kiểm tra hòm thư (bao gồm mục Spam)</span>
                </p>

                {otpError && (
                  <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 10, padding: "10px 14px", marginBottom: 16, color: "#ef4444", fontSize: 13 }}>
                    {otpError}
                  </div>
                )}

                {/* OTP Boxes */}
                <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 24 }}>
                  {otpInputs.map((digit, i) => (
                    <input
                      key={i}
                      ref={el => otpRefs.current[i] = el}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      style={{
                        width: 44, height: 48, textAlign: "center", fontSize: 20, fontWeight: 700,
                        background: digit ? "rgba(37,99,235,0.08)" : "var(--bg-card2)",
                        border: `2px solid ${digit ? "var(--primary)" : "var(--border)"}`,
                        borderRadius: 10, color: "#000000", outline: "none"
                      }}
                    />
                  ))}
                </div>

                {/* Resend area */}
                <div style={{ display: "flex", justifyContent: "center", alignItems: "center", fontSize: 12, color: "var(--text-muted)", marginBottom: 24 }}>
                  {canResend ? (
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      style={{ background: "none", border: "none", color: "var(--primary)", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
                    >
                      <RefreshCw size={12} /> Gửi lại mã OTP
                    </button>
                  ) : (
                    <span>Gửi lại mã sau {countdown}s</span>
                  )}
                </div>

                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    onClick={() => setShowOtpModal(false)}
                    style={{
                      flex: 1, background: "var(--bg-card2)", border: "1px solid var(--border)",
                      color: "var(--text-secondary)", borderRadius: 10, padding: "12px", fontWeight: 600,
                      fontSize: 14, cursor: "pointer"
                    }}
                  >
                    Hủy
                  </button>
                  <button
                    onClick={otpModalMode === "password" ? handleVerifyPasswordChange : handleVerifyEmailPhoneChange}
                    disabled={otpLoading}
                    style={{
                      flex: 2, background: "linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)",
                      color: "white", border: "none", borderRadius: 10, padding: "12px", fontWeight: 700,
                      fontSize: 14, cursor: otpLoading ? "not-allowed" : "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 8
                    }}
                  >
                    {otpLoading ? (
                      <div style={{ width: 18, height: 18, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                    ) : "Xác nhận & Cập nhật"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
