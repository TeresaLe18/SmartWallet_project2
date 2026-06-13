import { useState, useEffect } from "react";
import { Upload, CheckCircle, Clock, AlertCircle, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { authAPI } from "../../services/api";

const steps = [
  { id:1, title:"Thông tin cá nhân", desc:"CCCD/CMND & họ tên" },
  { id:2, title:"Tải ảnh giấy tờ", desc:"Mặt trước & sau CCCD" },
  { id:3, title:"Chờ xác minh", desc:"1-3 ngày làm việc" },
];

export default function KycPage() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ fullname:"", cccd:"", dob:"", frontImg:null, backImg:null, selfieImg:null });
  const [submitted, setSubmitted] = useState(false);
  const [user, setUser] = useState(null);
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => {
    if (user && (user.kycStatus === "rejected" || user.kyc === "rejected")) {
      authAPI.getNotifications()
        .then(res => {
          if (res.success && res.notifications) {
            const kycRejectNotif = res.notifications.find(n => n.title && n.title.includes("từ chối"));
            if (kycRejectNotif) {
              setRejectReason(kycRejectNotif.content);
            }
          }
        })
        .catch(err => console.error("Failed to load KYC rejection reason:", err));
    } else {
      setRejectReason("");
    }
  }, [user]);

  useEffect(() => {
    const loadUser = () => {
      const u = localStorage.getItem("bw_user");
      if (u) setUser(JSON.parse(u));
    };
    loadUser();
    window.addEventListener("storage", loadUser);
    window.addEventListener("kyc_updated", loadUser);
    return () => {
      window.removeEventListener("storage", loadUser);
      window.removeEventListener("kyc_updated", loadUser);
    };
  }, []);

  const handleFile = (key, e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate size (< 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert("Kích thước ảnh không được vượt quá 5MB.");
        return;
      }
      // Validate file extension
      const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
      if (!allowedTypes.includes(file.type)) {
        alert("Định dạng file không được hỗ trợ. Chỉ chấp nhận ảnh JPG, JPEG, PNG, WEBP, GIF.");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setForm(f => ({ ...f, [key]: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (step === 1) {
      if (!form.fullname.trim()) {
        alert("Vui lòng nhập họ và tên theo CCCD.");
        return;
      }
      if (!form.cccd.trim()) {
        alert("Vui lòng nhập số CCCD / CMND.");
        return;
      }
      if (!/^\d{9}$|^\d{12}$/.test(form.cccd.trim())) {
        alert("Số CCCD / CMND không đúng định dạng (phải gồm đúng 9 hoặc 12 chữ số).");
        return;
      }
      if (!form.dob) {
        alert("Vui lòng nhập ngày sinh.");
        return;
      }
      const birthDate = new Date(form.dob);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      if (age < 15) {
        alert("Yêu cầu độ tuổi từ 15 tuổi trở lên.");
        return;
      }
      setStep(2);
      return;
    }
    
    if (!form.frontImg) {
      alert("Vui lòng tải lên mặt trước CCCD.");
      return;
    }
    if (!form.backImg) {
      alert("Vui lòng tải lên mặt sau CCCD.");
      return;
    }
    if (!form.selfieImg) {
      alert("Vui lòng tải lên ảnh chân dung (Selfie).");
      return;
    }
    
    try {
      const payload = {
        national_id: form.cccd,
        full_name: form.fullname,
        date_of_birth: form.dob,
        front_image: form.frontImg,
        back_image: form.backImg,
        selfie_image: form.selfieImg,
        gender: "Nam",
        address: "Chưa cập nhật",
      };

      const res = await authAPI.submitKyc(payload);
      
      if (res.success) {
        // Sync local storage state
        const u = localStorage.getItem("bw_user");
        if (u) {
          const parsed = JSON.parse(u);
          parsed.kyc = false;
          parsed.kycStatus = "pending";
          parsed.cccd = form.cccd;
          parsed.name = form.fullname || parsed.name;
          parsed.dob = form.dob;
          
          localStorage.setItem("bw_user", JSON.stringify(parsed));
          setUser(parsed);
        }
        
        window.dispatchEvent(new Event("kyc_updated"));
        setSubmitted(true);
      } else {
        alert(res.message || "Không thể nộp hồ sơ xác thực.");
      }
    } catch (err) {
      console.error("KYC submission error:", err);
      alert(err.response?.data?.message || "Lỗi kết nối máy chủ khi nộp hồ sơ.");
    }
  };

  if (user && (user.kyc === true || user.kyc === "verified" || user.kycStatus === "verified")) {
    return (
      <div style={{ maxWidth: 560 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>Xác thực danh tính (KYC)</h1>
        <p style={{ color: "var(--text-secondary)", fontSize: 14, marginBottom: 24 }}>Tài khoản của bạn đã được xác minh chính thức bởi Ban quản trị</p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            background: "var(--bg-card)", border: "1px solid var(--border)",
            borderRadius: 16, padding: 28, boxShadow: "0 10px 30px rgba(0,0,0,0.02)"
          }}
        >
          {/* Status Badge */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24, padding: "12px 16px", background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 10 }}>
            <CheckCircle size={20} style={{ color: "#22c55e" }} />
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: "#22c55e" }}>Đã xác thực danh tính</p>
              <p style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 2 }}>Toàn bộ hạn mức giao dịch đã được nâng cấp lên mức tối đa.</p>
            </div>
          </div>

          {/* Full Information Table */}
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-secondary)" }}>Thông tin cá nhân đã xác minh</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
            {[
              { label: "Họ và tên", value: user.name || "Chưa cập nhật" },
              { label: "Số CCCD / CMND", value: user.cccd || "Chưa cập nhật" },
              { label: "Ngày sinh", value: user.dob || "Chưa cập nhật" },
              { label: "Giới tính", value: user.gender || "Nam" },
              { label: "Địa chỉ thường trú", value: user.address || "Hà Nội, Việt Nam" },
            ].map((item, idx) => (
              <div key={idx} style={{ display: "flex", justifyContent: "space-between", paddingBottom: 8, borderBottom: "1px solid var(--border)" }}>
                <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{item.label}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{item.value}</span>
              </div>
            ))}
          </div>

          {/* Document images */}
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-secondary)" }}>Ảnh giấy tờ tùy thân & Chân dung</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 28 }}>
            <div>
              <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 6 }}>Mặt trước CCCD</p>
              <div style={{ height: 110, background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: 12, overflow: "hidden" }}>
                {form.frontImg ? (
                  <img src={form.frontImg} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <span>[Ảnh đã lưu]</span>
                )}
              </div>
            </div>
            <div>
              <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 6 }}>Mặt sau CCCD</p>
              <div style={{ height: 110, background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: 12, overflow: "hidden" }}>
                {form.backImg ? (
                  <img src={form.backImg} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <span>[Ảnh đã lưu]</span>
                )}
              </div>
            </div>
            <div>
              <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 6 }}>Ảnh chân dung (Selfie)</p>
              <div style={{ height: 110, background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: 12, overflow: "hidden" }}>
                {form.selfieImg ? (
                  <img src={form.selfieImg} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <span>[Ảnh đã lưu]</span>
                )}
              </div>
            </div>
          </div>

          {/* Edit Button */}
          <button
            onClick={() => {
              setForm({
                fullname: user.name || "",
                cccd: user.cccd || "",
                dob: user.dob || "",
                frontImg: null,
                backImg: null,
                selfieImg: null
              });
              setStep(1);
              setSubmitted(false);
              
              // Tạm thời reset trạng thái kyc về "none" để người dùng sửa đổi và gửi lại
              const u = localStorage.getItem("bw_user");
              if (u) {
                const parsed = JSON.parse(u);
                parsed.kyc = false;
                parsed.kycStatus = "none";
                localStorage.setItem("bw_user", JSON.stringify(parsed));
                setUser(parsed);
              }
              window.dispatchEvent(new Event("kyc_updated"));
            }}
            style={{
              width: "100%", background: "var(--bg-card2)", border: "1px solid var(--border)",
              borderRadius: 10, padding: "12px", color: "var(--text-primary)", fontWeight: 700,
              fontSize: 14, cursor: "pointer", transition: "all 0.2s"
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = "var(--primary)"}
            onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border)"}
          >
            ✏️ Yêu cầu chỉnh sửa thông tin KYC
          </button>
        </motion.div>
      </div>
    );
  }

  if (submitted || (user && user.kycStatus === "pending")) {
    return (
      <div style={{ maxWidth:500, margin:"0 auto", textAlign:"center", paddingTop:40 }}>
        <motion.div initial={{scale:0}} animate={{scale:1}} transition={{type:"spring", damping:15}}
          style={{ width:80, height:80, background:"rgba(245,158,11,0.15)", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 20px" }}>
          <Clock size={36} style={{ color:"#f59e0b" }} />
        </motion.div>
        <h2 style={{ fontSize:22, fontWeight:800, marginBottom:8 }}>Đang xem xét hồ sơ</h2>
        <p style={{ color: "var(--text-secondary)", fontSize:14, lineHeight:1.6 }}>
          Chúng tôi đã nhận được hồ sơ KYC của bạn.<br />
          Kết quả đang được ban quản trị xem xét. Vui lòng chờ phản hồi trong thời gian sớm nhất!
        </p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth:560 }}>
      <h1 style={{ fontSize:20, fontWeight:800, marginBottom:4 }}>Xác thực danh tính (KYC)</h1>
      <p style={{ color: "var(--text-secondary)", fontSize:14, marginBottom:28 }}>Xác thực để tăng hạn mức giao dịch và sử dụng đầy đủ tính năng</p>

      {rejectReason && (
        <div style={{
          background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)",
          borderRadius: 12, padding: "16px 20px", marginBottom: 24, display: "flex", gap: 12
        }}>
          <AlertCircle size={20} style={{ color: "#ef4444", flexShrink: 0, marginTop: 2 }} />
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: "#ef4444", marginBottom: 4 }}>Yêu cầu KYC trước đó bị từ chối</p>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>{rejectReason}</p>
            <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}>Vui lòng chỉnh sửa thông tin và gửi lại hồ sơ chính xác.</p>
          </div>
        </div>
      )}

      {/* Stepper */}
      <div style={{ display:"flex", alignItems:"center", marginBottom:32 }}>
        {steps.map((s, i) => (
          <div key={s.id} style={{ display:"flex", alignItems:"center", flex: i < steps.length-1 ? 1 : "none" }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, flexShrink:0 }}>
              <div style={{
                width:32, height:32, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:13,
                background: step > s.id ? "#22c55e" : step === s.id ? "#2563eb" : "#ffffff",
                border: `2px solid ${step > s.id ? "#22c55e" : step === s.id ? "#2563eb" : "var(--border)"}`,
                color: step >= s.id ? "white" : "var(--text-muted)", transition:"all 0.3s"
              }}>
                {step > s.id ? <CheckCircle size={16} /> : s.id}
              </div>
              <div className="hidden sm:block">
                <p style={{ fontSize:12, fontWeight:600, color: step >= s.id ? "var(--primary)" : "var(--text-muted)" }}>{s.title}</p>
                <p style={{ fontSize:10, color: "var(--text-muted)" }}>{s.desc}</p>
              </div>
            </div>
            {i < steps.length-1 && (
              <div style={{ flex:1, height:2, margin:"0 12px", background: step > s.id ? "#22c55e" : "var(--border)", transition:"all 0.3s" }} />
            )}
          </div>
        ))}
      </div>

      {/* Step 1 */}
      {step === 1 && (
        <motion.div initial={{opacity:0,x:20}} animate={{opacity:1,x:0}}
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius:16, padding:28 }}>
          <h3 style={{ fontSize:15, fontWeight:700, marginBottom:20 }}>Thông tin cá nhân</h3>
          {[
            { label:"Họ và tên (theo CCCD)", key:"fullname", placeholder:"Nguyễn Văn A" },
            { label:"Số CCCD / CMND", key:"cccd", placeholder:"012345678901" },
            { label:"Ngày sinh", key:"dob", placeholder:"", type:"date" },
          ].map(f => (
            <div key={f.key} style={{ marginBottom:16 }}>
              <label style={{ fontSize:13, color: "var(--text-secondary)", display:"block", marginBottom:6 }}>{f.label}</label>
              <input value={form[f.key]} onChange={e => setForm(p => ({...p,[f.key]:e.target.value}))}
                type={f.type||"text"} placeholder={f.placeholder}
                style={{ width:"100%", background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius:10, padding:"11px 14px", color: "#000000", fontSize:14, outline:"none" }}
                onFocus={e => { e.target.style.borderColor="#2563eb"; }}
                onBlur={e => { e.target.style.borderColor="var(--border)"; }}
              />
            </div>
          ))}
          <button onClick={handleSubmit} style={{ width:"100%", background:"linear-gradient(135deg,#2563eb,#1d4ed8)", color: "white", border:"none", borderRadius:10, padding:"13px", fontWeight:700, fontSize:14, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8, marginTop:8 }}>
            Tiếp theo <ArrowRight size={16} />
          </button>
        </motion.div>
      )}

      {/* Step 2 */}
      {step === 2 && (
        <motion.div initial={{opacity:0,x:20}} animate={{opacity:1,x:0}}
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius:16, padding:28 }}>
          <h3 style={{ fontSize:15, fontWeight:700, marginBottom:20 }}>Tải ảnh giấy tờ & nhận diện khuôn mặt</h3>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(130px, 1fr))", gap:12, marginBottom:24 }}>
            {[
              { label:"Mặt trước CCCD", key:"frontImg" },
              { label:"Mặt sau CCCD", key:"backImg" },
              { label:"Ảnh chân dung (Selfie)", key:"selfieImg" },
            ].map(f => (
              <div key={f.key}>
                <p style={{ fontSize:13, color: "var(--text-secondary)", marginBottom:8 }}>{f.label}</p>
                <label style={{
                  display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
                  height:140, border:`2px dashed ${form[f.key] ? "#22c55e" : "var(--border)"}`,
                  borderRadius:12, cursor:"pointer", background: form[f.key] ? "rgba(34,197,94,0.05)" : "var(--bg-card2)",
                  overflow:"hidden", transition:"all 0.2s", position:"relative"
                }}>
                  {form[f.key]
                    ? <img src={form[f.key]} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                    : <>
                        <Upload size={24} style={{ color: "var(--text-muted)", marginBottom:8 }} />
                        <span style={{ fontSize:12, color: "var(--text-muted)" }}>Chọn ảnh</span>
                      </>
                  }
                  <input type="file" accept="image/*" onChange={e => handleFile(f.key, e)} style={{ position:"absolute", inset:0, opacity:0, cursor:"pointer" }} />
                </label>
              </div>
            ))}
          </div>
          <div style={{ background:"rgba(245,158,11,0.08)", border:"1px solid rgba(245,158,11,0.2)", borderRadius:10, padding:"12px 14px", marginBottom:20, display:"flex", gap:8 }}>
            <AlertCircle size={15} style={{ color:"#f59e0b", flexShrink:0, marginTop:2 }} />
            <p style={{ fontSize:12, color:"#a16207", lineHeight:1.5 }}>Ảnh phải rõ ràng, không bị mờ, che khuất. Định dạng JPG/PNG/WEBP/GIF, tối đa 5MB.</p>
          </div>
          <div style={{ display:"flex", gap:10 }}>
            <button onClick={() => setStep(1)} style={{ flex:1, background: "var(--bg-card2)", border: "1px solid var(--border)", color: "var(--text-secondary)", borderRadius:10, padding:"12px", fontWeight:600, fontSize:14, cursor:"pointer" }}>
              Quay lại
            </button>
            <button onClick={handleSubmit} style={{ flex:2, background:"linear-gradient(135deg,#2563eb,#1d4ed8)", color: "white", border:"none", borderRadius:10, padding:"13px", fontWeight:700, fontSize:14, cursor:"pointer" }}>
              Gửi xác minh
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
