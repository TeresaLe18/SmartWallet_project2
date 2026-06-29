import { useState, useEffect, useRef } from "react";
import { Send, Image, X, Headphones, Shield } from "lucide-react";
import { supportAPI } from "../../services/api";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "../../context/LanguageContext";
import { useModal } from "../../context/ModalContext";
import "./ChatLayout.css";
import "./Support.css";

export default function Support() {
  const { t, lang } = useLanguage();
  const { showAlert } = useModal();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const scrollToBottom = (behavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

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
    fetchMessages(true);
    const interval = setInterval(() => fetchMessages(false), 4000);
    return () => clearInterval(interval);
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showAlert(lang === "vi" ? "Kích thước ảnh đính kèm không được vượt quá 5MB." : "Attached image size must not exceed 5MB.", "error");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => setSelectedImage(reader.result);
    reader.readAsDataURL(file);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputText.trim() && !selectedImage) return;

    setSending(true);
    const textToSend = inputText;
    const imgToSend = selectedImage;

    setInputText("");
    setSelectedImage(null);

    try {
      const res = await supportAPI.sendMessage(textToSend, imgToSend);
      if (res.success) {
        setMessages((prev) => [...prev, res.data]);
        setTimeout(() => scrollToBottom("smooth"), 50);
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      showAlert(error.response?.data?.message || (lang === "vi" ? "Không thể gửi tin nhắn hỗ trợ. Vui lòng thử lại." : "Failed to send support message. Please try again."), "error");
    } finally {
      setSending(false);
    }
  };

  const canSend = inputText.trim() || selectedImage;

  return (
    <div className="chat-page-shell support-chat">
      <div className="support-header">
        <div className="support-header-icon">
          <Headphones size={20} />
        </div>
        <div>
          <h3>{t.support.subtitle}</h3>
          <p className="support-header-status">
            <span />
            {lang === "vi" ? "Tư vấn viên trực tuyến" : "Support agent is online"}
          </p>
        </div>
      </div>

      <div className="support-messages">
        {loading ? (
          <div className="support-empty">
            <div className="support-spinner" />
          </div>
        ) : messages.length === 0 ? (
          <div className="support-empty">
            <Headphones size={48} style={{ color: "rgba(255,255,255,0.1)" }} />
            <h4>{t.support.hello}</h4>
            <p>{t.support.desc}</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isAdmin = msg.is_admin === true;
            return (
              <div key={msg.id} className={`support-bubble-row ${isAdmin ? "is-admin" : "is-user"}`}>
                <div className="support-bubble-wrap">
                  {isAdmin && (
                    <div className="support-bubble-avatar">
                      <Shield size={12} />
                    </div>
                  )}
                  <div className="support-bubble-col">
                    <div className={`support-bubble ${isAdmin ? "is-admin" : "is-user"}`}>
                      {msg.image_url && (
                        <div className="support-bubble-image-wrap">
                          <img src={msg.image_url} alt="Attachment" />
                        </div>
                      )}
                      {msg.message && <div>{msg.message}</div>}
                    </div>
                    <span className="support-time">
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

      <AnimatePresence>
        {selectedImage && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 90, opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="support-preview"
          >
            <div className="support-preview-thumb">
              <img src={selectedImage} alt="Preview" />
              <button type="button" onClick={() => setSelectedImage(null)} className="support-preview-remove">
                <X size={10} />
              </button>
            </div>
            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{t.support.imageSelected}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleSend} className="support-form">
        <button type="button" onClick={() => fileInputRef.current?.click()} className="support-icon-btn">
          <Image size={18} />
        </button>
        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" style={{ display: "none" }} />
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={t.support.typeMessage}
        />
        <button
          type="submit"
          disabled={sending || !canSend}
          className={`support-send-btn ${canSend ? "is-active" : "is-disabled"}`}
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}
