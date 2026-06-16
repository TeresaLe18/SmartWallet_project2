import { useState, useEffect } from "react";
import { useNavigate, useLocation, Link, Outlet } from "react-router-dom";
import {
  Wallet, LayoutDashboard, CreditCard, Gift,
  Bell, ChevronDown, User, Shield, LogOut, Menu,
  AlertTriangle, CheckCircle, Check, Clock, MessageSquare, TrendingUp
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { authAPI } from "../../services/api";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/dashboard/wallets", icon: CreditCard, label: "My Wallets" },
  { href: "/dashboard/investment", icon: TrendingUp, label: "Investments & Savings" },
  { href: "/dashboard/offers", icon: Gift, label: "Offers" },
  { href: "/dashboard/support", icon: MessageSquare, label: "Live Support" },
];

export default function DashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const pathname = location.pathname;
  const [user, setUser] = useState(null);
  const [showNotif, setShowNotif] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Notification states & hooks
  const [readNotifIds, setReadNotifIds] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("bw_read_notif_ids");
      if (saved) return JSON.parse(saved);
    }
    return [];
  });
  const [notifFilter, setNotifFilter] = useState("all");
  const [newsPosts, setNewsPosts] = useState([]);
  const [dbNotifications, setDbNotifications] = useState([]);

  useEffect(() => {
    if (!user?.email) return;
    
    const loadData = () => {
      // Load News
      const savedNews = localStorage.getItem("bw_posts");
      if (savedNews) {
        setNewsPosts(JSON.parse(savedNews).filter(p => p.active));
      } else {
        setNewsPosts([
          { 
            id: 1, 
            title: "Central Bank Adjusts Savings Deposit Interest Rates", 
            time: "2 hours ago", 
            tag: "Economy", 
            content: "The State Bank has announced an adjustment to the savings deposit interest rate framework applicable to credit institutions. This move aims to channel capital more effectively into production and business, while keeping domestic inflation under control."
          },
          { 
            id: 2, 
            title: "Cashless Payments Up 40% in 2025", 
            time: "5 hours ago", 
            tag: "Fintech", 
            content: "The latest report from the financial regulator shows that the wave of digital transformation is booming across the country. Transaction volumes through e-wallets and bank transfers have reached record growth levels."
          },
          { 
            id: 3, 
            title: "Financial AI: The Smart Spending Management Trend", 
            time: "1 day ago", 
            tag: "Technology", 
            content: "Fintech experts note that artificial intelligence (AI) assistants are reshaping how younger generations build savings habits and track personal budgets. Predictive analytics technology helps maximize monthly cost optimization."
          }
        ]);
      }
    };

    loadData();
    
    window.addEventListener("storage", loadData);
    window.addEventListener("kyc_updated", loadData);
    return () => {
      window.removeEventListener("storage", loadData);
      window.removeEventListener("kyc_updated", loadData);
    };
  }, [user, pathname]);

  const fetchDbNotifications = () => {
    const token = localStorage.getItem("bw_token");
    if (!token) return;
    authAPI.getNotifications()
      .then(res => {
        if (res.success && res.notifications) {
          setDbNotifications(res.notifications);
        }
      })
      .catch(err => {
        console.error("Failed to fetch database notifications:", err);
      });
  };

  useEffect(() => {
    const token = localStorage.getItem("bw_token");
    if (!token) return;
    fetchDbNotifications();
    const interval = setInterval(fetchDbNotifications, 15000);
    return () => clearInterval(interval);
  }, [user]);

  const notifications = (() => {
    const list = [];

    // 1. Add KYC Notification
    const isKycVerified = user?.kyc === true || user?.kyc === "verified" || user?.kycStatus === "verified";
    const isKycPending = !isKycVerified && (user?.kycStatus === "pending" || user?.kyc === "pending");
    const isKycRejected = !isKycVerified && !isKycPending && (user?.kycStatus === "rejected" || user?.kyc === "rejected");

    if (isKycVerified) {
      list.push({
        id: "kyc_verified",
        title: "KYC Verification Successful ✅",
        desc: "Your account has been fully activated with top-up, withdrawal, and transfer features.",
        time: "System",
        type: "kyc"
      });
    } else if (isKycPending) {
      list.push({
        id: "kyc_pending",
        title: "KYC Pending Review ⏳",
        desc: "Your identity verification documents are currently being reviewed by the admin team.",
        time: "System",
        type: "kyc"
      });
    } else if (isKycRejected) {
      const rejectNotif = dbNotifications.find(n => n.title && n.title.includes("từ chối"));
      const customDesc = rejectNotif ? rejectNotif.content : "Verification information did not match or was unclear. Please resubmit accurate documents.";
      list.push({
        id: "kyc_rejected",
        title: "KYC Application Rejected ❌",
        desc: customDesc,
        time: "System",
        type: "kyc"
      });
    } else {
      list.push({
        id: "kyc_needed",
        title: "Identity Verification Required (KYC) ⚠️",
        desc: "Click to submit your ID document to increase transaction limits and secure your wallet.",
        time: "System",
        type: "kyc"
      });
    }

    // 2. Add Database Notifications (transaction & system — skip KYC ones already shown above)
    const KYC_TITLE_KEYWORDS = ["KYC", "kyc", "xác minh", "từ chối"];
    dbNotifications
      .filter(dbNotif => !KYC_TITLE_KEYWORDS.some(kw => (dbNotif.title || "").includes(kw)))
      .forEach(dbNotif => {
        list.push({
          id: `db_${dbNotif.id}`,
          dbId: dbNotif.id,            // id thật trong DB → dùng để mark-read trên server
          is_read: !!dbNotif.is_read,  // trạng thái đã đọc lấy từ DB
          title: dbNotif.title,
          desc: dbNotif.content,
          time: new Date(dbNotif.created_at || dbNotif.createdAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) + " " + new Date(dbNotif.created_at || dbNotif.createdAt).toLocaleDateString("vi-VN"),
          type: "transaction"
        });
      });

    // 3. Add News Notifications
    newsPosts.forEach(post => {
      const contentText = post.content || "";
      list.push({
        id: `news_${post.id}`,
        title: `📰 [${post.tag || "News"}] ${post.title || ""}`,
        desc: contentText.length > 70 ? contentText.slice(0, 70) + "..." : contentText,
        time: post.time || "Just now",
        type: "news"
      });
    });

    return list.map(item => ({
      ...item,
      // notif giao dịch (có row DB) lấy đã-đọc từ server; KYC/News synthetic dùng localStorage
      read: item.dbId != null ? !!item.is_read : readNotifIds.includes(item.id)
    }));
  })();

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkAsRead = (item) => {
    if (item?.dbId != null) {
      // Notif giao dịch: lưu đã-đọc lên DB (đồng bộ đa thiết bị) + cập nhật lạc quan
      setDbNotifications(prev => prev.map(n => n.id === item.dbId ? { ...n, is_read: true } : n));
      authAPI.markNotificationRead(item.dbId).catch(() => {});
      return;
    }
    // KYC/News synthetic: không có row DB → giữ localStorage
    if (item?.id && !readNotifIds.includes(item.id)) {
      const updated = [...readNotifIds, item.id];
      setReadNotifIds(updated);
      localStorage.setItem("bw_read_notif_ids", JSON.stringify(updated));
    }
  };

  const handleMarkAllRead = () => {
    // Notif giao dịch trên DB
    setDbNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    authAPI.markAllNotificationsRead().catch(() => {});
    // KYC/News synthetic → localStorage
    const syntheticIds = notifications.filter(n => n.dbId == null).map(n => n.id);
    const updated = Array.from(new Set([...readNotifIds, ...syntheticIds]));
    setReadNotifIds(updated);
    localStorage.setItem("bw_read_notif_ids", JSON.stringify(updated));
  };

  const filteredNotifs = notifications.filter(n => {
    if (notifFilter === "unread") return !n.read;
    if (notifFilter === "read") return n.read;
    return true;
  });

  useEffect(() => {
    const token = localStorage.getItem("bw_token");
    const userData = localStorage.getItem("bw_user");
    // Nếu không có token user nhưng có token admin, chuyển thẳng về admin panel
    if (!token && localStorage.getItem("bw_admin_token")) {
      navigate("/admin", { replace: true });
      return;
    }
    if (!token) { navigate("/login", { replace: true }); return; }
    if (userData) setUser(JSON.parse(userData));

    // Fetch up-to-date user details from backend
    authAPI.getProfile()
      .then(data => {
        if (data.success && data.user) {
          const kycStatus = data.user.kyc_status || "none";
          const sessionUser = {
            email: data.user.email,
            name: data.user.full_name || data.user.email.split("@")[0],
            kyc: kycStatus === "VERIFIED",
            kycStatus: kycStatus.toLowerCase(),
            phone: data.user.phone || undefined,
            status: data.user.status,
            id: data.user.id,
            has_pin: !!data.user.has_pin,
          };
          localStorage.setItem("bw_user", JSON.stringify(sessionUser));
          setUser(sessionUser);
        }
      })
      .catch(err => {
        console.error("Failed to fetch backend profile state:", err);
      });

    const handleStorageChange = () => {
      const u = localStorage.getItem("bw_user");
      if (u) setUser(JSON.parse(u));
    };
    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("kyc_updated", handleStorageChange);
    window.addEventListener("balance_updated", handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("kyc_updated", handleStorageChange);
      window.removeEventListener("balance_updated", handleStorageChange);
    };
  }, [navigate, pathname]);

  // Helper: chuẩn hoá trạng thái KYC
  const isKycVerified = user?.kyc === true || user?.kyc === "verified" || user?.kycStatus === "verified";
  const isKycPending = !isKycVerified && (user?.kycStatus === "pending" || user?.kyc === "pending");

  const handleLogout = async () => {
    await authAPI.logout();
    navigate("/login");
  };

  const Sidebar = ({ mobile = false }) => (
    <aside style={{
      width: mobile ? "100%" : 240,
      background: "var(--bg-dark)",
      borderRight: mobile ? "none" : "1px solid var(--border)",
      display: "flex", flexDirection: "column",
      height: "100%", padding: "24px 16px",
      position: "relative"
    }}>
      {/* Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 36, paddingLeft: 8 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg, #2563eb, #1d4ed8)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Wallet size={18} color="white" />
        </div>
        <span style={{ fontSize: 18, fontWeight: 800 }}>SmartWallet</span>
      </div>

      {/* Nav items */}
      <nav style={{ flex: 1 }}>
        <p style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 8, paddingLeft: 12 }}>Menu</p>
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
          return (
            <Link key={href} to={href} onClick={() => setSidebarOpen(false)} style={{ textDecoration: "none" }}>
              <div style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "11px 12px", borderRadius: 10, marginBottom: 4,
                background: active ? "rgba(37,99,235,0.12)" : "transparent",
                border: active ? "1px solid rgba(37,99,235,0.2)" : "1px solid transparent",
                color: active ? "#2563eb" : "#71717a",
                transition: "all 0.2s", cursor: "pointer", fontWeight: active ? 600 : 400
              }}
              onMouseEnter={(e) => { if (!active) { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.color = "#a1a1aa"; } }}
              onMouseLeave={(e) => { if (!active) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#71717a"; } }}
              >
                <Icon size={18} />
                <span style={{ fontSize: 14 }}>{label}</span>
                {active && <div style={{ marginLeft: "auto", width: 6, height: 6, borderRadius: "50%", background: "#2563eb" }} />}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* User info at bottom */}
      {user && (
        <div style={{ padding: "12px", background: "var(--bg-card2)", borderRadius: 12, marginTop: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, #2563eb, #1d4ed8)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden" }}>
              {user.avatar ? (
                <img src={user.avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <User size={16} color="white" />
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.name}</p>
              <p style={{ fontSize: 11, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.email}</p>
            </div>
          </div>
        </div>
      )}
    </aside>
  );

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "var(--bg-dark)" }}>
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex" style={{ flexShrink: 0 }}>
        <Sidebar />
      </div>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 40 }}
            />
            <motion.div
              initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
              transition={{ type: "spring", damping: 25, stiffness: 250 }}
              style={{ position: "fixed", left: 0, top: 0, bottom: 0, width: 260, zIndex: 50 }}
            >
              <Sidebar mobile />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Navbar */}
        <header style={{
          height: 64, background: "rgba(255,255,255,0.95)", backdropFilter: "blur(20px)",
          borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center",
          padding: "0 24px", gap: 16, flexShrink: 0, position: "sticky", top: 0, zIndex: 30
        }}>
          {/* Mobile menu button */}
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", padding: 4 }}>
            <Menu size={22} />
          </button>

          {/* Page title - dynamic */}
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>
              {pathname === "/dashboard" ? "Dashboard" :
               pathname.includes("wallets") ? "My Wallets" :
               pathname.includes("investment") ? "Investments & Savings" :
               pathname.includes("offers") ? "Offers" :
               pathname.includes("support") ? "Live Support" : "SmartWallet"}
            </h2>
          </div>

          {/* KYC Status Badge */}
          {user && (
            isKycVerified ? (
              // ✅ Đã KYC - hiện badge xanh
              <div style={{
                display: "flex", alignItems: "center", gap: 6,
                background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)",
                borderRadius: 8, padding: "6px 12px", color: "#22c55e",
                fontSize: 12, fontWeight: 600
              }}>
                <CheckCircle size={14} />
                <span className="hidden sm:inline">KYC Verified</span>
              </div>
            ) : isKycPending ? (
              // ⏳ Đang chờ duyệt
              <button
                onClick={() => navigate("/dashboard/kyc")}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)",
                  borderRadius: 8, padding: "6px 12px", color: "#f59e0b",
                  cursor: "pointer", fontSize: 12, fontWeight: 600
                }}
              >
                <Clock size={14} style={{ animation: "pulse 2s infinite" }} />
                <span className="hidden sm:inline">KYC Pending</span>
                <span className="sm:hidden">Pending</span>
              </button>
            ) : (
              // ⚠️ Chưa KYC - hiện cảnh báo
              <button
                onClick={() => navigate("/dashboard/kyc")}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)",
                  borderRadius: 8, padding: "6px 12px", color: "#f59e0b",
                  cursor: "pointer", fontSize: 12, fontWeight: 600
                }}
              >
                <AlertTriangle size={14} />
                <span className="hidden sm:inline">Verify Identity</span>
                <span className="sm:hidden">KYC</span>
              </button>
            )
          )}

          {/* Notifications */}
          <div style={{ position: "relative" }}>
            <button
              onClick={() => { const opening = !showNotif; setShowNotif(opening); setShowUserMenu(false); if (opening) fetchDbNotifications(); }}
              style={{
                width: 40, height: 40, borderRadius: 10, background: "var(--bg-card2)",
                border: "1px solid var(--border)", display: "flex", alignItems: "center",
                justifyContent: "center", cursor: "pointer", position: "relative"
              }}
            >
              <Bell size={18} style={{ color: "var(--text-secondary)" }} />
              {unreadCount > 0 && (
                <div style={{
                  position: "absolute", top: 6, right: 6, width: 8, height: 8,
                  background: "#2563eb", borderRadius: "50%",
                  animation: "pulse-red 2s infinite"
                }} />
              )}
            </button>

            <AnimatePresence>
              {showNotif && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  style={{
                    position: "absolute", right: 0, top: "calc(100% + 8px)",
                    width: 320, background: "var(--bg-card)", border: "1px solid var(--border)",
                    borderRadius: 14, boxShadow: "0 20px 60px rgba(0,0,0,0.5)", zIndex: 100, overflow: "hidden"
                  }}
                >
                  <div style={{ padding: "16px 20px 10px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <h3 style={{ fontSize: 14, fontWeight: 700 }}>Notifications</h3>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {unreadCount > 0 && <span style={{ fontSize: 11, background: "rgba(37,99,235,0.15)", color: "#2563eb", padding: "2px 8px", borderRadius: 10, fontWeight: 600 }}>{unreadCount} new</span>}
                      {unreadCount > 0 && (
                        <button onClick={(e) => { e.stopPropagation(); handleMarkAllRead(); }}
                          style={{ fontSize: 11, background: "none", border: "none", color: "#2563eb", fontWeight: 600, cursor: "pointer", padding: 0 }}>
                          Mark all read
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Filter Pills */}
                  <div style={{ display: "flex", gap: 6, padding: "4px 20px 12px", borderBottom: "1px solid var(--border)" }}>
                    {[
                      { id: "all", label: "All" },
                      { id: "unread", label: "Unread" },
                      { id: "read", label: "Read" },
                    ].map(f => (
                      <button 
                        key={f.id} 
                        onClick={(e) => { e.stopPropagation(); setNotifFilter(f.id); }}
                        style={{
                          padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 500,
                          background: notifFilter === f.id ? "rgba(37,99,235,0.15)" : "#161616",
                          border: `1px solid ${notifFilter === f.id ? "rgba(37,99,235,0.4)" : "#222"}`,
                          color: notifFilter === f.id ? "#2563eb" : "#71717a",
                          cursor: "pointer", transition: "all 0.2s"
                        }}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>

                  {/* Notification List */}
                  <div style={{ maxHeight: 280, overflowY: "auto" }}>
                    {filteredNotifs.length === 0 ? (
                      <div style={{ padding: "30px 20px", textAlign: "center", color: "var(--text-secondary)" }}>
                        <p style={{ fontSize: 12 }}>No notifications</p>
                      </div>
                    ) : (
                      filteredNotifs.map((n) => (
                        <div key={n.id}
                          onClick={() => handleMarkAsRead(n)}
                          style={{
                            padding: "14px 20px", borderBottom: "1px solid var(--border)",
                            background: !n.read ? "rgba(37,99,235,0.04)" : "transparent",
                            cursor: "pointer", transition: "background 0.2s"
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
                          onMouseLeave={(e) => { 
                            const latest = notifications.find(x => x.id === n.id);
                            e.currentTarget.style.background = (latest && !latest.read) ? "rgba(37,99,235,0.04)" : "transparent"; 
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                            {!n.read && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#2563eb", marginTop: 6, flexShrink: 0 }} />}
                            <div style={{ flex: 1 }}>
                              <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{n.title}</p>
                              <p style={{ fontSize: 12, color: "var(--text-secondary)" }}>{n.desc}</p>
                              <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>{n.time}</p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* User Menu */}
          <div style={{ position: "relative" }}>
            <button
              onClick={() => { setShowUserMenu(!showUserMenu); setShowNotif(false); }}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                background: "var(--bg-card2)", border: "1px solid var(--border)",
                borderRadius: 10, padding: "6px 12px 6px 6px",
                cursor: "pointer"
              }}
            >
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg, #2563eb, #1d4ed8)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                {user?.avatar ? (
                  <img src={user.avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <User size={14} color="white" />
                )}
              </div>
              <span style={{ fontSize: 13, fontWeight: 500, color: "#000000" }} className="hidden sm:inline">
                {user?.name || "User"}
              </span>
              <ChevronDown size={14} style={{ color: "var(--text-muted)" }} />
            </button>

            <AnimatePresence>
              {showUserMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  style={{
                    position: "absolute", right: 0, top: "calc(100% + 8px)",
                    width: 200, background: "var(--bg-card)", border: "1px solid var(--border)",
                    borderRadius: 12, boxShadow: "0 10px 30px rgba(0,0,0,0.08)", zIndex: 100, overflow: "hidden"
                  }}
                >
                  <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>
                    <p style={{ fontSize: 13, fontWeight: 600 }}>{user?.name}</p>
                    <p style={{ fontSize: 11, color: "var(--text-muted)" }}>{user?.email}</p>
                  </div>
                  {[
                    isKycVerified
                      ? { icon: CheckCircle, label: "KYC Verified ✓", href: "/dashboard/kyc", status: "verified" }
                      : isKycPending
                        ? { icon: Clock, label: "KYC Pending", href: "/dashboard/kyc", status: "pending" }
                        : { icon: Shield, label: "Verify KYC", href: "/dashboard/kyc", status: "none" },
                    { icon: User, label: "Personal Information", href: "/dashboard/profile", status: "none" },
                  ].map(({ icon: Icon, label, href, status }) => (
                    <Link key={href} to={href} style={{ textDecoration: "none" }} onClick={() => setShowUserMenu(false)}>
                      <div style={{
                        display: "flex", alignItems: "center", gap: 10, padding: "11px 16px",
                        color: status === "verified" ? "#22c55e" : status === "pending" ? "#f59e0b" : "var(--text-primary)", fontSize: 13, cursor: "pointer", transition: "all 0.2s"
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "var(--bg-card2)";
                        if (status === "none") e.currentTarget.style.color = "var(--primary)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                        if (status === "none") e.currentTarget.style.color = "var(--text-primary)";
                      }}
                      >
                        <Icon size={15} style={{ color: status === "verified" ? "#22c55e" : status === "pending" ? "#f59e0b" : undefined }} />
                        <span style={{ fontWeight: status !== "none" ? 600 : 400, flex: 1 }}>{label}</span>
                        {status === "verified" && (
                          <div style={{ display: "inline-flex", background: "#22c55e", borderRadius: "50%", width: 16, height: 16, alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <Check size={9} color="white" style={{ strokeWidth: 3 }} />
                          </div>
                        )}
                        {status === "pending" && (
                          <div style={{ display: "inline-flex", background: "rgba(245,158,11,0.12)", borderRadius: "50%", width: 14, height: 14, alignItems: "center", justifyContent: "center" }}>
                            <Clock size={8} color="#f59e0b" />
                          </div>
                        )}
                      </div>
                    </Link>
                  ))}
                  <div style={{ borderTop: "1px solid var(--border)" }}>
                    <button onClick={handleLogout} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 16px", color: "#ef4444", fontSize: 13, cursor: "pointer", background: "none", border: "none", width: "100%", transition: "all 0.2s" }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.08)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                    >
                      <LogOut size={15} /> Log Out
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </header>

        {/* Main Content */}
        <main style={{ flex: 1, overflow: "auto", padding: "24px" }}>
          <Outlet />
        </main>
      </div>

      {/* Close dropdowns on outside click */}
      {(showNotif || showUserMenu) && (
        <div style={{ position: "fixed", inset: 0, zIndex: 25 }} onClick={() => { setShowNotif(false); setShowUserMenu(false); }} />
      )}
    </div>
  );
}
