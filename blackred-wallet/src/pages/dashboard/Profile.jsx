import { useState, useRef, useEffect } from "react";
import { User, Camera, Phone, Mail, Lock, CheckCircle, RefreshCw, AlertCircle, Eye, EyeOff, ShieldCheck, X, Send } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { authAPI, getUploadUrl } from "../../services/api";

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
        const data = res.data || res.user || {};
        setUser({
          ...data,
          avatar: getUploadUrl(data.avatar),
        });
      } catch (err) {
        console.log("Load profile error:", err);
      }
    };

    loadProfile();
  }, []);

  // Avatar states
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [avatarSuccess, setAvatarSuccess] = useState(false);
  const fileInputRef = useRef(null);

  // Contact update states — email and phone are independent
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  // "email" | "phone" — which field triggered the OTP modal
  const [changeTarget, setChangeTarget] = useState("email");
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpInputs, setOtpInputs] = useState(["", "", "", "", "", ""]);
  const [otpError, setOtpError] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [contactSuccess, setContactSuccess] = useState("");
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

  // OTP modal is only used for email/phone contact changes (not password — password uses direct old-password verification)

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
      alert("Image size must be less than 2MB");
      return;
    }

    setAvatarLoading(true);

    try {
      const res = await authAPI.updateAvatar(file);

      const newFilename = res.user?.avatar || res.data?.avatar;
      const updatedUser = {
        ...user,
        avatar: getUploadUrl(newFilename) || user.avatar,
      };

      setUser(updatedUser);
      setAvatarSuccess(true);
      setTimeout(() => setAvatarSuccess(false), 2000);
    } catch (err) {
      console.log(err);
      alert(err.response?.data?.message || "Avatar upload failed. Please try again.");
    } finally {
      setAvatarLoading(false);
    }
  };
  //-------------------------------------

  // ─── Contact Change OTP Logic ─────────────────────────────────────────────
  // target: "email" | "phone"
  const handleRequestContactChange = async (target) => {
    setOtpError("");
    setContactSuccess("");

    if (target === "email") {
      if (!newEmail.trim()) {
      setOtpError("Please enter a new email.");
      return;
      }
      if (!/\S+@\S+\.\S+/.test(newEmail.trim())) {
        setOtpError("Invalid email format.");
        return;
      }
      if (newEmail.trim().toLowerCase() === user.email?.toLowerCase()) {
        setOtpError("New email must be different from current email.");
        return;
      }
    } else {
      if (!newPhone.trim()) {
        setOtpError("Please enter a new phone number.");
        return;
      }
      if (!/^0\d{9}$/.test(newPhone.trim())) {
        setOtpError("Invalid phone number (10 digits, starting with 0).");
        return;
      }
      if (newPhone.trim() === user.phone) {
        setOtpError("New phone number must be different from current.");
        return;
      }
    }

    setOtpSending(true);
    setChangeTarget(target);

    try {
      const payload = target === "email"
        ? { email: newEmail.trim() }
        : { phone: newPhone.trim() };

      const res = await authAPI.requestChangeContact(payload);

      if (res.success) {
        setShowOtpModal(true);
        setCountdown(60);
        setCanResend(false);
        setOtpInputs(["", "", "", "", "", ""]);
        setOtpError("");
      } else {
        setOtpError(res.message || "Failed to send OTP.");
      }
    } catch (err) {
      setOtpError(err.response?.data?.message || "Unable to send OTP. Please try again.");
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

  const handleVerifyContactChange = async () => {
    const entered = otpInputs.join("");

    if (entered.length < 6) {
      setOtpError("Please enter all 6 digits of the OTP code.");
      return;
    }

    setOtpLoading(true);
    setOtpError("");

    try {
      const res = await authAPI.verifyChangeContact({ otp: entered });

      if (res.success) {
        // Backend returns { success, data: { email, phone } }
        const updatedUser = {
          ...user,
          email: res.data?.email ?? user.email,
          phone: res.data?.phone ?? user.phone,
        };

        setUser(updatedUser);

        // Clear the input that was just updated
        if (changeTarget === "email") setNewEmail("");
        if (changeTarget === "phone") setNewPhone("");

        setShowOtpModal(false);
        const label = changeTarget === "email" ? "Email" : "Phone number";
        setContactSuccess(`✓ ${label} updated successfully!`);
        setTimeout(() => setContactSuccess(""), 4000);

        window.dispatchEvent(new Event("kyc_updated"));
      } else {
        setOtpError(res.message || "Incorrect OTP code.");
      }
    } catch (err) {
      setOtpError(err.response?.data?.message || "Verification failed. Please try again.");
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
      setPassError("Please enter your current password.");
      return;
    }
    if (!passForm.newPass || !passForm.confirmPass) {
      setPassError("Please fill in all new password fields.");
      return;
    }
    if (passForm.newPass.length < 8) {
      setPassError("New password must be at least 8 characters.");
      return;
    }
    if (passForm.newPass !== passForm.confirmPass) {
      setPassError("New passwords do not match.");
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
        setPassError(res.message || "Unable to change password.");
      }
    } catch (err) {
      setPassError(
        err.response?.data?.message || "System error. Please try again."
      );
    } finally {
      setPassLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setOtpError("");
    try {
      const payload = changeTarget === "email"
        ? { email: newEmail.trim() }
        : { phone: newPhone.trim() };
      await authAPI.requestChangeContact(payload);
      setCountdown(60);
      setCanResend(false);
      setOtpInputs(["", "", "", "", "", ""]);
    } catch (err) {
      setOtpError(err.response?.data?.message || "Failed to resend OTP.");
    }
  };

  // KYC Verification label
  const isKycVerified = user.kyc === true || user.kyc === "verified" || user.kycStatus === "verified";
  const isKycPending = !isKycVerified && (user.kycStatus === "pending" || user.kyc === "pending");

  return (
    <div style={{ maxWidth: 640, display: "flex", flexDirection: "column", gap: 24, paddingBottom: 40 }}>
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>Account Settings</h1>
        <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>Manage your profile picture, contact information, and security password.</p>
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
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>1. Profile Picture</h3>
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
            <p style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>{user.name || "User"}</p>
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{user.email}</p>
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
              Choose Photo
            </button>
          </div>
        </div>

        {avatarSuccess && (
          <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} style={{ color: "#22c55e", fontSize: 12, marginTop: 12, display: "flex", alignItems: "center", gap: 4 }}>
            ✓ Profile picture updated successfully!
          </motion.div>
        )}
      </motion.div>

      {/* CARD 2: UPDATE EMAIL & PHONE (independent sections) */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        style={{
          background: "var(--bg-card)", border: "1px solid var(--border)",
          borderRadius: 16, padding: 24, boxShadow: "0 4px 20px rgba(0, 0, 0, 0.01)"
        }}
      >
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>2. Email & Phone Number</h3>
        <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 16 }}>
          A verification OTP will be sent to your current email: <strong>{user.email}</strong>
        </p>

        {contactSuccess && (
          <div style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 10, padding: "10px 14px", marginBottom: 16, color: "#22c55e", fontSize: 13 }}>
            {contactSuccess}
          </div>
        )}

        {otpError && !showOtpModal && (
          <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, padding: "10px 14px", marginBottom: 16, color: "#ef4444", fontSize: 13 }}>
            {otpError}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* ── Email section ── */}
          <div style={{ background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius: 12, padding: 16 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 8 }}>
              Current email: <span style={{ color: "var(--text-primary)" }}>{user.email || "—"}</span>
            </p>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <div style={{ flex: 1, position: "relative" }}>
                <Mail size={15} style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                <input
                  type="email"
                  placeholder="Enter new email"
                  value={newEmail}
                  onChange={(e) => { setNewEmail(e.target.value); setOtpError(""); }}
                  style={{ width: "100%", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 14px 10px 38px", color: "#000000", fontSize: 13, outline: "none", boxSizing: "border-box" }}
                />
              </div>
              <button
                type="button"
                disabled={otpSending && changeTarget === "email"}
                onClick={() => handleRequestContactChange("email")}
                style={{
                  flexShrink: 0, background: "linear-gradient(135deg,#2563eb,#1d4ed8)",
                  color: "white", border: "none", borderRadius: 10, padding: "10px 16px",
                  fontWeight: 700, fontSize: 13, cursor: (otpSending && changeTarget === "email") ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap"
                }}
              >
                {otpSending && changeTarget === "email" ? (
                  <div style={{ width: 13, height: 13, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                ) : <Send size={13} />}
                {otpSending && changeTarget === "email" ? "Sending..." : "Change Email"}
              </button>
            </div>
          </div>

          {/* ── Phone section ── */}
          <div style={{ background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius: 12, padding: 16 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 8 }}>
              Current phone: <span style={{ color: "var(--text-primary)" }}>{user.phone || "Not set"}</span>
            </p>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <div style={{ flex: 1, position: "relative" }}>
                <Phone size={15} style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                <input
                  type="tel"
                  placeholder="Enter new phone number (e.g. 0912345678)"
                  value={newPhone}
                  onChange={(e) => { setNewPhone(e.target.value); setOtpError(""); }}
                  style={{ width: "100%", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 14px 10px 38px", color: "#000000", fontSize: 13, outline: "none", boxSizing: "border-box" }}
                />
              </div>
              <button
                type="button"
                disabled={otpSending && changeTarget === "phone"}
                onClick={() => handleRequestContactChange("phone")}
                style={{
                  flexShrink: 0, background: "linear-gradient(135deg,#2563eb,#1d4ed8)",
                  color: "white", border: "none", borderRadius: 10, padding: "10px 16px",
                  fontWeight: 700, fontSize: 13, cursor: (otpSending && changeTarget === "phone") ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap"
                }}
              >
                {otpSending && changeTarget === "phone" ? (
                  <div style={{ width: 13, height: 13, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                ) : <Send size={13} />}
                {otpSending && changeTarget === "phone" ? "Sending..." : "Change Phone"}
              </button>
            </div>
          </div>
        </div>
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
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>3. Change Password</h3>

        {passError && (
          <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, padding: "10px 14px", marginBottom: 16, color: "#ef4444", fontSize: 13 }}>
            {passError}
          </div>
        )}

        {passSuccess && (
          <div style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 10, padding: "10px 14px", marginBottom: 16, color: "#22c55e", fontSize: 13 }}>
            ✓ Password updated successfully!
          </div>
        )}

        <form onSubmit={handleChangePasswordSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Current Password */}
          <div>
            <label style={{ fontSize: 12, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>Current Password</label>
            <div style={{ position: "relative" }}>
              <Lock size={15} style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
              <input
                type={showPassCurrent ? "text" : "password"}
                placeholder="Enter current password"
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
              <label style={{ fontSize: 12, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>New Password</label>
              <div style={{ position: "relative" }}>
                <Lock size={15} style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                <input
                  type={showPassNew ? "text" : "password"}
                  placeholder="Minimum 8 characters"
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
              <label style={{ fontSize: 12, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>Confirm New Password</label>
              <div style={{ position: "relative" }}>
                <Lock size={15} style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                <input
                  type={showPassConfirm ? "text" : "password"}
                  placeholder="Re-enter new password"
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
            ) : "Change Password"}
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
                  Verify New Information
                </h3>
                <p style={{ color: "var(--text-secondary)", fontSize: 13, lineHeight: 1.6, marginBottom: 20 }}>
                  An OTP code has been sent to your registered email:<br />
                  <strong style={{ color: "var(--primary)" }}>{user.email}</strong>
                  <br /><span style={{ fontSize: 12 }}>Check your inbox (including Spam folder)</span>
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
                      <RefreshCw size={12} /> Resend OTP Code
                    </button>
                  ) : (
                    <span>Resend in {countdown}s</span>
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
                    Cancel
                  </button>
                  <button
                    onClick={handleVerifyContactChange}
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
                    ) : "Confirm & Update"}
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
