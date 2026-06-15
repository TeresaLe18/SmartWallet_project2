import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, X, Tag, Percent, FolderOpen, Flame } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { feeAPI, categoryAPI, voucherAPI } from "../../services/api";

// Loại giao dịch áp phí (khớp enum backend TransactionType)
const TX_TYPES = ["TRANSFER", "WITHDRAW", "PAYMENT", "DEPOSIT"];
const TX_LABEL = { TRANSFER: "Chuyển tiền nội bộ", WITHDRAW: "Rút/chuyển ngân hàng", PAYMENT: "Thanh toán", DEPOSIT: "Nạp tiền" };

const VOUCHER_TAGS = ["Chuyển tiền", "Rút tiền", "Nạp tiền", "Mua sắm", "Referral", "Hóa đơn"];
const emptyForm = { code:"", title:"", desc:"", tag:"Chuyển tiền", hot:false, discountType:"FIXED", discountValue:"", minTransactionAmount:"0", quantity:"", expiredAt:"", status:"ACTIVE" };

// Nhãn giảm giá suy từ cơ chế: FIXED -> "50.000₫", PERCENT -> "10%"
const discountLabel = (v) => v.discount_type === "PERCENT" ? `${Number(v.discount_value)}%` : `${Number(v.discount_value).toLocaleString("vi-VN")}₫`;
const fmtVoucherDate = (d) => { try { return new Date(d).toLocaleDateString("vi-VN"); } catch { return ""; } };

export default function AdminServices() {
  const [tab, setTab] = useState("voucher");
  const [vouchers, setVouchers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [newCat, setNewCat] = useState("");
  const [catList, setCatList] = useState([]);

  const loadCats = async () => {
    try { const res = await categoryAPI.adminList(); if (res.success) setCatList(res.data); }
    catch (e) { console.error("Load categories failed:", e); }
  };
  const handleAddCat = async () => {
    if (!newCat.trim()) return;
    try {
      const res = await categoryAPI.create(newCat.trim());
      if (res.success) { setNewCat(""); loadCats(); } else alert(res.message || "Lỗi thêm danh mục");
    } catch (e) { alert(e.response?.data?.message || "Lỗi thêm danh mục"); }
  };
  const handleDeleteCat = async (id) => {
    try { const res = await categoryAPI.remove(id); if (res.success) loadCats(); }
    catch (e) { alert(e.response?.data?.message || "Lỗi xoá danh mục"); }
  };

  // Fee management states (DB qua feeAPI)
  const [feeList, setFeeList] = useState([]);
  const [showFeeModal, setShowFeeModal] = useState(false);
  const [editFeeItem, setEditFeeItem] = useState(null);
  const [feeForm, setFeeForm] = useState({ transactionType: "TRANSFER", feeValue: "" });

  const loadFees = async () => {
    try {
      const res = await feeAPI.getAll();
      if (res.success) setFeeList(res.data);
    } catch (e) {
      console.error("Load fees failed:", e);
    }
  };
  useEffect(() => { loadFees(); loadCats(); loadVouchers(); }, []);

  const openAddFee = () => {
    setEditFeeItem(null);
    setFeeForm({ transactionType: "TRANSFER", feeValue: "" });
    setShowFeeModal(true);
  };

  const openEditFee = (fee) => {
    setEditFeeItem(fee);
    setFeeForm({ transactionType: fee.transaction_type, feeValue: String(fee.fee_value) });
    setShowFeeModal(true);
  };

  const handleSaveFee = async () => {
    const value = Number(feeForm.feeValue);
    if (!Number.isFinite(value) || value < 0) {
      alert("Giá trị phí phải là số >= 0 (VND).");
      return;
    }
    try {
      const res = editFeeItem
        ? await feeAPI.update(editFeeItem.id, { feeValue: value })
        : await feeAPI.create(feeForm.transactionType, value);
      if (res.success) { await loadFees(); setShowFeeModal(false); }
      else alert(res.message || "Lưu phí thất bại.");
    } catch (e) {
      alert(e.response?.data?.message || "Lỗi máy chủ khi lưu phí.");
    }
  };

  const handleDeleteFee = async (id) => {
    if (!confirm("Xoá rule phí này?")) return;
    try {
      const res = await feeAPI.remove(id);
      if (res.success) loadFees();
    } catch (e) {
      alert(e.response?.data?.message || "Lỗi khi xoá phí.");
    }
  };

  const loadVouchers = async () => {
    try { const res = await voucherAPI.adminList(); if (res.success) setVouchers(res.data); }
    catch (e) { console.error("Load vouchers failed:", e); }
  };

  const openAdd = () => { setEditItem(null); setForm({ ...emptyForm }); setShowModal(true); };
  const openEdit = (v) => {
    setEditItem(v);
    setForm({
      code: v.code, title: v.title || "", desc: v.description || "", tag: v.tag || "Chuyển tiền", hot: !!v.hot,
      discountType: v.discount_type, discountValue: String(v.discount_value),
      minTransactionAmount: String(v.min_transaction_amount), quantity: String(v.quantity),
      expiredAt: new Date(v.expired_at).toISOString().slice(0, 10), status: v.status,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.code.trim() || !form.title.trim()) { alert("Vui lòng nhập Mã code và Tiêu đề!"); return; }
    if (!(Number(form.discountValue) > 0)) { alert("Giá trị giảm phải > 0"); return; }
    if (!(Number(form.quantity) > 0)) { alert("Số lượng phải > 0"); return; }
    if (!form.expiredAt) { alert("Vui lòng chọn ngày hết hạn"); return; }
    const payload = {
      code: form.code.trim(), title: form.title.trim(), description: form.desc, tag: form.tag, hot: form.hot,
      discountType: form.discountType, discountValue: Number(form.discountValue),
      minTransactionAmount: Number(form.minTransactionAmount) || 0, quantity: Number(form.quantity),
      expiredAt: form.expiredAt, status: form.status,
    };
    try {
      const res = editItem ? await voucherAPI.update(editItem.id, payload) : await voucherAPI.create(payload);
      if (res.success) { await loadVouchers(); setShowModal(false); }
      else alert(res.message || "Lưu voucher thất bại");
    } catch (e) { alert(e.response?.data?.message || "Lỗi máy chủ khi lưu voucher"); }
  };

  const handleDelete = async (id) => {
    if (!confirm("Xoá voucher này?")) return;
    try { const res = await voucherAPI.remove(id); if (res.success) loadVouchers(); }
    catch (e) { alert(e.response?.data?.message || "Lỗi xoá voucher"); }
  };
  const toggleActive = async (v) => {
    const newStatus = v.status === "ACTIVE" ? "DISABLED" : "ACTIVE";
    try { const res = await voucherAPI.update(v.id, { status: newStatus }); if (res.success) loadVouchers(); }
    catch (e) { alert(e.response?.data?.message || "Lỗi đổi trạng thái"); }
  };

  const tabs = [{ v:"voucher", l:"Voucher", icon:Tag }, { v:"fee", l:"Phí giao dịch", icon:Percent }, { v:"category", l:"Danh mục", icon:FolderOpen }];
  const tagColors = { "Chuyển tiền":"#2563eb","Mua sắm":"#3b82f6","Rút tiền":"#22c55e","Referral":"#8b5cf6","Nạp tiền":"#f59e0b","Hóa đơn":"#ec4899" };

  return (
    <div style={{ maxWidth:900 }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20, flexWrap:"wrap", gap:12 }}>
        <div>
          <h1 style={{ fontSize:18, fontWeight:800, marginBottom:2 }}>Quản lý dịch vụ</h1>
          <p style={{ color: "var(--text-secondary)", fontSize:13 }}>Voucher, phí giao dịch và danh mục chi tiêu</p>
        </div>
        {tab === "voucher" && (
          <button onClick={openAdd} style={{ display:"flex", alignItems:"center", gap:6, background:"linear-gradient(135deg,#2563eb,#1d4ed8)", color: "white", border:"none", borderRadius:8, padding:"9px 16px", fontWeight:600, fontSize:13, cursor:"pointer" }}>
            <Plus size={14} /> Thêm voucher
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", gap:6, marginBottom:20 }}>
        {tabs.map(t => (
          <button key={t.v} onClick={() => setTab(t.v)} style={{
            display:"flex", alignItems:"center", gap:6, padding:"8px 16px", borderRadius:8, fontSize:13, fontWeight:500,
            background: tab===t.v ? "rgba(37,99,235,0.15)" : "var(--bg-card)",
            border:`1px solid ${tab===t.v ? "rgba(37,99,235,0.3)" : "var(--border)"}`,
            color: tab===t.v ? "#2563eb" : "var(--text-secondary)", cursor:"pointer"
          }}>
            <t.icon size={14} />{t.l}
          </button>
        ))}
      </div>

      {/* VOUCHER TAB */}
      {tab === "voucher" && (
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius:14, overflow:"hidden" }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 90px 90px 110px 100px 80px 80px", padding:"11px 16px", borderBottom:"1px solid var(--border)", background: "var(--bg-dark)" }}>
            {["Mã code","Giảm giá","Loại","HSD","Tiêu đề","Trạng thái",""].map(h => (
              <span key={h} style={{ fontSize:11, fontWeight:700, color: "var(--text-muted)", textTransform:"uppercase" }}>{h}</span>
            ))}
          </div>
          {vouchers.map((v, i) => (
            <motion.div key={v.id} initial={{opacity:0}} animate={{opacity:1}} transition={{delay:i*0.05}}
              style={{ display:"grid", gridTemplateColumns:"1fr 90px 90px 110px 100px 80px 80px", padding:"13px 16px", borderBottom: "1px solid var(--border)", alignItems:"center", gap:4 }}>
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                <span style={{ fontSize:14, fontWeight:700, fontFamily:"monospace", color:"#2563eb" }}>{v.code}</span>
                {v.hot && <Flame size={12} style={{ color:"#2563eb" }} />}
              </div>
              <span style={{ fontSize:13, fontWeight:600 }}>{discountLabel(v)}</span>
              <span style={{ fontSize:11, padding:"3px 8px", borderRadius:6, background:`${tagColors[v.tag] || "#3f3f46"}18`, color:tagColors[v.tag] || "#a1a1aa", fontWeight:600, whiteSpace:"nowrap" }}>{v.tag}</span>
              <span style={{ fontSize:12, color: "var(--text-secondary)" }}>{fmtVoucherDate(v.expired_at)}</span>
              <span style={{ fontSize:11, color: "var(--text-secondary)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{v.title}</span>
              <button onClick={() => toggleActive(v)} style={{
                fontSize:11, padding:"3px 8px", borderRadius:6, fontWeight:600, cursor:"pointer", border:"none",
                background: v.status === "ACTIVE" ? "rgba(34,197,94,0.12)" : "rgba(100,116,139,0.12)",
                color: v.status === "ACTIVE" ? "#22c55e" : "#94a3b8"
              }}>
                {v.status === "ACTIVE" ? "Bật" : "Tắt"}
              </button>
              <div style={{ display:"flex", gap:6 }}>
                <button onClick={() => openEdit(v)} style={{ background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius:6, width:28, height:28, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color: "var(--text-secondary)" }}>
                  <Pencil size={12} />
                </button>
                <button onClick={() => handleDelete(v.id)} style={{ background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.15)", borderRadius:6, width:28, height:28, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"#ef4444" }}>
                  <Trash2 size={12} />
                </button>
              </div>
            </motion.div>
          ))}
          {vouchers.length === 0 && (
            <div style={{ padding:32, textAlign:"center", color: "var(--text-muted)", fontSize:13 }}>Chưa có voucher nào. Nhấn "+ Thêm voucher" để bắt đầu.</div>
          )}
        </div>
      )}

      {/* FEE TAB */}
      {tab === "fee" && (
        <div>
          <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:12 }}>
            <button onClick={openAddFee} style={{ display:"flex", alignItems:"center", gap:6, background:"linear-gradient(135deg,#2563eb,#1d4ed8)", color:"white", border:"none", borderRadius:8, padding:"9px 16px", fontWeight:600, fontSize:13, cursor:"pointer" }}>
              <Plus size={14} /> Thêm phí
            </button>
          </div>
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius:14, overflow:"hidden" }}>
            {feeList.length === 0 && (
              <div style={{ padding:32, textAlign:"center", color: "var(--text-muted)", fontSize:13 }}>Chưa có rule phí nào. Nhấn "+ Thêm phí" để tạo.</div>
            )}
            {feeList.map((f, i) => (
              <div key={f.id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"16px 20px", borderBottom: i < feeList.length-1 ? "1px solid var(--border)" : "none" }}>
                <div>
                  <p style={{ fontSize:14, fontWeight:600 }}>{TX_LABEL[f.transaction_type] || f.transaction_type}</p>
                  <p style={{ fontSize:12, color: "var(--text-muted)", marginTop:2 }}>Loại giao dịch: {f.transaction_type}</p>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <span style={{ fontSize:16, fontWeight:800, color:"#2563eb" }}>{Number(f.fee_value).toLocaleString("vi-VN")} ₫</span>
                  <button onClick={() => openEditFee(f)} style={{ background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius:6, padding:"6px 10px", color: "var(--text-secondary)", cursor:"pointer", fontSize:12, display:"flex", alignItems:"center", gap:4 }}>
                    <Pencil size={12} /> Sửa
                  </button>
                  <button onClick={() => handleDeleteFee(f.id)} style={{ background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.15)", borderRadius:6, padding:"6px 10px", color:"#ef4444", cursor:"pointer", fontSize:12, display:"flex", alignItems:"center", gap:4 }}>
                    <Trash2 size={12} /> Xoá
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CATEGORY TAB */}
      {tab === "category" && (
        <div>
          <div style={{ display:"flex", gap:10, marginBottom:16 }}>
            <input value={newCat} onChange={e => setNewCat(e.target.value)} placeholder="Tên danh mục mới..."
              style={{ flex:1, background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius:8, padding:"10px 14px", color: "var(--text-primary)", fontSize:14, outline:"none" }} />
            <button onClick={handleAddCat} style={{ background:"linear-gradient(135deg,#2563eb,#1d4ed8)", color: "white", border:"none", borderRadius:8, padding:"10px 16px", fontWeight:600, fontSize:13, cursor:"pointer", display:"flex", alignItems:"center", gap:6 }}>
              <Plus size={14} /> Thêm
            </button>
          </div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:10 }}>
            {catList.map((c, i) => (
              <motion.div key={c.id} initial={{opacity:0,scale:0.8}} animate={{opacity:1,scale:1}} transition={{delay:i*0.03}}
                style={{ display:"flex", alignItems:"center", gap:8, background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius:10, padding:"8px 14px" }}>
                <span style={{ fontSize:13, fontWeight:500 }}>{c.name}</span>
                <button onClick={() => handleDeleteCat(c.id)} style={{ background:"none", border:"none", cursor:"pointer", color: "var(--text-muted)", display:"flex", padding:0 }}>
                  <X size={13} />
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Modal add/edit voucher */}
      <AnimatePresence>
        {showModal && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={() => setShowModal(false)}
            style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
            <motion.div initial={{scale:0.9,opacity:0}} animate={{scale:1,opacity:1}} exit={{scale:0.9,opacity:0}} onClick={e => e.stopPropagation()}
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius:18, padding:26, width:"100%", maxWidth:400, maxHeight:"90vh", overflowY:"auto" }}>
              <h3 style={{ fontSize:16, fontWeight:700, marginBottom:18 }}>{editItem ? "Sửa Voucher" : "Thêm Voucher"}</h3>

              {/* Code */}
              <div style={{ marginBottom:14 }}>
                <label style={{ fontSize:12, color: "var(--text-secondary)", display:"block", marginBottom:6 }}>Mã code <span style={{ color:"#2563eb" }}>*</span></label>
                <input value={form.code} onChange={e => setForm(p => ({...p, code: e.target.value.toUpperCase()}))} placeholder="VD: BLACKRED50"
                  style={{ width:"100%", background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius:8, padding:"10px 12px", color: "var(--text-primary)", fontSize:13, outline:"none", fontFamily:"monospace", letterSpacing:1 }} />
              </div>

              {/* Title */}
              <div style={{ marginBottom:14 }}>
                <label style={{ fontSize:12, color: "var(--text-secondary)", display:"block", marginBottom:6 }}>Tiêu đề hiển thị <span style={{ color:"#2563eb" }}>*</span></label>
                <input value={form.title} onChange={e => setForm(p => ({...p, title:e.target.value}))} placeholder="VD: Giảm 50K phí chuyển tiền"
                  style={{ width:"100%", background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius:8, padding:"10px 12px", color: "var(--text-primary)", fontSize:13, outline:"none" }} />
              </div>

              {/* Desc */}
              <div style={{ marginBottom:14 }}>
                <label style={{ fontSize:12, color: "var(--text-secondary)", display:"block", marginBottom:6 }}>Mô tả ngắn</label>
                <input value={form.desc} onChange={e => setForm(p => ({...p, desc:e.target.value}))} placeholder="VD: Áp dụng cho giao dịch từ 500K"
                  style={{ width:"100%", background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius:8, padding:"10px 12px", color: "var(--text-primary)", fontSize:13, outline:"none" }} />
              </div>

              {/* Cơ chế giảm: kiểu + giá trị */}
              <div style={{ display:"flex", gap:10, marginBottom:14 }}>
                <div style={{ flex:1 }}>
                  <label style={{ fontSize:12, color: "var(--text-secondary)", display:"block", marginBottom:6 }}>Kiểu giảm <span style={{ color:"#2563eb" }}>*</span></label>
                  <select value={form.discountType} onChange={e => setForm(p => ({...p, discountType:e.target.value}))}
                    style={{ width:"100%", background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius:8, padding:"10px 12px", color: "var(--text-primary)", fontSize:13, outline:"none" }}>
                    <option value="FIXED">Cố định (₫)</option>
                    <option value="PERCENT">Phần trăm (%)</option>
                  </select>
                </div>
                <div style={{ flex:1 }}>
                  <label style={{ fontSize:12, color: "var(--text-secondary)", display:"block", marginBottom:6 }}>Giá trị <span style={{ color:"#2563eb" }}>*</span></label>
                  <input type="number" min="0" value={form.discountValue} onChange={e => setForm(p => ({...p, discountValue:e.target.value}))} placeholder={form.discountType === "PERCENT" ? "VD: 10" : "VD: 50000"}
                    style={{ width:"100%", background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius:8, padding:"10px 12px", color: "var(--text-primary)", fontSize:13, outline:"none" }} />
                </div>
              </div>

              {/* Điều kiện: min + số lượng */}
              <div style={{ display:"flex", gap:10, marginBottom:14 }}>
                <div style={{ flex:1 }}>
                  <label style={{ fontSize:12, color: "var(--text-secondary)", display:"block", marginBottom:6 }}>GD tối thiểu (₫)</label>
                  <input type="number" min="0" value={form.minTransactionAmount} onChange={e => setForm(p => ({...p, minTransactionAmount:e.target.value}))} placeholder="0"
                    style={{ width:"100%", background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius:8, padding:"10px 12px", color: "var(--text-primary)", fontSize:13, outline:"none" }} />
                </div>
                <div style={{ flex:1 }}>
                  <label style={{ fontSize:12, color: "var(--text-secondary)", display:"block", marginBottom:6 }}>Số lượng <span style={{ color:"#2563eb" }}>*</span></label>
                  <input type="number" min="1" value={form.quantity} onChange={e => setForm(p => ({...p, quantity:e.target.value}))} placeholder="VD: 100"
                    style={{ width:"100%", background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius:8, padding:"10px 12px", color: "var(--text-primary)", fontSize:13, outline:"none" }} />
                </div>
              </div>

              {/* HSD + trạng thái */}
              <div style={{ display:"flex", gap:10, marginBottom:14 }}>
                <div style={{ flex:1 }}>
                  <label style={{ fontSize:12, color: "var(--text-secondary)", display:"block", marginBottom:6 }}>Ngày hết hạn <span style={{ color:"#2563eb" }}>*</span></label>
                  <input type="date" value={form.expiredAt} onChange={e => setForm(p => ({...p, expiredAt:e.target.value}))}
                    style={{ width:"100%", background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius:8, padding:"10px 12px", color: "var(--text-primary)", fontSize:13, outline:"none" }} />
                </div>
                <div style={{ flex:1 }}>
                  <label style={{ fontSize:12, color: "var(--text-secondary)", display:"block", marginBottom:6 }}>Trạng thái</label>
                  <select value={form.status} onChange={e => setForm(p => ({...p, status:e.target.value}))}
                    style={{ width:"100%", background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius:8, padding:"10px 12px", color: "var(--text-primary)", fontSize:13, outline:"none" }}>
                    {["ACTIVE","EXPIRED","DISABLED"].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              {/* Loại (marketing) */}
              <div style={{ marginBottom:14 }}>
                <label style={{ fontSize:12, color: "var(--text-secondary)", display:"block", marginBottom:6 }}>Loại (marketing, để lọc trang Ưu đãi)</label>
                <select value={form.tag} onChange={e => setForm(p => ({...p, tag:e.target.value}))}
                  style={{ width:"100%", background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius:8, padding:"10px 12px", color: "var(--text-primary)", fontSize:13, outline:"none" }}>
                  {VOUCHER_TAGS.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              {/* Hot toggle */}
              <div style={{ marginBottom:20, display:"flex", alignItems:"center", gap:10 }}>
                <button
                  onClick={() => setForm(p => ({...p, hot:!p.hot}))}
                  style={{
                    display:"flex", alignItems:"center", gap:6, padding:"8px 14px", borderRadius:8, fontSize:12, fontWeight:600, cursor:"pointer", border:"none",
                    background: form.hot ? "rgba(37,99,235,0.15)" : "var(--bg-card2)",
                    color: form.hot ? "#2563eb" : "var(--text-secondary)",
                    outline:`1px solid ${form.hot ? "rgba(37,99,235,0.35)" : "var(--border)"}`
                  }}>
                  <Flame size={13} /> {form.hot ? "HOT (đang bật)" : "Đánh dấu HOT"}
                </button>
                <span style={{ fontSize:11, color: "var(--text-muted)" }}>Hiển thị badge 🔥 trên card</span>
              </div>

              <div style={{ display:"flex", gap:10 }}>
                <button onClick={() => setShowModal(false)} style={{ flex:1, background: "var(--bg-card2)", border: "1px solid var(--border)", color: "var(--text-secondary)", borderRadius:8, padding:"11px", fontWeight:600, fontSize:13, cursor:"pointer" }}>Huỷ</button>
                <button onClick={handleSave} style={{ flex:2, background:"linear-gradient(135deg,#2563eb,#1d4ed8)", color: "white", border:"none", borderRadius:8, padding:"11px", fontWeight:700, fontSize:13, cursor:"pointer" }}>
                  {editItem ? "Cập nhật" : "Thêm mới"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Modal edit transaction fee */}
      <AnimatePresence>
        {showFeeModal && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={() => setShowFeeModal(false)}
            style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
            <motion.div initial={{scale:0.9,opacity:0}} animate={{scale:1,opacity:1}} exit={{scale:0.9,opacity:0}} onClick={e => e.stopPropagation()}
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius:18, padding:26, width:"100%", maxWidth:400, maxHeight:"90vh", overflowY:"auto" }}>
              <h3 style={{ fontSize:16, fontWeight:700, marginBottom:18, display: "flex", alignItems: "center", gap: 6 }}>
                <Percent size={18} style={{ color: "#2563eb" }} /> {editFeeItem ? "Sửa phí giao dịch" : "Thêm phí giao dịch"}
              </h3>

              {/* Loại giao dịch */}
              <div style={{ marginBottom:14 }}>
                <label style={{ fontSize:12, color: "var(--text-secondary)", display:"block", marginBottom:6 }}>Loại giao dịch <span style={{ color:"#2563eb" }}>*</span></label>
                <select value={feeForm.transactionType} disabled={!!editFeeItem} onChange={e => setFeeForm(p => ({...p, transactionType: e.target.value}))}
                  style={{ width:"100%", background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius:8, padding:"10px 12px", color: "var(--text-primary)", fontSize:13, outline:"none" }}>
                  {TX_TYPES.map(t => <option key={t} value={t}>{TX_LABEL[t]} ({t})</option>)}
                </select>
              </div>

              {/* Phí (VND) */}
              <div style={{ marginBottom:20 }}>
                <label style={{ fontSize:12, color: "var(--text-secondary)", display:"block", marginBottom:6 }}>Phí cố định (VND) <span style={{ color:"#2563eb" }}>*</span></label>
                <input type="number" min="0" value={feeForm.feeValue} onChange={e => setFeeForm(p => ({...p, feeValue: e.target.value}))} placeholder="VD: 5000"
                  style={{ width:"100%", background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius:8, padding:"10px 12px", color: "var(--text-primary)", fontSize:13, outline:"none" }} />
              </div>

              <div style={{ display:"flex", gap:10 }}>
                <button onClick={() => setShowFeeModal(false)} style={{ flex:1, background: "var(--bg-card2)", border: "1px solid var(--border)", color: "var(--text-secondary)", borderRadius:8, padding:"11px", fontWeight:600, fontSize:13, cursor:"pointer" }}>Huỷ</button>
                <button onClick={handleSaveFee} style={{ flex:2, background:"linear-gradient(135deg,#2563eb,#1d4ed8)", color: "white", border:"none", borderRadius:8, padding:"11px", fontWeight:700, fontSize:13, cursor:"pointer" }}>
                  Lưu thay đổi
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
