import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, X, Tag, Percent, FolderOpen, Flame } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { feeAPI, categoryAPI, voucherAPI } from "../../services/api";

// Transaction types for fee rules (matching backend TransactionType enum)
const TX_TYPES = ["TRANSFER", "WITHDRAW", "PAYMENT", "DEPOSIT"];
const TX_LABEL = { TRANSFER: "Internal Transfer", WITHDRAW: "Bank Withdrawal/Transfer", PAYMENT: "Payment", DEPOSIT: "Top-up" };

const VOUCHER_TAGS = ["Transfer", "Withdrawal", "Top-up", "Shopping", "Referral", "Bills"];
const emptyForm = { code:"", title:"", desc:"", tag:"Transfer", hot:false, discountType:"FIXED", discountValue:"", minTransactionAmount:"0", quantity:"", expiredAt:"", status:"ACTIVE" };

// Discount label derived from type: FIXED -> "50.000₫", PERCENT -> "10%"
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
      if (res.success) { setNewCat(""); loadCats(); } else alert(res.message || "Failed to add category");
    } catch (e) { alert(e.response?.data?.message || "Failed to add category"); }
  };
  const handleDeleteCat = async (id) => {
    try { const res = await categoryAPI.remove(id); if (res.success) loadCats(); }
    catch (e) { alert(e.response?.data?.message || "Failed to delete category"); }
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
      alert("Fee value must be a number >= 0 (VND).");
      return;
    }
    try {
      const res = editFeeItem
        ? await feeAPI.update(editFeeItem.id, { feeValue: value })
        : await feeAPI.create(feeForm.transactionType, value);
      if (res.success) { await loadFees(); setShowFeeModal(false); }
      else alert(res.message || "Failed to save fee.");
    } catch (e) {
      alert(e.response?.data?.message || "Server error while saving fee.");
    }
  };

  const handleDeleteFee = async (id) => {
    if (!confirm("Delete this fee rule?")) return;
    try {
      const res = await feeAPI.remove(id);
      if (res.success) loadFees();
    } catch (e) {
      alert(e.response?.data?.message || "Error deleting fee.");
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
      code: v.code, title: v.title || "", desc: v.description || "", tag: v.tag || "Transfer", hot: !!v.hot,
      discountType: v.discount_type, discountValue: String(v.discount_value),
      minTransactionAmount: String(v.min_transaction_amount), quantity: String(v.quantity),
      expiredAt: new Date(v.expired_at).toISOString().slice(0, 10), status: v.status,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.code.trim() || !form.title.trim()) { alert("Please enter a Code and Title!"); return; }
    if (!(Number(form.discountValue) > 0)) { alert("Discount value must be > 0"); return; }
    if (!(Number(form.quantity) > 0)) { alert("Quantity must be > 0"); return; }
    if (!form.expiredAt) { alert("Please select an expiry date"); return; }
    const payload = {
      code: form.code.trim(), title: form.title.trim(), description: form.desc, tag: form.tag, hot: form.hot,
      discountType: form.discountType, discountValue: Number(form.discountValue),
      minTransactionAmount: Number(form.minTransactionAmount) || 0, quantity: Number(form.quantity),
      expiredAt: form.expiredAt, status: form.status,
    };
    try {
      const res = editItem ? await voucherAPI.update(editItem.id, payload) : await voucherAPI.create(payload);
      if (res.success) { await loadVouchers(); setShowModal(false); }
      else alert(res.message || "Failed to save voucher");
    } catch (e) { alert(e.response?.data?.message || "Server error while saving voucher"); }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this voucher?")) return;
    try { const res = await voucherAPI.remove(id); if (res.success) loadVouchers(); }
    catch (e) { alert(e.response?.data?.message || "Error deleting voucher"); }
  };
  const toggleActive = async (v) => {
    const newStatus = v.status === "ACTIVE" ? "DISABLED" : "ACTIVE";
    try { const res = await voucherAPI.update(v.id, { status: newStatus }); if (res.success) loadVouchers(); }
    catch (e) { alert(e.response?.data?.message || "Error updating status"); }
  };

  const tabs = [{ v:"voucher", l:"Voucher", icon:Tag }, { v:"fee", l:"Transaction Fees", icon:Percent }, { v:"category", l:"Categories", icon:FolderOpen }];
  const tagColors = { "Transfer":"#2563eb","Shopping":"#3b82f6","Withdrawal":"#22c55e","Referral":"#8b5cf6","Top-up":"#f59e0b","Bills":"#ec4899" };

  return (
    <div style={{ maxWidth:900 }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20, flexWrap:"wrap", gap:12 }}>
        <div>
          <h1 style={{ fontSize:18, fontWeight:800, marginBottom:2 }}>Service Management</h1>
          <p style={{ color: "var(--text-secondary)", fontSize:13 }}>Vouchers, transaction fees, and spending categories</p>
        </div>
        {tab === "voucher" && (
          <button onClick={openAdd} style={{ display:"flex", alignItems:"center", gap:6, background:"linear-gradient(135deg,#2563eb,#1d4ed8)", color: "white", border:"none", borderRadius:8, padding:"9px 16px", fontWeight:600, fontSize:13, cursor:"pointer" }}>
            <Plus size={14} /> Add Voucher
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
            {["Code","Discount","Type","Expiry","Title","Status",""].map(h => (
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
                {v.status === "ACTIVE" ? "Active" : "Inactive"}
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
            <div style={{ padding:32, textAlign:"center", color: "var(--text-muted)", fontSize:13 }}>No vouchers yet. Click "+ Add Voucher" to get started.</div>
          )}
        </div>
      )}

      {/* FEE TAB */}
      {tab === "fee" && (
        <div>
          <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:12 }}>
            <button onClick={openAddFee} style={{ display:"flex", alignItems:"center", gap:6, background:"linear-gradient(135deg,#2563eb,#1d4ed8)", color:"white", border:"none", borderRadius:8, padding:"9px 16px", fontWeight:600, fontSize:13, cursor:"pointer" }}>
              <Plus size={14} /> Add Fee
            </button>
          </div>
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius:14, overflow:"hidden" }}>
            {feeList.length === 0 && (
              <div style={{ padding:32, textAlign:"center", color: "var(--text-muted)", fontSize:13 }}>No fee rules yet. Click "+ Add Fee" to create one.</div>
            )}
            {feeList.map((f, i) => (
              <div key={f.id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"16px 20px", borderBottom: i < feeList.length-1 ? "1px solid var(--border)" : "none" }}>
                <div>
                  <p style={{ fontSize:14, fontWeight:600 }}>{TX_LABEL[f.transaction_type] || f.transaction_type}</p>
                  <p style={{ fontSize:12, color: "var(--text-muted)", marginTop:2 }}>Transaction Type: {f.transaction_type}</p>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <span style={{ fontSize:16, fontWeight:800, color:"#2563eb" }}>{Number(f.fee_value).toLocaleString("vi-VN")} ₫</span>
                  <button onClick={() => openEditFee(f)} style={{ background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius:6, padding:"6px 10px", color: "var(--text-secondary)", cursor:"pointer", fontSize:12, display:"flex", alignItems:"center", gap:4 }}>
                    <Pencil size={12} /> Edit
                  </button>
                  <button onClick={() => handleDeleteFee(f.id)} style={{ background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.15)", borderRadius:6, padding:"6px 10px", color:"#ef4444", cursor:"pointer", fontSize:12, display:"flex", alignItems:"center", gap:4 }}>
                    <Trash2 size={12} /> Delete
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
            <input value={newCat} onChange={e => setNewCat(e.target.value)} placeholder="New category name..."
              style={{ flex:1, background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius:8, padding:"10px 14px", color: "var(--text-primary)", fontSize:14, outline:"none" }} />
            <button onClick={handleAddCat} style={{ background:"linear-gradient(135deg,#2563eb,#1d4ed8)", color: "white", border:"none", borderRadius:8, padding:"10px 16px", fontWeight:600, fontSize:13, cursor:"pointer", display:"flex", alignItems:"center", gap:6 }}>
              <Plus size={14} /> Add
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
              <h3 style={{ fontSize:16, fontWeight:700, marginBottom:18 }}>{editItem ? "Edit Voucher" : "Add Voucher"}</h3>

              {/* Code */}
              <div style={{ marginBottom:14 }}>
                <label style={{ fontSize:12, color: "var(--text-secondary)", display:"block", marginBottom:6 }}>Code <span style={{ color:"#2563eb" }}>*</span></label>
                <input value={form.code} onChange={e => setForm(p => ({...p, code: e.target.value.toUpperCase()}))} placeholder="e.g. BLACKRED50"
                  style={{ width:"100%", background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius:8, padding:"10px 12px", color: "var(--text-primary)", fontSize:13, outline:"none", fontFamily:"monospace", letterSpacing:1 }} />
              </div>

              {/* Title */}
              <div style={{ marginBottom:14 }}>
                <label style={{ fontSize:12, color: "var(--text-secondary)", display:"block", marginBottom:6 }}>Display Title <span style={{ color:"#2563eb" }}>*</span></label>
                <input value={form.title} onChange={e => setForm(p => ({...p, title:e.target.value}))} placeholder="e.g. Save 50K on transfer fees"
                  style={{ width:"100%", background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius:8, padding:"10px 12px", color: "var(--text-primary)", fontSize:13, outline:"none" }} />
              </div>

              {/* Desc */}
              <div style={{ marginBottom:14 }}>
                <label style={{ fontSize:12, color: "var(--text-secondary)", display:"block", marginBottom:6 }}>Short Description</label>
                <input value={form.desc} onChange={e => setForm(p => ({...p, desc:e.target.value}))} placeholder="e.g. Applicable for transactions from 500K"
                  style={{ width:"100%", background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius:8, padding:"10px 12px", color: "var(--text-primary)", fontSize:13, outline:"none" }} />
              </div>

              {/* Cơ chế giảm: kiểu + giá trị */}
              <div style={{ display:"flex", gap:10, marginBottom:14 }}>
                <div style={{ flex:1 }}>
                  <label style={{ fontSize:12, color: "var(--text-secondary)", display:"block", marginBottom:6 }}>Discount Type <span style={{ color:"#2563eb" }}>*</span></label>
                  <select value={form.discountType} onChange={e => setForm(p => ({...p, discountType:e.target.value}))}
                    style={{ width:"100%", background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius:8, padding:"10px 12px", color: "var(--text-primary)", fontSize:13, outline:"none" }}>
                    <option value="FIXED">Fixed (₫)</option>
                    <option value="PERCENT">Percentage (%)</option>
                  </select>
                </div>
                <div style={{ flex:1 }}>
                  <label style={{ fontSize:12, color: "var(--text-secondary)", display:"block", marginBottom:6 }}>Value <span style={{ color:"#2563eb" }}>*</span></label>
                  <input type="number" min="0" value={form.discountValue} onChange={e => setForm(p => ({...p, discountValue:e.target.value}))} placeholder={form.discountType === "PERCENT" ? "e.g. 10" : "e.g. 50000"}
                    style={{ width:"100%", background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius:8, padding:"10px 12px", color: "var(--text-primary)", fontSize:13, outline:"none" }} />
                </div>
              </div>

              {/* Điều kiện: min + số lượng */}
              <div style={{ display:"flex", gap:10, marginBottom:14 }}>
                <div style={{ flex:1 }}>
                  <label style={{ fontSize:12, color: "var(--text-secondary)", display:"block", marginBottom:6 }}>Min. Transaction (₫)</label>
                  <input type="number" min="0" value={form.minTransactionAmount} onChange={e => setForm(p => ({...p, minTransactionAmount:e.target.value}))} placeholder="0"
                    style={{ width:"100%", background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius:8, padding:"10px 12px", color: "var(--text-primary)", fontSize:13, outline:"none" }} />
                </div>
                <div style={{ flex:1 }}>
                  <label style={{ fontSize:12, color: "var(--text-secondary)", display:"block", marginBottom:6 }}>Quantity <span style={{ color:"#2563eb" }}>*</span></label>
                  <input type="number" min="1" value={form.quantity} onChange={e => setForm(p => ({...p, quantity:e.target.value}))} placeholder="e.g. 100"
                    style={{ width:"100%", background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius:8, padding:"10px 12px", color: "var(--text-primary)", fontSize:13, outline:"none" }} />
                </div>
              </div>

              {/* HSD + trạng thái */}
              <div style={{ display:"flex", gap:10, marginBottom:14 }}>
                <div style={{ flex:1 }}>
                  <label style={{ fontSize:12, color: "var(--text-secondary)", display:"block", marginBottom:6 }}>Expiry Date <span style={{ color:"#2563eb" }}>*</span></label>
                  <input type="date" value={form.expiredAt} onChange={e => setForm(p => ({...p, expiredAt:e.target.value}))}
                    style={{ width:"100%", background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius:8, padding:"10px 12px", color: "var(--text-primary)", fontSize:13, outline:"none" }} />
                </div>
                <div style={{ flex:1 }}>
                  <label style={{ fontSize:12, color: "var(--text-secondary)", display:"block", marginBottom:6 }}>Status</label>
                  <select value={form.status} onChange={e => setForm(p => ({...p, status:e.target.value}))}
                    style={{ width:"100%", background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius:8, padding:"10px 12px", color: "var(--text-primary)", fontSize:13, outline:"none" }}>
                    {["ACTIVE","EXPIRED","DISABLED"].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              {/* Loại (marketing) */}
              <div style={{ marginBottom:14 }}>
                <label style={{ fontSize:12, color: "var(--text-secondary)", display:"block", marginBottom:6 }}>Tag (marketing, used to filter the Offers page)</label>
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
                  <Flame size={13} /> {form.hot ? "HOT (enabled)" : "Mark as HOT"}
                </button>
                <span style={{ fontSize:11, color: "var(--text-muted)" }}>Shows a 🔥 badge on the card</span>
              </div>

              <div style={{ display:"flex", gap:10 }}>
                <button onClick={() => setShowModal(false)} style={{ flex:1, background: "var(--bg-card2)", border: "1px solid var(--border)", color: "var(--text-secondary)", borderRadius:8, padding:"11px", fontWeight:600, fontSize:13, cursor:"pointer" }}>Cancel</button>
                <button onClick={handleSave} style={{ flex:2, background:"linear-gradient(135deg,#2563eb,#1d4ed8)", color: "white", border:"none", borderRadius:8, padding:"11px", fontWeight:700, fontSize:13, cursor:"pointer" }}>
                  {editItem ? "Update" : "Add New"}
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
                <Percent size={18} style={{ color: "#2563eb" }} /> {editFeeItem ? "Edit Transaction Fee" : "Add Transaction Fee"}
              </h3>

              {/* Loại giao dịch */}
              <div style={{ marginBottom:14 }}>
                <label style={{ fontSize:12, color: "var(--text-secondary)", display:"block", marginBottom:6 }}>Transaction Type <span style={{ color:"#2563eb" }}>*</span></label>
                <select value={feeForm.transactionType} disabled={!!editFeeItem} onChange={e => setFeeForm(p => ({...p, transactionType: e.target.value}))}
                  style={{ width:"100%", background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius:8, padding:"10px 12px", color: "var(--text-primary)", fontSize:13, outline:"none" }}>
                  {TX_TYPES.map(t => <option key={t} value={t}>{TX_LABEL[t]} ({t})</option>)}
                </select>
              </div>

              {/* Phí (VND) */}
              <div style={{ marginBottom:20 }}>
                <label style={{ fontSize:12, color: "var(--text-secondary)", display:"block", marginBottom:6 }}>Fixed Fee (VND) <span style={{ color:"#2563eb" }}>*</span></label>
                <input type="number" min="0" value={feeForm.feeValue} onChange={e => setFeeForm(p => ({...p, feeValue: e.target.value}))} placeholder="e.g. 5000"
                  style={{ width:"100%", background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius:8, padding:"10px 12px", color: "var(--text-primary)", fontSize:13, outline:"none" }} />
              </div>

              <div style={{ display:"flex", gap:10 }}>
                <button onClick={() => setShowFeeModal(false)} style={{ flex:1, background: "var(--bg-card2)", border: "1px solid var(--border)", color: "var(--text-secondary)", borderRadius:8, padding:"11px", fontWeight:600, fontSize:13, cursor:"pointer" }}>Cancel</button>
                <button onClick={handleSaveFee} style={{ flex:2, background:"linear-gradient(135deg,#2563eb,#1d4ed8)", color: "white", border:"none", borderRadius:8, padding:"11px", fontWeight:700, fontSize:13, cursor:"pointer" }}>
                  Save Changes
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
