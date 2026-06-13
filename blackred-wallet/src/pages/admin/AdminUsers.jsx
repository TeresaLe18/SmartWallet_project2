import { useState, useEffect } from "react";
import { 
  X, Search, Eye, User, CreditCard,
  ArrowDownLeft, ArrowUpRight, History
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { adminAPI } from "../../services/api";

const mockUsers = [
  { id:"U001", name:"Nguyễn Văn A", email:"nva@email.com", phone:"0901234567", kyc:"verified", status:"active", balance:"12,500,000 ₫", joined:"01/01/2025", cccd:"034095009876", dob:"12/04/1995", gender:"Nam", address:"Hà Nội" },
  { id:"U002", name:"Trần Thị B",    email:"ttb@email.com", phone:"0912345678", kyc:"pending",  status:"active", balance:"3,200,000 ₫",  joined:"15/02/2025", cccd:"079102008888", dob:"20/09/2002", gender:"Nữ", address:"TP. Hồ Chí Minh" },
  { id:"U003", name:"Lê Văn C",      email:"lvc@email.com", phone:"0923456789", kyc:"none",     status:"locked", balance:"0 ₫",           joined:"20/03/2025", cccd:null, dob:null, gender:null, address:null },
  { id:"U004", name:"Phạm Thị D",    email:"ptd@email.com", phone:"0934567890", kyc:"verified", status:"active", balance:"8,750,000 ₫",  joined:"05/04/2025", cccd:"036098006543", dob:"18/11/1998", gender:"Nữ", address:"Hải Phòng" },
  { id:"U005", name:"Hoàng Minh E",  email:"hme@email.com", phone:"0945678901", kyc:"pending",  status:"active", balance:"1,000,000 ₫",  joined:"12/04/2025", cccd:"038101007777", dob:"05/05/2001", gender:"Nam", address:"Đà Nẵng" },
];

const kycBadge = { verified:{ bg:"rgba(34,197,94,0.12)", color:"#22c55e", text:"Đã KYC" }, pending:{ bg:"rgba(245,158,11,0.12)", color:"#f59e0b", text:"Chờ duyệt" }, none:{ bg:"rgba(100,116,139,0.12)", color:"#94a3b8", text:"Chưa KYC" } };
const statusBadge = { active:{ bg:"rgba(34,197,94,0.12)", color:"#22c55e", text:"Hoạt động" }, locked:{ bg:"rgba(239,68,68,0.12)", color:"#ef4444", text:"Bị khóa" } };

const getUserBaseBalance = (email) => {
  if (!email) return 0;
  const lower = email.toLowerCase();
  if (lower === "nva@email.com") return 12500000;
  if (lower === "ttb@email.com") return 3200000;
  if (lower === "lvc@email.com") return 0;
  if (lower === "ptd@email.com") return 8750000;
  if (lower === "hme@email.com") return 1000000;
  return 0;
};

const getMockUserEmailByName = (name) => {
  if (!name) return null;
  const lower = name.toLowerCase();
  if (lower.includes("nguyễn văn a")) return "nva@email.com";
  if (lower.includes("trần thị b")) return "ttb@email.com";
  if (lower.includes("lê văn c")) return "lvc@email.com";
  if (lower.includes("phạm thị d")) return "ptd@email.com";
  if (lower.includes("hoàng minh e")) return "hme@email.com";
  return null;
};

const calcUserBalance = (userEmail) => {
  try {
    const bwUser = localStorage.getItem("bw_user");
    if (bwUser) {
      const u = JSON.parse(bwUser);
      if (u.email === userEmail && u.balance) return u.balance;
    }
    const emailTx = localStorage.getItem(`bw_transactions_${userEmail}`);
    if (emailTx) {
      const txs = JSON.parse(emailTx);
      const base = getUserBaseBalance(userEmail);
      const total = Math.max(0, txs.reduce((acc, tx) => {
        if (tx.status !== "success") return acc;
        if (tx.type === "receive") return acc + tx.amount;
        if (tx.type === "send") return acc - tx.amount;
        return acc;
      }, base));
      return total.toLocaleString("vi-VN") + " ₫";
    }
    return null;
  } catch { return null; }
};

const shortId = (id = "") => {
  if (!id) return "—";
  if (id.length <= 12) return id;
  return id.slice(0, 7) + "…" + id.slice(-4);
};

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

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [allTransactions, setAllTransactions] = useState([]);
  const [search, setSearch] = useState("");
  const [kycFilter, setKycFilter] = useState("all");
  const [selectedUser, setSelectedUser] = useState(null);
  const [modalTab, setModalTab] = useState("info");
  const [rejectingUserId, setRejectingUserId] = useState(null);
  const [rejectComment, setRejectComment] = useState("");

  const fetchUsers = async () => {
    try {
      const res = await adminAPI.getUsers();
      if (res.success && res.users) {
        const list = res.users.map(u => {
          const kycState = u.kyc
            ? u.kyc.status.toLowerCase()
            : "none";
          return {
            id: String(u.id),
            name: u.kyc?.full_name || "Người dùng",
            email: u.email,
            phone: u.phone || "Chưa cập nhật",
            kyc: kycState,
            kycStatus: kycState,
            status: u.status.toLowerCase(),
            balance: u.wallet ? (Number(u.wallet.balance).toLocaleString("vi-VN") + " ₫") : "0 ₫",
            joined: new Date(u.created_at || u.createdAt).toLocaleDateString("vi-VN"),
            cccd: u.kyc?.national_id || null,
            dob: u.kyc?.date_of_birth ? new Date(u.kyc.date_of_birth).toLocaleDateString("vi-VN") : null,
            gender: u.kyc?.gender || "Nam",
            address: u.kyc?.address || "Chưa cập nhật",
            walletStatus: u.wallet ? u.wallet.status.toLowerCase() : "active",
            walletId: u.wallet?.id || null,
            front_image: u.kyc?.front_image || null,
            back_image: u.kyc?.back_image || null,
            selfie_image: u.kyc?.selfie_image || null,
          };
        });
        setUsers(list);
        if (selectedUser) {
          const freshSel = list.find(x => x.id === selectedUser.id);
          if (freshSel) setSelectedUser(freshSel);
        }
      }

      // Fetch all transactions too
      const txRes = await adminAPI.getTransactions();
      if (txRes.success && txRes.transactions) {
        setAllTransactions(txRes.transactions);
      }
    } catch (error) {
      console.error("Failed to fetch users from backend:", error);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleApproveKyc = async (id) => {
    const targetUser = users.find(u => u.id === id);
    if (!targetUser) return;
    try {
      await adminAPI.reviewKyc(id, 'VERIFIED');
      await fetchUsers();
      alert(`✅ Đã duyệt KYC cho ${targetUser.name || targetUser.email}!`);
    } catch (error) {
      console.error("Failed to approve KYC:", error);
      alert("Lỗi hệ thống khi phê duyệt KYC.");
    }
  };

  const handleRejectKyc = (id) => {
    setRejectingUserId(id);
    setRejectComment("Giấy tờ tùy thân không rõ nét hoặc không khớp thông tin.");
  };

  const submitRejectKyc = async () => {
    if (!rejectComment.trim()) {
      alert("Vui lòng cung cấp lý do từ chối KYC.");
      return;
    }
    const targetUser = users.find(u => u.id === rejectingUserId);
    try {
      await adminAPI.reviewKyc(rejectingUserId, 'REJECTED', rejectComment.trim());
      await fetchUsers();
      if (selectedUser && selectedUser.id === rejectingUserId) {
        setSelectedUser(null);
      }
      setRejectingUserId(null);
      setRejectComment("");
      alert(`❌ Đã từ chối KYC của ${targetUser ? (targetUser.name || targetUser.email) : "người dùng"}.`);
    } catch (error) {
      console.error("Failed to reject KYC:", error);
      alert("Lỗi hệ thống khi từ chối KYC.");
    }
  };

  const handleToggleLock = async (id) => {
    const targetUser = users.find(u => u.id === id);
    if (!targetUser) return;
    const nextStatus = targetUser.status === "active" ? "LOCKED" : "ACTIVE";
    try {
      await adminAPI.updateUserStatus(id, nextStatus);
      await fetchUsers();
      alert(`${nextStatus === "LOCKED" ? "🔒 Đã khóa" : "🔓 Đã mở khóa"} tài khoản thành công!`);
    } catch (error) {
      console.error("Failed to toggle user status:", error);
      alert("Lỗi hệ thống khi thay đổi trạng thái tài khoản.");
    }
  };

  const handleToggleFreeze = async (id) => {
    const targetUser = users.find(u => u.id === id);
    if (!targetUser) return;
    const nextStatus = targetUser.walletStatus === "frozen" ? "ACTIVE" : "FROZEN";
    try {
      await adminAPI.updateWalletStatus(id, nextStatus);
      await fetchUsers();
      alert(`${nextStatus === "FROZEN" ? "❄️ Đã đóng băng" : "🔓 Đã mở đóng băng"} ví thành công!`);
    } catch (error) {
      console.error("Failed to toggle wallet status:", error);
      alert("Lỗi hệ thống khi thay đổi trạng thái ví.");
    }
  };

  const filtered = users.filter(u => {
    const matchSearch = !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.includes(search) || u.id.includes(search);
    const matchKyc = kycFilter === "all" || u.kyc === kycFilter;
    return matchSearch && matchKyc;
  });

  return (
    <div style={{ maxWidth:1100 }}>
      <div style={{ display:"flex", alignItems:"center", justifycontent:"space-between", marginBottom:20, flexWrap:"wrap", gap:12 }}>
        <div>
          <h1 style={{ fontSize:18, fontWeight:800, marginBottom:2 }}>Quản lý người dùng</h1>
          <p style={{ color: "var(--text-secondary)", fontSize:13 }}>{users.length} người dùng</p>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display:"flex", gap:10, marginBottom:20, flexWrap:"wrap" }}>
        <div style={{ position:"relative", flex:1, minWidth:200 }}>
          <Search size={14} style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", color: "var(--text-muted)" }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm theo tên, email, ID..."
            style={{ width:"100%", background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius:8, padding:"9px 12px 9px 34px", color: "#000000", fontSize:13, outline:"none" }} />
        </div>
        <div style={{ display:"flex", gap:6 }}>
          {[{v:"all",l:"Tất cả"},{v:"verified",l:"Đã KYC"},{v:"pending",l:"Chờ duyệt"},{v:"none",l:"Chưa KYC"}].map(f => (
            <button key={f.v} onClick={() => setKycFilter(f.v)} style={{
              padding:"8px 12px", borderRadius:8, fontSize:12, fontWeight:500,
              background: kycFilter===f.v ? "rgba(37,99,235,0.15)" : "#ffffff",
              border:`1px solid ${kycFilter===f.v ? "rgba(37,99,235,0.3)" : "var(--border)"}`,
              color: kycFilter===f.v ? "#2563eb" : "#000000", cursor:"pointer"
            }}>{f.l}</button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius:14, overflow:"hidden" }}>
        {/* Header */}
        <div style={{ display:"grid", gridTemplateColumns:"80px 1fr 1fr 100px 100px 120px 80px", gap:0, padding:"12px 16px", borderBottom:"1px solid var(--border)", background: "var(--bg-dark)" }}>
          {["ID","Tên","Email","KYC","Trạng thái","Số dư","Hành động"].map(h => (
            <span key={h} style={{ fontSize:11, fontWeight:700, color: "var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.5px" }}>{h}</span>
          ))}
        </div>

        {filtered.map((u, i) => (
          <motion.div key={u.id} initial={{opacity:0}} animate={{opacity:1}} transition={{delay:i*0.04}}
            style={{ display:"grid", gridTemplateColumns:"80px 1fr 1fr 100px 100px 120px 80px", gap:0, padding:"14px 16px", borderBottom: "1px solid var(--border)", alignItems:"center", transition:"background 0.2s" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            <span
              title={u.id}
              onClick={() => { navigator.clipboard?.writeText(u.id); }}
              style={{
                fontSize:11, color: "var(--text-muted)", fontFamily:"monospace",
                cursor:"copy", overflow:"hidden", textOverflow:"ellipsis",
                whiteSpace:"nowrap", display:"block", maxWidth:76,
                borderRadius:4, padding:"2px 4px",
                transition:"background 0.15s"
              }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.06)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >{shortId(u.id)}</span>
            <div>
              <p style={{ fontSize:13, fontWeight:600 }}>{u.name}</p>
              <p style={{ fontSize:11, color: "var(--text-muted)" }}>{u.phone}</p>
            </div>
            <span style={{ fontSize:13, color: "var(--text-secondary)" }}>{u.email}</span>
            <span style={{ ...kycBadge[u.kyc], fontSize:11, padding:"3px 8px", borderRadius:6, fontWeight:600, display:"inline-block" }}>
              {kycBadge[u.kyc].text}
            </span>
            <span style={{ ...statusBadge[u.status], fontSize:11, padding:"3px 8px", borderRadius:6, fontWeight:600, display:"inline-block" }}>
              {statusBadge[u.status].text}
            </span>
            <span style={{ fontSize:13, fontWeight:600 }}>{u.balance}</span>
            <button onClick={() => { setSelectedUser(u); setModalTab("info"); }} style={{ background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius:6, padding:"6px 10px", color: "var(--text-secondary)", cursor:"pointer", display:"flex", alignItems:"center", gap:4, fontSize:12 }}>
              <Eye size={13} />Chi tiết
            </button>
          </motion.div>
        ))}
        {filtered.length === 0 && (
          <div style={{ textAlign:"center", padding:40, color: "var(--text-muted)" }}>Không tìm thấy người dùng</div>
        )}
      </div>

      {/* User detail modal */}
      <AnimatePresence>
        {selectedUser && (
          <div onClick={() => setSelectedUser(null)} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.8)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
            <motion.div initial={{scale:0.95,opacity:0}} animate={{scale:1,opacity:1}} onClick={e => e.stopPropagation()}
              style={{ background: "var(--bg-dark)", border:"1px solid #222", borderRadius:20, padding:28, width:"100%", maxWidth: modalTab === "cccd" && selectedUser.cccd ? 760 : modalTab === "tx" ? 600 : 450, transition: "max-width 0.3s ease" }}>
              
              <h3 style={{ fontSize:16, fontWeight:700, marginBottom:16, color: "#000000" }}>Chi tiết tài khoản: {selectedUser.name}</h3>

              {/* Tabs Selector */}
              <div style={{ display:"flex", borderBottom: "1px solid var(--border)", marginBottom:20, gap:16 }}>
                <button onClick={() => setModalTab("info")} style={{
                  background:"none", border:"none", padding:"8px 4px", fontSize:13, fontWeight:600,
                  color: modalTab === "info" ? "#2563eb" : "#52525b", cursor:"pointer",
                  borderBottom: modalTab === "info" ? "2px solid #2563eb" : "2px solid transparent",
                  display:"flex", alignItems:"center", gap:6, transition:"all 0.25s"
                }}>
                  <User size={14} /> Thông tin chính
                </button>
                <button onClick={() => setModalTab("cccd")} style={{
                  background:"none", border:"none", padding:"8px 4px", fontSize:13, fontWeight:600,
                  color: modalTab === "cccd" ? "#2563eb" : "#52525b", cursor:"pointer",
                  borderBottom: modalTab === "cccd" ? "2px solid #2563eb" : "2px solid transparent",
                  display:"flex", alignItems:"center", gap:6, transition:"all 0.25s"
                }}>
                  <CreditCard size={14} /> Hồ sơ CCCD
                </button>
                <button onClick={() => setModalTab("tx")} style={{
                  background:"none", border:"none", padding:"8px 4px", fontSize:13, fontWeight:600,
                  color: modalTab === "tx" ? "#2563eb" : "#52525b", cursor:"pointer",
                  borderBottom: modalTab === "tx" ? "2px solid #2563eb" : "2px solid transparent",
                  display:"flex", alignItems:"center", gap:6, transition:"all 0.25s"
                }}>
                  <History size={14} /> Lịch sử GD
                </button>
              </div>

              {/* Tab 1: Info */}
              {modalTab === "info" && (
                <div>
                  {Object.entries({
                    "ID": selectedUser.id,
                    "Email": selectedUser.email,
                    "SĐT": selectedUser.phone,
                    "KYC": kycBadge[selectedUser.kyc].text,
                    "Trạng thái tài khoản": statusBadge[selectedUser.status].text,
                    "Trạng thái ví": selectedUser.walletStatus === "frozen" ? "❄️ Đóng băng" : "🟢 Hoạt động",
                    "Số dư": selectedUser.balance,
                    "Ngày tham gia": selectedUser.joined
                  }).map(([k,v]) => (
                    <div key={k} style={{ display:"flex", justifyContent:"space-between", padding:"9px 0", borderBottom: "1px solid var(--border)" }}>
                      <span style={{ fontSize:13, color: "var(--text-secondary)" }}>{k}</span>
                      <span style={{ fontSize:13, fontWeight:600, color: "#000000" }}>{v}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Tab 2: CCCD and Images */}
              {modalTab === "cccd" && (
                <div>
                  {!selectedUser.cccd ? (
                    <div style={{ textAlign: "center", padding: "30px 10px", color: "var(--text-muted)" }}>
                      <CreditCard size={32} style={{ marginBottom: 12, opacity: 0.3 }} />
                      <p style={{ fontSize: 13 }}>Người dùng chưa cập nhật thông tin CCCD hoặc chưa yêu cầu duyệt KYC.</p>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                      {/* CCCD details */}
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, background: "var(--bg-card)", padding: 16, borderRadius: 12, border: "1px solid var(--border)" }}>
                        {[
                          { k: "Số CCCD", v: selectedUser.cccd },
                          { k: "Họ và tên", v: selectedUser.name.toUpperCase() },
                          { k: "Ngày sinh", v: selectedUser.dob },
                          { k: "Giới tính", v: selectedUser.gender },
                          { k: "Địa chỉ thường trú", v: selectedUser.address }
                        ].map(item => (
                          <div key={item.k} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                            <span style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase" }}>{item.k}</span>
                            <span style={{ fontSize: 13, fontWeight: 700, color: "#000000" }}>{item.v}</span>
                          </div>
                        ))}
                      </div>

                      {/* Real uploaded images */}
                      {(selectedUser.front_image || selectedUser.back_image || selectedUser.selfie_image) && (
                        <div style={{ marginBottom: 20 }}>
                          <p style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 10, textTransform: "uppercase" }}>Hình ảnh tải lên từ thiết bị</p>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
                            {selectedUser.front_image && (
                              <div style={{ background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius: 10, padding: 8, textAlign: "center" }}>
                                <span style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>Mặt trước CCCD</span>
                                <img src={selectedUser.front_image} style={{ width: "100%", maxHeight: 120, objectFit: "contain", borderRadius: 6 }} alt="Mặt trước" />
                              </div>
                            )}
                            {selectedUser.back_image && (
                              <div style={{ background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius: 10, padding: 8, textAlign: "center" }}>
                                <span style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>Mặt sau CCCD</span>
                                <img src={selectedUser.back_image} style={{ width: "100%", maxHeight: 120, objectFit: "contain", borderRadius: 6 }} alt="Mặt sau" />
                              </div>
                            )}
                            {selectedUser.selfie_image && (
                              <div style={{ background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius: 10, padding: 8, textAlign: "center" }}>
                                <span style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>Ảnh chân dung (Selfie)</span>
                                <img src={selectedUser.selfie_image} style={{ width: "100%", maxHeight: 120, objectFit: "contain", borderRadius: 6 }} alt="Selfie" />
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Styled citizen card mockups (Front & Back) */}
                      <div>
                        <p style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 10, textTransform: "uppercase" }}>Hình ảnh đối chiếu (CCCD gắn chíp)</p>
                        
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
                          {/* CCCD Front side */}
                          <div style={{
                            background: "linear-gradient(135deg, #102e42 0%, #051622 100%)",
                            border: "1px solid #1a3e56", borderRadius: 12,
                            padding: 14, position: "relative", minHeight: 200,
                            display: "flex", flexDirection: "column", justifyContent: "space-between",
                            boxShadow: "0 8px 24px rgba(0,0,0,0.4)"
                          }}>
                            {/* Card header */}
                            <div style={{ textAlign: "center", borderBottom: "1px solid rgba(26,62,86,0.5)", paddingBottom: 6, marginBottom: 8 }}>
                              <p style={{ fontSize: 8, fontWeight: 800, color: "#ffd700", letterSpacing: "0.2px" }}>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
                              <p style={{ fontSize: 6, color: "#fff", opacity: 0.8 }}>Độc lập - Tự do - Hạnh phúc</p>
                              <p style={{ fontSize: 9, fontWeight: 900, color: "#fff", marginTop: 4, letterSpacing: "0.5px" }}>CĂN CƯỚC CÔNG DÂN / CITIZEN IDENTITY CARD</p>
                            </div>

                            {/* Card body */}
                            <div style={{ display: "flex", gap: 12, flex: 1 }}>
                              {/* Avatar silhouette */}
                              <div style={{
                                width: 54, height: 70, background: "#173a50",
                                border: "1px solid #23587b", borderRadius: 4,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                position: "relative", overflow: "hidden"
                              }}>
                                {selectedUser.selfie_image ? (
                                  <img src={selectedUser.selfie_image} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="Selfie" />
                                ) : (
                                  <User size={30} style={{ color: "#0d202e" }} />
                                )}
                                <div style={{ position: "absolute", bottom: 0, width: "100%", height: 3, background: "rgba(37,99,235,0.6)" }} />
                              </div>

                              {/* Card info */}
                              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 3 }}>
                                <p style={{ fontSize: 7, color: "#8ab4cd" }}>Số / No: <span style={{ fontSize: 11, fontWeight: 800, color: "#ff4444" }}>{selectedUser.cccd}</span></p>
                                <p style={{ fontSize: 7, color: "#8ab4cd" }}>Họ và tên / Full name: <span style={{ fontSize: 9, fontWeight: 700, color: "#fff", display: "block" }}>{selectedUser.name.toUpperCase()}</span></p>
                                <div style={{ display: "flex", gap: 10 }}>
                                  <p style={{ fontSize: 7, color: "#8ab4cd" }}>Ngày sinh / Date of birth: <span style={{ fontSize: 8, fontWeight: 600, color: "#fff", display: "block" }}>{selectedUser.dob}</span></p>
                                  <p style={{ fontSize: 7, color: "#8ab4cd" }}>Giới tính / Sex: <span style={{ fontSize: 8, fontWeight: 600, color: "#fff", display: "block" }}>{selectedUser.gender}</span></p>
                                </div>
                                <p style={{ fontSize: 7, color: "#8ab4cd" }}>Nơi thường trú / Place of residence: <span style={{ fontSize: 8, fontWeight: 600, color: "#fff", display: "block" }}>{selectedUser.address}</span></p>
                              </div>
                            </div>

                            {/* Hologram stamp */}
                            <div style={{
                              position: "absolute", bottom: 12, right: 12,
                              width: 24, height: 24, borderRadius: "50%",
                              background: "radial-gradient(circle, #ffd700 0%, #00ffcc 50%, #2563eb 100%)",
                              opacity: 0.7, border: "1px solid rgba(255,255,255,0.4)"
                            }} />

                            <span style={{ position: "absolute", top: 12, left: 12, fontSize: 8, fontWeight: 700, color: "rgba(255,255,255,0.2)" }}>FRONT</span>
                          </div>

                          {/* CCCD Back side */}
                          <div style={{
                            background: "linear-gradient(135deg, #102e42 0%, #051622 100%)",
                            border: "1px solid #1a3e56", borderRadius: 12,
                            padding: 14, position: "relative", minHeight: 200,
                            display: "flex", flexDirection: "column", justifyContent: "space-between",
                            boxShadow: "0 8px 24px rgba(0,0,0,0.4)"
                          }}>
                            {/* Metal chip mockup */}
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <div style={{
                                width: 32, height: 24, borderRadius: 4,
                                background: "linear-gradient(135deg, #ffd700 0%, #d4af37 100%)",
                                border: "1px solid #b8860b", display: "flex", flexDirection: "column",
                                padding: 2, gap: 2, opacity: 0.95
                              }}>
                                <div style={{ display: "flex", gap: 2, height: "100%" }}>
                                  <div style={{ flex: 1, borderRight: "1px solid rgba(0,0,0,0.2)" }} />
                                  <div style={{ flex: 1, borderRight: "1px solid rgba(0,0,0,0.2)" }} />
                                  <div style={{ flex: 1 }} />
                                </div>
                              </div>

                              {/* Barcode area mock */}
                              <div style={{ width: 120, height: 22, background: "rgba(255,255,255,0.05)", border: "1px dashed rgba(255,255,255,0.2)", borderRadius: 3, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <div style={{ width: "90%", height: 8, background: "repeating-linear-gradient(90deg, #fff, #fff 2px, transparent 2px, transparent 6px)" }} />
                              </div>
                            </div>

                            {/* Center info */}
                            <div style={{ flex: 1, display: "flex", gap: 14, alignItems: "center", marginTop: 8 }}>
                              {/* Fingerprint spot */}
                              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                                <div style={{
                                  width: 44, height: 44, borderRadius: "50%",
                                  background: "#173a50", border: "1px dashed #23587b",
                                  display: "flex", alignItems: "center", justifyContent: "center",
                                  opacity: 0.8
                                }}>
                                  <span style={{ fontSize: 14 }}>🌀</span>
                                </div>
                                <span style={{ fontSize: 6, color: "#8ab4cd" }}>VÂN TAY TRÁI</span>
                              </div>

                              {/* Seal / Sign info */}
                              <div style={{ flex: 1 }}>
                                <p style={{ fontSize: 6, color: "#8ab4cd" }}>Cục trưởng Cục Cảnh sát quản lý hành chính về trật tự xã hội</p>
                                <p style={{ fontSize: 5, color: "#5c8ba9", fontStyle: "italic" }}>Director General of Police Department for Administrative...</p>
                                
                                {/* Signature overlay */}
                                <div style={{ position: "relative", height: 30, marginTop: 4 }}>
                                  <div style={{ fontSize: 10, color: "#ef4444", fontFamily: "cursive", transform: "rotate(-6deg)", position: "absolute", top: 4, left: 10 }}>Nguyen Van Police</div>
                                  <div style={{
                                    position: "absolute", top: 0, left: 60,
                                    width: 24, height: 24, borderRadius: "50%",
                                    background: "rgba(239,68,68,0.25)", border: "1px dashed #ef4444"
                                  }} />
                                </div>
                              </div>
                            </div>

                            <span style={{ position: "absolute", top: 12, left: 12, fontSize: 8, fontWeight: 700, color: "rgba(255,255,255,0.2)" }}>BACK</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 3: Transaction History */}
              {modalTab === "tx" && (() => {
                const txList = allTransactions
                  .filter(tx => {
                    const senderEmail = tx.sender_wallet?.user?.email;
                    const receiverEmail = tx.receiver_wallet?.user?.email;
                    return senderEmail === selectedUser.email || receiverEmail === selectedUser.email;
                  })
                  .map(tx => {
                    const isSender = tx.sender_wallet?.user?.email === selectedUser.email;
                    const type = isSender ? "send" : "receive";
                    const otherUser = isSender
                      ? tx.receiver_wallet?.user?.email || "Ngân hàng"
                      : tx.sender_wallet?.user?.email || "Ngân hàng";
                    
                    return {
                      id: tx.reference_code || `TX${tx.id}`,
                      type,
                      name: otherUser,
                      amount: Number(tx.amount),
                      time: new Date(tx.created_at || tx.createdAt).toLocaleTimeString("vi-VN", {hour: "2-digit", minute:"2-digit"}) + " " + new Date(tx.created_at || tx.createdAt).toLocaleDateString("vi-VN"),
                      status: tx.status.toLowerCase(),
                      category: tx.transaction_type,
                    };
                  });

                const fmtCur = (n) => Number(n).toLocaleString("vi-VN") + " ₫";
                return (
                  <div>
                    {/* Summary stats */}
                    <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, marginBottom:16 }}>
                      {[
                        { label:"Tổng GD", val: txList.length, color:"#3b82f6" },
                        { label:"Thành công", val: txList.filter(t=>t.status==="success").length, color:"#22c55e" },
                        { label:"Chờ duyệt", val: txList.filter(t=>t.status==="pending").length, color:"#f59e0b" }
                      ].map(s => (
                        <div key={s.label} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius:10, padding:"10px 14px", textAlign:"center" }}>
                          <p style={{ fontSize:20, fontWeight:900, color: s.color }}>{s.val}</p>
                          <p style={{ fontSize:11, color: "var(--text-muted)", marginTop:2 }}>{s.label}</p>
                        </div>
                      ))}
                    </div>

                    {/* Transaction list */}
                    <div style={{ display:"flex", flexDirection:"column", gap:6, maxHeight:340, overflowY:"auto", paddingRight:4 }}>
                      {txList.length === 0 ? (
                        <div style={{ textAlign:"center", padding:"30px 0", color: "var(--text-muted)" }}>
                          <History size={28} style={{ marginBottom:8, opacity:0.3 }} />
                          <p style={{ fontSize:13 }}>Không có lịch sử giao dịch</p>
                        </div>
                      ) : txList.map((tx, i) => (
                        <div key={tx.id || i} style={{
                          display:"flex", alignItems:"center", gap:12,
                          padding:"10px 12px", background: "var(--bg-card)",
                          border: "1px solid var(--border)", borderRadius:10
                        }}>
                          <div style={{
                            width:34, height:34, borderRadius:8, flexShrink:0,
                            background: tx.type==="receive" ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
                            display:"flex", alignItems:"center", justifyContent:"center"
                          }}>
                            {tx.type==="receive"
                              ? <ArrowDownLeft size={16} style={{color:"#22c55e"}} />
                              : <ArrowUpRight size={16} style={{color:"#ef4444"}} />
                            }
                          </div>

                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                              <p style={{ fontSize:12, fontWeight:600, color: "#000000", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{tx.name}</p>
                              {tx.category && (
                                <span style={{ fontSize:9, background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:4, padding:"0 4px", color: "var(--text-secondary)", fontWeight:500 }}>
                                  {tx.category}
                                </span>
                              )}
                            </div>
                            <p style={{ fontSize:10, color: "var(--text-muted)", marginTop:1 }}>{tx.id} • {tx.time}</p>
                          </div>

                          <div style={{ textAlign:"right", flexShrink:0 }}>
                            <p style={{ fontSize:13, fontWeight:700, color: tx.type==="receive" ? "#22c55e" : "#ef4444" }}>
                              {tx.type==="receive" ? "+" : "-"}{fmtCur(tx.amount)}
                            </p>
                            <span style={{
                              fontSize:10, padding:"1px 7px", borderRadius:5, fontWeight:600, display:"inline-block", marginTop:3,
                              background: tx.status==="success" ? "rgba(34,197,94,0.1)" : tx.status==="pending" ? "rgba(245,158,11,0.1)" : "rgba(239,68,68,0.1)",
                              color: tx.status==="success" ? "#22c55e" : tx.status==="pending" ? "#f59e0b" : "#ef4444"
                            }}>
                              {tx.status==="success" ? "Thành công" : tx.status==="pending" ? "Chờ duyệt" : "Thất bại"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Bottom Actions */}
              <div style={{ display:"flex", gap:10, marginTop:24, flexWrap:"wrap" }}>
                {(selectedUser.kyc === "pending" || selectedUser.kycStatus === "pending") && (
                  <>
                    <button
                      onClick={() => handleApproveKyc(selectedUser.id)}
                      style={{
                        flex: 1,
                        background: "rgba(34,197,94,0.15)",
                        border: "1px solid rgba(34,197,94,0.3)",
                        color: "#22c55e",
                        borderRadius: 8,
                        padding: "10px 14px",
                        fontWeight: 700,
                        fontSize: 13,
                        cursor: "pointer",
                        transition: "all 0.2s"
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = "rgba(34,197,94,0.25)"}
                      onMouseLeave={e => e.currentTarget.style.background = "rgba(34,197,94,0.15)"}
                    >
                      ✅ Duyệt KYC
                    </button>
                    <button
                      onClick={() => handleRejectKyc(selectedUser.id)}
                      style={{
                        flex: 1,
                        background: "rgba(239,68,68,0.12)",
                        border: "1px solid rgba(239,68,68,0.25)",
                        color: "#ef4444",
                        borderRadius: 8,
                        padding: "10px 14px",
                        fontWeight: 700,
                        fontSize: 13,
                        cursor: "pointer",
                        transition: "all 0.2s"
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = "rgba(239,68,68,0.25)"}
                      onMouseLeave={e => e.currentTarget.style.background = "rgba(239,68,68,0.12)"}
                    >
                      ❌ Từ chối KYC
                    </button>
                  </>
                )}
                <button
                  onClick={() => handleToggleLock(selectedUser.id)}
                  style={{
                    flex: 1,
                    background: selectedUser.status === "active" ? "rgba(239,68,68,0.1)" : "rgba(34,197,94,0.1)",
                    border: selectedUser.status === "active" ? "1px solid rgba(239,68,68,0.2)" : "1px solid rgba(34,197,94,0.2)",
                    color: selectedUser.status === "active" ? "#ef4444" : "#22c55e",
                    borderRadius: 8,
                    padding: "10px",
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: "pointer",
                    transition: "all 0.2s"
                  }}
                >
                  {selectedUser.status === "active" ? "Khóa tài khoản" : "Mở khóa tài khoản"}
                </button>
                <button
                  onClick={() => handleToggleFreeze(selectedUser.id)}
                  style={{
                    flex: 1,
                    background: selectedUser.walletStatus === "frozen" ? "rgba(34,197,94,0.1)" : "rgba(59,130,246,0.1)",
                    border: selectedUser.walletStatus === "frozen" ? "1px solid rgba(34,197,94,0.2)" : "1px solid rgba(59,130,246,0.2)",
                    color: selectedUser.walletStatus === "frozen" ? "#22c55e" : "#3b82f6",
                    borderRadius: 8,
                    padding: "10px",
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: "pointer",
                    transition: "all 0.2s"
                  }}
                >
                  {selectedUser.walletStatus === "frozen" ? "🔓 Mở băng ví" : "❄️ Đóng băng ví"}
                </button>
                <button onClick={() => setSelectedUser(null)} style={{ flex:1, background: "var(--bg-card2)", border: "1px solid var(--border)", color: "var(--text-secondary)", borderRadius:8, padding:"10px", fontWeight:600, fontSize:13, cursor:"pointer" }}>
                  Đóng
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Rejection comment modal */}
      <AnimatePresence>
        {rejectingUserId && (
          <div onClick={() => setRejectingUserId(null)} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.8)", zIndex:300, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
            <motion.div initial={{scale:0.95,opacity:0}} animate={{scale:1,opacity:1}} exit={{scale:0.95,opacity:0}} onClick={e => e.stopPropagation()}
              style={{ background: "var(--bg-dark)", border:"1px solid #222", borderRadius:20, padding:28, width:"100%", maxWidth:400 }}>
              
              <h3 style={{ fontSize:16, fontWeight:700, marginBottom:16, color: "#000000" }}>Từ chối hồ sơ KYC</h3>
              <p style={{ fontSize:13, color: "var(--text-secondary)", marginBottom:14 }}>Vui lòng nhập lý do từ chối hồ sơ xác minh để thông báo cho người dùng:</p>

              <textarea 
                value={rejectComment}
                onChange={e => setRejectComment(e.target.value)}
                placeholder="Nhập lý do từ chối..."
                style={{
                  width: "100%", height: 100, background: "var(--bg-card2)", border: "1px solid var(--border)",
                  borderRadius: 10, padding: "10px 12px", color: "#000000", fontSize: 13, outline: "none",
                  resize: "none", marginBottom: 20
                }}
              />

              <div style={{ display:"flex", gap:10 }}>
                <button 
                  onClick={submitRejectKyc}
                  style={{
                    flex: 1, background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)",
                    color: "#ef4444", borderRadius: 8, padding: "10px", fontWeight: 700, fontSize: 13, cursor: "pointer",
                    transition: "all 0.2s"
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(239,68,68,0.25)"}
                  onMouseLeave={e => e.currentTarget.style.background = "rgba(239,68,68,0.15)"}
                >
                  Xác nhận
                </button>
                <button 
                  onClick={() => { setRejectingUserId(null); setRejectComment(""); }}
                  style={{
                    flex: 1, background: "var(--bg-card2)", border: "1px solid var(--border)",
                    color: "var(--text-secondary)", borderRadius: 8, padding: "10px", fontWeight: 600, fontSize: 13, cursor: "pointer"
                  }}
                >
                  Hủy
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
