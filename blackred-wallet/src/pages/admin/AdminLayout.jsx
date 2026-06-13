import { useState, useEffect } from "react";
import { useNavigate, useLocation, Link, Outlet } from "react-router-dom";
import { Users, Settings, Newspaper, LayoutGrid, LogOut, Wallet, Menu, Shield, ArrowRightLeft, AlertTriangle, MessageSquare, TrendingUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { adminAPI, supportAPI } from "../../services/api";

const adminNav = [
  { href:"/admin", icon:LayoutGrid, label:"Tổng quan" },
  { href:"/admin/users", icon:Users, label:"Quản lý User", badgeKey: "users" },
  { href:"/admin/transactions", icon:ArrowRightLeft, label:"Giao dịch", badgeKey: "transactions" },
  { href:"/admin/investment", icon:TrendingUp, label:"Quản lý Đầu tư" },
  { href:"/admin/suspicious", icon:AlertTriangle, label:"Bất thường", badgeKey: "suspicious" },
  { href:"/admin/services", icon:Settings, label:"Dịch vụ" },
  { href:"/admin/media", icon:Newspaper, label:"Bài viết" },
  { href:"/admin/support", icon:MessageSquare, label:"Hỗ trợ khách hàng", badgeKey: "support" },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const pathname = location.pathname;
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [adminUser, setAdminUser] = useState(null);

  // States for pending item counts on the sidebar
  const [kycPendingCount, setKycPendingCount] = useState(0);
  const [txPendingCount, setTxPendingCount] = useState(0);
  const [fraudPendingCount, setFraudPendingCount] = useState(0);
  const [supportUnreadCount, setSupportUnreadCount] = useState(0);

  const fetchCounts = async () => {
    const token = localStorage.getItem("bw_admin_token");
    if (!token) return;
    try {
      const kycRes = await adminAPI.getKycSubmissions();
      if (kycRes.success && kycRes.submissions) {
        const pendingKyc = kycRes.submissions.filter(s => s.status === 'PENDING').length;
        setKycPendingCount(pendingKyc);
      }
    } catch (e) { /* silent */ }

    try {
      const txRes = await adminAPI.getTransactions();
      if (txRes.success && txRes.transactions) {
        const pendingTx = txRes.transactions.filter(t => t.status === 'PENDING' || t.status === 'pending').length;
        setTxPendingCount(pendingTx);
      }
    } catch (e) { /* silent */ }

    try {
      const fraudRes = await adminAPI.getFraudLogs();
      const fraudList = fraudRes.fraudLogs || fraudRes.logs || [];
      if (fraudRes.success) {
        setFraudPendingCount(fraudList.length);
      }
    } catch (e) { /* silent */ }

    try {
      const supportRes = await supportAPI.getAdminConversations();
      if (supportRes.success && supportRes.conversations) {
        const unreadSupport = supportRes.conversations.filter(c => c.unreadCount > 0).length;
        setSupportUnreadCount(unreadSupport);
      }
    } catch (e) { /* silent */ }
  };

  useEffect(() => {
    if (!localStorage.getItem("bw_admin_token")) {
      navigate("/login", { replace: true });
      return;
    }
    const saved = localStorage.getItem("bw_admin");
    if (saved) setAdminUser(JSON.parse(saved));

    fetchCounts();
    const interval = setInterval(fetchCounts, 6000);
    return () => clearInterval(interval);
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("bw_admin_token");
    localStorage.removeItem("bw_admin");
    navigate("/login");
  };

  const Sidebar = () => (
    <aside style={{ width:220, background: "var(--bg-dark)", borderRight:"1px solid var(--border)", display:"flex", flexDirection:"column", height:"100%", padding:"20px 12px" }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:32, paddingLeft:8 }}>
        <div style={{ width:32, height:32, borderRadius:8, background:"linear-gradient(135deg,#2563eb,#1d4ed8)", display:"flex", alignItems:"center", justifyContent:"center" }}>
          <Wallet size={16} color="white" />
        </div>
        <div>
          <span style={{ fontSize:15, fontWeight:800 }}>SmartWallet</span>
          <p style={{ fontSize:10, color:"#2563eb", fontWeight:600 }}>ADMIN</p>
        </div>
      </div>

      <nav style={{ flex:1 }}>
        {adminNav.map(({ href, icon:Icon, label, badgeKey }) => {
          const active = pathname === href;
          let badgeCount = 0;
          if (badgeKey === "users") badgeCount = kycPendingCount;
          else if (badgeKey === "transactions") badgeCount = txPendingCount;
          else if (badgeKey === "suspicious") badgeCount = fraudPendingCount;
          else if (badgeKey === "support") badgeCount = supportUnreadCount;

          return (
            <Link key={href} to={href} style={{ textDecoration:"none" }} onClick={() => setSidebarOpen(false)}>
              <div style={{
                display:"flex", alignItems:"center", gap:10, padding:"10px 12px", borderRadius:10, marginBottom:2,
                background: active ? "rgba(37,99,235,0.12)" : "transparent",
                border: `1px solid ${active ? "rgba(37,99,235,0.2)" : "transparent"}`,
                color: active ? "#2563eb" : "#71717a", transition:"all 0.2s", fontWeight: active ? 600 : 400
              }}
              onMouseEnter={(e) => { if (!active) { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.color = "#a1a1aa"; }}}
              onMouseLeave={(e) => { if (!active) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#71717a"; }}}
              >
                <Icon size={17} />
                <span style={{ fontSize:14, flex: 1 }}>{label}</span>
                {badgeCount > 0 && (
                  <span style={{
                    background: badgeKey === "suspicious" ? "#e11d48" : "#ef4444",
                    color: "white",
                    fontSize: 10,
                    fontWeight: 700,
                    padding: "1px 6px",
                    borderRadius: 10,
                    minWidth: 16,
                    textAlign: "center"
                  }}>
                    {badgeCount}
                  </span>
                )}
                {active && !badgeCount && <div style={{ marginLeft:"auto", width:6, height:6, borderRadius:"50%", background:"#2563eb" }} />}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Admin info at bottom of sidebar */}
      <div style={{ borderTop:"1px solid var(--border)", paddingTop:12, display:"flex", flexDirection:"column", gap:4 }}>
        {adminUser && (
          <div style={{ padding:"10px 12px", marginBottom:4 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <div style={{ width:30, height:30, borderRadius:"50%", background:"linear-gradient(135deg,#2563eb,#1d4ed8)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <Shield size={14} color="white" />
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <p style={{ fontSize:12, fontWeight:700, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{adminUser.name}</p>
                <p style={{ fontSize:10, color:"#2563eb", fontWeight:600, textTransform:"uppercase" }}>{adminUser.role}</p>
              </div>
            </div>
          </div>
        )}
        <button
          onClick={() => setShowLogoutConfirm(true)}
          style={{
            display:"flex", alignItems:"center", gap:10,
            padding:"10px 12px", borderRadius:10,
            background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.15)",
            color:"#ef4444", fontSize:14, cursor:"pointer", width:"100%",
            transition:"all 0.2s", fontWeight:500
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background="rgba(239,68,68,0.15)"; e.currentTarget.style.borderColor="rgba(239,68,68,0.3)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background="rgba(239,68,68,0.08)"; e.currentTarget.style.borderColor="rgba(239,68,68,0.15)"; }}
        >
          <LogOut size={16} />
          <span>Đăng xuất</span>
        </button>
      </div>
    </aside>
  );

  return (
    <>
      <div style={{ display:"flex", height:"100vh", overflow:"hidden", background: "var(--bg-dark)" }}>
        <div className="hidden lg:flex" style={{ flexShrink:0 }}><Sidebar /></div>

        <AnimatePresence>
          {sidebarOpen && (
            <>
              <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={() => setSidebarOpen(false)} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", zIndex:40 }} />
              <motion.div initial={{x:-240}} animate={{x:0}} exit={{x:-240}} transition={{type:"spring",damping:25,stiffness:250}} style={{ position:"fixed", left:0, top:0, bottom:0, width:240, zIndex:50 }}>
                <Sidebar />
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
          <header style={{ height:58, background:"rgba(255,255,255,0.95)", backdropFilter:"blur(20px)", borderBottom: "1px solid var(--border)", display:"flex", alignItems:"center", padding:"0 20px", gap:12, flexShrink:0 }}>
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden" style={{ background:"none", border:"none", cursor:"pointer", color: "var(--text-secondary)" }}>
              <Menu size={20} />
            </button>
            <div style={{ flex:1 }}>
              <h2 style={{ fontSize:15, fontWeight:700 }}>
                {adminNav.find(n => n.href === pathname)?.label || "Admin Panel"}
              </h2>
            </div>
            <span style={{ fontSize:11, background:"rgba(37,99,235,0.15)", color:"#2563eb", padding:"3px 10px", borderRadius:6, fontWeight:700 }}>ADMIN</span>
            {adminUser && (
              <div className="hidden sm:flex" style={{ alignItems:"center", gap:8, background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius:8, padding:"5px 10px 5px 6px" }}>
                <div style={{ width:24, height:24, borderRadius:"50%", background:"linear-gradient(135deg,#2563eb,#1d4ed8)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  <Shield size={12} color="white" />
                </div>
                <div>
                  <p style={{ fontSize:12, fontWeight:700, lineHeight:1 }}>{adminUser.name}</p>
                  <p style={{ fontSize:10, color:"#2563eb", fontWeight:600, textTransform:"uppercase" }}>{adminUser.role}</p>
                </div>
              </div>
            )}
            <button
              onClick={() => setShowLogoutConfirm(true)}
              style={{
                display:"flex", alignItems:"center", gap:6,
                background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.2)",
                borderRadius:8, padding:"6px 12px",
                color:"#ef4444", cursor:"pointer", fontSize:13, fontWeight:600,
                transition:"all 0.2s"
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background="rgba(239,68,68,0.18)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background="rgba(239,68,68,0.08)"; }}
            >
              <LogOut size={14} />
              <span className="hidden sm:inline">Đăng xuất</span>
            </button>
          </header>
          <main style={{ flex:1, overflow:"auto", padding:"20px" }}>
            <Outlet />
          </main>
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <motion.div
            initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            onClick={() => setShowLogoutConfirm(false)}
            style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", zIndex:300, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}
          >
            <motion.div
              initial={{ scale:0.9, opacity:0 }} animate={{ scale:1, opacity:1 }} exit={{ scale:0.9, opacity:0 }}
              onClick={(e) => e.stopPropagation()}
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius:18, padding:28, width:"100%", maxWidth:360, textAlign:"center" }}
            >
              <div style={{ width:56, height:56, borderRadius:"50%", background:"rgba(239,68,68,0.12)", border:"1px solid rgba(239,68,68,0.2)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px" }}>
                <LogOut size={24} style={{ color:"#ef4444" }} />
              </div>
              <h3 style={{ fontSize:17, fontWeight:700, marginBottom:8 }}>Đăng xuất Admin?</h3>
              <p style={{ color: "var(--text-secondary)", fontSize:13, lineHeight:1.6, marginBottom:24 }}>
                Bạn sẽ được chuyển về trang đăng nhập.<br />
                Phiên làm việc hiện tại sẽ kết thúc.
              </p>
              <div style={{ display:"flex", gap:10 }}>
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  style={{ flex:1, background: "var(--bg-card2)", border: "1px solid var(--border)", color: "var(--text-secondary)", borderRadius:10, padding:"11px", fontWeight:600, fontSize:14, cursor:"pointer" }}
                >
                  Huỷ bỏ
                </button>
                <button
                  onClick={handleLogout}
                  style={{ flex:1, background:"linear-gradient(135deg,#dc2626,#991b1b)", border:"none", color: "#000000", borderRadius:10, padding:"11px", fontWeight:700, fontSize:14, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}
                >
                  <LogOut size={15} /> Đăng xuất
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
