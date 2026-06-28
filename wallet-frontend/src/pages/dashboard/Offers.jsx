import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, ChevronRight, Flame } from "lucide-react";
import { motion } from "framer-motion";
import { voucherAPI } from "../../services/api";
import { useLanguage } from "../../context/LanguageContext";

const discountLabel = (v, lang) => {
  if (v.discount_type === "PERCENT") return `${Number(v.discount_value)}%`;
  const formatted = Number(v.discount_value).toLocaleString(lang === "en" ? "en-US" : "vi-VN");
  return lang === "en" ? `${formatted} VND` : `${formatted}₫`;
};

const translateVoucher = (v, lang) => {
  if (lang !== "en" || !v) return v;
  const translations = {
    "CHUYENTIEN50": {
      title: "50K discount on transfer fee",
      description: "For transactions from 500K"
    },
    "MUASAM10": {
      title: "10% off shopping",
      description: "Max 200K"
    },
    "BILL30": {
      title: "30K discount on bills",
      description: "Bill payment"
    }
  };
  const trans = translations[v.code];
  if (trans) {
    return {
      ...v,
      title: trans.title,
      description: trans.description
    };
  }
  
  const titleMap = {
    "Giảm 50K phí chuyển tiền": "50K discount on transfer fee",
    "Giảm 10% mua sắm": "10% off shopping",
    "Giảm 30K hóa đơn": "30K discount on bills"
  };
  const descMap = {
    "Áp dụng giao dịch từ 500K": "For transactions from 500K",
    "Tối đa 200K": "Max 200K",
    "Thanh toán hóa đơn": "Bill payment"
  };
  return {
    ...v,
    title: titleMap[v.title] || v.title,
    description: descMap[v.description] || v.description
  };
};
const fmtDate = (d) => { try { return new Date(d).toLocaleDateString("vi-VN"); } catch { return ""; } };

const tagColors = {
  "Transfer":"#2563eb","Shopping":"#3b82f6","Withdraw":"#22c55e",
  "Referral":"#8b5cf6","Deposit":"#f59e0b","Bills":"#ec4899"
};

// Map legacy Vietnamese DB tag values to the English display keys
const TAG_MAP = {
  "Chuyển tiền":"Transfer","Mua sắm":"Shopping","Rút tiền":"Withdraw",
  "Referral":"Referral","Nạp tiền":"Deposit","Hóa đơn":"Bills"
};

const normalizeTag = (tag) => TAG_MAP[tag] || tag;

const getTagLabel = (tagKey, lang) => {
  if (lang === "vi") {
    if (tagKey === "All") return "Tất cả";
    if (tagKey === "Transfer") return "Chuyển tiền";
    if (tagKey === "Shopping") return "Mua sắm";
    if (tagKey === "Withdraw") return "Rút tiền";
    if (tagKey === "Referral") return "Giới thiệu";
    if (tagKey === "Deposit") return "Nạp tiền";
    if (tagKey === "Bills") return "Hóa đơn";
    return tagKey;
  }
  return tagKey;
};

export default function OffersPage() {
  const navigate = useNavigate();
  const { t, lang } = useLanguage();
  const [activeTag, setActiveTag] = useState("All");
  const [vouchers, setVouchers] = useState([]);

  const loadVouchers = async () => {
    try { const res = await voucherAPI.publicList(); if (res.success) setVouchers(res.data); }
    catch (e) { console.error("Load vouchers failed:", e); }
  };

  useEffect(() => { loadVouchers(); }, []);

  const tags = ["All", ...Object.keys(tagColors)];
  const filtered = activeTag === "All" ? vouchers : vouchers.filter(v => normalizeTag(v.tag) === activeTag);

  const handleUseVoucher = (v) => {
    const type = normalizeTag(v.tag || "");
    let modalType = "transfer";
    if (type === "Withdraw") modalType = "withdraw";
    else if (type === "Deposit") modalType = "deposit";
    navigate(`/dashboard/wallets?promo=${v.code}&modal=${modalType}`);
  };

  return (
    <div style={{ maxWidth:900 }}>
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontSize:22, fontWeight:800, marginBottom:4 }}>🎁 {t.offersPage.title}</h1>
        <p style={{ color: "var(--text-secondary)", fontSize:14 }}>{t.offersPage.subtitle}</p>
      </div>

      {/* Tags filter */}
      <div style={{ display:"flex", gap:8, marginBottom:24, flexWrap:"wrap" }}>
        {tags.map(tagKey => (
          <button key={tagKey} onClick={() => setActiveTag(tagKey)} style={{
            padding:"6px 14px", borderRadius:20, fontSize:13, fontWeight:500,
            background: activeTag===tagKey ? "rgba(37,99,235,0.15)" : "#ffffff",
            border:`1px solid ${activeTag===tagKey ? "rgba(37,99,235,0.4)" : "var(--border)"}`,
            color: activeTag===tagKey ? "#2563eb" : "#000000", cursor:"pointer", transition:"all 0.2s"
          }}>{getTagLabel(tagKey, lang)}</button>
        ))}
      </div>

      {/* Voucher grid */}
      {filtered.length === 0 ? (
        <div style={{ textAlign:"center", padding:"60px 0", color: "var(--text-muted)", fontSize:14 }}>
          <p style={{ fontSize:40, marginBottom:12 }}>🎟️</p>
          <p>{t.offersPage.noOffers}{activeTag !== "All" ? ` ${lang === "vi" ? "cho" : "for"} "${getTagLabel(activeTag, lang)}"` : ""}.</p>
        </div>
      ) : (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(280px, 1fr))", gap:16 }}>
          {filtered.map((rawV, i) => {
            const v = translateVoucher(rawV, lang);
            const type = normalizeTag(v.tag || "Other");
            const color = tagColors[type] || "#71717a";
            return (
              <motion.div key={v.id} initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{delay:i*0.07}}
                onClick={() => handleUseVoucher(v)}
                style={{
                  background: "var(--bg-card)", border:`1px solid ${v.hot ? "rgba(37,99,235,0.25)" : "var(--border)"}`,
                  borderRadius:16, overflow:"hidden", cursor:"pointer", transition:"all 0.25s", position:"relative"
                }}
                whileHover={{ y:-4, boxShadow:"0 12px 32px rgba(37,99,235,0.06)" }}
              >
                {v.hot && (
                  <div style={{ position:"absolute", top:12, right:12, display:"flex", alignItems:"center", gap:4, background:"rgba(37,99,235,0.15)", border:"1px solid rgba(37,99,235,0.3)", borderRadius:6, padding:"3px 8px" }}>
                    <Flame size={11} style={{ color:"#2563eb" }} />
                    <span style={{ fontSize:10, fontWeight:700, color:"#2563eb" }}>{t.offersPage.hot}</span>
                  </div>
                )}
                {/* Discount badge */}
                <div style={{ background:`linear-gradient(135deg, ${color}12, transparent)`, padding:"20px 20px 16px", borderBottom:"1px dashed var(--border)" }}>
                  <div style={{ fontSize:32, fontWeight:900, color }}>{discountLabel(v, lang)}</div>
                  <p style={{ fontSize:15, fontWeight:700, marginTop:4, color:"var(--text-primary)" }}>{v.title || v.code}</p>
                </div>
                <div style={{ padding:"14px 20px" }}>
                  <p style={{ fontSize:12, color: "var(--text-secondary)", marginBottom:12 }}>{v.description || ""}</p>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                      <span style={{ fontSize:10, padding:"3px 8px", borderRadius:6, background:`${color}18`, color, fontWeight:600 }}>{getTagLabel(type, lang)}</span>
                      {v.expired_at && (
                        <div style={{ display:"flex", alignItems:"center", gap:4, color: "var(--text-muted)" }}>
                          <Clock size={11} />
                          <span style={{ fontSize:11 }}>{t.offersPage.exp}: {fmtDate(v.expired_at)}</span>
                        </div>
                      )}
                    </div>
                    <button style={{ background:"none", border:"none", cursor:"pointer", color, display:"flex", alignItems:"center", gap:2, fontSize:12, fontWeight:600 }}>
                      {lang === "vi" ? "Dùng ngay" : "Use"} <ChevronRight size={12} />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
