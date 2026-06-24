import { useEffect, useMemo, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Bell,
  CheckCircle,
  ChevronDown,
  CreditCard,
  Gift,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Shield,
  TrendingUp,
  User,
  Wallet,
  X,
  Sparkles,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { authAPI } from "../../services/api";

import { QrCode } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";


const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/dashboard/profile", icon: User, label: "Profile"},
  { href: "/dashboard/qr", icon: QrCode, label: "My QR"},  
  { href: "/dashboard/wallets", icon: CreditCard, label: "My Wallets" },
  { href: "/dashboard/investment", icon: TrendingUp, label: "Investments & Savings" },
  { href: "/dashboard/offers", icon: Gift, label: "Offers" },
  { href: "/dashboard/support", icon: MessageSquare, label: "Live Support" },
  { href: "/dashboard/ai-chatbot", icon: Sparkles, label: "AI Advisor" },
];

const pageTitle = (pathname, t, lang) => {
  if (pathname === "/dashboard") return t.nav.dashboard;
  if (pathname.includes("wallets")) return t.nav.myWallets;
  if (pathname.includes("investment")) return t.nav.investment;
  if (pathname.includes("offers")) return t.nav.offers;
  if (pathname.includes("support")) return t.nav.support;
  if (pathname.includes("kyc")) return t.kyc.title;
  if (pathname.includes("profile")) return t.nav.profile;
  if (pathname.includes("notifications")) return t.notifications.title;
  if (pathname.includes("ai-chatbot")) return lang === "vi" ? "Trợ lý AI" : "AI Advisor";
  return "SmartWallet";
};

const safeParse = (value) => {
  try {
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
};

export default function DashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const pathname = location.pathname;

  const { lang, toggleLang, t } = useLanguage();
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "light");

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    localStorage.setItem("theme", next);
    document.documentElement.dataset.theme = next;
  };

  const [user, setUser] = useState(() => safeParse(localStorage.getItem("bw_user")));
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const [dbNotifications, setDbNotifications] = useState([]);

  const title = pageTitle(pathname, t, lang);

  const isKycVerified =
    user?.kyc === true || user?.kyc === "verified" || user?.kycStatus === "verified";
  const isKycPending =
    !isKycVerified && (user?.kycStatus === "pending" || user?.kyc === "pending");

  const notifications = useMemo(() => {
    const kycItem = isKycVerified
      ? {
        id: "kyc_verified",
        title: "KYC Verification Successful ✅",
        desc: "Your account is ready for deposit, withdrawal and transfer.",
        read: true,
      }
      : isKycPending
        ? {
          id: "kyc_pending",
          title: "KYC Pending Review ⏳",
          desc: "Your identity documents are being reviewed by the admin team.",
          read: false,
        }
        : {
          id: "kyc_needed",
          title: "Verify Identity Required ⚠️",
          desc: "Complete KYC to unlock full SmartWallet features.",
          read: false,
        };

    const dbItems = dbNotifications.map((n) => ({
      id: `db_${n.id}`,
      title: n.title,
      desc: n.content,
      read: !!n.is_read,
      dbId: n.id,
    }));

    return [kycItem, ...dbItems];
  }, [dbNotifications, isKycPending, isKycVerified]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const fetchDbNotifications = () => {
    const token = localStorage.getItem("bw_token");
    if (!token) return;

    authAPI
      .getNotifications()
      .then((res) => {
        if (res?.success && Array.isArray(res.notifications)) {
          setDbNotifications(res.notifications);
        }
      })
      .catch(() => { });
  };

  useEffect(() => {
    const token = localStorage.getItem("bw_token");
    const adminToken = localStorage.getItem("bw_admin_token");

    if (!token && adminToken) {
      navigate("/admin", { replace: true });
      return;
    }

    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    const savedUser = safeParse(localStorage.getItem("bw_user"));
    if (savedUser) setUser(savedUser);

    authAPI
      .getProfile()
      .then((data) => {
        if (!data?.success || !data.user) return;

        const kycStatus = data.user.kyc_status || "none";
        const nextUser = {
          id: data.user.id,
          email: data.user.email,
          name: data.user.full_name || data.user.email?.split("@")[0] || "User",
          phone: data.user.phone || undefined,
          status: data.user.status,
          kyc: kycStatus === "VERIFIED",
          kycStatus: kycStatus.toLowerCase(),
          has_pin: !!data.user.has_pin,
        };

        localStorage.setItem("bw_user", JSON.stringify(nextUser));
        setUser(nextUser);
      })
      .catch(() => { });
  }, [navigate]);

  useEffect(() => {
    fetchDbNotifications();
    const interval = setInterval(fetchDbNotifications, 15000);
    return () => clearInterval(interval);
  }, [user?.email]);

  const handleLogout = async () => {
    try {
      await authAPI.logout();
    } catch { }

    localStorage.removeItem("bw_token");
    localStorage.removeItem("bw_user");
    localStorage.removeItem("bw_refresh_token");
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    navigate("/login", { replace: true });
  };

  const Sidebar = ({ mobile = false }) => (
    <aside className={`dash-sidebar ${mobile ? "mobile" : ""}`}>
      <button className="dash-logo" type="button" onClick={() => navigate("/")}>
        <span className="dash-logo-icon">
          <Wallet size={20} />
        </span>
        <span>SmartWallet</span>
      </button>

      <div className="dash-nav-label">Navigation</div>

      <nav className="dash-nav">
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
          const translatedLabel =
            label === "Dashboard" ? t.nav.dashboard :
            label === "Profile" ? t.nav.profile :
            label === "QR Deposit" ? t.nav.qrDeposit :
            label === "My QR" ? t.nav.myQr :
            label === "My Wallets" ? t.nav.myWallets :
            label === "Investments & Savings" ? t.nav.investment :
            label === "Offers" ? t.nav.offers :
            label === "Live Support" ? t.nav.support : label;

          return (
            <Link
              className={`dash-nav-link ${active ? "active" : ""}`}
              key={href}
              to={href}
              onClick={() => setSidebarOpen(false)}
            >
              <Icon size={19} />
              <span>{translatedLabel}</span>
              {active && <i />}
            </Link>
          );
        })}
      </nav>

      <div className="dash-side-card">
        <div className="dash-side-card-icon">
          <Shield size={18} />
        </div>
        <div>
          <strong>Secure Wallet</strong>
          <p>Protected payments, alerts and KYC verification.</p>
        </div>
      </div>

      {user && (
        <div className="dash-side-user">
          <div className="dash-avatar">
            {user.avatar ? <img src={user.avatar} alt="" /> : <User size={18} />}
          </div>
          <div>
            <strong>{user.name || "User"}</strong>
            <span>{user.email}</span>
          </div>
        </div>
      )}
    </aside>
  );

  return (
    <div className="dash-shell">
      <style>{dashboardLayoutCss}</style>

      <div className="dash-sidebar-wrap">
        <Sidebar />
      </div>

      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              className="dash-mobile-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
            />
            <motion.div
              className="dash-mobile-sidebar"
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", damping: 25, stiffness: 240 }}
            >
              <button className="dash-mobile-close" onClick={() => setSidebarOpen(false)} type="button">
                <X size={20} />
              </button>
              <Sidebar mobile />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <section className="dash-main">
        <header className="dash-topbar">
          <button className="dash-menu-btn" type="button" onClick={() => setSidebarOpen(true)}>
            <Menu size={22} />
          </button>

          <div className="dash-title-box">
            <h1>{title}</h1>
          </div>

          {user && (
            <button
              className={`dash-kyc ${isKycVerified ? "verified" : isKycPending ? "pending" : "warning"}`}
              type="button"
              onClick={() => navigate("/dashboard/kyc")}
            >
              {isKycVerified ? <CheckCircle size={15} /> : <AlertTriangle size={15} />}
              <span>{isKycVerified ? "KYC Verified" : isKycPending ? "KYC Pending" : "Verify Identity"}</span>
            </button>
          )}

          <div className="dash-actions">
            <button
              className="dash-icon-btn"
              type="button"
              onClick={toggleLang}
              title="Change Language"
            >
              {lang === "vi" ? "EN" : "VI"}
            </button>

            <button
              className="dash-icon-btn"
              type="button"
              onClick={toggleTheme}
              title="Toggle Theme"
            >
              {theme === "light" ? "🌙" : "☀️"}
            </button>

            <div className="dash-pop-wrap">
              <Link
                className="dash-icon-btn"
                to="/dashboard/notifications"
                onClick={() => {
                  setShowUserMenu(false);
                  setShowNotif(false);
                }}
                title={t.notifications.title}
              >
                <Bell size={18} />
                {unreadCount > 0 && <em>{unreadCount}</em>}
              </Link>
            </div>

            <div className="dash-pop-wrap">
              <button
                className="dash-user-btn"
                type="button"
                onClick={() => {
                  setShowUserMenu((prev) => !prev);
                  setShowNotif(false);
                }}
              >
                <span className="dash-avatar small">
                  {user?.avatar ? <img src={user.avatar} alt="" /> : <User size={15} />}
                </span>
                <b>{user?.name || "User"}</b>
                <ChevronDown size={14} />
              </button>

              <AnimatePresence>
                {showUserMenu && (
                  <motion.div
                    className="dash-dropdown dash-user-menu"
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                  >
                    <div className="dash-user-info">
                      <strong>{user?.name}</strong>
                      <span>{user?.email}</span>
                    </div>
                    <Link to="/dashboard/profile" onClick={() => setShowUserMenu(false)}>
                      <User size={15} /> Profile
                    </Link>
                    <Link to="/dashboard/kyc" onClick={() => setShowUserMenu(false)}>
                      <Shield size={15} /> KYC Verification
                    </Link>
                    <button type="button" onClick={handleLogout}>
                      <LogOut size={15} /> Log Out
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        <main className="dash-content">
          <Outlet />
        </main>
      </section>

      {(showNotif || showUserMenu) && (
        <button
          aria-label="Close dropdowns"
          className="dash-click-away"
          type="button"
          onClick={() => {
            setShowNotif(false);
            setShowUserMenu(false);
          }}
        />
      )}
    </div>
  );
}

const dashboardLayoutCss = `
:root {
  --dash-navy: #1e3a8a;
  --dash-navy-2: #1d4ed8;
  --dash-bg: #f4f7fb;
  --dash-card: #ffffff;
  --dash-line: #e7edf5;
  --dash-text: #172033;
  --dash-muted: #7a879a;
  --dash-teal: #0d9488;
  --dash-green: #11c981;
  --dash-coral: #11c981;
  --dash-pink: #2563eb;
  --dash-blue: #2563eb;
}

[data-theme='dark'] {
  --dash-bg: #0f172a;
  --dash-card: #1e293b;
  --dash-line: #334155;
  --dash-text: #f8fafc;
  --dash-muted: #64748b;
  --dash-navy: #0f172a;
  --dash-navy-2: #1e293b;
}

.dash-topbar, .dash-dropdown, .dash-user-menu button, .dash-user-menu a, .dash-notif-item {
  background: var(--dash-card) !important;
  color: var(--dash-text) !important;
}

.dash-icon-btn, .dash-user-btn {
  background: var(--dash-card) !important;
  color: var(--dash-text) !important;
  border-color: var(--dash-line) !important;
}


* { box-sizing: border-box; }

.dash-shell {
  min-height: 100vh;
  display: flex;
  background: var(--dash-bg);
  color: var(--dash-text);
  overflow: hidden;
}

.dash-sidebar-wrap {
  width: 278px;
  flex: 0 0 278px;
  display: block;
}

.dash-sidebar {
  height: 100vh;
  background: linear-gradient(180deg, var(--dash-navy) 0%, #263550 100%);
  color: #eaf0f8;
  padding: 24px 18px;
  display: flex;
  flex-direction: column;
  box-shadow: 18px 0 48px rgba(32, 45, 68, 0.12);
}

.dash-logo {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  border: 0;
  background: transparent;
  color: #fff;
  cursor: pointer;
  font-size: 22px;
  font-weight: 900;
  padding: 4px 6px 28px;
}

.dash-logo-icon {
  width: 42px;
  height: 42px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, var(--dash-teal), var(--dash-green));
  box-shadow: 0 14px 28px rgba(9, 182, 182, 0.25);
}

.dash-nav-label {
  color: rgba(234, 240, 248, 0.42);
  font-size: 12px;
  letter-spacing: 1.4px;
  text-transform: uppercase;
  padding: 0 10px 12px;
}

.dash-nav {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.dash-nav-link {
  position: relative;
  display: flex;
  align-items: center;
  gap: 13px;
  padding: 13px 12px;
  color: rgba(234, 240, 248, 0.78);
  text-decoration: none;
  border-radius: 14px;
  font-size: 14px;
  font-weight: 700;
  transition: 0.2s ease;
}

.dash-nav-link:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.08);
  transform: translateX(3px);
}

.dash-nav-link.active {
  color: #fff;
  background: rgba(255, 255, 255, 0.12);
  box-shadow: inset 4px 0 0 var(--dash-coral);
}

.dash-nav-link.active i {
  margin-left: auto;
  width: 9px;
  height: 9px;
  border-radius: 999px;
  background: var(--dash-coral);
}

.dash-side-card {
  margin-top: 20px;
  display: flex;
  gap: 12px;
  padding: 15px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.09);
}

.dash-side-card-icon {
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  border-radius: 12px;
  color: #fff;
  background: linear-gradient(135deg, var(--dash-pink), var(--dash-coral));
  flex: 0 0 36px;
}

.dash-side-card strong,
.dash-side-user strong {
  display: block;
  font-size: 13px;
}

.dash-side-card p,
.dash-side-user span {
  color: rgba(234, 240, 248, 0.62);
  font-size: 11px;
  line-height: 1.45;
  margin: 3px 0 0;
}

.dash-side-user {
  margin-top: 16px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  border-radius: 16px;
  background: rgba(0, 0, 0, 0.12);
}

.dash-avatar {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, var(--dash-teal), var(--dash-green));
  color: #fff;
  overflow: hidden;
  flex: 0 0 38px;
}

.dash-avatar.small {
  width: 30px;
  height: 30px;
  flex-basis: 30px;
}

.dash-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.dash-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}

.dash-topbar {
  height: 76px;
  flex: 0 0 76px;
  background: rgba(255, 255, 255, 0.88);
  backdrop-filter: blur(18px);
  border-bottom: 1px solid var(--dash-line);
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 0 28px;
  position: sticky;
  top: 0;
  z-index: 30;
}

.dash-menu-btn {
  display: none;
  border: 0;
  background: #eef3f9;
  border-radius: 12px;
  width: 42px;
  height: 42px;
  cursor: pointer;
  color: var(--dash-navy);
}

.dash-title-box {
  flex: 1;
  min-width: 0;
}

.dash-title-box h1 {
  margin: 0;
  font-size: 22px;
  font-weight: 900;
  letter-spacing: -0.02em;
}

.dash-title-box p {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--dash-muted);
}

.dash-title-box span {
  margin: 0 8px;
}

.dash-kyc {
  display: flex;
  align-items: center;
  gap: 7px;
  border-radius: 999px;
  border: 1px solid transparent;
  padding: 9px 13px;
  font-weight: 800;
  font-size: 12px;
  cursor: pointer;
  white-space: nowrap;
}

.dash-kyc.verified {
  background: rgba(17, 201, 129, 0.1);
  color: var(--dash-green);
  border-color: rgba(17, 201, 129, 0.2);
}

.dash-kyc.pending,
.dash-kyc.warning {
  background: rgba(255, 142, 110, 0.12);
  color: #f97316;
  border-color: rgba(255, 142, 110, 0.28);
}

.dash-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.dash-pop-wrap {
  position: relative;
  z-index: 40;
}

.dash-icon-btn,
.dash-user-btn {
  border: 1px solid var(--dash-line);
  background: #fff;
  border-radius: 14px;
  height: 44px;
  cursor: pointer;
  box-shadow: 0 10px 24px rgba(31, 45, 61, 0.05);
}

.dash-icon-btn {
  width: 44px;
  display: grid;
  place-items: center;
  position: relative;
  color: var(--dash-navy);
}

.dash-icon-btn em {
  position: absolute;
  top: -7px;
  right: -5px;
  min-width: 19px;
  height: 19px;
  padding: 0 5px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  background: var(--dash-pink);
  color: #fff;
  font-size: 10px;
  font-style: normal;
  font-weight: 900;
}

.dash-user-btn {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 6px 12px 6px 7px;
  color: var(--dash-text);
}

.dash-user-btn b {
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dash-dropdown {
  position: absolute;
  right: 0;
  top: calc(100% + 10px);
  background: #fff;
  border: 1px solid var(--dash-line);
  border-radius: 18px;
  box-shadow: 0 22px 70px rgba(24, 36, 56, 0.18);
  overflow: hidden;
  z-index: 60;
}

.dash-dropdown-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid var(--dash-line);
}

.dash-dropdown-head span {
  font-size: 11px;
  color: var(--dash-pink);
  font-weight: 900;
}

.dash-notif {
  width: 340px;
}

.dash-notif-list {
  max-height: 340px;
  overflow: auto;
}

.dash-notif-item {
  width: 100%;
  border: 0;
  border-bottom: 1px solid var(--dash-line);
  background: #fff;
  padding: 13px 16px;
  text-align: left;
  cursor: pointer;
}

.dash-notif-item.unread {
  background: linear-gradient(90deg, rgba(9, 182, 182, 0.09), #fff);
}

.dash-notif-item strong {
  display: block;
  font-size: 13px;
  margin-bottom: 3px;
}

.dash-notif-item span,
.dash-empty {
  color: var(--dash-muted);
  font-size: 12px;
  line-height: 1.45;
}

.dash-empty {
  text-align: center;
  padding: 28px;
}

.dash-user-menu {
  width: 230px;
}

.dash-user-info {
  padding: 16px;
  border-bottom: 1px solid var(--dash-line);
}

.dash-user-info strong,
.dash-user-info span {
  display: block;
}

.dash-user-info span {
  margin-top: 4px;
  color: var(--dash-muted);
  font-size: 12px;
}

.dash-user-menu a,
.dash-user-menu button {
  width: 100%;
  border: 0;
  background: #fff;
  padding: 12px 16px;
  text-decoration: none;
  color: var(--dash-text);
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

.dash-user-menu a:hover,
.dash-user-menu button:hover {
  background: #f5f8fc;
}

.dash-user-menu button {
  color: #ef4444;
  border-top: 1px solid var(--dash-line);
}

.dash-content {
  flex: 1;
  overflow: auto;
  padding: 28px;
  background:
    radial-gradient(circle at top right, rgba(9, 182, 182, 0.08), transparent 34%),
    radial-gradient(circle at bottom left, rgba(255, 142, 110, 0.08), transparent 36%),
    var(--dash-bg);
}

.dash-click-away {
  position: fixed;
  inset: 0;
  border: 0;
  background: transparent;
  z-index: 29;
  cursor: default;
}

.dash-mobile-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.55);
  z-index: 80;
}

.dash-mobile-sidebar {
  position: fixed;
  inset: 0 auto 0 0;
  width: 280px;
  z-index: 90;
}

.dash-mobile-close {
  position: absolute;
  right: -48px;
  top: 18px;
  width: 38px;
  height: 38px;
  border: 0;
  border-radius: 12px;
  background: #fff;
  color: var(--dash-navy);
  display: grid;
  place-items: center;
  z-index: 100;
}

@media (max-width: 1024px) {
  .dash-sidebar-wrap { display: none; }
  .dash-menu-btn { display: grid; place-items: center; }
  .dash-content { padding: 18px; }
}

@media (max-width: 720px) {
  .dash-topbar { padding: 0 14px; gap: 10px; }
  .dash-title-box h1 { font-size: 18px; }
  .dash-title-box p { display: none; }
  .dash-kyc span, .dash-user-btn b { display: none; }
  .dash-notif { width: calc(100vw - 28px); right: -58px; }
}
`;
