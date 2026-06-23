import { useState, useEffect } from "react";
import { Upload, CheckCircle, Clock, AlertCircle, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { authAPI, kycAPI, getUploadUrl } from "../../services/api";
import { useLanguage } from "../../context/LanguageContext";
import "./Kyc.css";

export default function KycPage() {
  const { t } = useLanguage();
  const steps = [
    { id:1, title: t.kyc.personalInfo,    desc: "ID card & name" },
    { id:2, title: t.kyc.uploadDocuments, desc: "Front & back of ID" },
    { id:3, title: t.kyc.underReviewStep, desc: "1–3 business days" },
  ];
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ fullname:"", cccd:"", dob:"", gender:"Male", address:"", frontImg:null, backImg:null, selfieImg:null });
  const [submitted, setSubmitted] = useState(false);
  const [user, setUser] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  // KYC record loaded from backend — contains server-side image filenames
  const [savedKyc, setSavedKyc] = useState(null);

  useEffect(() => {
    if (user && (user.kycStatus === "rejected" || user.kyc === "rejected")) {
      authAPI.getNotifications()
        .then(res => {
          if (res.success && res.notifications) {
            // backend sends Vietnamese notification titles — search for rejection keyword
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

  // Load the existing KYC record from backend whenever user has any KYC status
  useEffect(() => {
    if (!user) return;
    const hasKyc = user.kyc === true || user.kyc === "verified" || user.kycStatus === "verified"
      || user.kycStatus === "pending" || user.kycStatus === "rejected";
    if (!hasKyc) return;

    kycAPI.getMyKyc()
      .then(kyc => {
        if (kyc && !kyc.message) {
          setSavedKyc(kyc);
          // Pre-fill text fields for rejected/edit flow
          setForm(f => ({
            ...f,
            fullname: f.fullname || kyc.full_name || "",
            cccd: f.cccd || kyc.national_id || "",
            dob: f.dob || (kyc.date_of_birth ? kyc.date_of_birth.split("T")[0] : ""),
            gender: f.gender || kyc.gender || "Male",
            address: f.address || kyc.address || "",
          }));
        }
      })
      .catch(() => {});
  }, [user]);

  const handleFile = (key, e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("Image size must not exceed 5 MB.");
        return;
      }
      const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
      if (!allowedTypes.includes(file.type)) {
        alert("Unsupported file format. Only JPG, PNG, WEBP, or GIF images are accepted.");
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
        alert("Please enter your full name as shown on your ID card.");
        return;
      }
      if (!form.cccd.trim()) {
        alert("Please enter your national ID number.");
        return;
      }
      if (!/^\d{9}$|^\d{12}$/.test(form.cccd.trim())) {
        alert("Invalid ID number format — must be exactly 9 or 12 digits.");
        return;
      }
      if (!form.dob) {
        alert("Please enter your date of birth.");
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
        alert("You must be at least 15 years old to submit a KYC application.");
        return;
      }
      setStep(2);
      return;
    }

    // Images are only mandatory for a brand-new submission (no existing KYC record).
    // On an update the user can leave any unchanged — the backend keeps the old files.
    const isUpdate = !!savedKyc;

    if (!isUpdate) {
      if (!form.frontImg) {
        alert("Please upload the front side of your ID card.");
        return;
      }
      if (!form.backImg) {
        alert("Please upload the back side of your ID card.");
        return;
      }
      if (!form.selfieImg) {
        alert("Please upload a selfie photo.");
        return;
      }
    }

    try {
      // Only send images that were newly selected — omitting them lets the backend keep the old ones
      const payload = {
        national_id: form.cccd,
        full_name: form.fullname,
        date_of_birth: form.dob,
        gender: form.gender || "Male",
        address: form.address || "",
        ...(form.frontImg  && { front_image:  form.frontImg }),
        ...(form.backImg   && { back_image:   form.backImg }),
        ...(form.selfieImg && { selfie_image: form.selfieImg }),
      };

      // Use update if an existing KYC record is loaded, submit otherwise
      const res = isUpdate
        ? await kycAPI.update(payload)
        : await kycAPI.submit(payload);

      if (res.success) {
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
        alert(res.message || "Failed to submit KYC application.");
      }
    } catch (err) {
      console.error("KYC submission error:", err);
      alert(err.response?.data?.message || "Server error during submission. Please try again.");
    }
  };

  // ── Verified view ──────────────────────────────────────────────────────────
  if (user && (user.kyc === true || user.kyc === "verified" || user.kycStatus === "verified")) {
    return (
      <div className="kyc-container">
        <h1 className="kyc-title">{t.kyc.title}</h1>
        <p className="kyc-subtitle">{t.kyc.verifiedDesc}</p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="kyc-verified-box"
        >
          {/* Status Badge */}
          <div className="kyc-status-alert">
            <CheckCircle size={20} style={{ color: "#22c55e" }} />
            <div>
              <p className="kyc-status-title">{t.kyc.verifiedTitle}</p>
              <p className="kyc-status-desc">{t.kyc.verifiedDesc}</p>
            </div>
          </div>

          {/* Information Table */}
          <h3 className="kyc-info-section-title">
            {t.kyc.verifiedInfo}
          </h3>
          <div className="kyc-info-table">
            {[
              { label: t.kyc.fullName,         value: savedKyc?.full_name || "Not provided" },
              { label: t.kyc.nationalId,       value: savedKyc?.national_id || "Not provided" },
              { label: t.kyc.dob,     value: savedKyc?.date_of_birth ? new Date(savedKyc.date_of_birth).toLocaleDateString("en-GB") : "Not provided" },
              { label: t.kyc.gender,            value: savedKyc?.gender || "Not provided" },
              { label: t.kyc.address, value: savedKyc?.address || "Not provided" },
            ].map((item, idx) => (
              <div key={idx} className="kyc-info-row">
                <span className="kyc-info-label">{item.label}</span>
                <span className="kyc-info-value">{item.value}</span>
              </div>
            ))}
          </div>

          {/* Document Images */}
          <h3 className="kyc-info-section-title">
            {t.kyc.documentsTitle}
          </h3>
          <div className="kyc-images-grid">
            {[
              { label: t.kyc.idFront, src: getUploadUrl(savedKyc?.front_image) },
              { label: t.kyc.idBack,  src: getUploadUrl(savedKyc?.back_image) },
              { label: t.kyc.selfie,          src: getUploadUrl(savedKyc?.selfie_image) },
            ].map(({ label, src }) => (
              <div key={label}>
                <p className="kyc-image-label">{label}</p>
                <div className="kyc-image-preview-box">
                  {src ? (
                    <img src={src} alt={label} />
                  ) : (
                    <span>{t.kyc.noImage}</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Edit Button */}
          <button
            onClick={() => {
              setForm({
                fullname: savedKyc?.full_name || "",
                cccd: savedKyc?.national_id || "",
                dob: savedKyc?.date_of_birth ? savedKyc.date_of_birth.split("T")[0] : "",
                gender: savedKyc?.gender || "Male",
                address: savedKyc?.address || "",
                frontImg: null,
                backImg: null,
                selfieImg: null,
              });
              setStep(1);
              setSubmitted(false);
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
            className="kyc-btn"
          >
            ✏️ {t.kyc.requestUpdate}
          </button>
        </motion.div>
      </div>
    );
  }

  // ── Pending view ───────────────────────────────────────────────────────────
  if (submitted || (user && user.kycStatus === "pending")) {
    return (
      <div style={{ maxWidth:500, margin:"0 auto", textAlign:"center", paddingTop:40 }}>
        <motion.div initial={{scale:0}} animate={{scale:1}} transition={{type:"spring", damping:15}}
          style={{ width:80, height:80, background:"rgba(245,158,11,0.15)", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 20px" }}>
          <Clock size={36} style={{ color:"#f59e0b" }} />
        </motion.div>
        <h2 style={{ fontSize:22, fontWeight:800, marginBottom:8, color: "var(--text-primary)" }}>{t.kyc.underReviewTitle}</h2>
        <p style={{ color: "var(--text-secondary)", fontSize:14, lineHeight:1.6 }}>
          {t.kyc.underReviewDesc}
        </p>
      </div>
    );
  }

  // ── Submission form ────────────────────────────────────────────────────────
  return (
    <div className="kyc-container">
      <h1 className="kyc-title">{t.kyc.title}</h1>
      <p className="kyc-subtitle">{t.kyc.subtitle}</p>

      {rejectReason && (
        <div style={{
          background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)",
          borderRadius: 12, padding: "16px 20px", marginBottom: 24, display: "flex", gap: 12
        }}>
          <AlertCircle size={20} style={{ color: "#ef4444", flexShrink: 0, marginTop: 2 }} />
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: "#ef4444", marginBottom: 4 }}>{t.kyc.rejectedTitle}</p>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>{rejectReason}</p>
            <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}>
              {t.kyc.rejectedDesc}
            </p>
          </div>
        </div>
      )}

      {/* Stepper */}
      <div className="kyc-stepper">
        {steps.map((s, i) => (
          <div key={s.id} className="kyc-step-item" style={{ flex: i < steps.length-1 ? 1 : "none" }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, flexShrink:0 }}>
              <div className="kyc-step-circle" style={{
                background: step > s.id ? "#22c55e" : step === s.id ? "#2563eb" : "var(--bg-card)",
                border: `2px solid ${step > s.id ? "#22c55e" : step === s.id ? "#2563eb" : "var(--border)"}`,
                color: step >= s.id ? "white" : "var(--text-muted)",
              }}>
                {step > s.id ? <CheckCircle size={16} /> : s.id}
              </div>
              <div className="hidden sm:block">
                <p className="kyc-step-text-title" style={{ color: step >= s.id ? "var(--primary)" : "var(--text-muted)" }}>{s.title}</p>
                <p className="kyc-step-text-desc">{s.desc}</p>
              </div>
            </div>
            {i < steps.length-1 && (
              <div className="kyc-step-line" style={{ background: step > s.id ? "#22c55e" : "var(--border)" }} />
            )}
          </div>
        ))}
      </div>

      {/* Step 1 — Personal Information */}
      {step === 1 && (
        <motion.div initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} className="kyc-card">
          <h3 className="kyc-info-section-title">{t.kyc.personalInfo}</h3>

          {[
            { label: t.kyc.fullName, key:"fullname", placeholder: lang === "vi" ? "VD: Nguyễn Văn A" : "e.g. John Smith" },
            { label: t.kyc.nationalId,        key:"cccd",     placeholder: lang === "vi" ? "9 hoặc 12 số" : "9 or 12 digits" },
            { label: t.kyc.dob,             key:"dob",      placeholder:"", type:"date" },
          ].map(f => (
            <div key={f.key} style={{ marginBottom:16 }}>
              <label style={{ fontSize:13, color: "var(--text-secondary)", display:"block", marginBottom:6 }}>{f.label}</label>
              <input value={form[f.key]} onChange={e => setForm(p => ({...p,[f.key]:e.target.value}))}
                type={f.type||"text"} placeholder={f.placeholder}
                style={{ width:"100%", background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius:10, padding:"11px 14px", color: "var(--text-primary)", fontSize:14, outline:"none" }}
              />
            </div>
          ))}

          {/* Gender */}
          <div style={{ marginBottom:16 }}>
            <label style={{ fontSize:13, color: "var(--text-secondary)", display:"block", marginBottom:6 }}>{t.kyc.gender}</label>
            <div style={{ display:"flex", gap:10 }}>
              {[(lang === "vi" ? "Nam" : "Male"), (lang === "vi" ? "Nữ" : "Female"), (lang === "vi" ? "Khác" : "Other")].map(g => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setForm(p => ({...p, gender: g}))}
                  style={{
                    flex:1, padding:"10px", borderRadius:10, fontSize:14, fontWeight:600, cursor:"pointer",
                    background: form.gender === g ? "rgba(37,99,235,0.12)" : "var(--bg-card2)",
                    border: `2px solid ${form.gender === g ? "#2563eb" : "var(--border)"}`,
                    color: form.gender === g ? "#2563eb" : "var(--text-secondary)",
                    transition:"all 0.15s"
                  }}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          {/* Address */}
          <div style={{ marginBottom:16 }}>
            <label style={{ fontSize:13, color: "var(--text-secondary)", display:"block", marginBottom:6 }}>{t.kyc.address}</label>
            <input
              value={form.address}
              onChange={e => setForm(p => ({...p, address: e.target.value}))}
              type="text"
              placeholder={lang === "vi" ? "Số nhà, tên đường, phường, quận, thành phố" : "House number, street, city"}
              style={{ width:"100%", background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius:10, padding:"11px 14px", color: "var(--text-primary)", fontSize:14, outline:"none" }}
            />
          </div>

          <button onClick={handleSubmit} style={{ width:"100%", background:"linear-gradient(135deg,#2563eb,#1d4ed8)", color: "white", border:"none", borderRadius:10, padding:"13px", fontWeight:700, fontSize:14, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8, marginTop:8 }}>
            {t.kyc.next} <ArrowRight size={16} />
          </button>
        </motion.div>
      )}

      {/* Step 2 — Upload Documents */}
      {step === 2 && (
        <motion.div initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} className="kyc-card">
          <h3 className="kyc-info-section-title">{t.kyc.documentsTitle}</h3>
          <div className="kyc-upload-row">
            {[
              { label: t.kyc.idFront, key:"frontImg",  serverKey:"front_image" },
              { label: t.kyc.idBack,  key:"backImg",   serverKey:"back_image" },
              { label: t.kyc.selfie,    key:"selfieImg", serverKey:"selfie_image" },
            ].map(f => {
              const preview = form[f.key] || getUploadUrl(savedKyc?.[f.serverKey]);
              const hasImage = !!preview;
              return (
                <div key={f.key}>
                  <p style={{ fontSize:13, color: "var(--text-secondary)", marginBottom:8 }}>{f.label}</p>
                  <label className="kyc-upload-box" style={{ border: `2px dashed ${hasImage ? "#22c55e" : "var(--border)"}` }}>
                    {hasImage
                      ? <img src={preview} alt="" />
                      : <>
                          <Upload size={24} style={{ color: "var(--text-muted)", marginBottom:8 }} />
                          <span style={{ fontSize:12, color: "var(--text-muted)" }}>{t.kyc.uploadPrompt}</span>
                        </>
                    }
                    <input type="file" accept="image/*" onChange={e => handleFile(f.key, e)} style={{ position:"absolute", inset:0, opacity:0, cursor:"pointer" }} />
                  </label>
                  {form[f.key] && (
                    <p style={{ fontSize:11, color:"#22c55e", marginTop:4, textAlign:"center" }}>✓ New</p>
                  )}
                </div>
              );
            })}
          </div>
          <div className="kyc-alert-banner">
            <AlertCircle size={15} style={{ color:"#f59e0b", flexShrink:0, marginTop:2 }} />
            <p className="kyc-alert-text">
              {t.kyc.alertNote}
            </p>
          </div>
          <div style={{ display:"flex", gap:10 }}>
            <button onClick={() => setStep(1)} className="kyc-btn" style={{ flex:1 }}>
              {t.kyc.back}
            </button>
            <button onClick={handleSubmit} style={{ flex:2, background:"linear-gradient(135deg,#2563eb,#1d4ed8)", color: "white", border:"none", borderRadius:10, padding:"13px", fontWeight:700, fontSize:14, cursor:"pointer" }}>
              {t.kyc.submitKyc}
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
