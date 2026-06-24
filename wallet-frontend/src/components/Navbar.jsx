import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import "./Navbar.css";
import { walletAPI, formatVND } from "../services/api";

import { useLanguage } from "../context/LanguageContext";

export default function Navbar() {
  const navigate = useNavigate();

  const { lang, toggleLang, t } = useLanguage();
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "light");
  const [scrolled, setScrolled] = useState(false);
  const [openMenu, setOpenMenu] = useState(false);
  const [balance, setBalance] = useState(null);

  const [user, setUser] = useState(
    JSON.parse(localStorage.getItem("bw_user") || "null")
  );
  const [admin, setAdmin] = useState(
    JSON.parse(localStorage.getItem("bw_admin") || "null")
  );

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 8);
    handleScroll();

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const syncSession = () => {
      setUser(JSON.parse(localStorage.getItem("bw_user") || "null"));
      setAdmin(JSON.parse(localStorage.getItem("bw_admin") || "null"));
    };

    window.addEventListener("storage", syncSession);
    window.addEventListener("auth_updated", syncSession);
    return () => {
      window.removeEventListener("storage", syncSession);
      window.removeEventListener("auth_updated", syncSession);
    };
  }, []);

  useEffect(() => {
    const fetchBalance = async () => {
      const savedUser = JSON.parse(localStorage.getItem("bw_user") || "null");
      const savedAdmin = JSON.parse(localStorage.getItem("bw_admin") || "null");
      if (savedUser && !savedAdmin) {
        try {
          const res = await walletAPI.getStats();
          if (res.success) {
            setBalance(Number(res.stats.currentBalance));
          }
        } catch (e) {
          console.error("Fetch navbar balance error:", e);
        }
      } else {
        setBalance(null);
      }
    };

    fetchBalance();

    window.addEventListener("balance_updated", fetchBalance);
    window.addEventListener("auth_updated", fetchBalance);
    return () => {
      window.removeEventListener("balance_updated", fetchBalance);
      window.removeEventListener("auth_updated", fetchBalance);
    };
  }, [user, admin]);

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    localStorage.setItem("theme", next);
    document.documentElement.dataset.theme = next;
  };

  const handleLogout = () => {
    localStorage.removeItem("bw_token");
    localStorage.removeItem("bw_refresh_token");
    localStorage.removeItem("bw_user");
    localStorage.removeItem("bw_admin_token");
    localStorage.removeItem("bw_admin");
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("token");

    setUser(null);
    setAdmin(null);
    setOpenMenu(false);

    window.dispatchEvent(new Event("auth_updated"));
    navigate("/");
  };

  const displayName =
    admin?.name || admin?.email || user?.name || user?.email || "User";

  return (
    <header className={`site-header ${scrolled ? "site-header-scrolled" : ""}`}>
      <Link to="/" className="site-logo" aria-label="SmartWallet Home">
        <span className="site-logo-icon">✧</span>
        SmartWallet
      </Link>

      <nav className="site-nav">
        <Link to="/">{t.nav.home}</Link>
        <a href="#about">{t.nav.about}</a>
        <Link to="/dashboard/offers">{t.nav.offers}</Link>
        <Link to="/transfer">{t.nav.transfer}</Link>
        <Link to="/contact">{t.nav.contact}</Link>
      </nav>

      <div className="header-actions">
        <button className="icon-btn" type="button" onClick={toggleLang}>
          {lang === "vi" ? "EN" : "VI"}
        </button>

        <button className="icon-btn" type="button" onClick={toggleTheme}>
          {theme === "light" ? "🌙" : "☀️"}
        </button>

        {user || admin ? (
            <div className="user-menu">
              <button
                className="login-btn"
                type="button"
                onClick={() => setOpenMenu((prev) => !prev)}
              >
                {admin ? "ADMIN" : displayName}
              </button>

              {openMenu && (
                <div className="user-dropdown">
                  <button
                    type="button"
                    onClick={() => {
                      setOpenMenu(false);
                      navigate(admin ? "/admin" : "/dashboard");
                    }}
                  >
                    {t.nav.dashboard}
                  </button>

                  <button type="button" onClick={handleLogout}>
                    {t.nav.logout}
                  </button>
                </div>
              )}
            </div>
        ) : (
          <button
            className="login-btn"
            type="button"
            onClick={() => navigate("/login")}
          >
            {t.nav.login}
          </button>
        )}
      </div>
    </header>
  );
}
