import { useState, useEffect, useRef } from "react";
import { 
  Check, X, Search, Filter, ArrowDownLeft, ArrowUpRight, 
  Clock, AlertCircle, CheckCircle2, XCircle, ArrowRightLeft,
  Building2, TrendingUp, Calendar, Info
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { adminAPI, formatVND } from "../../services/api";

const fmtCurrency = (n) => formatVND(n);

const parseTxTime = (timeStr) => {
  if (!timeStr) return new Date();
  try {
    const parts = timeStr.trim().split(" ");
    if (parts.length === 2 && parts[1].includes("/")) {
      const [hour, minute] = parts[0].split(":");
      const [day, month, year] = parts[1].split("/");
      return new Date(
        Number(year),
        Number(month) - 1,
        Number(day),
        Number(hour || 0),
        Number(minute || 0)
      );
    }
    const d = new Date(timeStr);
    return isNaN(d.getTime()) ? new Date() : d;
  } catch (e) {
    return new Date();
  }
};

export default function AdminTransactions() {
  const [txList, setTxList] = useState([]);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedTx, setSelectedTx] = useState(null);
  const [toast, setToast] = useState(null);
  const toastTimeoutRef = useRef(null);

  // Load transactions from live backend
  const loadTransactions = async () => {
    try {
      setLoading(true);
      const res = await adminAPI.getTransactions();
      if (res.success && res.transactions) {
        const mapped = res.transactions.map(tx => {
          const isDeposit = tx.transaction_type === "DEPOSIT";
          const initiatorName = isDeposit
            ? tx.receiver_wallet?.user?.kyc?.full_name || tx.receiver_wallet?.user?.email || "User"
            : tx.sender_wallet?.user?.kyc?.full_name || tx.sender_wallet?.user?.email || "User";
          
          return {
            id: tx.reference_code || `TX${tx.id}`,
            realId: tx.id,
            type: tx.transaction_type === "DEPOSIT" ? "receive" : "send",
            name: initiatorName,
            amount: Number(tx.amount),
            time: new Date(tx.created_at || tx.createdAt).toLocaleTimeString("vi-VN", {hour: "2-digit", minute:"2-digit"}) + " " + new Date(tx.created_at || tx.createdAt).toLocaleDateString("vi-VN"),
            status: tx.status.toLowerCase(),
            note: tx.message || "",
            bankCode: tx.bank_code,
            accountNumber: tx.account_number,
            accountName: tx.account_name,
            transactionType: tx.transaction_type,
          };
        });
        setTxList(mapped);
      }
    } catch (error) {
      console.error("Failed to load transactions:", error);
      showToast("Failed to load transaction list", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, []);

  const showToast = (message, type="success") => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToast({ message, type });
    toastTimeoutRef.current = setTimeout(() => setToast(null), 3000);
  };

  const handleApprove = async (txDisplayId, e) => {
    if (e) e.stopPropagation();
    // Tìm realId từ txList (txDisplayId là reference_code hoặc "TX{id}")
    const tx = txList.find(t => t.id === txDisplayId);
    if (!tx) return;
    try {
      const res = await adminAPI.reviewTransaction(tx.realId, "SUCCESS");
      if (res.success) {
        showToast(`✅ Transaction ${txDisplayId} approved successfully`, "success");
        setSelectedTx(null);
        await loadTransactions();
      } else {
        showToast(res.message || "Failed to approve transaction", "error");
      }
    } catch (err) {
      showToast(err.response?.data?.message || "Server error", "error");
    }
  };

  const handleReject = async (txDisplayId, e) => {
    if (e) e.stopPropagation();
    const tx = txList.find(t => t.id === txDisplayId);
    if (!tx) return;
    try {
      const res = await adminAPI.reviewTransaction(tx.realId, "FAILED");
      if (res.success) {
        showToast(`❌ Transaction ${txDisplayId} rejected`, "success");
        setSelectedTx(null);
        await loadTransactions();
      } else {
        showToast(res.message || "Failed to reject transaction", "error");
      }
    } catch (err) {
      showToast(err.response?.data?.message || "Server error", "error");
    }
  };

  const filtered = txList.filter(tx => {
    const matchStatus = filterStatus === "all" || tx.status === filterStatus;
    const matchType = filterType === "all" || tx.type === filterType;
    const matchSearch = !search || 
      tx.id.toLowerCase().includes(search.toLowerCase()) || 
      tx.name.toLowerCase().includes(search.toLowerCase()) ||
      (tx.note && tx.note.toLowerCase().includes(search.toLowerCase()));
    return matchStatus && matchType && matchSearch;
  }).sort((a, b) => parseTxTime(b.time) - parseTxTime(a.time));

  // Calculate statistics
  const stats = {
    total: txList.length,
    pending: txList.filter(t => t.status === "pending").length,
    success: txList.filter(t => t.status === "success").length,
    failed: txList.filter(t => t.status === "failed").length
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:24, maxWidth:1200, margin:"0 auto" }}>
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity:0, y:-50 }}
            animate={{ opacity:1, y:0 }}
            exit={{ opacity:0, y:-50 }}
            style={{
              position:"fixed", top:24, right:24, zIndex:300,
              background: toast.type === "success" ? "rgba(34,197,94,0.95)" : "rgba(239,68,68,0.95)",
              backdropFilter:"blur(10px)", color:"white",
              padding:"12px 24px", borderRadius:10, boxShadow:"0 10px 30px rgba(0,0,0,0.5)",
              display:"flex", alignItems:"center", gap:10, fontWeight:600, fontSize:14
            }}
          >
            {toast.type === "success" ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header and overview */}
      <div>
        <h1 style={{ fontSize:24, fontWeight:800, color:"var(--text-primary)", marginBottom:6 }}>📋 Transaction Management</h1>
        <p style={{ color: "var(--text-secondary)", fontSize:14 }}>Approve and monitor deposit, withdrawal, and transfer requests from users</p>
      </div>

      {/* Quick stats cards */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(220px, 1fr))", gap:16 }}>
        {[
          { label:"Total Transactions", count:stats.total, color:"#3b82f6", icon:ArrowRightLeft, desc:"System history" },
          { label:"Pending Requests", count:stats.pending, color:"#f59e0b", icon:Clock, desc:"Requires immediate action", pulse: stats.pending > 0 },
          { label:"Completed", count:stats.success, color:"#22c55e", icon:CheckCircle2, desc:"Successful transactions" },
          { label:"Failed", count:stats.failed, color:"#ef4444", icon:XCircle, desc:"Failed transactions" }
        ].map((item, idx) => {
          const Icon = item.icon;
          return (
            <motion.div
              key={idx}
              initial={{ opacity:0, y:20 }}
              animate={{ opacity:1, y:0 }}
              transition={{ delay: idx * 0.05 }}
              style={{
                background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius:16, padding:20,
                position:"relative", overflow:"hidden"
              }}
            >
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
                <span style={{ fontSize:13, color: "var(--text-secondary)", fontWeight:500 }}>{item.label}</span>
                <div style={{ width:38, height:38, borderRadius:10, background:`${item.color}15`, border:`1px solid ${item.color}30`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <Icon size={18} style={{ color: item.color }} />
                </div>
              </div>
              <div style={{ display:"flex", alignItems:"baseline", gap:8 }}>
                <h3 style={{ fontSize:28, fontWeight:900, color:"var(--text-primary)" }}>{item.count}</h3>
                {item.pulse && (
                  <span style={{ display:"flex", height:8, width:8, position:"relative" }}>
                    <span className="animate-ping" style={{ position:"absolute", display:"inline-flex", height:"100%", width:"100%", borderRadius:"50%", background:"#f59e0b", opacity:0.75 }}></span>
                    <span style={{ relative:"true", display:"inline-flex", borderRadius:"50%", height:8, width:8, background:"#f59e0b" }}></span>
                  </span>
                )}
              </div>
              <p style={{ fontSize:11, color: "var(--text-muted)", marginTop:6 }}>{item.desc}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Main filter and list view */}
      <motion.div 
        initial={{ opacity:0 }}
        animate={{ opacity:1 }}
        transition={{ delay:0.2 }}
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius:18, padding:24 }}
      >
        {/* Filters */}
        <div style={{ display:"flex", gap:12, marginBottom:20, flexWrap:"wrap", alignItems:"center" }}>
          {/* Search box */}
          <div style={{ position:"relative", flex:1, minWidth:240 }}>
            <Search size={15} style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", color: "var(--text-muted)" }} />
            <input 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              placeholder="Search by Transaction ID, user name, or content..." 
              style={{ width:"100%", background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius:10, padding:"10px 14px 10px 36px", color:"var(--text-primary)", fontSize:13, outline:"none" }} 
            />
          </div>
          
          {/* Status filter */}
          <div style={{ display:"flex", gap:4, background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius:10, padding:3 }}>
            {[
              { v: "all", l: "All" },
              { v: "pending", l: "Pending" },
              { v: "success", l: "Successful" },
              { v: "failed", l: "Failed" }
            ].map(s => (
              <button 
                key={s.v} 
                onClick={() => setFilterStatus(s.v)}
                style={{
                  padding:"6px 12px", border:"none", borderRadius:8, fontSize:12, fontWeight:600, cursor:"pointer",
                  background: filterStatus === s.v ? "rgba(37,99,235,0.15)" : "transparent",
                  color: filterStatus === s.v ? "#2563eb" : "#71717a",
                  transition: "all 0.2s"
                }}
              >
                {s.l}
              </button>
            ))}
          </div>

          {/* Type filter */}
          <div style={{ display:"flex", gap:4, background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius:10, padding:3 }}>
            {[
              { v: "all", l: "All Types" },
              { v: "receive", l: "Deposit" },
              { v: "send", l: "Withdraw/Transfer" }
            ].map(t => (
              <button 
                key={t.v} 
                onClick={() => setFilterType(t.v)}
                style={{
                  padding:"6px 12px", border:"none", borderRadius:8, fontSize:12, fontWeight:600, cursor:"pointer",
                  background: filterType === t.v ? "rgba(59,130,246,0.15)" : "transparent",
                  color: filterType === t.v ? "#3b82f6" : "#71717a",
                  transition: "all 0.2s"
                }}
              >
                {t.l}
              </button>
            ))}
          </div>
        </div>

        {/* Transaction request list */}
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {loading ? (
            [1, 2, 3, 4].map(i => <div key={i} className="skeleton" style={{ height:68, borderRadius:12 }} />)
          ) : (
            filtered.map(tx => (
              <div 
                key={tx.id}
                onClick={() => setSelectedTx(tx)}
                style={{
                  display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 18px",
                  background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius:12,
                  cursor:"pointer", transition:"all 0.2s"
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--primary)"; e.currentTarget.style.background = "rgba(37,99,235,0.04)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "var(--bg-card2)"; }}
              >
                {/* Status icon column */}
                <div style={{
                  width:42, height:42, borderRadius:10, flexShrink:0, marginRight:16,
                  background: tx.type === "receive" ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
                  display:"flex", alignItems:"center", justifyContent:"center"
                }}>
                  {tx.type === "receive" 
                    ? <ArrowDownLeft size={18} style={{ color:"#22c55e" }} /> 
                    : <ArrowUpRight size={18} style={{ color:"#ef4444" }} />
                  }
                </div>

                {/* Main info */}
                <div style={{ flex:1, minWidth:0, marginRight:16 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                    <span style={{ fontSize:13, fontWeight:700, color:"var(--text-primary)" }}>{tx.name}</span>
                    <span style={{ fontSize:10, color: "var(--text-muted)" }}>•</span>
                    <span style={{ fontSize:11, color: "var(--text-secondary)", fontFamily:"monospace" }}>{tx.id}</span>
                    <span style={{ fontSize:10, color: "var(--text-muted)" }}>•</span>
                    <span style={{ fontSize:11, color: "var(--text-muted)" }}>{tx.time}</span>
                  </div>
                  <p style={{ fontSize:12, color: "var(--text-secondary)", marginTop:4, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                    Note: {tx.note || "—"}
                  </p>
                </div>

                {/* Financial and actions */}
                <div style={{ display:"flex", alignItems:"center", gap:20, flexShrink:0 }}>
                  <div style={{ textAlign:"right" }}>
                    <p style={{ fontSize:15, fontWeight:900, color: tx.type === "receive" ? "#22c55e" : "#ef4444" }}>
                      {tx.type === "receive" ? "+" : "-"}{fmtCurrency(tx.amount)}
                    </p>
                    <span style={{
                      fontSize:10, padding:"2px 8px", borderRadius:6, fontWeight:700, display:"inline-block", marginTop:4,
                      background: tx.status === "success" ? "rgba(34,197,94,0.1)" : tx.status === "pending" ? "rgba(245,158,11,0.1)" : "rgba(239,68,68,0.1)",
                      color: tx.status === "success" ? "#22c55e" : tx.status === "pending" ? "#f59e0b" : "#ef4444"
                    }}>
                      {tx.status === "success" ? "Successful" : tx.status === "pending" ? "Pending" : "Failed"}
                    </span>
                  </div>

                  {/* Actions column */}
                  <div style={{ display:"flex", gap:6 }}>
                    {tx.status === "pending" ? (
                      <>
                        <button
                          onClick={(e) => handleApprove(tx.id, e)}
                          title="Approve"
                          style={{
                            width:32, height:32, borderRadius:8, background:"rgba(34,197,94,0.12)", border:"1px solid rgba(34,197,94,0.3)",
                            color:"#22c55e", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", transition:"all 0.2s"
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = "#22c55e"; e.currentTarget.style.color = "white"; }}
                          onMouseLeave={e => { e.currentTarget.style.background = "rgba(34,197,94,0.12)"; e.currentTarget.style.color = "#22c55e"; }}
                        >
                          <Check size={15} />
                        </button>
                        <button
                          onClick={(e) => handleReject(tx.id, e)}
                          title="Reject"
                          style={{
                            width:32, height:32, borderRadius:8, background:"rgba(239,68,68,0.12)", border:"1px solid rgba(239,68,68,0.3)",
                            color:"#ef4444", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", transition:"all 0.2s"
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = "#ef4444"; e.currentTarget.style.color = "white"; }}
                          onMouseLeave={e => { e.currentTarget.style.background = "rgba(239,68,68,0.12)"; e.currentTarget.style.color = "#ef4444"; }}
                        >
                          <X size={15} />
                        </button>
                      </>
                    ) : (
                      <div style={{ width:70, display:"flex", justifyContent:"center" }}>
                        <CheckCircle2 size={16} style={{ color: tx.status === "success" ? "#22c55e" : "#52525b", opacity: 0.3 }} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}

          {!loading && filtered.length === 0 && (
            <div style={{ textAlign:"center", padding:"40px 0", color: "var(--text-muted)" }}>
              <AlertCircle size={32} style={{ margin:"0 auto 12px", color: "var(--text-muted)" }} />
              <p style={{ fontSize:14 }}>No matching transactions found</p>
            </div>
          )}
        </div>
      </motion.div>

      {/* Transaction details modal */}
      <AnimatePresence>
        {selectedTx && (
          <motion.div 
            initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            onClick={() => setSelectedTx(null)}
            style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}
          >
            <motion.div 
              initial={{ scale:0.9, opacity:0 }} animate={{ scale:1, opacity:1 }} exit={{ scale:0.9, opacity:0 }}
              onClick={e => e.stopPropagation()}
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius:18, padding:28, width:"100%", maxWidth:450, position:"relative" }}
            >
              <button 
                onClick={() => setSelectedTx(null)} 
                style={{ position:"absolute", top:16, right:16, background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius:8, width:32, height:32, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color: "var(--text-secondary)" }}
              >
                <X size={16} />
              </button>

              <h3 style={{ fontSize:18, fontWeight:700, marginBottom:20, color:"var(--text-primary)" }}>Transaction Request Details</h3>

              <div style={{ background: "var(--bg-card2)", borderRadius:12, padding:20, marginBottom:20, textAlign:"center", border: "1px solid var(--border)" }}>
                <p style={{ fontSize:32, fontWeight:900, color: selectedTx.type === "receive" ? "#22c55e" : "#ef4444" }}>
                  {selectedTx.type === "receive" ? "+" : "-"}{fmtCurrency(selectedTx.amount)}
                </p>
                <span style={{
                  fontSize:12, padding:"4px 12px", borderRadius:8, fontWeight:700, display:"inline-block", marginTop:8,
                  background: selectedTx.status === "success" ? "rgba(34,197,94,0.12)" : selectedTx.status === "pending" ? "rgba(245,158,11,0.12)" : "rgba(239,68,68,0.12)",
                  color: selectedTx.status === "success" ? "#22c55e" : selectedTx.status === "pending" ? "#f59e0b" : "#ef4444"
                }}>
                  {selectedTx.status === "success" ? "Successful" : selectedTx.status === "pending" ? "Pending Approval" : "Failed"}
                </span>
              </div>

              <div style={{ display:"flex", flexDirection:"column", gap:1 }}>
                {[
                  { label:"Transaction ID", value:selectedTx.id, font:"monospace" },
                  { label:"Transaction Type", value: selectedTx.type === "receive" ? "Deposit" : "Withdraw/Transfer" },
                  ...(selectedTx.category ? [{ label:"Category", value: selectedTx.category }] : []),
                  { label:"Initiated By", value:selectedTx.name },
                  { label:"Created At", value:selectedTx.time },
                  { label:"Note / Description", value:selectedTx.note || "—" }
                ].map(r => (
                  <div key={r.label} style={{ display:"flex", justifyContent:"space-between", padding:"12px 0", borderBottom: "1px solid var(--border)" }}>
                    <span style={{ fontSize:13, color: "var(--text-secondary)" }}>{r.label}</span>
                    <span style={{ fontSize:13, fontWeight:600, color:"var(--text-primary)", fontFamily: r.font || "inherit" }}>{r.value}</span>
                  </div>
                ))}
              </div>

              {selectedTx.status === "pending" && (
                <div style={{ display:"flex", gap:12, marginTop:24 }}>
                  <button
                    onClick={() => {
                      handleReject(selectedTx.id);
                    }}
                    style={{
                      flex:1, background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.2)",
                      color:"#ef4444", borderRadius:10, padding:"12px", fontWeight:600, fontSize:14, cursor:"pointer",
                      transition:"all 0.2s"
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(239,68,68,0.15)"}
                    onMouseLeave={e => e.currentTarget.style.background = "rgba(239,68,68,0.08)"}
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => {
                      handleApprove(selectedTx.id);
                    }}
                    style={{
                      flex:1, background:"linear-gradient(135deg,#22c55e,#15803d)", border:"none",
                      color:"white", borderRadius:10, padding:"12px", fontWeight:700, fontSize:14, cursor:"pointer",
                      display:"flex", alignItems:"center", justifyContent:"center", gap:6
                    }}
                  >
                    <Check size={16} /> Approve
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
