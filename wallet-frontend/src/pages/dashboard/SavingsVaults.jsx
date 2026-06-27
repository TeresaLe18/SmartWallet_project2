import { useState, useEffect, useRef } from "react";
import { 
  TrendingUp, Wallet, Calculator, AlertTriangle, PlusCircle, 
  ArrowUpRight, ArrowDownLeft, Send, Sparkles, PiggyBank, Target, Trash2, ArrowUp
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { savingsVaultAPI, walletAPI, formatVND } from "../../services/api";
import { useLanguage } from "../../context/LanguageContext";

const CATEGORIES = [
  { id: "Dining", vi: "Ăn uống", en: "Dining", emoji: "🍔", aliases: ["Ăn uống", "dining"] },
  { id: "Travel", vi: "Đi lại", en: "Travel", emoji: "🚗", aliases: ["Đi lại", "Di chuyển", "travel", "transportation"] },
  { id: "Boba", vi: "Trà sữa & Giải trí", en: "Boba & Snacks", emoji: "🧋", aliases: ["Trà sữa & Giải trí", "Trà sữa", "boba"] },
  { id: "Shopping", vi: "Mua sắm", en: "Shopping", emoji: "🛍️", aliases: ["Mua sắm", "shopping"] },
  { id: "Housing", vi: "Nhà cửa", en: "Housing", emoji: "🏠", aliases: ["Nhà cửa", "housing"] },
  { id: "Bills", vi: "Hóa đơn", en: "Utilities/Bills", emoji: "💵", aliases: ["Hóa đơn", "Điện nước", "Điện nước & Hóa đơn", "bills", "utilities"] },
  { id: "General", vi: "Khác", en: "General", emoji: "💰", aliases: ["Khác", "General", "general"] }
];

const translateVaultName = (name, lang) => {
  if (lang !== "en" || !name) return name;
  const dict = {
    "Điện nước & Hóa đơn": "Utilities & Bills",
    "Quỹ Du lịch Hè": "Summer Travel Fund",
    "Mua sắm Tết": "Lunar New Year Shopping",
    "Ví tiết kiệm Nimo": "Nimo Savings Pocket"
  };
  return dict[name.trim()] || name;
};

export default function SavingsVaults() {
  const { lang, t } = useLanguage();
  const [walletBalance, setWalletBalance] = useState(0);
  const [vaults, setVaults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false); // deposit/withdraw
  const [modalType, setModalType] = useState("deposit"); // 'deposit' | 'withdraw'
  const [selectedVault, setSelectedVault] = useState(null);

  // Form states
  const [newVaultName, setNewVaultName] = useState("");
  const [newVaultTarget, setNewVaultTarget] = useState("");
  const [newVaultCategory, setNewVaultCategory] = useState("General");
  const [actionAmount, setActionAmount] = useState("");

  // AI Chat states
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState([
    { sender: "ai", text: t.savings.aiWelcome }
  ]);
  const chatBottomRef = useRef(null);

  const getScrollContainer = () => document.querySelector(".dash-content");

  const scrollToTop = (behavior = "smooth") => {
    getScrollContainer()?.scrollTo({ top: 0, behavior });
  };

  // Toasts
  const [toast, setToast] = useState(null);
  const toastTimeoutRef = useRef(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const showToast = (message, type = "success") => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast({ message, type });
    toastTimeoutRef.current = setTimeout(() => setToast(null), 5000);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const statsRes = await walletAPI.getStats();
      if (statsRes.success) {
        setWalletBalance(Number(statsRes.stats.currentBalance));
      }

      const vaultsRes = await savingsVaultAPI.getAll();
      if (vaultsRes.success) {
        setVaults(vaultsRes.vaults || []);
      }
    } catch (error) {
      console.error("Failed to load savings vaults:", error);
      showToast(lang === "vi" ? "Không thể tải danh sách ví tiết kiệm" : "Failed to load savings vaults", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    scrollToTop("auto");
    const handleUpdate = () => {
      walletAPI.getStats().then(statsRes => {
        if (statsRes.success) {
          setWalletBalance(Number(statsRes.stats.currentBalance));
        }
      });
    };
    window.addEventListener("balance_updated", handleUpdate);
    return () => {
      window.removeEventListener("balance_updated", handleUpdate);
    };
  }, []);

  useEffect(() => {
    const scrollEl = getScrollContainer();
    if (!scrollEl) return;

    const onScroll = () => setShowScrollTop(scrollEl.scrollTop > 320);
    scrollEl.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    return () => scrollEl.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  const handleCreateVault = async (e) => {
    e.preventDefault();
    if (!newVaultName.trim()) {
      showToast(lang === "vi" ? "Vui lòng nhập tên ví tiết kiệm" : "Please enter vault name", "error");
      return;
    }

    setSubmitting(true);
    try {
      const target = newVaultTarget ? Number(newVaultTarget) : null;
      const res = await savingsVaultAPI.create(newVaultName.trim(), target, newVaultCategory);
      if (res.success) {
        showToast(t.savings.depositSuccess || "Tạo ví tiết kiệm thành công!");
        setShowCreateModal(false);
        setNewVaultName("");
        setNewVaultTarget("");
        setNewVaultCategory("General");
        loadData();
      } else {
        showToast(res.message || "Lỗi tạo ví", "error");
      }
    } catch (error) {
      console.error("Failed to create vault:", error);
      showToast(lang === "vi" ? "Lỗi hệ thống khi tạo ví tiết kiệm" : "System error while creating vault", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleVaultAction = async (e) => {
    e.preventDefault();
    const amount = Number(actionAmount);
    if (isNaN(amount) || amount <= 0) {
      showToast(lang === "vi" ? "Vui lòng nhập số tiền hợp lệ" : "Please enter a valid amount", "error");
      return;
    }

    if (modalType === "deposit" && amount > walletBalance) {
      showToast(lang === "vi" ? "Số dư ví chính không đủ" : "Insufficient main wallet balance", "error");
      return;
    }

    if (modalType === "withdraw" && amount > Number(selectedVault.current_amount)) {
      showToast(lang === "vi" ? "Số tiền rút vượt quá số dư ví tiết kiệm" : "Withdrawal amount exceeds vault balance", "error");
      return;
    }

    setSubmitting(true);
    try {
      let res;
      if (modalType === "deposit") {
        res = await savingsVaultAPI.deposit(selectedVault.id, amount);
      } else {
        res = await savingsVaultAPI.withdraw(selectedVault.id, amount);
      }

      if (res.success) {
        showToast(
          modalType === "deposit" 
            ? (t.savings.depositSuccess || "Nạp vào ví tiết kiệm thành công!") 
            : (t.savings.withdrawSuccess || "Rút về ví chính thành công!")
        );
        setShowActionModal(false);
        setActionAmount("");
        setSelectedVault(null);
        if (res.wallet) {
          setWalletBalance(Number(res.wallet.balance) - Number(res.wallet.locked_balance || 0));
        }
        window.dispatchEvent(new CustomEvent("balance_updated"));
        loadData();
      } else {
        showToast(res.message || "Giao dịch thất bại", "error");
      }
    } catch (error) {
      console.error("Vault action error:", error);
      showToast(lang === "vi" ? "Lỗi giao dịch" : "Transaction error", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendChat = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = chatInput.trim();
    setChatInput("");
    setChatHistory(prev => [...prev, { sender: "user", text: userMsg }]);
    setChatLoading(true);

    try {
      const response = await fetch("/api/chat/advisor", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("bw_token")}`
        },
        body: JSON.stringify({ message: userMsg, history: chatHistory })
      });

      const resData = await response.json();
      if (response.ok && resData.success && resData.reply) {
        setChatHistory(prev => [...prev, { sender: "ai", text: resData.reply }]);
      } else {
        throw new Error(resData.message || "Use fallback");
      }
    } catch (err) {
      setTimeout(() => {
        const quotes = t.savings.motivationalQuotes || [
          "Mỗi đồng tiết kiệm hôm nay là một bước đệm cho tự do tài chính ngày mai!",
          "Bớt đi một ly trà sữa 50k mỗi ngày, sau 1 năm bạn sẽ dư ra hơn 18 triệu đồng đấy!"
        ];
        const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
        
        let reply = "";
        if (lang === "vi") {
          reply = `Dưới góc độ kế toán tài chính SmartWallet, tôi đã ghi nhận câu hỏi của bạn. Hiện tại, số dư khả dụng trên ví chính của bạn là **${formatVND(walletBalance)}**. \n\nTôi khuyên bạn nên phân bổ tối thiểu 20% thu nhập hàng tháng vào các ví tiết kiệm như Nimo hoặc trà sữa để tránh chi tiêu lãng phí. \n\n💡 **Lời khuyên thủ quỹ:** *"${randomQuote}"*`;
        } else {
          reply = `From a SmartWallet financial accounting perspective, I have received your message. Your active wallet balance is currently **${formatVND(walletBalance)}**. \n\nI highly advise setting aside at least 20% of your salary into custom savings vaults (like Summer Trip or emergency funds) immediately upon receiving it. \n\n💡 **Accountant's Advice:** *"${randomQuote}"*`;
        }
        setChatHistory(prev => [...prev, { sender: "ai", text: reply }]);
      }, 1000);
    } finally {
      setChatLoading(false);
    }
  };

  const getCategoryDetails = (catId) => {
    if (!catId) return CATEGORIES[CATEGORIES.length - 1];
    const cleanId = catId.trim().toLowerCase();
    
    // 1. Try exact match on ID
    let found = CATEGORIES.find(c => c.id.toLowerCase() === cleanId);
    if (found) return found;

    // 2. Try match on aliases
    found = CATEGORIES.find(c => 
      c.aliases && c.aliases.some(alias => alias.toLowerCase() === cleanId)
    );
    if (found) return found;

    // 3. Fallback
    return { vi: catId, en: catId, emoji: "💰" };
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.08 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 120 } }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      style={{ maxWidth: 1280, margin: "0 auto", paddingBottom: 60 }}
    >
      <style>{`
        .savings-grid {
          display: grid;
          grid-template-columns: 1.5fr 1fr;
          gap: 24px;
        }
        @media (max-width: 968px) {
          .savings-grid {
            grid-template-columns: 1fr;
          }
        }
        .vault-card {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 20px;
          padding: 20px;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 12px rgba(0,0,0,0.01);
        }
        .vault-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 25px rgba(0,0,0,0.04);
          border-color: var(--primary);
        }
        .chat-container {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 24px;
          display: flex;
          flex-direction: column;
          height: 600px;
          overflow: hidden;
          box-shadow: 0 8px 30px rgba(0,0,0,0.03);
        }
        .chat-feed {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          background: var(--bg-card2);
        }
        .chat-bubble {
          max-width: 80%;
          padding: 12px 16px;
          border-radius: 18px;
          font-size: 13px;
          line-height: 1.45;
        }
        .chat-bubble.ai {
          background: #ffffff;
          color: var(--text-primary);
          align-self: flex-start;
          border-bottom-left-radius: 4px;
          border: 1px solid var(--border);
        }
        .chat-bubble.user {
          background: var(--primary);
          color: white;
          align-self: flex-end;
          border-bottom-right-radius: 4px;
        }
        .modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          background: rgba(15, 23, 42, 0.4);
          backdrop-filter: blur(4px);
        }
        .modal-body {
          background: #ffffff;
          border-radius: 24px;
          padding: 28px;
          max-width: 480px;
          width: 100%;
          box-shadow: 0 20px 50px rgba(0,0,0,0.15);
          position: relative;
        }
        .cat-badge {
          font-size: 10px;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 12px;
          background: var(--bg-card2);
          color: var(--text-secondary);
        }
        .savings-scroll-top {
          position: fixed;
          right: 28px;
          bottom: 28px;
          z-index: 60;
          width: 44px;
          height: 44px;
          border-radius: 14px;
          border: 1px solid var(--border);
          background: var(--bg-card);
          color: var(--primary);
          display: grid;
          place-items: center;
          cursor: pointer;
          box-shadow: 0 12px 28px rgba(15, 23, 42, 0.12);
          transition: transform 0.2s, box-shadow 0.2s, opacity 0.2s;
        }
        .savings-scroll-top:hover {
          transform: translateY(-2px);
          box-shadow: 0 16px 32px rgba(15, 23, 42, 0.16);
        }
        @media (max-width: 1024px) {
          .savings-scroll-top {
            right: 18px;
            bottom: 18px;
          }
        }
      `}</style>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            style={{
              position: "fixed", top: 20, right: 20, zIndex: 99999,
              background: toast.type === "error" ? "rgba(239, 68, 68, 0.95)" : "rgba(34, 197, 94, 0.95)",
              color: "white", padding: "12px 24px", borderRadius: 12,
              backdropFilter: "blur(10px)", fontWeight: 600, fontSize: 14,
              boxShadow: "0 10px 25px rgba(0,0,0,0.15)", display: "flex", alignItems: "center", gap: 10
            }}
          >
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            type="button"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.2 }}
            className="savings-scroll-top"
            onClick={() => scrollToTop("smooth")}
            aria-label={lang === "vi" ? "Cuộn lên đầu trang" : "Scroll to top"}
          >
            <ArrowUp size={20} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Header Banner */}
      <div style={{
        background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
        borderRadius: 24, padding: "32px 28px", color: "white", marginBottom: 30,
        position: "relative", overflow: "hidden", boxShadow: "0 10px 30px rgba(15,23,42,0.15)"
      }}>
        <div style={{ position: "relative", zIndex: 1 }}>
          <span style={{ fontSize: 11, fontWeight: 900, textTransform: "uppercase", letterSpacing: "1.5px", color: "#38bdf8" }}>
            SmartWallet Piggy Banks
          </span>
          <h2 style={{ fontSize: 28, fontWeight: 800, marginTop: 6 }}>{t.savings.title}</h2>
          <p style={{ fontSize: 13, color: "#94a3b8", marginTop: 6, maxWidth: 600 }}>{t.savings.subtitle}</p>
        </div>
        <PiggyBank size={140} style={{ position: "absolute", right: 20, bottom: -20, color: "rgba(255,255,255,0.04)" }} />
      </div>

      <div className="savings-grid">
        {/* Main Vaults Panel */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ fontSize: 16, fontWeight: 800 }}>{lang === "vi" ? "Các hũ tiết kiệm hiện có" : "Your Savings Vaults"}</h3>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary"
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 12, fontSize: 12 }}
            >
              <PlusCircle size={15} />
              {t.savings.createVault}
            </button>
          </div>

          {loading ? (
            <div style={{ textAlign: "center", padding: "60px 0" }}>
              <div style={{
                width: 32, height: 32, border: "3px solid var(--border)", borderTopColor: "var(--primary)",
                borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 12px"
              }} />
              <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>{lang === "vi" ? "Đang tải ví nhỏ..." : "Loading vaults..."}</p>
            </div>
          ) : vaults.length === 0 ? (
            <div style={{
              background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 20,
              textAlign: "center", padding: "60px 20px", color: "var(--text-secondary)"
            }}>
              <PiggyBank size={48} style={{ margin: "0 auto 16px", color: "var(--text-muted)" }} />
              <p style={{ fontWeight: 700 }}>{t.savings.noVaults}</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
              {vaults.map((vault) => {
                const cat = getCategoryDetails(vault.category);
                const current = Number(vault.current_amount || 0);
                const target = vault.target_amount ? Number(vault.target_amount) : 0;
                
                let percent = 0;
                if (target > 0) {
                  percent = Math.min(100, Math.round((current / target) * 100));
                }

                return (
                  <motion.div
                    key={vault.id}
                    variants={itemVariants}
                    className="vault-card"
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        <span style={{ fontSize: 24 }}>{cat.emoji}</span>
                        <div>
                          <h4 style={{ fontSize: 14, fontWeight: 800, color: "var(--text-primary)" }}>{translateVaultName(vault.name, lang)}</h4>
                          <span className="cat-badge">{lang === "vi" ? cat.vi : cat.en}</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ marginBottom: 16 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4 }}>
                        <span style={{ color: "var(--text-secondary)" }}>{t.savings.currentAmount}:</span>
                        <strong style={{ color: "var(--text-primary)" }}>{formatVND(current)}</strong>
                      </div>
                      {target > 0 && (
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 8 }}>
                          <span style={{ color: "var(--text-secondary)" }}>{t.savings.targetAmountLabel}:</span>
                          <strong style={{ color: "var(--text-primary)" }}>{formatVND(target)}</strong>
                        </div>
                      )}
                      
                      {target > 0 && (
                        <div>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--text-secondary)", marginBottom: 4 }}>
                            <span>{t.savings.progress}</span>
                            <span>{percent}%</span>
                          </div>
                          <div style={{ width: "100%", height: 6, background: "var(--bg-card2)", borderRadius: 3, overflow: "hidden" }}>
                            <div style={{ width: `${percent}%`, height: "100%", background: percent >= 100 ? "#22c55e" : "var(--primary)", borderRadius: 3, transition: "width 0.4s ease" }} />
                          </div>
                        </div>
                      )}
                    </div>

                    <div style={{ display: "flex", gap: 10 }}>
                      <button
                        onClick={() => {
                          setSelectedVault(vault);
                          setModalType("deposit");
                          setShowActionModal(true);
                        }}
                        className="btn-primary"
                        style={{ flex: 1, padding: "8px 10px", borderRadius: 10, fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}
                      >
                        <ArrowDownLeft size={14} />
                        {t.savings.deposit}
                      </button>
                      <button
                        disabled={current <= 0}
                        onClick={() => {
                          setSelectedVault(vault);
                          setModalType("withdraw");
                          setShowActionModal(true);
                        }}
                        className="btn-secondary"
                        style={{ flex: 1, padding: "8px 10px", borderRadius: 10, fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}
                      >
                        <ArrowUpRight size={14} />
                        {t.savings.withdraw}
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* AI Accountant Chat Box Widget */}
        <div className="chat-container">
          <div style={{
            background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
            padding: "16px 20px", color: "white", display: "flex", alignItems: "center", gap: 10,
            boxShadow: "0 4px 15px rgba(29,78,216,0.15)"
          }}>
            <Sparkles size={20} />
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 800 }}>{t.savings.aiAccountant}</h3>
              <p style={{ fontSize: 10, color: "rgba(255,255,255,0.78)" }}>● {lang === "vi" ? "Thủ quỹ ngân hàng" : "SmartWallet Treasurer Assistant"}</p>
            </div>
          </div>

          <div className="chat-feed">
            {chatHistory.map((msg, i) => (
              <div key={i} className={`chat-bubble ${msg.sender}`}>
                <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{msg.text}</p>
              </div>
            ))}
            {chatLoading && (
              <div className="chat-bubble ai" style={{ display: "flex", gap: 4, padding: "10px 14px" }}>
                <span className="typing-dot" style={{ width: 6, height: 6, background: "var(--text-secondary)", borderRadius: "50%", animation: "bounce 0.6s infinite alternate" }} />
                <span className="typing-dot" style={{ width: 6, height: 6, background: "var(--text-secondary)", borderRadius: "50%", animation: "bounce 0.6s infinite alternate 0.2s" }} />
                <span className="typing-dot" style={{ width: 6, height: 6, background: "var(--text-secondary)", borderRadius: "50%", animation: "bounce 0.6s infinite alternate 0.4s" }} />
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          <form onSubmit={handleSendChat} style={{ borderTop: "1px solid var(--border)", padding: 12, display: "flex", gap: 10, background: "#ffffff" }}>
            <input
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              placeholder={t.savings.chatPlaceholder}
              style={{
                flex: 1, border: "1px solid var(--border)", borderRadius: 14,
                padding: "10px 14px", fontSize: 13, outline: "none"
              }}
            />
            <button
              type="submit"
              style={{
                background: "var(--primary)", border: "none", borderRadius: 14,
                width: 40, height: 40, display: "grid", placeItems: "center", color: "white", cursor: "pointer"
              }}
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      </div>

      {/* CREATE SAVINGS VAULT MODAL */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="modal-overlay">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="modal-body"
            >
              <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 18 }}>{t.savings.createVault}</h3>
              <form onSubmit={handleCreateVault} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>
                    {t.savings.vaultName} *
                  </label>
                  <input
                    type="text"
                    required
                    value={newVaultName}
                    onChange={e => setNewVaultName(e.target.value)}
                    className="input-field"
                    placeholder={t.savings.vaultNamePlaceholder}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>
                    {t.savings.targetAmount}
                  </label>
                  <input
                    type="number"
                    value={newVaultTarget}
                    onChange={e => setNewVaultTarget(e.target.value)}
                    className="input-field"
                    placeholder={lang === "vi" ? "VD: 5000000" : "e.g. 5000000"}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>
                    {t.savings.category}
                  </label>
                  <select
                    value={newVaultCategory}
                    onChange={e => setNewVaultCategory(e.target.value)}
                    className="input-field"
                    style={{ background: "#fff", cursor: "pointer" }}
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {cat.emoji} {lang === "vi" ? cat.vi : cat.en}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: "flex", gap: 12, marginTop: 10 }}>
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="btn-secondary"
                    style={{ flex: 1, padding: 12, borderRadius: 12 }}
                  >
                    {lang === "vi" ? "Hủy" : "Cancel"}
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn-primary"
                    style={{ flex: 1, padding: 12, borderRadius: 12 }}
                  >
                    {submitting ? (lang === "vi" ? "Đang tạo..." : "Creating...") : (lang === "vi" ? "Xác nhận tạo" : "Confirm Create")}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DEPOSIT / WITHDRAW ACTION MODAL */}
      <AnimatePresence>
        {showActionModal && selectedVault && (
          <div className="modal-overlay">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="modal-body"
            >
              <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 6 }}>
                {modalType === "deposit" ? t.savings.depositLabel : t.savings.withdrawLabel}
              </h3>
              <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 18 }}>
                {lang === "vi" ? "Ví tiết kiệm:" : "Savings Vault:"} <strong>{translateVaultName(selectedVault.name, lang)}</strong>
              </p>

              <form onSubmit={handleVaultAction} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius: 12, padding: 12, fontSize: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ color: "var(--text-secondary)" }}>{lang === "vi" ? "Số dư Ví chính:" : "Main Wallet Balance:"}</span>
                    <strong>{formatVND(walletBalance)}</strong>
                  </div>
                  {modalType === "deposit" && Number(actionAmount) > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ color: "var(--text-secondary)" }}>{lang === "vi" ? "Còn lại sau khi nạp:" : "Remaining after deposit:"}</span>
                      <strong style={{ color: "var(--primary)" }}>{formatVND(Math.max(0, walletBalance - Number(actionAmount)))}</strong>
                    </div>
                  )}
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--text-secondary)" }}>{lang === "vi" ? "Đã tiết kiệm trong hũ:" : "Savings Vault Balance:"}</span>
                    <strong>{formatVND(Number(selectedVault.current_amount || 0))}</strong>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>
                    {modalType === "deposit" ? t.savings.amountToDeposit : t.savings.amountToWithdraw}
                  </label>
                  <input
                    type="number"
                    required
                    value={actionAmount}
                    onChange={e => setActionAmount(e.target.value)}
                    className="input-field"
                    placeholder={lang === "vi" ? "VD: 50000" : "e.g. 50000"}
                  />
                </div>

                <div style={{ display: "flex", gap: 12, marginTop: 10 }}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowActionModal(false);
                      setActionAmount("");
                      setSelectedVault(null);
                    }}
                    className="btn-secondary"
                    style={{ flex: 1, padding: 12, borderRadius: 12 }}
                  >
                    {lang === "vi" ? "Hủy" : "Cancel"}
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn-primary"
                    style={{ flex: 1, padding: 12, borderRadius: 12 }}
                  >
                    {submitting ? (lang === "vi" ? "Đang xử lý..." : "Processing...") : (lang === "vi" ? "Xác nhận giao dịch" : "Confirm Transaction")}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes bounce {
          to { transform: translateY(-4px); }
        }
      `}</style>
    </motion.div>
  );
}
