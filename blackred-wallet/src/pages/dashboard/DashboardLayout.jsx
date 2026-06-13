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
  { href: "/dashboard/investment", icon: TrendingUp, label: "Đầu tư & Tích lũy" },
  { href: "/dashboard/offers", icon: Gift, label: "Ưu đãi" },
  { href: "/dashboard/support", icon: MessageSquare, label: "Hỗ trợ trực tuyến" },
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
  const [userTxs, setUserTxs] = useState([]);
  const [newsPosts, setNewsPosts] = useState([]);
  const [dbNotifications, setDbNotifications] = useState([]);

  useEffect(() => {
    if (!user?.email) return;
    
    const loadData = () => {
      // Load Transactions
      const savedTxs = localStorage.getItem(`bw_transactions_${user.email}`);
      if (savedTxs) {
        setUserTxs(JSON.parse(savedTxs));
      } else {
        setUserTxs([]);
      }

      // Load News
      const savedNews = localStorage.getItem("bw_posts");
      if (savedNews) {
        setNewsPosts(JSON.parse(savedNews).filter(p => p.active));
      } else {
        setNewsPosts([
          { 
            id: 1, 
            title: "Ngân hàng Nhà nước điều chỉnh lãi suất tiết kiệm", 
            time: "2 giờ trước", 
            tag: "Kinh tế", 
            content: "Ngân hàng Nhà nước vừa công bố điều chỉnh khung lãi suất tiền gửi tiết kiệm áp dụng cho các tổ chức tín dụng. Động thái này nhằm định hướng dòng vốn hiệu quả vào sản xuất kinh doanh, đồng thời kiểm soát lạm phát ổn định trong nước."
          },
          { 
            id: 2, 
            title: "Thanh toán không tiền mặt tăng 40% trong năm 2025", 
            time: "5 giờ trước", 
            tag: "Fintech", 
            content: "Báo cáo mới nhất của cơ quan quản lý tài chính cho thấy làn sóng chuyển đổi số đang bùng nổ mạnh mẽ tại Việt Nam. Khối lượng giao dịch không dùng tiền mặt qua ví điện tử và chuyển khoản ngân hàng ghi nhận mức tăng trưởng kỷ lục."
          },
          { 
            id: 3, 
            title: "AI tài chính: xu hướng quản lý chi tiêu thông minh", 
            time: "1 ngày trước", 
            tag: "Công nghệ", 
            content: "Các chuyên gia Fintech đánh giá trợ lý trí tuệ nhân tạo (AI) đang định hình lại thói quen tích lũy tài sản và theo dõi ngân sách cá nhân của thế hệ trẻ. Công nghệ phân tích dự báo giúp tối ưu hóa chi phí hàng tháng tối đa."
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

  useEffect(() => {
    const token = localStorage.getItem("bw_token");
    if (!token) return;

    const fetchDbNotifications = () => {
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

    fetchDbNotifications();
    const interval = setInterval(fetchDbNotifications, 6000);
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
        title: "Xác thực KYC thành công ✅",
        desc: "Tài khoản của bạn đã được kích hoạt đầy đủ các tính năng nạp/rút/chuyển tiền.",
        time: "Hệ thống",
        type: "kyc"
      });
    } else if (isKycPending) {
      list.push({
        id: "kyc_pending",
        title: "Đang chờ duyệt KYC ⏳",
        desc: "Hồ sơ xác minh danh tính của bạn đang được ban quản trị xét duyệt.",
        time: "Hệ thống",
        type: "kyc"
      });
    } else if (isKycRejected) {
      const rejectNotif = dbNotifications.find(n => n.title && n.title.includes("từ chối"));
      const customDesc = rejectNotif ? rejectNotif.content : "Thông tin xác thực không trùng khớp hoặc mờ. Vui lòng gửi lại hồ sơ chính xác.";
      list.push({
        id: "kyc_rejected",
        title: "Hồ sơ KYC bị từ chối ❌",
        desc: customDesc,
        time: "Hệ thống",
        type: "kyc"
      });
    } else {
      list.push({
        id: "kyc_needed",
        title: "Yêu cầu xác thực danh tính (KYC) ⚠️",
        desc: "Nhấp để gửi hồ sơ căn cước công dân nhằm tăng hạn mức và bảo mật ví.",
        time: "Hệ thống",
        type: "kyc"
      });
    }

    // 2. Add Transaction Notifications
    userTxs.forEach(tx => {
      let title = "";
      let desc = "";
      const fmtAmt = tx.amount.toLocaleString("vi-VN") + " ₫";

      if (tx.type === "deposit") {
        if (tx.status === "success") {
          title = "Nạp tiền thành công 💳";
          desc = `Đã cộng ${fmtAmt} vào ví qua ngân hàng liên kết.`;
        } else if (tx.status === "pending") {
          title = "Yêu cầu nạp tiền đang xử lý ⏳";
          desc = `Hệ thống đang xác minh giao dịch nạp ${fmtAmt}.`;
        } else {
          title = "Nạp tiền thất bại ❌";
          desc = `Giao dịch nạp ${fmtAmt} đã bị hủy bỏ hoặc từ chối.`;
        }
      } else if (tx.type === "withdraw") {
        if (tx.status === "success") {
          title = "Rút tiền thành công 🏦";
          desc = `Đã rút ${fmtAmt} về tài khoản ngân hàng của bạn.`;
        } else if (tx.status === "pending") {
          title = "Yêu cầu rút tiền đang chờ duyệt ⏳";
          desc = `Yêu cầu rút ${fmtAmt} đang đợi Admin phê duyệt.`;
        } else {
          title = "Rút tiền thất bại ❌";
          desc = `Yêu cầu rút ${fmtAmt} bị từ chối bởi hệ thống.`;
        }
      } else if (tx.type === "send") {
        if (tx.status === "success") {
          title = "Chuyển tiền thành công 💸";
          desc = `Đã gửi ${fmtAmt} tới người nhận.`;
        } else if (tx.status === "pending") {
          title = "Yêu cầu chuyển tiền đang chờ duyệt ⏳";
          desc = `Yêu cầu chuyển ${fmtAmt} đang được xử lý.`;
        } else {
          title = "Chuyển tiền thất bại ❌";
          desc = `Giao dịch chuyển ${fmtAmt} không thành công.`;
        }
      } else if (tx.type === "receive") {
        title = "Nhận tiền thành công 📥";
        desc = `Bạn nhận được ${fmtAmt} từ đối tác.`;
      }

      list.push({
        id: `tx_${tx.id}_${tx.status}`,
        title,
        desc,
        time: tx.time,
        type: "transaction"
      });
    });

    // 3. Add News Notifications
    newsPosts.forEach(post => {
      const contentText = post.content || "";
      list.push({
        id: `news_${post.id}`,
        title: `📰 [${post.tag || "Tin tức"}] ${post.title || ""}`,
        desc: contentText.length > 70 ? contentText.slice(0, 70) + "..." : contentText,
        time: post.time || "Vừa xong",
        type: "news"
      });
    });

    // 4. Add Database Notifications
    dbNotifications.forEach(dbNotif => {
      list.push({
        id: `db_${dbNotif.id}`,
        title: dbNotif.title,
        desc: dbNotif.content,
        time: new Date(dbNotif.created_at || dbNotif.createdAt).toLocaleTimeString("vi-VN", {hour: "2-digit", minute:"2-digit"}) + " " + new Date(dbNotif.created_at || dbNotif.createdAt).toLocaleDateString("vi-VN"),
        type: "system"
      });
    });

    return list.map(item => ({
      ...item,
      read: readNotifIds.includes(item.id)
    }));
  })();

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkAsRead = (id) => {
    if (!readNotifIds.includes(id)) {
      const updated = [...readNotifIds, id];
      setReadNotifIds(updated);
      localStorage.setItem("bw_read_notif_ids", JSON.stringify(updated));
    }
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

    // Fetch up-to-date user details from real backend Node.js server
    authAPI.getProfile()
      .then(data => {
        if (data.success) {
          const sessionUser = {
            email: data.user.email,
            name: data.user.email.split("@")[0],
            kyc: data.user.kyc_status === "VERIFIED",
            kycStatus: data.user.kyc_status.toLowerCase(),
            phone: data.user.phone || undefined,
            status: data.user.status,
            id: data.user.id,
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

  const handleLogout = () => {
    localStorage.removeItem("bw_token");
    localStorage.removeItem("bw_user");
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
               pathname.includes("investment") ? "Đầu tư & Tích lũy" :
               pathname.includes("offers") ? "Ưu đãi" :
               pathname.includes("support") ? "Hỗ trợ trực tuyến" : "SmartWallet Wallet"}
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
                <span className="hidden sm:inline">Đã xác thực KYC</span>
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
                <span className="hidden sm:inline">Đang chờ duyệt KYC</span>
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
                <span className="hidden sm:inline">Xác thực danh tính</span>
                <span className="sm:hidden">KYC</span>
              </button>
            )
          )}

          {/* Notifications */}
          <div style={{ position: "relative" }}>
            <button
              onClick={() => { setShowNotif(!showNotif); setShowUserMenu(false); }}
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
                    <h3 style={{ fontSize: 14, fontWeight: 700 }}>Thông báo</h3>
                    {unreadCount > 0 && <span style={{ fontSize: 11, background: "rgba(37,99,235,0.15)", color: "#2563eb", padding: "2px 8px", borderRadius: 10, fontWeight: 600 }}>{unreadCount} mới</span>}
                  </div>

                  {/* Filter Pills */}
                  <div style={{ display: "flex", gap: 6, padding: "4px 20px 12px", borderBottom: "1px solid var(--border)" }}>
                    {[
                      { id: "all", label: "Tất cả" },
                      { id: "unread", label: "Chưa xem" },
                      { id: "read", label: "Đã xem" },
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
                        <p style={{ fontSize: 12 }}>Không có thông báo nào</p>
                      </div>
                    ) : (
                      filteredNotifs.map((n) => (
                        <div key={n.id} 
                          onClick={() => handleMarkAsRead(n.id)}
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
                      ? { icon: CheckCircle, label: "Đã KYC ✓", href: "/dashboard/kyc", status: "verified" }
                      : isKycPending
                        ? { icon: Clock, label: "Đang chờ duyệt KYC", href: "/dashboard/kyc", status: "pending" }
                        : { icon: Shield, label: "Xác thực KYC", href: "/dashboard/kyc", status: "none" },
                    { icon: User, label: "Thông tin cá nhân", href: "/dashboard/profile", status: "none" },
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
                      <LogOut size={15} /> Đăng xuất
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
