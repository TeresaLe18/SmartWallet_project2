import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Wallet, Mail, Lock, ArrowRight, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";
import { authAPI } from "../services/api";

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "", confirmPassword: "" });
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const errs = {};
    if (!form.email) errs.email = "Email không được để trống";
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = "Email không hợp lệ";
    if (!form.password) errs.password = "Mật khẩu không được để trống";
    else if (form.password.length < 8) errs.password = "Mật khẩu tối thiểu 8 ký tự";
    if (form.password !== form.confirmPassword) errs.confirmPassword = "Mật khẩu xác nhận không khớp";
    return errs;
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    setLoading(true);
    
    try {
      const data = await authAPI.register(form.email, form.password);
      setLoading(false);
            if (data.success) {
        localStorage.setItem("bw_pending_email", form.email);
        alert(`Đăng ký tài khoản thành công! Mã OTP xác thực đã được gửi tới email ${form.email} của bạn. Vui lòng kiểm tra hòm thư Gmail (bao gồm cả thư rác/spam).`);
        navigate("/verify-otp");
      } else {
        setErrors({ server: data.message || "Đăng ký tài khoản thất bại." });
      }
    } catch (err) {
      setLoading(false);
      console.error("Register request error:", err);
      setErrors({
        server: err.response?.data?.message || "Lỗi kết nối máy chủ. Vui lòng kiểm tra lại XAMPP/Node.js."
      });
    }
  };

  const pwStrength = () => {
    const p = form.password;
    if (!p) return 0;
    let score = 0;
    if (p.length >= 8) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    return score;
  };
  const strength = pwStrength();
  const strengthLabel = ["", "Yếu", "Trung bình", "Tốt", "Rất mạnh"][strength];
  const strengthColors = ["", "#ef4444", "#f59e0b", "#3b82f6", "#22c55e"];

  const inputStyle = (err) => ({
    width: "100%", background: "var(--bg-card2)",
    border: `1px solid ${err ? "#ef4444" : "#2a2a2a"}`,
    borderRadius: 10, padding: "12px 16px 12px 42px",
    color: "#000000", fontSize: 14, outline: "none", transition: "all 0.3s"
  });

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "var(--bg-dark)" }}>
      {/* Background */}
      <div style={{ position: "fixed", inset: 0, zIndex: 0 }}>
        <div style={{ position: "absolute", top: -100, right: -100, width: 600, height: 600, background: "radial-gradient(circle, rgba(37,99,235,0.08) 0%, transparent 70%)", borderRadius: "50%" }} />
        <div style={{ position: "absolute", bottom: -100, left: -100, width: 500, height: 500, background: "radial-gradient(circle, rgba(29,78,216,0.06) 0%, transparent 70%)", borderRadius: "50%" }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{ width: "100%", maxWidth: 460, position: "relative", zIndex: 1 }}
      >
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 12px"
          }}>
            <Wallet size={26} color="white" />
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800 }}>
            SmartWallet Wallet
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 14, marginTop: 4 }}>Tạo tài khoản mới</p>
        </div>

        {/* Form Card */}
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 20, padding: 32 }}>
          {errors.server && (
            <div style={{ padding: "10px 14px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, color: "#ef4444", fontSize: 13, marginBottom: 16, textAlign: "center" }}>
              {errors.server}
            </div>
          )}
          <form onSubmit={handleRegister} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {/* Email */}
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 8, color: "var(--text-secondary)" }}>Email</label>
              <div style={{ position: "relative" }}>
                <Mail size={16} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                <input
                  type="email"
                  placeholder="example@email.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  style={inputStyle(errors.email)}
                  onFocus={(e) => { e.target.style.borderColor = "#2563eb"; e.target.style.boxShadow = "0 0 0 3px rgba(37,99,235,0.15)"; }}
                  onBlur={(e) => { e.target.style.borderColor = errors.email ? "#ef4444" : "#2a2a2a"; e.target.style.boxShadow = "none"; }}
                />
              </div>
              {errors.email && <p style={{ color: "#ef4444", fontSize: 12, marginTop: 4 }}>{errors.email}</p>}
            </div>

            {/* Password */}
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 8, color: "var(--text-secondary)" }}>Mật khẩu</label>
              <div style={{ position: "relative" }}>
                <Lock size={16} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                <input
                  type={showPass ? "text" : "password"}
                  placeholder="Tối thiểu 8 ký tự"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  style={{ ...inputStyle(errors.password), paddingRight: 42 }}
                  onFocus={(e) => { e.target.style.borderColor = "#2563eb"; }}
                  onBlur={(e) => { e.target.style.borderColor = errors.password ? "#ef4444" : "#2a2a2a"; }}
                />
                <button type="button" onClick={() => setShowPass(!showPass)} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}>
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {/* Password strength */}
              {form.password && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ display: "flex", gap: 4 }}>
                    {[1,2,3,4].map(i => (
                      <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= strength ? strengthColors[strength] : "#2a2a2a", transition: "all 0.3s" }} />
                    ))}
                  </div>
                  <p style={{ fontSize: 11, color: strengthColors[strength], marginTop: 4 }}>{strengthLabel}</p>
                </div>
              )}
              {errors.password && <p style={{ color: "#ef4444", fontSize: 12, marginTop: 4 }}>{errors.password}</p>}
            </div>

            {/* Confirm Password */}
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 8, color: "var(--text-secondary)" }}>Xác nhận mật khẩu</label>
              <div style={{ position: "relative" }}>
                <Lock size={16} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                <input
                  type={showConfirm ? "text" : "password"}
                  placeholder="Nhập lại mật khẩu"
                  value={form.confirmPassword}
                  onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                  style={{ ...inputStyle(errors.confirmPassword), paddingRight: 42 }}
                  onFocus={(e) => { e.target.style.borderColor = "#2563eb"; }}
                  onBlur={(e) => { e.target.style.borderColor = errors.confirmPassword ? "#ef4444" : "#2a2a2a"; }}
                />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}>
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
                {form.confirmPassword && form.password === form.confirmPassword && (
                  <CheckCircle size={16} style={{ position: "absolute", right: 40, top: "50%", transform: "translateY(-50%)", color: "#22c55e" }} />
                )}
              </div>
              {errors.confirmPassword && <p style={{ color: "#ef4444", fontSize: 12, marginTop: 4 }}>{errors.confirmPassword}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                background: loading ? "#3f3f46" : "linear-gradient(135deg, #2563eb, #1d4ed8)",
                color: "#000000", border: "none", borderRadius: 10,
                padding: "14px", fontWeight: 700, fontSize: 15,
                cursor: loading ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                transition: "all 0.3s", marginTop: 4
              }}
            >
              {loading ? (
                <div style={{ width: 20, height: 20, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
              ) : (
                <>Đăng ký & Xác thực Email <ArrowRight size={16} /></>
              )}
            </button>
          </form>
        </div>

        <p style={{ textAlign: "center", marginTop: 20, color: "var(--text-muted)", fontSize: 14 }}>
          Đã có tài khoản?{" "}
          <Link to="/login" style={{ color: "#2563eb", fontWeight: 600, textDecoration: "none" }}>Đăng nhập</Link>
        </p>
      </motion.div>
    </div>
  );
}
