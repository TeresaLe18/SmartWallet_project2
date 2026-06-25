import { useState, useEffect, useRef } from "react";
import { Send, Image, X, Headphones, User, Shield } from "lucide-react";
import { supportAPI } from "../../services/api";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "../../context/LanguageContext";

export default function Support() {
  const { t, lang } = useLanguage();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [selectedImage, setSelectedImage] = useState(null); // base64 string
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Auto-scroll to bottom of chat
  const scrollToBottom = (behavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  // Fetch messages from backend
  const fetchMessages = async (isFirstLoad = false) => {
    try {
      const res = await supportAPI.getMessages();
      if (res.success) {
        setMessages(res.data);
        if (isFirstLoad) {
          setTimeout(() => scrollToBottom("auto"), 100);
        } else {
          scrollToBottom("smooth");
        }
      }
    } catch (error) {
      console.error("Failed to fetch support messages:", error);
    } finally {
      if (isFirstLoad) setLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchMessages(true);

    // Setup polling every 4 seconds to sync messages in real-time
    const interval = setInterval(() => {
      fetchMessages(false);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  // Handle image attachment selection
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check size (limit to 5MB for base64 safety)
    if (file.size > 5 * 1024 * 1024) {
      alert(lang === "vi" ? "Kích thước ảnh đính kèm không được vượt quá 5MB." : "Attached image size must not exceed 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setSelectedImage(reader.result); // Base64 data URL
    };
    reader.readAsDataURL(file);
  };

  // Handle sending message
  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputText.trim() && !selectedImage) return;

    setSending(true);
    const textToSend = inputText;
    const imgToSend = selectedImage;

    // Clear input immediately for optimal UX latency
    setInputText("");
    setSelectedImage(null);

    try {
      const res = await supportAPI.sendMessage(textToSend, imgToSend);
      console.log("res: ", res);
      if (res.success) {
        // Optimistically append the message, or wait for polling to fetch it
        setMessages((prev) => [...prev, res.data]);
        setTimeout(() => scrollToBottom("smooth"), 50);
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      alert(error.response?.data?.message || (lang === "vi" ? "Không thể gửi tin nhắn hỗ trợ. Vui lòng thử lại." : "Failed to send support message. Please try again."));
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 120px)", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden" }}>
      {/* Chat Header */}
      <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 14, background: "rgba(255,255,255,0.02)" }}>
        <div style={{ width: 42, height: 42, borderRadius: "50%", background: "rgba(37,99,235,0.1)", border: "1px solid rgba(37,99,235,0.2)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--primary)" }}>
          <Headphones size={20} />
        </div>
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>{t.support.subtitle}</h3>
          <p style={{ fontSize: 11, color: "#22c55e", fontWeight: 500, margin: "2px 0 0 0", display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e" }} />
            {lang === "vi" ? "Tư vấn viên trực tuyến" : "Support agent is online"}
          </p>
        </div>
      </div>

      {/* Chat Messages Area */}
      <div style={{ flex: 1, overflowY: "auto", padding: "24px", display: "flex", flexDirection: "column", gap: 16 }}>
        {loading ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 30, height: 30, borderRadius: "50%", border: "2px solid var(--primary)", borderTopColor: "transparent", animation: "spin 1s linear infinite" }} />
          </div>
        ) : messages.length === 0 ? (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, color: "var(--text-secondary)", textAlign: "center", padding: 24 }}>
            <Headphones size={48} style={{ color: "rgba(255,255,255,0.1)" }} />
            <h4 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>{t.support.hello}</h4>
            <p style={{ fontSize: 13, maxWidth: 320, margin: 0 }}>{t.support.desc}</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isAdmin = msg.is_admin === true;
            return (
              <div key={msg.id} style={{ display: "flex", flexDirection: "column", alignItems: isAdmin ? "flex-start" : "flex-end" }}>
                {/* Bubble Container */}
                <div style={{ display: "flex", gap: 10, maxWidth: "75%", alignItems: "flex-end" }}>
                  {isAdmin && (
                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--bg-card2)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginBottom: 4 }}>
                      <Shield size={12} style={{ color: "var(--text-secondary)" }} />
                    </div>
                  )}
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <div style={{
                      padding: "12px 16px",
                      borderRadius: 14,
                      borderTopLeftRadius: isAdmin ? 2 : 14,
                      borderTopRightRadius: !isAdmin ? 2 : 14,
                      background: isAdmin ? "var(--bg-card2)" : "var(--primary)",
                      border: isAdmin ? "1px solid var(--border)" : "1px solid rgba(37,99,235,0.2)",
                      color: isAdmin ? "var(--text-primary)" : "white",
                      fontSize: 13.5,
                      lineHeight: 1.5,
                      boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
                    }}>
                      {/* Image Attachment inside Bubble */}
                      {msg.image_url && (
                        <div style={{ marginBottom: msg.message ? 8 : 0, borderRadius: 8, overflow: "hidden", border: "1px solid var(--border)" }}>
                          <img src={msg.image_url} alt="Attachment" style={{ maxWidth: "100%", maxHeight: 220, objectFit: "cover", display: "block" }} />
                        </div>
                      )}
                      {msg.message && <div style={{ wordBreak: "break-word", whiteSpace: "pre-wrap" }}>{msg.message}</div>}
                    </div>
                    {/* Timestamp */}
                    <span style={{ fontSize: 10, color: "var(--text-muted)", alignSelf: isAdmin ? "flex-start" : "flex-end", paddingLeft: 4, paddingRight: 4 }}>
                      {(() => {
                        const dateVal = msg.created_at || msg.createdAt;
                        if (!dateVal) return "";
                        const d = new Date(dateVal);
                        if (isNaN(d.getTime())) return "";
                        return d.toLocaleTimeString(lang === "vi" ? "vi-VN" : "en-US", { hour: "2-digit", minute: "2-digit" });
                      })()}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Image Preview Area */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 90, opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={{ padding: "0 24px", background: "rgba(0,0,0,0.02)", borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 12 }}
          >
            <div style={{ position: "relative", width: 64, height: 64, borderRadius: 8, overflow: "hidden", border: "1px solid var(--border)" }}>
              <img src={selectedImage} alt="Preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              <button
                onClick={() => setSelectedImage(null)}
                style={{ position: "absolute", top: 2, right: 2, width: 18, height: 18, borderRadius: "50%", background: "rgba(0,0,0,0.7)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "white" }}
              >
                <X size={10} />
              </button>
            </div>
            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{t.support.imageSelected}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Input Area */}
      <form onSubmit={handleSend} style={{ padding: "16px 24px", borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 12, background: "var(--bg-card2)" }}>
        {/* Attachment Button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--bg-card)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)", cursor: "pointer", transition: "all 0.2s" }}
          onMouseEnter={(e) => e.currentTarget.style.color = "var(--primary)"}
          onMouseLeave={(e) => e.currentTarget.style.color = "var(--text-secondary)"}
        >
          <Image size={18} />
        </button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          style={{ display: "none" }}
        />

        {/* Text Input */}
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={t.support.typeMessage}
          style={{ flex: 1, height: 40, padding: "0 16px", borderRadius: 20, border: "1px solid var(--border)", background: "var(--bg-card)", color: "var(--text-primary)", fontSize: 13.5 }}
        />

        {/* Send Button */}
        <button
          type="submit"
          disabled={sending || (!inputText.trim() && !selectedImage)}
          style={{
            width: 40, height: 40, borderRadius: "50%",
            background: (inputText.trim() || selectedImage) ? "var(--primary)" : "rgba(0,0,0,0.03)",
            border: "none", display: "flex", alignItems: "center", justifyContent: "center",
            color: "white", cursor: (inputText.trim() || selectedImage) ? "pointer" : "not-allowed",
            transition: "all 0.2s"
          }}
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}
