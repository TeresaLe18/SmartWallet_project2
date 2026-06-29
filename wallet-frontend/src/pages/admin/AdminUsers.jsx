import { useState, useEffect } from "react";
import { 
  X, Search, Eye, User, CreditCard,
  ArrowDownLeft, ArrowUpRight, History
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { adminAPI, getUploadUrl, formatVND } from "../../services/api";
import { useLanguage } from "../../context/LanguageContext";
import { useModal } from "../../context/ModalContext";

const kycBadge = { verified:{ bg:"rgba(34,197,94,0.12)", color:"#22c55e" }, pending:{ bg:"rgba(245,158,11,0.12)", color:"#f59e0b" }, rejected:{ bg:"rgba(239,68,68,0.12)", color:"#ef4444" }, none:{ bg:"rgba(100,116,139,0.12)", color:"#94a3b8" } };
const statusBadge = {
  active: { bg: "rgba(34,197,94,0.12)", color: "#22c55e" },
  locked: { bg: "rgba(239,68,68,0.12)", color: "#ef4444" },
  disabled: { bg: "rgba(100,116,139,0.12)", color: "#64748b" },
};

const shortId = (id = "") => {
  if (!id) return "—";
  if (id.length <= 12) return id;
  return id.slice(0, 7) + "…" + id.slice(-4);
};

export default function AdminUsersPage() {
  const { t } = useLanguage();
  const { showAlert, showConfirm } = useModal();
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
            name: u.kyc?.full_name || t.adminUsers.fallbackUser,
            email: u.email,
            phone: u.phone || t.adminUsers.notUpdated,
            kyc: kycState,
            kycStatus: kycState,
            status: u.status.toLowerCase(),
            balance: u.wallet ? (Number(u.wallet.balance).toLocaleString("vi-VN") + " ₫") : "0 ₫",
            joined: new Date(u.created_at || u.createdAt).toLocaleDateString("vi-VN"),
            cccd: u.kyc?.national_id || null,
            dob: u.kyc?.date_of_birth ? new Date(u.kyc.date_of_birth).toLocaleDateString("vi-VN") : null,
            gender: u.kyc?.gender || null,
            address: u.kyc?.address || null,
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
      showAlert(t.adminUsers.alertApproveSuccess.replace("{name}", targetUser.name || targetUser.email), "success");
    } catch (error) {
      console.error("Failed to approve KYC:", error);
      showAlert(t.adminUsers.errorApprove, "error");
    }
  };

  const handleRejectKyc = (id) => {
    setRejectingUserId(id);
    setRejectComment(t.adminUsers.defaultRejectReason);
  };

  const submitRejectKyc = async () => {
    if (!rejectComment.trim()) {
      showAlert(t.adminUsers.alertRejectReasonRequired, "error");
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
      showAlert(t.adminUsers.alertRejectSuccess.replace("{name}", targetUser ? (targetUser.name || targetUser.email) : t.adminUsers.fallbackUserLower), "success");
    } catch (error) {
      console.error("Failed to reject KYC:", error);
      showAlert(t.adminUsers.errorReject, "error");
    }
  };

  const handleToggleLock = (id) => {
    const targetUser = users.find(u => u.id === id);
    if (!targetUser || targetUser.status === "disabled") return;

    const isLocking = targetUser.status === "active";
    const label = targetUser.name || targetUser.email;
    const message = isLocking
      ? t.adminUsers.confirmLock.replace("{name}", label)
      : t.adminUsers.confirmUnlock.replace("{name}", label);

    showConfirm(message, async () => {
      try {
        if (isLocking) {
          await adminAPI.lockUser(id);
          showAlert(t.adminUsers.alertLockSuccess, "success");
        } else if (targetUser.status === "locked") {
          await adminAPI.unlockUser(id);
          showAlert(t.adminUsers.alertUnlockSuccess, "success");
        }
        await fetchUsers();
      } catch (error) {
        console.error("Failed to toggle user status:", error);
        showAlert(t.adminUsers.errorLock, "error");
      }
    }, null, isLocking);
  };

  const handleReactivate = (id) => {
    const targetUser = users.find(u => u.id === id);
    if (!targetUser || targetUser.status !== "disabled") return;
    showConfirm(t.adminUsers.confirmReactivate.replace("{name}", targetUser.name || targetUser.email), async () => {
      try {
        await adminAPI.reactivateAccount(id);
        await fetchUsers();
        showAlert(t.adminUsers.alertReactivateSuccess, "success");
      } catch (error) {
        console.error("Failed to reactivate account:", error);
        showAlert(t.adminUsers.errorReactivate, "error");
      }
    });
  };

  const handleToggleFreeze = (id) => {
    const targetUser = users.find(u => u.id === id);
    if (!targetUser) return;

    const isFreezing = targetUser.walletStatus !== "frozen";
    const label = targetUser.name || targetUser.email;
    const message = isFreezing
      ? t.adminUsers.confirmFreeze.replace("{name}", label)
      : t.adminUsers.confirmUnfreeze.replace("{name}", label);

    showConfirm(message, async () => {
      const nextStatus = isFreezing ? "FROZEN" : "ACTIVE";
      try {
        await adminAPI.updateWalletStatus(id, nextStatus);
        await fetchUsers();
        showAlert(nextStatus === "FROZEN" ? t.adminUsers.alertFreezeSuccess : t.adminUsers.alertUnfreezeSuccess, "success");
      } catch (error) {
        console.error("Failed to toggle wallet status:", error);
        showAlert(t.adminUsers.errorFreeze, "error");
      }
    }, null, isFreezing);
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
          <h1 style={{ fontSize:18, fontWeight:800, marginBottom:2 }}>{t.adminUsers.title}</h1>
          <p style={{ color: "var(--text-secondary)", fontSize:13 }}>{t.adminUsers.usersCount.replace("{count}", users.length)}</p>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display:"flex", gap:10, marginBottom:20, flexWrap:"wrap" }}>
        <div style={{ position:"relative", flex:1, minWidth:200 }}>
          <Search size={14} style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", color: "var(--text-muted)" }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t.adminUsers.searchPlaceholder}
            style={{ width:"100%", background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius:8, padding:"9px 12px 9px 34px", color: "var(--text-primary)", fontSize:13, outline:"none" }} />
        </div>
        <div style={{ display:"flex", gap:6 }}>
          {[{v:"all",l:t.adminUsers.filters.all},{v:"verified",l:t.adminUsers.filters.verified},{v:"pending",l:t.adminUsers.filters.pending},{v:"none",l:t.adminUsers.filters.none}].map(f => (
            <button key={f.v} onClick={() => setKycFilter(f.v)} style={{
              padding:"8px 12px", borderRadius:8, fontSize:12, fontWeight:500,
              background: kycFilter===f.v ? "rgba(37,99,235,0.15)" : "var(--bg-card)",
              border:`1px solid ${kycFilter===f.v ? "rgba(37,99,235,0.3)" : "var(--border)"}`,
              color: kycFilter===f.v ? "#2563eb" : "var(--text-primary)", cursor:"pointer"
            }}>{f.l}</button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius:14, overflow:"hidden" }}>
        {/* Header */}
        <div style={{ display:"grid", gridTemplateColumns:"80px 1fr 1fr 100px 100px 120px 80px", gap:0, padding:"12px 16px", borderBottom:"1px solid var(--border)", background: "var(--bg-dark)" }}>
          {["id","name","email","kyc","status","balance","actions"].map(h => (
            <span key={h} style={{ fontSize:11, fontWeight:700, color: "var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.5px" }}>{t.adminUsers.headers[h]}</span>
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
              {t.adminUsers.kyc[u.kyc]}
            </span>
            <span style={{ ...(statusBadge[u.status] || statusBadge.active), fontSize:11, padding:"3px 8px", borderRadius:6, fontWeight:600, display:"inline-block" }}>
              {t.adminUsers.status[u.status] || t.adminUsers.status.active}
            </span>
            <span style={{ fontSize:13, fontWeight:600 }}>{u.balance}</span>
            <button onClick={() => { setSelectedUser(u); setModalTab("info"); }} style={{ background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius:6, padding:"6px 10px", color: "var(--text-secondary)", cursor:"pointer", display:"flex", alignItems:"center", gap:4, fontSize:12 }}>
              <Eye size={13} />{t.adminUsers.details}
            </button>
          </motion.div>
        ))}
        {filtered.length === 0 && (
          <div style={{ textAlign:"center", padding:40, color: "var(--text-muted)" }}>{t.adminUsers.noUsers}</div>
        )}
      </div>

      {/* User detail modal */}
      <AnimatePresence>
        {selectedUser && (
          <div onClick={() => setSelectedUser(null)} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.8)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
            <motion.div initial={{scale:0.95,opacity:0}} animate={{scale:1,opacity:1}} onClick={e => e.stopPropagation()}
              style={{ background: "var(--bg-dark)", border:"1px solid #222", borderRadius:20, padding:"20px 24px", width:"100%", maxWidth:500, maxHeight:"90vh", display:"flex", flexDirection:"column" }}>
              
              <h3 style={{ fontSize:15, fontWeight:700, marginBottom:12, color: "var(--text-primary)", flexShrink:0 }}>{t.adminUsers.userModalTitle.replace("{name}", selectedUser.name)}</h3>

              {/* Tabs Selector */}
              <div style={{ display:"flex", borderBottom: "1px solid var(--border)", marginBottom:14, gap:2, overflowX:"auto", scrollbarWidth:"none", flexShrink:0 }}>
                {[
                  { id:"info", icon:<User size={12}/>,       label:t.adminUsers.tabInfo },
                  { id:"cccd", icon:<CreditCard size={12}/>, label:t.adminUsers.tabIdDocs },
                  { id:"tx",   icon:<History size={12}/>,    label:t.adminUsers.tabTransactions },
                ].map(tab => (
                  <button key={tab.id} onClick={() => setModalTab(tab.id)} style={{
                    flexShrink:0, background:"none", border:"none", padding:"5px 10px", fontSize:12, fontWeight:600,
                    color: modalTab === tab.id ? "#2563eb" : "#71717a", cursor:"pointer",
                    borderBottom: modalTab === tab.id ? "2px solid #2563eb" : "2px solid transparent",
                    display:"flex", alignItems:"center", gap:4, transition:"color 0.2s", whiteSpace:"nowrap"
                  }}>
                    {tab.icon} {tab.label}
                  </button>
                ))}
              </div>

              {/* Scrollable tab content */}
              <div style={{ flex:1, overflowY:"auto", minHeight:0, paddingRight:2 }}>

              {/* Tab 1: Info */}
              {modalTab === "info" && (
                <div>
                  {[
                    { k: "id",            label: t.adminUsers.infoLabels.id,            v: selectedUser.id },
                    { k: "email",         label: t.adminUsers.infoLabels.email,         v: selectedUser.email },
                    { k: "phone",         label: t.adminUsers.infoLabels.phone,         v: selectedUser.phone },
                    { k: "kyc",           label: t.adminUsers.infoLabels.kyc,           v: t.adminUsers.kyc[selectedUser.kyc] || selectedUser.kyc },
                    { k: "accountStatus", label: t.adminUsers.infoLabels.accountStatus, v: t.adminUsers.status[selectedUser.status] || selectedUser.status },
                    { k: "walletStatus",  label: t.adminUsers.infoLabels.walletStatus,  v: selectedUser.walletStatus === "frozen" ? t.adminUsers.walletFrozen : t.adminUsers.walletActive },
                    { k: "balance",       label: t.adminUsers.infoLabels.balance,       v: selectedUser.balance },
                    { k: "joined",        label: t.adminUsers.infoLabels.joined,        v: selectedUser.joined }
                  ].map(({ k, label, v }) => (
                    <div key={k} style={{ display:"flex", justifyContent:"space-between", padding:"9px 0", borderBottom: "1px solid var(--border)" }}>
                      <span style={{ fontSize:13, color: "var(--text-secondary)" }}>{label}</span>
                      <span style={{ fontSize:13, fontWeight:600, color: "var(--text-primary)" }}>{v}</span>
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
                      <p style={{ fontSize: 13 }}>{t.adminUsers.noIdDocs}</p>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                      {/* CCCD details */}
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, background: "var(--bg-card)", padding: 16, borderRadius: 12, border: "1px solid var(--border)" }}>
                        {[
                          { k: "nationalId", label: t.adminUsers.cccdLabels.nationalId, v: selectedUser.cccd },
                          { k: "fullName",   label: t.adminUsers.cccdLabels.fullName,   v: selectedUser.name.toUpperCase() },
                          { k: "dob",        label: t.adminUsers.cccdLabels.dob,        v: selectedUser.dob },
                          { k: "gender",     label: t.adminUsers.cccdLabels.gender,     v: selectedUser.gender || t.adminUsers.notProvided },
                          { k: "address",    label: t.adminUsers.cccdLabels.address,    v: selectedUser.address || t.adminUsers.notProvided },
                        ].map(item => (
                          <div key={item.k} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                            <span style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase" }}>{item.label}</span>
                            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>{item.v}</span>
                          </div>
                        ))}
                      </div>

                      {/* Real uploaded images */}
                      {(selectedUser.front_image || selectedUser.back_image || selectedUser.selfie_image) && (
                        <div style={{ marginBottom: 20 }}>
                          <p style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 10, textTransform: "uppercase" }}>{t.adminUsers.uploadedDocuments}</p>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                            {[
                              { key:"front_image",  label:t.adminUsers.imgFront },
                              { key:"back_image",   label:t.adminUsers.imgBack },
                              { key:"selfie_image", label:t.adminUsers.imgSelfie },
                            ].map(({ key, label }) => {
                              const url = getUploadUrl(selectedUser[key]);
                              if (!url) return null;
                              return (
                                <div key={key} style={{ background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius: 10, padding: 8, textAlign: "center" }}>
                                  <span style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>{label}</span>
                                  <img src={url} style={{ width: "100%", maxHeight: 100, objectFit: "contain", borderRadius: 6 }} alt={label} />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Styled citizen card mockups (Front & Back) */}
                      <div>
                        <p style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 10, textTransform: "uppercase" }}>{t.adminUsers.referenceImages}</p>
                        
                        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
                          {/* CCCD Front side */}
                          <div style={{
                            background: "linear-gradient(135deg, #102e42 0%, #051622 100%)",
                            border: "1px solid #1a3e56", borderRadius: 12,
                            padding: 12, position: "relative", minHeight: 160,
                            display: "flex", flexDirection: "column", justifyContent: "space-between",
                            boxShadow: "0 4px 16px rgba(0,0,0,0.4)"
                          }}>
                            {/* Card header */}
                            <div style={{ textAlign: "center", borderBottom: "1px solid rgba(26,62,86,0.5)", paddingBottom: 6, marginBottom: 8 }}>
                              <p style={{ fontSize: 8, fontWeight: 800, color: "#ffd700", letterSpacing: "0.2px" }}>SOCIALIST REPUBLIC OF VIETNAM</p>
                              <p style={{ fontSize: 6, color: "#fff", opacity: 0.8 }}>Independence - Freedom - Happiness</p>
                              <p style={{ fontSize: 9, fontWeight: 900, color: "#fff", marginTop: 4, letterSpacing: "0.5px" }}>CITIZEN IDENTITY CARD</p>
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
                                {getUploadUrl(selectedUser.selfie_image) ? (
                                  <img src={getUploadUrl(selectedUser.selfie_image)} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="Selfie" />
                                ) : (
                                  <User size={30} style={{ color: "#0d202e" }} />
                                )}
                                <div style={{ position: "absolute", bottom: 0, width: "100%", height: 3, background: "rgba(37,99,235,0.6)" }} />
                              </div>

                              {/* Card info */}
                              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 3 }}>
                                <p style={{ fontSize: 7, color: "#8ab4cd" }}>No: <span style={{ fontSize: 11, fontWeight: 800, color: "#ff4444" }}>{selectedUser.cccd}</span></p>
                                <p style={{ fontSize: 7, color: "#8ab4cd" }}>Full name: <span style={{ fontSize: 9, fontWeight: 700, color: "#fff", display: "block" }}>{selectedUser.name.toUpperCase()}</span></p>
                                <div style={{ display: "flex", gap: 10 }}>
                                  <p style={{ fontSize: 7, color: "#8ab4cd" }}>Date of birth: <span style={{ fontSize: 8, fontWeight: 600, color: "#fff", display: "block" }}>{selectedUser.dob}</span></p>
                                  <p style={{ fontSize: 7, color: "#8ab4cd" }}>Sex: <span style={{ fontSize: 8, fontWeight: 600, color: "#fff", display: "block" }}>{selectedUser.gender || "—"}</span></p>
                                </div>
                                <p style={{ fontSize: 7, color: "#8ab4cd" }}>Place of residence: <span style={{ fontSize: 8, fontWeight: 600, color: "#fff", display: "block" }}>{selectedUser.address || "—"}</span></p>
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
                            padding: 12, position: "relative", minHeight: 160,
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
                                <span style={{ fontSize: 6, color: "#8ab4cd" }}>LEFT FINGERPRINT</span>
                              </div>

                              {/* Seal / Sign info */}
                              <div style={{ flex: 1 }}>
                                <p style={{ fontSize: 6, color: "#8ab4cd" }}>Director General of the Administrative Police Department for Social Order</p>
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
                      ? tx.receiver_wallet?.user?.email || t.adminUsers.bank
                      : tx.sender_wallet?.user?.email || t.adminUsers.bank;
                    
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

                const fmtCur = (n) => formatVND(n);
                return (
                  <div>
                    {/* Summary stats */}
                    <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, marginBottom:16 }}>
                      {[
                        { key:"total",      label:t.adminUsers.txTotal,      val: txList.length, color:"#3b82f6" },
                        { key:"successful", label:t.adminUsers.txSuccessful, val: txList.filter(tx=>tx.status==="success").length, color:"#22c55e" },
                        { key:"pending",    label:t.adminUsers.txPending,    val: txList.filter(tx=>tx.status==="pending").length, color:"#f59e0b" }
                      ].map(s => (
                        <div key={s.key} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius:10, padding:"10px 14px", textAlign:"center" }}>
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
                          <p style={{ fontSize:13 }}>{t.adminUsers.noTxHistory}</p>
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
                              <p style={{ fontSize:12, fontWeight:600, color: "var(--text-primary)", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{tx.name}</p>
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
                              {tx.status==="success" ? t.adminUsers.txStatusSuccess : tx.status==="pending" ? t.adminUsers.txStatusPending : t.adminUsers.txStatusFailed}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              </div>{/* end scrollable content */}

              {/* Bottom Actions */}
              <div style={{ display:"flex", gap:8, marginTop:14, flexWrap:"wrap", flexShrink:0, borderTop:"1px solid var(--border)", paddingTop:14 }}>
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
                      {t.adminUsers.btnApproveKyc}
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
                      {t.adminUsers.btnRejectKyc}
                    </button>
                  </>
                )}
                <button
                  onClick={() => handleToggleLock(selectedUser.id)}
                  disabled={selectedUser.status === "disabled"}
                  style={{
                    flex: 1,
                    background: selectedUser.status === "active" ? "rgba(239,68,68,0.1)" : "rgba(34,197,94,0.1)",
                    border: selectedUser.status === "active" ? "1px solid rgba(239,68,68,0.2)" : "1px solid rgba(34,197,94,0.2)",
                    color: selectedUser.status === "active" ? "#ef4444" : "#22c55e",
                    borderRadius: 8,
                    padding: "10px",
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: selectedUser.status === "disabled" ? "not-allowed" : "pointer",
                    opacity: selectedUser.status === "disabled" ? 0.45 : 1,
                    transition: "all 0.2s"
                  }}
                >
                  {selectedUser.status === "active" ? t.adminUsers.btnLockAccount : selectedUser.status === "locked" ? t.adminUsers.btnUnlockAccount : t.adminUsers.btnLockAccount}
                </button>
                {selectedUser.status === "disabled" && (
                  <button
                    onClick={() => handleReactivate(selectedUser.id)}
                    style={{
                      flex: 1,
                      background: "rgba(34,197,94,0.1)",
                      border: "1px solid rgba(34,197,94,0.2)",
                      color: "#22c55e",
                      borderRadius: 8,
                      padding: "10px",
                      fontWeight: 600,
                      fontSize: 13,
                      cursor: "pointer",
                      transition: "all 0.2s"
                    }}
                  >
                    {t.adminUsers.btnReactivate}
                  </button>
                )}
                <button
                  onClick={() => handleToggleFreeze(selectedUser.id)}
                  style={{
                    flex: 1,
                    background: selectedUser.walletStatus === "frozen" ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
                    border: selectedUser.walletStatus === "frozen" ? "1px solid rgba(34,197,94,0.2)" : "1px solid rgba(239,68,68,0.2)",
                    color: selectedUser.walletStatus === "frozen" ? "#22c55e" : "#ef4444",
                    borderRadius: 8,
                    padding: "10px",
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: "pointer",
                    transition: "all 0.2s"
                  }}
                >
                  {selectedUser.walletStatus === "frozen" ? t.adminUsers.btnUnfreezeWallet : t.adminUsers.btnFreezeWallet}
                </button>
                <button onClick={() => setSelectedUser(null)} style={{ flex:1, background: "var(--bg-card2)", border: "1px solid var(--border)", color: "var(--text-secondary)", borderRadius:8, padding:"10px", fontWeight:600, fontSize:13, cursor:"pointer" }}>
                  {t.adminUsers.btnClose}
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
              
              <h3 style={{ fontSize:16, fontWeight:700, marginBottom:16, color: "var(--text-primary)" }}>{t.adminUsers.rejectModalTitle}</h3>
              <p style={{ fontSize:13, color: "var(--text-secondary)", marginBottom:14 }}>{t.adminUsers.rejectModalDesc}</p>

              <textarea
                value={rejectComment}
                onChange={e => setRejectComment(e.target.value)}
                placeholder={t.adminUsers.rejectPlaceholder}
                style={{
                  width: "100%", height: 100, background: "var(--bg-card2)", border: "1px solid var(--border)",
                  borderRadius: 10, padding: "10px 12px", color: "var(--text-primary)", fontSize: 13, outline: "none",
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
                  {t.adminUsers.btnConfirm}
                </button>
                <button 
                  onClick={() => { setRejectingUserId(null); setRejectComment(""); }}
                  style={{
                    flex: 1, background: "var(--bg-card2)", border: "1px solid var(--border)",
                    color: "var(--text-secondary)", borderRadius: 8, padding: "10px", fontWeight: 600, fontSize: 13, cursor: "pointer"
                  }}
                >
                  {t.adminUsers.btnCancel}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
