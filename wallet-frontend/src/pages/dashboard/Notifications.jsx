import { useState, useEffect } from "react";
import { Bell, Check, Trash2, Clock, CheckSquare } from "lucide-react";
import { motion } from "framer-motion";
import { authAPI } from "../../services/api";
import { useLanguage } from "../../context/LanguageContext";
import "./Notifications.css";

export default function NotificationsPage() {
  const { t } = useLanguage();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      const res = await authAPI.getNotifications();
      if (res.success) {
        setNotifications(res.notifications || []);
      }
    } catch (err) {
      console.error("Failed to load notifications:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAsRead = async (id) => {
    try {
      const res = await authAPI.markNotificationRead(id);
      if (res.success) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
        );
      }
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  };

  const handleDelete = async (id) => {
    try {
      const res = await authAPI.deleteNotification(id);
      if (res.success) {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
      }
    } catch (err) {
      console.error("Failed to delete notification:", err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const res = await authAPI.markAllNotificationsRead();
      if (res.success) {
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      }
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  };

  const formatNotifTime = (dateStr) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) + " " + d.toLocaleDateString("vi-VN");
    } catch {
      return dateStr;
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="notif-page-container">
      <div className="notif-page-header">
        <div>
          <h1 className="notif-page-title">🔔 {t.notifications.title}</h1>
          <p className="notif-page-subtitle">{t.notifications.subtitle}</p>
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            className="notif-mark-all-btn"
            onClick={handleMarkAllAsRead}
          >
            <CheckSquare size={16} />
            <span>{t.notifications.markAllRead}</span>
          </button>
        )}
      </div>

      {loading ? (
        <div className="notif-loader-list">
          {[1, 2, 3].map((i) => (
            <div key={i} className="notif-skeleton-loader" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="notif-empty-state">
          <div className="notif-empty-icon">
            <Bell size={48} />
          </div>
          <p>{t.notifications.empty}</p>
        </div>
      ) : (
        <div className="notif-list-wrapper">
          {notifications.map((n, i) => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.05, 0.4) }}
              className={`notif-card-item ${!n.is_read ? "unread-highlight" : ""}`}
              onClick={() => {
                if (!n.is_read) handleMarkAsRead(n.id);
              }}
            >
              <div className="notif-card-header">
                <div className="notif-card-icon-wrap">
                  <div className={`notif-dot-status ${!n.is_read ? "active-dot" : "inactive-dot"}`} />
                  <strong className="notif-card-title">{n.title}</strong>
                </div>

                <span className="notif-card-badge">
                  {n.is_read ? t.notifications.read : t.notifications.unread}
                </span>
              </div>

              <p className="notif-card-content">{n.content}</p>

              <div className="notif-card-footer" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Clock size={12} />
                  <span>{formatNotifTime(n.created_at || n.createdAt)}</span>
                </div>
                {n.is_read && (
                  <button
                    type="button"
                    title="Delete Notification"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(n.id);
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#ef4444",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      fontSize: 12,
                      fontWeight: 600,
                      padding: "4px 8px",
                      borderRadius: 6,
                      transition: "background 0.2s"
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "rgba(239, 68, 68, 0.08)"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "none"}
                  >
                    <Trash2 size={13} /> Delete
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
