import { createContext, useContext, useCallback, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Check, X, ShieldAlert } from "lucide-react";
import { useLanguage } from "./LanguageContext";

// Custom modal dùng chung toàn app — thay cho alert()/confirm() gốc của trình duyệt.
// Visual giữ y hệt modal đang dùng ở AdminSuspicious.jsx / AdminMedia.jsx.
const ModalContext = createContext(null);

export function ModalProvider({ children }) {
  const { t } = useLanguage();
  const [customAlert, setCustomAlert] = useState(null);   // { message, type }
  const [customConfirm, setCustomConfirm] = useState(null); // { message, onConfirm, onCancel, danger }

  // type: "success" | "error" | "info"
  const showAlert = useCallback((message, type = "info") => {
    setCustomAlert({ message, type });
  }, []);

  // danger=true -> nút xác nhận màu đỏ (hành động xoá/nguy hiểm)
  const showConfirm = useCallback((message, onConfirm, onCancel = null, danger = false) => {
    setCustomConfirm({ message, onConfirm, onCancel, danger });
  }, []);

  const value = useMemo(() => ({ showAlert, showConfirm }), [showAlert, showConfirm]);

  // Nhãn khung modal: ưu tiên i18n (t.modal.*), có literal fallback để an toàn nếu thiếu key.
  const m = t?.modal || {};
  const confirmTitle = m.confirmTitle || "Xác nhận";
  const notificationTitle = m.notificationTitle || "Thông báo";
  const errorTitle = m.errorTitle || "Lỗi";
  const agreeLabel = m.agree || "Đồng ý";
  const cancelLabel = m.cancel || "Huỷ";
  const closeLabel = m.close || "Đóng";

  return (
    <ModalContext.Provider value={value}>
      {children}

      {/* CUSTOM CONFIRMATION & ALERT MODAL */}
      <AnimatePresence>
        {customConfirm && (
          <div style={{
            position: "fixed", inset: 0, zIndex: 10000,
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 20, background: "rgba(15, 23, 42, 0.4)", backdropFilter: "blur(4px)"
          }}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              style={{
                background: "var(--bg-card)", border: "1px solid var(--border)",
                borderRadius: 20, padding: 24, maxWidth: 400, width: "100%",
                boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)", position: "relative",
                color: "var(--text-primary)"
              }}
            >
              <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                <AlertTriangle size={20} style={{ color: customConfirm.danger ? "#ef4444" : "#f59e0b" }} />
                {confirmTitle}
              </h3>
              <p style={{ fontSize: 13, lineHeight: 1.5, color: "var(--text-secondary)", marginBottom: 20, whiteSpace: "pre-line" }}>
                {customConfirm.message}
              </p>
              <div style={{ display: "flex", gap: 12 }}>
                <button
                  onClick={() => {
                    customConfirm.onCancel?.();
                    setCustomConfirm(null);
                  }}
                  style={{
                    flex: 1, padding: 10, borderRadius: 10, fontSize: 12,
                    background: "var(--bg-card2)", border: "1px solid var(--border)",
                    color: "var(--text-secondary)", cursor: "pointer"
                  }}
                >
                  {cancelLabel}
                </button>
                <button
                  onClick={() => {
                    customConfirm.onConfirm?.();
                    setCustomConfirm(null);
                  }}
                  style={{
                    flex: 1, padding: 10, borderRadius: 10, fontSize: 12, border: "none",
                    background: customConfirm.danger ? "#ef4444" : "var(--primary)", color: "white", cursor: "pointer", fontWeight: 700
                  }}
                >
                  {agreeLabel}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {customAlert && (
          <div style={{
            position: "fixed", inset: 0, zIndex: 10000,
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 20, background: "rgba(15, 23, 42, 0.4)", backdropFilter: "blur(4px)"
          }}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              style={{
                background: "var(--bg-card)", border: "1px solid var(--border)",
                borderRadius: 20, padding: 24, maxWidth: 400, width: "100%",
                boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)", position: "relative",
                color: "var(--text-primary)"
              }}
            >
              <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                {customAlert.type === "error" ? (
                  <X size={20} style={{ color: "#ef4444", background: "rgba(239,68,68,0.1)", borderRadius: "50%", padding: 2 }} />
                ) : customAlert.type === "success" ? (
                  <Check size={20} style={{ color: "#22c55e", background: "rgba(34,197,94,0.1)", borderRadius: "50%", padding: 2 }} />
                ) : (
                  <ShieldAlert size={20} style={{ color: "var(--primary)" }} />
                )}
                {customAlert.type === "error" ? errorTitle : notificationTitle}
              </h3>
              <p style={{ fontSize: 13, lineHeight: 1.5, color: "var(--text-secondary)", marginBottom: 20, whiteSpace: "pre-line" }}>
                {customAlert.message}
              </p>
              <button
                onClick={() => setCustomAlert(null)}
                style={{
                  width: "100%", padding: 10, borderRadius: 10, fontSize: 12, border: "none",
                  background: "var(--primary)", color: "white", cursor: "pointer", fontWeight: 700
                }}
              >
                {closeLabel}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </ModalContext.Provider>
  );
}

export function useModal() {
  const ctx = useContext(ModalContext);
  if (!ctx) {
    throw new Error("useModal must be used within a ModalProvider");
  }
  return ctx;
}
