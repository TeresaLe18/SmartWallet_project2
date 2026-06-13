import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, ChevronRight, Flame } from "lucide-react";
import { motion } from "framer-motion";

const STORAGE_KEY = "bw_admin_vouchers";

const tagColors = {
  "Chuyển tiền":"#2563eb","Mua sắm":"#3b82f6","Rút tiền":"#22c55e",
  "Referral":"#8b5cf6","Nạp tiền":"#f59e0b","Hóa đơn":"#ec4899"
};

export default function OffersPage() {
  const navigate = useNavigate();
  const [activeTag, setActiveTag] = useState("Tất cả");
  const [vouchers, setVouchers] = useState([]);

  const loadVouchers = () => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const all = JSON.parse(saved);
        setVouchers(all.filter(v => v.active !== false));
      } catch { setVouchers([]); }
    }
  };

  useEffect(() => {
    loadVouchers();
    const handler = () => loadVouchers();
    window.addEventListener("bw_vouchers_updated", handler);
    const storageHandler = (e) => { if (e.key === STORAGE_KEY) loadVouchers(); };
    window.addEventListener("storage", storageHandler);
    return () => {
      window.removeEventListener("bw_vouchers_updated", handler);
      window.removeEventListener("storage", storageHandler);
    };
  }, []);

  const tags = ["Tất cả", ...Object.keys(tagColors)];
  const filtered = activeTag === "Tất cả" ? vouchers : vouchers.filter(v => v.type === activeTag || v.tag === activeTag);

  const handleUseVoucher = (v) => {
    const type = v.type || v.tag || "";
    let modalType = "transfer";
    if (type === "Rút tiền") modalType = "withdraw";
    else if (type === "Nạp tiền") modalType = "deposit";
    navigate(`/dashboard/wallets?promo=${v.code}&modal=${modalType}`);
  };

  return (
    <div style={{ maxWidth:900 }}>
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontSize:22, fontWeight:800, marginBottom:4 }}>🎁 Ưu đãi & Voucher</h1>
        <p style={{ color: "var(--text-secondary)", fontSize:14 }}>Các ưu đãi độc quyền dành riêng cho thành viên SmartWallet</p>
      </div>

      {/* Tags filter */}
      <div style={{ display:"flex", gap:8, marginBottom:24, flexWrap:"wrap" }}>
        {tags.map(t => (
          <button key={t} onClick={() => setActiveTag(t)} style={{
            padding:"6px 14px", borderRadius:20, fontSize:13, fontWeight:500,
            background: activeTag===t ? "rgba(37,99,235,0.15)" : "#ffffff",
            border:`1px solid ${activeTag===t ? "rgba(37,99,235,0.4)" : "var(--border)"}`,
            color: activeTag===t ? "#2563eb" : "#000000", cursor:"pointer", transition:"all 0.2s"
          }}>{t}</button>
        ))}
      </div>

      {/* Voucher grid */}
      {filtered.length === 0 ? (
        <div style={{ textAlign:"center", padding:"60px 0", color: "var(--text-muted)", fontSize:14 }}>
          <p style={{ fontSize:40, marginBottom:12 }}>🎟️</p>
          <p>Chưa có ưu đãi nào{activeTag !== "Tất cả" ? ` cho mục "${activeTag}"` : ""}.</p>
        </div>
      ) : (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(280px, 1fr))", gap:16 }}>
          {filtered.map((v, i) => {
            const type = v.type || v.tag || "Khác";
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
                    <span style={{ fontSize:10, fontWeight:700, color:"#2563eb" }}>HOT</span>
                  </div>
                )}
                {/* Discount badge */}
                <div style={{ background:`linear-gradient(135deg, ${color}12, transparent)`, padding:"20px 20px 16px", borderBottom:"1px dashed var(--border)" }}>
                  <div style={{ fontSize:32, fontWeight:900, color }}>{v.discount}</div>
                  <p style={{ fontSize:15, fontWeight:700, marginTop:4, color:"var(--text-primary)" }}>{v.title || v.code}</p>
                </div>
                <div style={{ padding:"14px 20px" }}>
                  <p style={{ fontSize:12, color: "var(--text-secondary)", marginBottom:12 }}>{v.desc || ""}</p>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                      <span style={{ fontSize:10, padding:"3px 8px", borderRadius:6, background:`${color}18`, color, fontWeight:600 }}>{type}</span>
                      {v.exp && (
                        <div style={{ display:"flex", alignItems:"center", gap:4, color: "var(--text-muted)" }}>
                          <Clock size={11} />
                          <span style={{ fontSize:11 }}>HSD: {v.exp}</span>
                        </div>
                      )}
                    </div>
                    <button style={{ background:"none", border:"none", cursor:"pointer", color, display:"flex", alignItems:"center", gap:2, fontSize:12, fontWeight:600 }}>
                      Dùng <ChevronRight size={12} />
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
