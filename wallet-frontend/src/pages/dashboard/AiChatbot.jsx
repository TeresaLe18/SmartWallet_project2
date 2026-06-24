import { useState, useRef, useEffect } from "react";
import { Sparkles, Send, Bot, User, ArrowRight, AlertCircle, RefreshCw, Landmark } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { chatAPI } from "../../services/api";

export default function AiChatbot() {
  const [messages, setMessages] = useState([
    {
      sender: "ai",
      text: "Xin chào! Tôi là Trợ lý Tư vấn Tài chính AI của SmartWallet. Tôi có thể giúp gì cho bạn hôm nay? Bạn có thể yêu cầu tôi phân tích chi tiêu, gợi ý kế hoạch tiết kiệm hoặc tư vấn tối ưu hóa dòng tiền.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const messagesEndRef = useRef(null);

  // Scroll to bottom whenever messages list changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSend = async (textToSend) => {
    const msg = textToSend || input;
    if (!msg.trim()) return;

    if (!textToSend) setInput("");
    setErrorMsg("");

    // Add user message
    const userMsg = { sender: "user", text: msg };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      // Gather chat history (limit to last 10 messages for token context efficiency)
      const chatHistory = messages.map((m) => ({
        sender: m.sender,
        text: m.text,
      })).slice(-10);

      // Call API
      const res = await chatAPI.getAdvice(msg, chatHistory);

      if (res.success) {
        setMessages((prev) => [...prev, { sender: "ai", text: res.reply }]);
      } else {
        setErrorMsg(res.message || "Không thể tải phản hồi từ trợ lý.");
      }
    } catch (err) {
      console.error("Chat error:", err);
      const backendError = err.response?.data?.message;
      if (backendError && backendError.includes("GEMINI_API_KEY")) {
        setErrorMsg("GEMINI_API_KEY chưa được cấu hình. Vui lòng thêm khóa GEMINI_API_KEY vào tệp .env của Backend.");
      } else {
        setErrorMsg("Có lỗi xảy ra kết nối với hệ thống AI. Vui lòng kiểm tra và thử lại.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const quickPrompts = [
    "Phân tích chi tiêu của tôi gần đây",
    "Gợi ý cho tôi kế hoạch tiết kiệm 10 triệu đồng",
    "Tư vấn cách tối ưu số dư ví hiện tại",
    "Làm sao để hạn chế chi tiêu lãng phí?"
  ];

  return (
    <div className="ai-advisor-container">
      <style>{chatbotStyles}</style>

      {/* HEADER SECTION */}
      <section className="advisor-hero">
        <div className="advisor-hero-text">
          <span className="badge-ai">
            <Sparkles size={13} /> SMARTWALLET AI
          </span>
          <h1>AI Financial Advisor</h1>
          <p>Trợ lý thông minh phân tích dòng tiền, chi tiêu và đưa ra các kế hoạch tích lũy tài chính dành riêng cho bạn.</p>
        </div>
        <div className="advisor-hero-icon">
          <Bot size={44} />
        </div>
      </section>

      <div className="advisor-workspace">
        {/* LEFT PANEL: CHATBOX */}
        <div className="chatbox-panel">
          <div className="chatbox-header">
            <div className="advisor-avatar-status">
              <div className="advisor-avatar-wrap">
                <Bot size={20} />
              </div>
              <div>
                <strong>SmartWallet Assistant</strong>
                <span className="status-online">● Trực tuyến</span>
              </div>
            </div>
          </div>

          <div className="chat-messages-scroll">
            <AnimatePresence initial={false}>
              {messages.map((m, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 350, damping: 25 }}
                  className={`message-row ${m.sender === "user" ? "user-row" : "ai-row"}`}
                >
                  <div className="message-avatar">
                    {m.sender === "user" ? <User size={15} /> : <Bot size={15} />}
                  </div>
                  <div className="message-content-bubble">
                    <p style={{ whiteSpace: "pre-line" }}>{m.text}</p>
                  </div>
                </motion.div>
              ))}

              {loading && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="message-row ai-row"
                >
                  <div className="message-avatar">
                    <Bot size={15} />
                  </div>
                  <div className="message-content-bubble loading-bubble">
                    <div className="dot-loading">
                      <span />
                      <span />
                      <span />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div ref={messagesEndRef} />
          </div>

          {/* WARNING BANNER */}
          {errorMsg && (
            <div className="error-banner">
              <AlertCircle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="chat-input-area">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Nhập câu hỏi của bạn tại đây (ví dụ: Phân tích giúp tôi 10 giao dịch gần nhất)..."
              rows={2}
            />
            <button
              onClick={() => handleSend()}
              disabled={loading || !input.trim()}
              className="btn-send-message"
            >
              {loading ? <RefreshCw size={16} className="spin-icon" /> : <Send size={16} />}
            </button>
          </div>
        </div>

        {/* RIGHT PANEL: QUICK PROMPTS & UTILITIES */}
        <div className="quick-panel">
          <div className="panel-section">
            <h3>💡 Gợi ý nhanh câu hỏi</h3>
            <p className="panel-desc">Click vào các câu hỏi gợi ý bên dưới để trợ lý phân tích dữ liệu ví của bạn ngay lập tức:</p>
            <div className="prompts-list">
              {quickPrompts.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => !loading && handleSend(p)}
                  disabled={loading}
                  className="prompt-card"
                >
                  <span>{p}</span>
                  <ArrowRight size={14} className="prompt-arrow" />
                </button>
              ))}
            </div>
          </div>

          <div className="panel-section dashboard-stats-card">
            <div className="stats-card-header">
              <Landmark size={18} />
              <h4>Lưu ý bảo mật</h4>
            </div>
            <p className="security-note">
              Trợ lý tài chính SmartWallet AI hoạt động dựa trên dữ liệu giao dịch nội bộ của bạn. 
              Chúng tôi bảo mật thông tin tuyệt đối và không chia sẻ dữ liệu này với bên thứ ba bên ngoài dịch vụ tư vấn.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

const chatbotStyles = `
.ai-advisor-container {
  display: flex;
  flex-direction: column;
  gap: 24px;
  max-width: 1480px;
  margin: 0 auto;
}

.advisor-hero {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  align-items: center;
  border-radius: 28px;
  padding: 28px;
  color: #fff;
  background:
    radial-gradient(circle at 8% 20%, rgba(255,255,255,.2), transparent 22%),
    linear-gradient(135deg, var(--dash-blue) 0%, #1e40af 50%, var(--dash-green) 100%);
  box-shadow: 0 24px 70px rgba(37, 99, 235, .15);
  overflow: hidden;
  position: relative;
}

.advisor-hero-text {
  position: relative;
  z-index: 1;
}

.badge-ai {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(255, 255, 255, 0.16);
  padding: 6px 12px;
  border-radius: 99px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.8px;
  margin-bottom: 12px;
}

.advisor-hero h1 {
  margin: 0 0 8px;
  font-size: clamp(24px, 4vw, 36px);
  font-weight: 900;
  color: #fff;
}

.advisor-hero p {
  margin: 0;
  max-width: 720px;
  color: rgba(255, 255, 255, 0.85);
  font-size: 14px;
  line-height: 1.6;
}

.advisor-hero-icon {
  width: 72px;
  height: 72px;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.16);
  display: grid;
  place-items: center;
  flex-shrink: 0;
  position: relative;
  z-index: 1;
}

.advisor-workspace {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(280px, 0.95fr);
  gap: 24px;
}

.chatbox-panel {
  background: #ffffff;
  border: 1px solid #e7edf5;
  border-radius: 20px;
  box-shadow: 0 18px 44px rgba(29, 45, 70, .06);
  display: flex;
  flex-direction: column;
  height: 600px;
  overflow: hidden;
}

.chatbox-header {
  padding: 18px 24px;
  border-bottom: 1px solid #e7edf5;
  background: #fbfdff;
}

.advisor-avatar-status {
  display: flex;
  align-items: center;
  gap: 12px;
}

.advisor-avatar-wrap {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: rgba(37, 99, 235, 0.08);
  color: var(--dash-blue);
  display: grid;
  place-items: center;
}

.advisor-avatar-status strong {
  display: block;
  font-size: 14px;
  color: #172033;
}

.status-online {
  font-size: 11px;
  color: var(--dash-green);
  font-weight: 700;
  display: block;
  margin-top: 2px;
}

.chat-messages-scroll {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 18px;
  background: #fafbfc;
}

.message-row {
  display: flex;
  gap: 12px;
  max-width: 80%;
}

.user-row {
  align-self: flex-end;
  flex-direction: row-reverse;
}

.ai-row {
  align-self: flex-start;
}

.message-avatar {
  width: 32px;
  height: 32px;
  border-radius: 9px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  background: #eef2f6;
  color: #64748b;
  margin-top: 2px;
}

.user-row .message-avatar {
  background: rgba(37, 99, 235, 0.08);
  color: var(--dash-blue);
}

.ai-row .message-avatar {
  background: rgba(17, 201, 129, 0.08);
  color: var(--dash-green);
}

.message-content-bubble {
  padding: 12px 18px;
  border-radius: 18px;
  font-size: 14px;
  line-height: 1.6;
}

.user-row .message-content-bubble {
  background: var(--dash-blue);
  color: #fff;
  border-top-right-radius: 4px;
}

.ai-row .message-content-bubble {
  background: #ffffff;
  color: #1e293b;
  border: 1px solid #e2e8f0;
  border-top-left-radius: 4px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.02);
}

.loading-bubble {
  display: flex;
  align-items: center;
  min-height: 42px;
}

.dot-loading {
  display: flex;
  gap: 4px;
}

.dot-loading span {
  width: 6px;
  height: 6px;
  background: #94a3b8;
  border-radius: 50%;
  animation: dot-blink 1.4s infinite both;
}

.dot-loading span:nth-child(2) {
  animation-delay: .2s;
}

.dot-loading span:nth-child(3) {
  animation-delay: .4s;
}

@keyframes dot-blink {
  0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
  40% { transform: scale(1); opacity: 1; }
}

.chat-input-area {
  padding: 16px 24px;
  border-top: 1px solid #e7edf5;
  background: #ffffff;
  display: flex;
  gap: 12px;
  align-items: center;
}

.chat-input-area textarea {
  flex: 1;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 12px 16px;
  font-family: inherit;
  font-size: 13px;
  resize: none;
  outline: none;
  transition: border-color 0.2s;
}

.chat-input-area textarea:focus {
  border-color: var(--dash-blue);
}

.btn-send-message {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  border: none;
  background: var(--dash-blue);
  color: #fff;
  display: grid;
  place-items: center;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}

.btn-send-message:hover {
  background: #1e40af;
  transform: translateY(-2px);
}

.btn-send-message:disabled {
  background: #e2e8f0;
  color: #94a3b8;
  cursor: not-allowed;
  transform: none;
}

.spin-icon {
  animation: spin 1.2s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-banner {
  margin: 0 24px;
  padding: 10px 14px;
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.15);
  border-radius: 10px;
  color: #ef4444;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
}

/* RIGHT PANEL */
.quick-panel {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.panel-section {
  background: #ffffff;
  border: 1px solid #e7edf5;
  border-radius: 20px;
  padding: 24px;
  box-shadow: 0 18px 44px rgba(29, 45, 70, .06);
}

.panel-section h3 {
  font-size: 16px;
  font-weight: 800;
  margin: 0 0 12px;
  color: #172033;
}

.panel-desc {
  font-size: 12px;
  color: #64748b;
  margin: 0 0 16px;
  line-height: 1.5;
}

.prompts-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.prompt-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border: 1px solid #eef2f6;
  border-radius: 12px;
  background: #fbfdff;
  cursor: pointer;
  text-align: left;
  font-family: inherit;
  font-size: 13px;
  font-weight: 700;
  color: #334155;
  transition: all 0.2s;
}

.prompt-card:hover {
  border-color: var(--dash-blue);
  background: rgba(37, 99, 235, 0.02);
  color: var(--dash-blue);
  transform: translateX(3px);
}

.prompt-arrow {
  color: #94a3b8;
  transition: transform 0.2s;
}

.prompt-card:hover .prompt-arrow {
  color: var(--dash-blue);
  transform: translateX(2px);
}

.dashboard-stats-card {
  border: 1px solid rgba(17, 201, 129, 0.15);
}

.stats-card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--dash-green);
  margin-bottom: 10px;
}

.stats-card-header h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 800;
}

.security-note {
  font-size: 12px;
  color: #64748b;
  line-height: 1.6;
  margin: 0;
}

@media(max-width: 980px) {
  .advisor-workspace {
    grid-template-columns: 1fr;
  }
}
`;
