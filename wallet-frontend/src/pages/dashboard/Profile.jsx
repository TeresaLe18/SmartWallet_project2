import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { User, Camera, Phone, Mail, Lock, CheckCircle, RefreshCw, AlertCircle, Eye, EyeOff, ShieldCheck, X, Send, UserX, KeyRound } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { authAPI, getUploadUrl } from "../../services/api";
import { useLanguage } from "../../context/LanguageContext";

export default function ProfilePage() {
  const navigate = useNavigate();
  const { t, lang } = useLanguage();

  // 1. Fetch current logged-in user from localStorage
  const [user, setUser] = useState({
    avatar: "",
    email: "",
    phone: "",
  });

  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameVal, setEditNameVal] = useState("");

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await authAPI.getProfile();
        const data = res.data || res.user || {};
        const local = JSON.parse(localStorage.getItem("bw_user") || "{}");
        const emailPrefix = data.email?.split("@")[0] || "";
        let finalName = data.full_name || local.name || emailPrefix || "User";

        if (local.name && local.name !== emailPrefix) {
          finalName = local.name;
        } else if (data.full_name) {
          finalName = data.full_name;
        }

        setUser({
          ...data,
          name: finalName,
          avatar: getUploadUrl(data.avatar),
          has_pin: data.has_pin,
          pin_locked_until: data.pin_locked_until,
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

  // PIN change states
  const [pinForm, setPinForm] = useState({ currentPin: "", newPin: "", confirmPin: "" });
  const [pinError, setPinError] = useState("");
  const [pinSuccess, setPinSuccess] = useState(false);
  const [pinSuccessMessage, setPinSuccessMessage] = useState("");
  const [pinLoading, setPinLoading] = useState(false);

  // Forgot PIN states
  const [showForgotPinModal, setShowForgotPinModal] = useState(false);
  const [forgotPinOtpInputs, setForgotPinOtpInputs] = useState(["", "", "", "", "", ""]);
  const [forgotPinForm, setForgotPinForm] = useState({ newPin: "", confirmPin: "" });
  const [forgotPinError, setForgotPinError] = useState("");
  const [forgotPinLoading, setForgotPinLoading] = useState(false);
  const [forgotPinSending, setForgotPinSending] = useState(false);
  const [forgotPinCountdown, setForgotPinCountdown] = useState(60);
  const [forgotPinCanResend, setForgotPinCanResend] = useState(false);
  const forgotPinOtpRefs = useRef([]);

  // Create PIN states
  const [showCreatePinModal, setShowCreatePinModal] = useState(false);
  const [createPinOtpInputs, setCreatePinOtpInputs] = useState(["", "", "", "", "", ""]);
  const [createPinForm, setCreatePinForm] = useState({ newPin: "", confirmPin: "" });
  const [createPinError, setCreatePinError] = useState("");
  const [createPinLoading, setCreatePinLoading] = useState(false);
  const [createPinSending, setCreatePinSending] = useState(false);
  const [createPinCountdown, setCreatePinCountdown] = useState(60);
  const [createPinCanResend, setCreatePinCanResend] = useState(false);
  const createPinOtpRefs = useRef([]);

  const isPinLocked = user.pin_locked_until && new Date(user.pin_locked_until) > new Date();

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

  useEffect(() => {
    let timer;
    if (showForgotPinModal && forgotPinCountdown > 0) {
      timer = setTimeout(() => setForgotPinCountdown(c => c - 1), 1000);
    } else if (forgotPinCountdown === 0) {
      setForgotPinCanResend(true);
    }
    return () => clearTimeout(timer);
  }, [showForgotPinModal, forgotPinCountdown]);

  useEffect(() => {
    let timer;
    if (showCreatePinModal && createPinCountdown > 0) {
      timer = setTimeout(() => setCreatePinCountdown(c => c - 1), 1000);
    } else if (createPinCountdown === 0) {
      setCreatePinCanResend(true);
    }
    return () => clearTimeout(timer);
  }, [showCreatePinModal, createPinCountdown]);

  const handleDisableAccount = async () => {
    setDisableLoading(true);
    setDisableError("");
    try {
      const res = await authAPI.disableAccount();
      if (res.success) {
        await authAPI.logout();
        navigate("/login", { replace: true, state: { message: "Your account has been disabled. Contact support to reactivate it." } });
        return;
      }
      setDisableError(res.message || "Failed to disable account.");
    } catch (err) {
      setDisableError(err.response?.data?.message || "System error. Please try again.");
    } finally {
      setDisableLoading(false);
    }
  };

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
      alert(err.response?.data?.message || (lang === "vi" ? "Tải ảnh đại diện thất bại. Vui lòng thử lại." : "Avatar upload failed. Please try again."));
    } finally {
      setAvatarLoading(false);
    }
  };

  const handleSaveName = () => {
    if (!editNameVal.trim()) {
      alert(t.profile.nameCannotBeEmpty);
      return;
    }
    const updatedUser = {
      ...user,
      name: editNameVal.trim(),
    };
    setUser(updatedUser);

    // Save to localStorage
    const local = localStorage.getItem("bw_user");
    if (local) {
      const parsed = JSON.parse(local);
      parsed.name = editNameVal.trim();
      localStorage.setItem("bw_user", JSON.stringify(parsed));
    }

    // Dispatch event to sync with other components
    window.dispatchEvent(new Event("kyc_updated"));
    setIsEditingName(false);
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
        await authAPI.logout();
        navigate("/login", {
          replace: true,
          state: {
            message: "Password changed. Please sign in again with your new password.",
          },
        });
        return;
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

  const handleChangePinSubmit = async (e) => {
    e.preventDefault();
    setPinError("");
    setPinSuccess(false);

    if (isPinLocked) {
      setPinError(t.profile.pinLocked);
      return;
    }
    if (!user.has_pin) {
      setPinError(t.profile.noPinSet);
      return;
    }
    if (!pinForm.currentPin || !pinForm.newPin || !pinForm.confirmPin) {
      setPinError(t.profile.enterAllFields);
      return;
    }
    if (!/^\d{4}$/.test(pinForm.newPin)) {
      setPinError(t.profile.pinMustBe4Digits);
      return;
    }
    if (pinForm.newPin !== pinForm.confirmPin) {
      setPinError(t.profile.pinsDoNotMatch);
      return;
    }

    setPinLoading(true);
    try {
      const res = await authAPI.changePin(pinForm.currentPin, pinForm.newPin);
      if (res.success) {
        setPinSuccess(true);
        setPinSuccessMessage(t.profile.pinUpdated);
        setPinForm({ currentPin: "", newPin: "", confirmPin: "" });
        setUser((prev) => ({ ...prev, pin_locked_until: null }));
        setTimeout(() => { setPinSuccess(false); setPinSuccessMessage(""); }, 3000);
      } else {
        setPinError(res.message || "Failed to change PIN.");
      }
    } catch (err) {
      setPinError(err.response?.data?.message || "System error. Please try again.");
      try {
        const profile = await authAPI.getProfile();
        const data = profile.data || profile.user || {};
        setUser((prev) => ({
          ...prev,
          pin_locked_until: data.pin_locked_until,
          has_pin: data.has_pin,
        }));
      } catch (_) { /* ignore */ }
    } finally {
      setPinLoading(false);
    }
  };

  const handleStartForgotPin = async () => {
    setForgotPinError("");
    setForgotPinSending(true);
    try {
      const res = await authAPI.requestForgotPinOtp();
      if (res.success) {
        setForgotPinOtpInputs(["", "", "", "", "", ""]);
        setForgotPinForm({ newPin: "", confirmPin: "" });
        setForgotPinCountdown(60);
        setForgotPinCanResend(false);
        setShowForgotPinModal(true);
      } else {
        setPinError(res.message || "Failed to send OTP.");
      }
    } catch (err) {
      setPinError(err.response?.data?.message || "Unable to send OTP. Please try again.");
    } finally {
      setForgotPinSending(false);
    }
  };

  const handleForgotPinOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...forgotPinOtpInputs];
    newOtp[index] = value.slice(-1);
    setForgotPinOtpInputs(newOtp);
    setForgotPinError("");
    if (value && index < 5) forgotPinOtpRefs.current[index + 1]?.focus();
  };

  const handleForgotPinOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !forgotPinOtpInputs[index] && index > 0) {
      forgotPinOtpRefs.current[index - 1]?.focus();
    }
  };

  const handleResendForgotPinOtp = async () => {
    setForgotPinError("");
    setForgotPinSending(true);
    try {
      const res = await authAPI.requestForgotPinOtp();
      if (res.success) {
        setForgotPinCountdown(60);
        setForgotPinCanResend(false);
        setForgotPinOtpInputs(["", "", "", "", "", ""]);
      } else {
        setForgotPinError(res.message || "Failed to resend OTP.");
      }
    } catch (err) {
      setForgotPinError(err.response?.data?.message || "Unable to resend OTP.");
    } finally {
      setForgotPinSending(false);
    }
  };

  const handleResetPinWithOtp = async () => {
    const enteredOtp = forgotPinOtpInputs.join("");
    setForgotPinError("");

    if (enteredOtp.length < 6) {
      setForgotPinError(lang === "vi" ? "Vui lòng nhập đủ 6 số OTP." : "Please enter all 6 digits of the OTP code.");
      return;
    }
    if (!/^\d{4}$/.test(forgotPinForm.newPin)) {
      setForgotPinError(t.profile.pinMustBe4Digits);
      return;
    }
    if (forgotPinForm.newPin !== forgotPinForm.confirmPin) {
      setForgotPinError(t.profile.pinsDoNotMatch);
      return;
    }

    setForgotPinLoading(true);
    try {
      const res = await authAPI.resetPinWithOtp(enteredOtp, forgotPinForm.newPin);
      if (res.success) {
        setShowForgotPinModal(false);
        setPinForm({ currentPin: "", newPin: "", confirmPin: "" });
        setPinError("");
        setPinSuccess(true);
        setPinSuccessMessage(t.profile.pinResetSuccess);
        setUser((prev) => ({ ...prev, pin_locked_until: null, has_pin: true }));
        setTimeout(() => { setPinSuccess(false); setPinSuccessMessage(""); }, 3000);
      } else {
        setForgotPinError(res.message || "Failed to reset PIN.");
      }
    } catch (err) {
      setForgotPinError(err.response?.data?.message || "Verification failed. Please try again.");
    } finally {
      setForgotPinLoading(false);
    }
  };

  const handleStartCreatePin = async () => {
    setCreatePinError("");
    setCreatePinSending(true);
    try {
      const res = await authAPI.requestCreatePinOtp();
      if (res.success) {
        setCreatePinOtpInputs(["", "", "", "", "", ""]);
        setCreatePinForm({ newPin: "", confirmPin: "" });
        setCreatePinCountdown(60);
        setCreatePinCanResend(false);
        setShowCreatePinModal(true);
      } else {
        setCreatePinError(res.message || "Failed to send OTP.");
      }
    } catch (err) {
      setCreatePinError(err.response?.data?.message || "Unable to send OTP. Please try again.");
    } finally {
      setCreatePinSending(false);
    }
  };

  const handleCreatePinOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...createPinOtpInputs];
    newOtp[index] = value.slice(-1);
    setCreatePinOtpInputs(newOtp);
    setCreatePinError("");
    if (value && index < 5) createPinOtpRefs.current[index + 1]?.focus();
  };

  const handleCreatePinOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !createPinOtpInputs[index] && index > 0) {
      createPinOtpRefs.current[index - 1]?.focus();
    }
  };

  const handleResendCreatePinOtp = async () => {
    setCreatePinError("");
    setCreatePinSending(true);
    try {
      const res = await authAPI.requestCreatePinOtp();
      if (res.success) {
        setCreatePinCountdown(60);
        setCreatePinCanResend(false);
        setCreatePinOtpInputs(["", "", "", "", "", ""]);
      } else {
        setCreatePinError(res.message || "Failed to resend OTP.");
      }
    } catch (err) {
      setCreatePinError(err.response?.data?.message || "Unable to resend OTP.");
    } finally {
      setCreatePinSending(false);
    }
  };

  const handleCreatePinWithOtp = async () => {
    const enteredOtp = createPinOtpInputs.join("");
    setCreatePinError("");

    if (enteredOtp.length < 6) {
      setCreatePinError(lang === "vi" ? "Vui lòng nhập đủ 6 số OTP." : "Please enter all 6 digits of the OTP code.");
      return;
    }
    if (!/^\d{4}$/.test(createPinForm.newPin)) {
      setCreatePinError(t.profile.pinMustBe4Digits);
      return;
    }
    if (createPinForm.newPin !== createPinForm.confirmPin) {
      setCreatePinError(t.profile.pinsDoNotMatch);
      return;
    }

    setCreatePinLoading(true);
    try {
      const res = await authAPI.createPinWithOtp(enteredOtp, createPinForm.newPin);
      if (res.success) {
        setShowCreatePinModal(false);
        setCreatePinError("");
        setUser((prev) => ({ ...prev, has_pin: true, pin_locked_until: null }));
        const u = localStorage.getItem("bw_user");
        if (u) {
          const parsed = JSON.parse(u);
          parsed.has_pin = true;
          localStorage.setItem("bw_user", JSON.stringify(parsed));
        }
        window.dispatchEvent(new Event("kyc_updated"));
        setPinSuccess(true);
        setPinSuccessMessage(t.profile.pinCreatedSuccess);
        setTimeout(() => { setPinSuccess(false); setPinSuccessMessage(""); }, 3000);
      } else {
        setCreatePinError(res.message || "Failed to create PIN.");
      }
    } catch (err) {
      setCreatePinError(err.response?.data?.message || "Verification failed. Please try again.");
    } finally {
      setCreatePinLoading(false);
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
        <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>{t.profile.title}</h1>
        <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>{t.profile.subtitle}</p>
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
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>{t.profile.section1}</h3>
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
            {isEditingName ? (
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input
                  type="text"
                  value={editNameVal}
                  onChange={(e) => setEditNameVal(e.target.value)}
                  style={{
                    background: "var(--bg-card2)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    padding: "4px 8px",
                    color: "var(--text-primary)",
                    fontSize: 14,
                    fontWeight: 700,
                    outline: "none"
                  }}                  
                />            
          
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <p style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                  {user.name || "User"}
                </p>

              </div>
            )}
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4, marginBottom: 0 }}>{user.email}</p>
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
              {t.profile.changeAvatar}
            </button>
          </div>
        </div>

        {avatarSuccess && (
          <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} style={{ color: "#22c55e", fontSize: 12, marginTop: 12, display: "flex", alignItems: "center", gap: 4 }}>
            ✓ {t.profile.avatarSuccess}
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
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{t.profile.section2}</h3>
        <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 16 }}>
          {lang === "vi" ? "Mã xác thực OTP sẽ được gửi về email để xác nhận thay đổi số điện thoại." : "A verification OTP will be sent to your email to confirm phone number updates."}
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
          {/* ── Email section (Read-only) ── */}
          <div style={{ background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius: 12, padding: 16 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 0 }}>
              {t.profile.emailLabel}: <span style={{ color: "var(--text-primary)", marginLeft: 6 }}>{user.email || "—"}</span>
            </p>
          </div>

          {/* ── Phone section ── */}
          <div style={{ background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius: 12, padding: 16 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 8 }}>
              {lang === "vi" ? "SĐT hiện tại:" : "Current phone:"} <span style={{ color: "var(--text-primary)" }}>{user.phone || (lang === "vi" ? "Chưa thiết lập" : "Not set")}</span>
            </p>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <div style={{ flex: 1, position: "relative" }}>
                <Phone size={15} style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                <input
                  type="tel"
                  placeholder={lang === "vi" ? "Nhập số điện thoại mới (ví dụ: 0912345678)" : "Enter new phone number (e.g. 0912345678)"}
                  value={newPhone}
                  onChange={(e) => { setNewPhone(e.target.value); setOtpError(""); }}
                  style={{ width: "100%", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 14px 10px 38px", color: "var(--text-primary)", fontSize: 13, outline: "none", boxSizing: "border-box" }}
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
                {otpSending && changeTarget === "phone" ? t.login.sending : (lang === "vi" ? "Đổi Số Điện Thoại" : "Change Phone")}
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
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{t.profile.section3}</h3>

        {passError && (
          <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, padding: "10px 14px", marginBottom: 16, color: "#ef4444", fontSize: 13 }}>
            {passError}
          </div>
        )}

        {passSuccess && (
          <div style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 10, padding: "10px 14px", marginBottom: 16, color: "#22c55e", fontSize: 13 }}>
            ✓ {t.profile.passwordUpdated}
          </div>
        )}

        <form onSubmit={handleChangePasswordSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Current Password */}
          <div>
            <label style={{ fontSize: 12, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>{t.profile.currentPassword}</label>
            <div style={{ position: "relative" }}>
              <Lock size={15} style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
              <input
                type={showPassCurrent ? "text" : "password"}
                placeholder={lang === "vi" ? "Nhập mật khẩu hiện tại" : "Enter current password"}
                value={passForm.currentPass}
                onChange={(e) => setPassForm({ ...passForm, currentPass: e.target.value })}
                style={{ width: "100%", background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius: 10, padding: "11px 42px 11px 38px", color: "var(--text-primary)", fontSize: 13, outline: "none" }}
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
              <label style={{ fontSize: 12, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>{t.profile.newPassword}</label>
              <div style={{ position: "relative" }}>
                <Lock size={15} style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                <input
                  type={showPassNew ? "text" : "password"}
                  placeholder={lang === "vi" ? "Tối thiểu 8 ký tự" : "Minimum 8 characters"}
                  value={passForm.newPass}
                  onChange={(e) => setPassForm({ ...passForm, newPass: e.target.value })}
                  style={{ width: "100%", background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius: 10, padding: "11px 42px 11px 38px", color: "var(--text-primary)", fontSize: 13, outline: "none" }}
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
              <label style={{ fontSize: 12, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>{t.profile.confirmNewPassword}</label>
              <div style={{ position: "relative" }}>
                <Lock size={15} style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                <input
                  type={showPassConfirm ? "text" : "password"}
                  placeholder={lang === "vi" ? "Nhập lại mật khẩu mới" : "Re-enter new password"}
                  value={passForm.confirmPass}
                  onChange={(e) => setPassForm({ ...passForm, confirmPass: e.target.value })}
                  style={{ width: "100%", background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius: 10, padding: "11px 42px 11px 38px", color: "var(--text-primary)", fontSize: 13, outline: "none" }}
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
            ) : <Lock size={13} />}
            {t.profile.updatePassword}
          </button>
        </form>
      </motion.div>

      {/* CARD 4: CREATE TRANSACTION PIN */}
      {!user.has_pin && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          style={{
            background: "var(--bg-card)", border: "1px solid var(--border)",
            borderRadius: 16, padding: 24, boxShadow: "0 4px 20px rgba(0, 0, 0, 0.01)"
          }}
        >
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>{t.profile.section4Create}</h3>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 16 }}>
            {t.profile.createPinDesc}
          </p>

          {createPinError && !showCreatePinModal && (
            <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, padding: "10px 14px", marginBottom: 16, color: "#ef4444", fontSize: 13 }}>
              {createPinError}
            </div>
          )}

          {pinSuccess && (
            <div style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 10, padding: "10px 14px", marginBottom: 16, color: "#22c55e", fontSize: 13 }}>
              ✓ {pinSuccessMessage || t.profile.pinCreatedSuccess}
            </div>
          )}

          <button
            type="button"
            onClick={handleStartCreatePin}
            disabled={createPinSending}
            style={{
              background: "linear-gradient(135deg,#2563eb,#1d4ed8)",
              color: "white", border: "none", borderRadius: 10, padding: "11px 20px",
              fontWeight: 700, fontSize: 13, cursor: createPinSending ? "not-allowed" : "pointer",
              display: "inline-flex", alignItems: "center", gap: 8
            }}
          >
            {createPinSending ? (
              <div style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
            ) : <KeyRound size={14} />}
            {createPinSending ? (lang === "vi" ? "Đang gửi OTP..." : "Sending OTP...") : t.profile.createPin}
          </button>
        </motion.div>
      )}

      {/* CARD 4: CHANGE TRANSACTION PIN */}
      {user.has_pin && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          style={{
            background: "var(--bg-card)", border: "1px solid var(--border)",
            borderRadius: 16, padding: 24, boxShadow: "0 4px 20px rgba(0, 0, 0, 0.01)"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4, gap: 12 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>{t.profile.section4}</h3>
            <button
              type="button"
              onClick={handleStartForgotPin}
              disabled={forgotPinSending}
              style={{
                background: "none", border: "none", padding: 0,
                color: "var(--primary)", fontSize: 13, fontWeight: 600,
                cursor: forgotPinSending ? "not-allowed" : "pointer",
                opacity: forgotPinSending ? 0.6 : 1,
              }}
            >
              {forgotPinSending ? (lang === "vi" ? "Đang gửi..." : "Sending...") : t.profile.forgotPin}
            </button>
          </div>

          {isPinLocked && (
            <div style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 10, padding: "10px 14px", marginBottom: 16, color: "#f59e0b", fontSize: 13, display: "flex", gap: 8, alignItems: "flex-start" }}>
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
              {t.profile.pinLocked}
            </div>
          )}

          {pinError && (
            <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, padding: "10px 14px", marginBottom: 16, color: "#ef4444", fontSize: 13 }}>
              {pinError}
            </div>
          )}

          {pinSuccess && (
            <div style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 10, padding: "10px 14px", marginBottom: 16, color: "#22c55e", fontSize: 13 }}>
              ✓ {pinSuccessMessage || t.profile.pinUpdated}
            </div>
          )}

          <form onSubmit={handleChangePinSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>{t.profile.currentPin}</label>
              <div style={{ position: "relative" }}>
                <KeyRound size={15} style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="••••"
                  value={pinForm.currentPin}
                  onChange={(e) => setPinForm({ ...pinForm, currentPin: e.target.value.replace(/\D/g, "").slice(0, 4) })}
                  disabled={isPinLocked || pinLoading}
                  style={{ width: "100%", background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius: 10, padding: "11px 14px 11px 38px", color: "var(--text-primary)", fontSize: 13, outline: "none", letterSpacing: 4 }}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <label style={{ fontSize: 12, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>{t.profile.newPin}</label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="••••"
                  value={pinForm.newPin}
                  onChange={(e) => setPinForm({ ...pinForm, newPin: e.target.value.replace(/\D/g, "").slice(0, 4) })}
                  disabled={isPinLocked || pinLoading}
                  style={{ width: "100%", background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius: 10, padding: "11px 14px", color: "var(--text-primary)", fontSize: 13, outline: "none", letterSpacing: 4 }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>{t.profile.confirmNewPin}</label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="••••"
                  value={pinForm.confirmPin}
                  onChange={(e) => setPinForm({ ...pinForm, confirmPin: e.target.value.replace(/\D/g, "").slice(0, 4) })}
                  disabled={isPinLocked || pinLoading}
                  style={{ width: "100%", background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius: 10, padding: "11px 14px", color: "var(--text-primary)", fontSize: 13, outline: "none", letterSpacing: 4 }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={pinLoading || isPinLocked}
              style={{
                alignSelf: "flex-end", background: isPinLocked ? "var(--bg-card2)" : "linear-gradient(135deg,#2563eb,#1d4ed8)",
                color: isPinLocked ? "var(--text-muted)" : "white", border: "none", borderRadius: 10, padding: "10px 20px",
                fontWeight: 700, fontSize: 13, cursor: (pinLoading || isPinLocked) ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", gap: 8, transition: "all 0.2s", marginTop: 4
              }}
            >
              {pinLoading ? (
                <div style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
              ) : <KeyRound size={13} />}
              {t.profile.updatePin}
            </button>
          </form>
        </motion.div>
      )}

      {/* ─── FORGOT PIN MODAL ───────────────────────────────────────────────── */}
      <AnimatePresence>
        {showForgotPinModal && (
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
              <button
                onClick={() => setShowForgotPinModal(false)}
                style={{
                  position: "absolute", right: 20, top: 20,
                  background: "none", border: "none", cursor: "pointer",
                  color: "var(--text-muted)",
                }}
              >
                <X size={20} />
              </button>

              <div style={{ textAlign: "center" }}>
                <div style={{ width: 56, height: 56, background: "rgba(37,99,235,0.08)", borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
                  <KeyRound size={24} style={{ color: "var(--primary)" }} />
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: "var(--text-primary)", marginBottom: 8 }}>
                  {t.profile.forgotPinTitle}
                </h3>
                <p style={{ color: "var(--text-secondary)", fontSize: 13, lineHeight: 1.6, marginBottom: 20 }}>
                  {t.profile.forgotPinDesc}
                  <br />
                  <strong style={{ color: "var(--primary)" }}>{user.email}</strong>
                </p>

                {forgotPinError && (
                  <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 10, padding: "10px 14px", marginBottom: 16, color: "#ef4444", fontSize: 13 }}>
                    {forgotPinError}
                  </div>
                )}

                <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 20 }}>
                  {forgotPinOtpInputs.map((digit, i) => (
                    <input
                      key={i}
                      ref={el => forgotPinOtpRefs.current[i] = el}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleForgotPinOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleForgotPinOtpKeyDown(i, e)}
                      style={{
                        width: 44, height: 48, textAlign: "center", fontSize: 20, fontWeight: 700,
                        background: digit ? "rgba(37,99,235,0.08)" : "var(--bg-card2)",
                        border: `2px solid ${digit ? "var(--primary)" : "var(--border)"}`,
                        borderRadius: 10, color: "var(--text-primary)", outline: "none"
                      }}
                    />
                  ))}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20, textAlign: "left" }}>
                  <div>
                    <label style={{ fontSize: 12, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>{t.profile.newPin}</label>
                    <input
                      type="password"
                      inputMode="numeric"
                      maxLength={4}
                      placeholder="••••"
                      value={forgotPinForm.newPin}
                      onChange={(e) => setForgotPinForm({ ...forgotPinForm, newPin: e.target.value.replace(/\D/g, "").slice(0, 4) })}
                      style={{ width: "100%", background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius: 10, padding: "11px 14px", color: "var(--text-primary)", fontSize: 13, outline: "none", letterSpacing: 4, boxSizing: "border-box" }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>{t.profile.confirmNewPin}</label>
                    <input
                      type="password"
                      inputMode="numeric"
                      maxLength={4}
                      placeholder="••••"
                      value={forgotPinForm.confirmPin}
                      onChange={(e) => setForgotPinForm({ ...forgotPinForm, confirmPin: e.target.value.replace(/\D/g, "").slice(0, 4) })}
                      style={{ width: "100%", background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius: 10, padding: "11px 14px", color: "var(--text-primary)", fontSize: 13, outline: "none", letterSpacing: 4, boxSizing: "border-box" }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: 20 }}>
                  {forgotPinCanResend ? (
                    <button
                      type="button"
                      onClick={handleResendForgotPinOtp}
                      disabled={forgotPinSending}
                      style={{ background: "none", border: "none", color: "var(--primary)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                    >
                      {t.profile.resendCode}
                    </button>
                  ) : (
                    <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
                      {t.profile.resendIn.replace("{seconds}", forgotPinCountdown)}
                    </p>
                  )}
                </div>

                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    type="button"
                    onClick={() => setShowForgotPinModal(false)}
                    style={{
                      flex: 1, background: "var(--bg-card2)", color: "var(--text-secondary)",
                      border: "1px solid var(--border)", borderRadius: 10, padding: "12px",
                      fontWeight: 600, fontSize: 14, cursor: "pointer"
                    }}
                  >
                    {lang === "vi" ? "Hủy" : "Cancel"}
                  </button>
                  <button
                    type="button"
                    onClick={handleResetPinWithOtp}
                    disabled={forgotPinLoading}
                    style={{
                      flex: 2, background: "linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)",
                      color: "white", border: "none", borderRadius: 10, padding: "12px", fontWeight: 700,
                      fontSize: 14, cursor: forgotPinLoading ? "not-allowed" : "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 8
                    }}
                  >
                    {forgotPinLoading ? (
                      <div style={{ width: 18, height: 18, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                    ) : <CheckCircle size={14} />}
                    {t.profile.resetPin}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── CREATE PIN MODAL ───────────────────────────────────────────────── */}
      <AnimatePresence>
        {showCreatePinModal && (
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
              <button
                onClick={() => setShowCreatePinModal(false)}
                style={{ position: "absolute", right: 20, top: 20, background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}
              >
                <X size={20} />
              </button>

              <div style={{ textAlign: "center" }}>
                <div style={{ width: 56, height: 56, background: "rgba(37,99,235,0.08)", borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
                  <KeyRound size={24} style={{ color: "var(--primary)" }} />
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: "var(--text-primary)", marginBottom: 8 }}>
                  {t.profile.createPinTitle}
                </h3>
                <p style={{ color: "var(--text-secondary)", fontSize: 13, lineHeight: 1.6, marginBottom: 20 }}>
                  {t.profile.createPinOtpDesc}
                  <br />
                  <strong style={{ color: "var(--primary)" }}>{user.email}</strong>
                </p>

                {createPinError && (
                  <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 10, padding: "10px 14px", marginBottom: 16, color: "#ef4444", fontSize: 13 }}>
                    {createPinError}
                  </div>
                )}

                <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 20 }}>
                  {createPinOtpInputs.map((digit, i) => (
                    <input
                      key={i}
                      ref={el => createPinOtpRefs.current[i] = el}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleCreatePinOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleCreatePinOtpKeyDown(i, e)}
                      style={{
                        width: 44, height: 48, textAlign: "center", fontSize: 20, fontWeight: 700,
                        background: digit ? "rgba(37,99,235,0.08)" : "var(--bg-card2)",
                        border: `2px solid ${digit ? "var(--primary)" : "var(--border)"}`,
                        borderRadius: 10, color: "var(--text-primary)", outline: "none"
                      }}
                    />
                  ))}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20, textAlign: "left" }}>
                  <div>
                    <label style={{ fontSize: 12, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>{t.profile.newPin}</label>
                    <input
                      type="password"
                      inputMode="numeric"
                      maxLength={4}
                      placeholder="••••"
                      value={createPinForm.newPin}
                      onChange={(e) => setCreatePinForm({ ...createPinForm, newPin: e.target.value.replace(/\D/g, "").slice(0, 4) })}
                      style={{ width: "100%", background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius: 10, padding: "11px 14px", color: "var(--text-primary)", fontSize: 13, outline: "none", letterSpacing: 4, boxSizing: "border-box" }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>{t.profile.confirmNewPin}</label>
                    <input
                      type="password"
                      inputMode="numeric"
                      maxLength={4}
                      placeholder="••••"
                      value={createPinForm.confirmPin}
                      onChange={(e) => setCreatePinForm({ ...createPinForm, confirmPin: e.target.value.replace(/\D/g, "").slice(0, 4) })}
                      style={{ width: "100%", background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius: 10, padding: "11px 14px", color: "var(--text-primary)", fontSize: 13, outline: "none", letterSpacing: 4, boxSizing: "border-box" }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: 20 }}>
                  {createPinCanResend ? (
                    <button type="button" onClick={handleResendCreatePinOtp} disabled={createPinSending} style={{ background: "none", border: "none", color: "var(--primary)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                      {t.profile.resendCode}
                    </button>
                  ) : (
                    <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
                      {t.profile.resendIn.replace("{seconds}", createPinCountdown)}
                    </p>
                  )}
                </div>

                <div style={{ display: "flex", gap: 10 }}>
                  <button type="button" onClick={() => setShowCreatePinModal(false)} style={{ flex: 1, background: "var(--bg-card2)", color: "var(--text-secondary)", border: "1px solid var(--border)", borderRadius: 10, padding: "12px", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>
                    {lang === "vi" ? "Hủy" : "Cancel"}
                  </button>
                  <button type="button" onClick={handleCreatePinWithOtp} disabled={createPinLoading} style={{ flex: 2, background: "linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)", color: "white", border: "none", borderRadius: 10, padding: "12px", fontWeight: 700, fontSize: 14, cursor: createPinLoading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                    {createPinLoading ? (
                      <div style={{ width: 18, height: 18, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                    ) : <CheckCircle size={14} />}
                    {t.profile.createPin}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
                  {t.profile.otpTitle}
                </h3>
                <p style={{ color: "var(--text-secondary)", fontSize: 13, lineHeight: 1.6, marginBottom: 20 }}>
                  {t.profile.otpSent}:<br />
                  <strong style={{ color: "var(--primary)" }}>{user.email}</strong>
                  <br /><span style={{ fontSize: 12 }}>{t.profile.checkInbox}</span>
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
                        borderRadius: 10, color: "var(--text-primary)", outline: "none"
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
                      <RefreshCw size={12} /> {t.profile.resendCode}
                    </button>
                  ) : (
                    <span>{t.profile.resendIn.replace("{seconds}", countdown)}</span>
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
                    {lang === "vi" ? "Hủy" : "Cancel"}
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
                    ) : <CheckCircle size={14} />}
                    {t.profile.submitOtp}
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
