import { useState, useEffect } from "react";
import { AlertTriangle, ShieldAlert, Eye, UserMinus, X, UserCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { adminAPI } from "../../services/api";
import { useLanguage } from "../../context/LanguageContext";
import { useModal } from "../../context/ModalContext";

const initialSuspiciousItems = [
  {
    id: "S001",
    userEmail: "nva@email.com",
    userName: "Nguyễn Văn A",
    type: "account",
    title: "Sudden Balance Spike",
    severity: "high",
    reason: "Wallet balance surged by 5,000,000 ₫ through a series of automated transfers within 15 seconds without going through normal top-up confirmation.",
    time: "10 minutes ago",
    status: "pending"
  },
  {
    id: "S002",
    userEmail: "ttb@email.com",
    userName: "Trần Thị B",
    type: "transaction",
    title: "Deposit/Withdrawal Spam",
    severity: "medium",
    reason: "Performed 6 consecutive top-up and immediate withdrawal transactions at the same value of 500,000 ₫ within 3 minutes — indicating potential money laundering or abnormal payment gateway probing.",
    time: "25 minutes ago",
    status: "pending"
  },
  {
    id: "S003",
    userEmail: "ptd@email.com",
    userName: "Phạm Thị D",
    type: "account",
    title: "Large Transactions Without KYC",
    severity: "high",
    reason: "Cumulative transaction volume over the past 24 hours exceeded 50,000,000 ₫ despite this account not having completed any identity verification (KYC) step.",
    time: "1 hour ago",
    status: "pending"
  },
  {
    id: "S004",
    userEmail: "lvc@email.com",
    userName: "Lê Văn C",
    type: "transaction",
    title: "Repeated Transfers to Unknown Wallets",
    severity: "low",
    reason: "Account made 10 consecutive transfers of 20,000 ₫ to new wallet accounts with no prior transaction history — suspected automated fund-scattering bot behavior.",
    time: "3 hours ago",
    status: "pending"
  }
];

export default function AdminSuspiciousPage() {
  const { t } = useLanguage();
  const [items, setItems] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [loading, setLoading] = useState(true);

  const { showAlert, showConfirm } = useModal();

  const getSeverityText = (sev) => {
    if (sev === "critical" || sev === "high") return t.adminSuspicious.critical;
    if (sev === "medium") return t.adminSuspicious.medium;
    return t.adminSuspicious.low;
  };

  const getTitleText = (title) => {
    if (title === "Critical Alert") return t.adminSuspicious.titleCritical;
    if (title === "Security Alert") return t.adminSuspicious.titleSecurity;
    return title;
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const userRes = await adminAPI.getUsers();
      let userList = [];
      if (userRes.success && userRes.users) {
        userList = userRes.users;
        setUsers(userList);
      }

      const logRes = await adminAPI.getFraudLogs();
      const fraudList = logRes.fraudLogs || logRes.logs || [];
      if (logRes.success && fraudList.length >= 0) {
        const mapped = fraudList.map(log => {
          const matchedUser = userList.find(x => x.id === log.user_id);
          const type = log.transaction_id ? "transaction" : "account";
          const severity = log.severity.toLowerCase();
          
          return {
            id: String(log.id),
            userId: log.user_id,
            userEmail: log.user?.email || matchedUser?.email || "—",
            userName: log.user?.kyc?.full_name || matchedUser?.kyc?.full_name || log.user?.email || "User",
            type,
            title: severity === "critical" || severity === "high" ? "Critical Alert" : "Security Alert",
            severity,
            reason: log.reason,
            time: new Date(log.created_at || log.createdAt).toLocaleTimeString("vi-VN", {hour:"2-digit", minute:"2-digit"}) + " " + new Date(log.created_at || log.createdAt).toLocaleDateString("vi-VN"),
            status: log.status ? log.status.toLowerCase() : "pending",
          };
        });
        setItems(mapped);
        if (selectedItem) {
          const freshSel = mapped.find(x => x.id === selectedItem.id);
          if (freshSel) setSelectedItem(freshSel);
        }
      }
    } catch (error) {
      console.error("Failed to load fraud detection data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleLockUser = async (email) => {
    const matchedUser = users.find(x => x.email === email);
    if (!matchedUser) {
      showAlert(t.adminSuspicious.userNotFound, "error");
      return;
    }
    const currentStatus = matchedUser.status.toLowerCase();
    if (currentStatus === "disabled") {
      showAlert(t.adminSuspicious.disabledReactivateHint, "error");
      return;
    }

    const isLocking = currentStatus === "active";
    const label = matchedUser.email;
    showConfirm(
      isLocking
        ? t.adminSuspicious.confirmLock.replace("{email}", label)
        : t.adminSuspicious.confirmUnlock.replace("{email}", label),
      async () => {
        try {
          if (isLocking) {
            await adminAPI.lockUser(matchedUser.id);
            showAlert(t.adminSuspicious.lockSuccess, "success");
          } else {
            await adminAPI.unlockUser(matchedUser.id);
            showAlert(t.adminSuspicious.unlockSuccess, "success");
          }
          await loadData();
        } catch (error) {
          console.error("Failed to update user status:", error);
          showAlert(t.adminSuspicious.errUpdateUserStatus, "error");
        }
      },
      null,
      isLocking
    );
  };

  const handleToggleFreezeWallet = async (email) => {
    const matchedUser = users.find(x => x.email === email);
    if (!matchedUser) {
      showAlert(t.adminSuspicious.userNotFound, "error");
      return;
    }
    const walletStatus = matchedUser.wallet ? matchedUser.wallet.status.toLowerCase() : "active";
    const isFreezing = walletStatus !== "frozen";
    const label = matchedUser.email;
    showConfirm(
      isFreezing
        ? t.adminSuspicious.confirmFreeze.replace("{email}", label)
        : t.adminSuspicious.confirmUnfreeze.replace("{email}", label),
      async () => {
        const nextStatus = isFreezing ? "FROZEN" : "ACTIVE";
        try {
          await adminAPI.updateWalletStatus(matchedUser.id, nextStatus);
          await loadData();
          showAlert(nextStatus === "FROZEN" ? t.adminSuspicious.freezeSuccess : t.adminSuspicious.unfreezeSuccess, "success");
        } catch (error) {
          console.error("Failed to update wallet status:", error);
          showAlert(t.adminSuspicious.errUpdateWalletStatus, "error");
        }
      },
      null,
      isFreezing
    );
  };

  const handleResolveAlert = async (id) => {
    try {
      await adminAPI.resolveFraudLog(id);
      await loadData();
      showAlert(t.adminSuspicious.resolveSuccess, "success");
    } catch (error) {
      console.error("Failed to resolve fraud warning:", error);
      showAlert(t.adminSuspicious.errResolveAlert, "error");
    }
  };

  const getUserStatus = (email) => {
    const u = users.find(x => x.email === email);
    return u ? u.status.toLowerCase() : "active";
  };

  const getWalletStatus = (email) => {
    const u = users.find(x => x.email === email);
    return u && u.wallet ? u.wallet.status.toLowerCase() : "active";
  };

  return (
    <div style={{ maxWidth: 1000, display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4, display: "flex", alignItems: "center", gap: 8 }}>
          <ShieldAlert size={22} style={{ color: "#ef4444" }} /> {t.adminSuspicious.title}
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
          {t.adminSuspicious.subtitle}
        </p>
      </div>

      {/* Overview Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, padding: 16 }}>
          <p style={{ fontSize: 12, color: "var(--text-secondary)" }}>{t.adminSuspicious.totalAlerts}</p>
          <p style={{ fontSize: 24, fontWeight: 800, marginTop: 4, color: "#ef4444" }}>{items.length}</p>
        </div>
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, padding: 16 }}>
          <p style={{ fontSize: 12, color: "var(--text-secondary)" }}>{t.adminSuspicious.pendingReview}</p>
          <p style={{ fontSize: 24, fontWeight: 800, marginTop: 4, color: "#f59e0b" }}>{items.filter(x => x.status === "pending").length}</p>
        </div>
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, padding: 16 }}>
          <p style={{ fontSize: 12, color: "var(--text-secondary)" }}>{t.adminSuspicious.resolved}</p>
          <p style={{ fontSize: 24, fontWeight: 800, marginTop: 4, color: "#22c55e" }}>{items.filter(x => x.status === "resolved").length}</p>
        </div>
      </div>

      {/* Main List */}
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ fontSize: 14, fontWeight: 700 }}>{t.adminSuspicious.detectedAlerts}</h3>
          <span style={{ fontSize: 11, background: "rgba(239,68,68,0.1)", color: "#ef4444", padding: "2px 8px", borderRadius: 20, fontWeight: 600 }}>{t.adminSuspicious.autoMonitoring}</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          {items.map((item, idx) => {
            const uStatus = getUserStatus(item.userEmail);
            const wStatus = getWalletStatus(item.userEmail);
            
            return (
              <div
                key={item.id}
                style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "16px 20px", borderBottom: idx < items.length - 1 ? "1px solid var(--border)" : "none",
                  background: item.status === "resolved" ? "rgba(255,255,255,0.01)" : "rgba(239,68,68,0.01)",
                  flexWrap: "wrap", gap: 16
                }}
              >
                {/* Left info */}
                <div style={{ flex: 1, minWidth: 280 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 4, textTransform: "uppercase",
                      background: item.severity === "high" || item.severity === "critical" ? "rgba(239,68,68,0.12)" : item.severity === "medium" ? "rgba(245,158,11,0.12)" : "rgba(59,130,246,0.12)",
                      color: item.severity === "high" || item.severity === "critical" ? "#ef4444" : item.severity === "medium" ? "#f59e0b" : "#3b82f6"
                    }}>
                      {getSeverityText(item.severity)}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>{getTitleText(item.title)}</span>
                    {item.status === "resolved" && (
                      <span style={{ fontSize: 10, background: "rgba(34,197,94,0.1)", color: "#22c55e", padding: "1px 6px", borderRadius: 4, fontWeight: 600 }}>{t.adminSuspicious.resolved}</span>
                    )}
                  </div>
                  
                  <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 8 }}>
                    {t.adminSuspicious.userLabel} <strong>{item.userName}</strong> ({item.userEmail}) • {item.time}
                  </p>

                  <p style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    {item.reason}
                  </p>
                </div>

                {/* Status Badges */}
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  {uStatus === "locked" && (
                    <span style={{ fontSize: 11, background: "rgba(239,68,68,0.1)", color: "#ef4444", padding: "3px 8px", borderRadius: 6, fontWeight: 600 }}>{t.adminSuspicious.userLockedBadge}</span>
                  )}
                  {wStatus === "frozen" && (
                    <span style={{ fontSize: 11, background: "rgba(59,130,246,0.1)", color: "#3b82f6", padding: "3px 8px", borderRadius: 6, fontWeight: 600 }}>{t.adminSuspicious.walletFrozenBadge}</span>
                  )}
                </div>

                {/* Right actions */}
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  <button
                    onClick={() => setSelectedItem(item)}
                    style={{
                      background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius: 8,
                      padding: "8px 12px", color: "var(--text-primary)", fontSize: 12, fontWeight: 600,
                      cursor: "pointer", display: "flex", alignItems: "center", gap: 4
                    }}
                  >
                    <Eye size={14} /> {t.adminSuspicious.viewDetails}
                  </button>
                  {item.status === "pending" && (
                    <button
                      onClick={() => handleResolveAlert(item.id)}
                      style={{
                        background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 8,
                        padding: "8px 12px", color: "#22c55e", fontSize: 12, fontWeight: 600,
                        cursor: "pointer"
                      }}
                    >
                      {t.adminSuspicious.dismissAlert}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detailed Alert Modal */}
      <AnimatePresence>
        {selectedItem && (
          <div onClick={() => setSelectedItem(null)} style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", padding: 16 }}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              style={{
                background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 20,
                padding: 28, width: "100%", maxWidth: 500, position: "relative",
                boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)"
              }}
            >
              {/* Close button */}
              <button
                onClick={() => setSelectedItem(null)}
                style={{ position: "absolute", right: 20, top: 20, background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}
              >
                <X size={20} />
              </button>

              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <AlertTriangle size={24} style={{ color: selectedItem.severity === "high" || selectedItem.severity === "critical" ? "#ef4444" : "#f59e0b" }} />
                <h3 style={{ fontSize: 18, fontWeight: 800 }}>{t.adminSuspicious.alertDetails}</h3>
              </div>

              {/* Alert Meta details */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10, background: "var(--bg-card2)", padding: 16, borderRadius: 12, border: "1px solid var(--border)", marginBottom: 20 }}>
                {[
                  { label: t.adminSuspicious.alertId, value: selectedItem.id },
                  { label: t.adminSuspicious.accountName, value: selectedItem.userName },
                  { label: t.adminSuspicious.linkedEmail, value: selectedItem.userEmail },
                  { label: t.adminSuspicious.behaviorType, value: getTitleText(selectedItem.title) },
                  { label: t.adminSuspicious.timeDetected, value: selectedItem.time },
                  { label: t.adminSuspicious.severityLevel, value: selectedItem.severity === "high" || selectedItem.severity === "critical" ? t.adminSuspicious.critical : selectedItem.severity === "medium" ? t.adminSuspicious.medium : t.adminSuspicious.low },
                ].map(item => (
                  <div key={item.label} style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                    <span style={{ color: "var(--text-secondary)" }}>{item.label}:</span>
                    <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>{item.value}</span>
                  </div>
                ))}
              </div>

              {/* Suspicious Reasons detailed description */}
              <h4 style={{ fontSize: 13, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 8, textTransform: "uppercase" }}>{t.adminSuspicious.systemReason}</h4>
              <div style={{
                background: "rgba(239,68,68,0.03)", border: "1px solid rgba(239,68,68,0.15)",
                borderRadius: 10, padding: 14, marginBottom: 24, fontSize: 13, lineHeight: 1.6, color: "var(--text-primary)"
              }}>
                {selectedItem.reason}
              </div>

              {/* Quick Actions Footer */}
              <h4 style={{ fontSize: 13, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 12, textTransform: "uppercase" }}>{t.adminSuspicious.immediateActions}</h4>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {/* Lock account button */}
                <button
                  onClick={() => handleToggleLockUser(selectedItem.userEmail)}
                  style={{
                    flex: 1, minWidth: 130,
                    background: getUserStatus(selectedItem.userEmail) === "locked" ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
                    border: getUserStatus(selectedItem.userEmail) === "locked" ? "1px solid rgba(34,197,94,0.2)" : "1px solid rgba(239,68,68,0.2)",
                    color: getUserStatus(selectedItem.userEmail) === "locked" ? "#22c55e" : "#ef4444",
                    borderRadius: 10, padding: "12px", fontWeight: 700, fontSize: 13, cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6
                  }}
                >
                  {getUserStatus(selectedItem.userEmail) === "locked" ? (
                    <><UserCheck size={14} /> {t.adminSuspicious.unlockUser}</>
                  ) : (
                    <><UserMinus size={14} /> {t.adminSuspicious.lockAccount}</>
                  )}
                </button>

                {/* Freeze wallet button */}
                <button
                  onClick={() => handleToggleFreezeWallet(selectedItem.userEmail)}
                  style={{
                    flex: 1, minWidth: 130,
                    background: getWalletStatus(selectedItem.userEmail) === "frozen" ? "rgba(34,197,94,0.1)" : "rgba(59,130,246,0.1)",
                    border: getWalletStatus(selectedItem.userEmail) === "frozen" ? "1px solid rgba(34,197,94,0.2)" : "1px solid rgba(59,130,246,0.2)",
                    color: getWalletStatus(selectedItem.userEmail) === "frozen" ? "#22c55e" : "#3b82f6",
                    borderRadius: 10, padding: "12px", fontWeight: 700, fontSize: 13, cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6
                  }}
                >
                  {getWalletStatus(selectedItem.userEmail) === "frozen" ? (
                    <> {t.adminSuspicious.unfreezeWallet}</>
                  ) : (
                    <>❄️ {t.adminSuspicious.freezeWallet}</>
                  )}
                </button>
              </div>

              {selectedItem.status === "pending" && (
                <button
                  onClick={() => handleResolveAlert(selectedItem.id)}
                  style={{
                    width: "100%", background: "var(--bg-card2)", border: "1px solid var(--border)",
                    color: "var(--text-primary)", borderRadius: 10, padding: "12px", fontWeight: 700,
                    fontSize: 13, cursor: "pointer", marginTop: 12
                  }}
                >
                  ✓ {t.adminSuspicious.dismissAlert}
                </button>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
