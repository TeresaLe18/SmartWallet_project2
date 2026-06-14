import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  TrendingUp, TrendingDown, ArrowUpRight, ArrowDownLeft,
  Wallet, Sparkles, ChevronRight, Calendar,
  BarChart3, Newspaper, X, Send, Settings
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";
import { newsAPI, walletAPI, authAPI, statisticsAPI, formatVND } from "../../services/api";

const getUserBaseBalance = (email) => {
  if (!email) return 0;
  const lower = email.toLowerCase();
  if (lower === "nva@email.com") return 12500000;
  if (lower === "ttb@email.com") return 3200000;
  if (lower === "lvc@email.com") return 0;
  if (lower === "ptd@email.com") return 8750000;
  if (lower === "hme@email.com") return 1000000;
  return 0;
};

const parseTxTime = (timeStr) => {
  if (!timeStr) return new Date();
  try {
    const parts = timeStr.trim().split(" ");
    if (parts.length === 2 && parts[1].includes("/")) {
      const [hour, minute] = parts[0].split(":");
      const [day, month, year] = parts[1].split("/");
      return new Date(
        Number(year),
        Number(month) - 1,
        Number(day),
        Number(hour || 0),
        Number(minute || 0)
      );
    }
    const d = new Date(timeStr);
    return isNaN(d.getTime()) ? new Date() : d;
  } catch (e) {
    return new Date();
  }
};

const getSpendingData = (txs, filter) => {
  const now = new Date();

  if (filter === "1d") {
    const data = [
      { month: "00-06h", income: 0, expense: 0 },
      { month: "06-12h", income: 0, expense: 0 },
      { month: "12-18h", income: 0, expense: 0 },
      { month: "18-24h", income: 0, expense: 0 },
    ];

    txs.forEach(tx => {
      if (tx.status !== "success") return;
      const txDate = parseTxTime(tx.time);
      const diffTime = now.getTime() - txDate.getTime();
      if (diffTime >= 0 && diffTime <= 24 * 60 * 60 * 1000) {
        const hour = txDate.getHours();
        const idx = Math.min(3, Math.floor(hour / 6));
        if (tx.type === "receive") {
          data[idx].income += tx.amount;
        } else if (tx.type === "send") {
          data[idx].expense += tx.amount;
        }
      }
    });
    return data;
  }

  if (filter === "1w") {
    const data = [];
    const weekdays = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const dateStr = d.toLocaleDateString("vi-VN");
      data.push({
        dateStr,
        month: weekdays[d.getDay()],
        income: 0,
        expense: 0
      });
    }

    txs.forEach(tx => {
      if (tx.status !== "success") return;
      const txDate = parseTxTime(tx.time);
      const txDateStr = txDate.toLocaleDateString("vi-VN");
      const found = data.find(item => item.dateStr === txDateStr);
      if (found) {
        if (tx.type === "receive") {
          found.income += tx.amount;
        } else if (tx.type === "send") {
          found.expense += tx.amount;
        }
      }
    });
    return data;
  }

  if (filter === "1m") {
    const data = [
      { month: "Tuần 1", income: 0, expense: 0 },
      { month: "Tuần 2", income: 0, expense: 0 },
      { month: "Tuần 3", income: 0, expense: 0 },
      { month: "Tuần 4", income: 0, expense: 0 },
    ];

    txs.forEach(tx => {
      if (tx.status !== "success") return;
      const txDate = parseTxTime(tx.time);
      const diffDays = Math.floor((now.getTime() - txDate.getTime()) / (24 * 60 * 60 * 1000));
      if (diffDays >= 0 && diffDays < 30) {
        let idx = 3;
        if (diffDays >= 22) idx = 0;
        else if (diffDays >= 15) idx = 1;
        else if (diffDays >= 8) idx = 2;

        if (tx.type === "receive") {
          data[idx].income += tx.amount;
        } else if (tx.type === "send") {
          data[idx].expense += tx.amount;
        }
      }
    });
    return data;
  }

  // 1 Year (1y)
  const data = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthNum = d.getMonth() + 1;
    data.push({
      year: d.getFullYear(),
      monthIndex: d.getMonth(),
      month: `T${monthNum}`,
      income: 0,
      expense: 0
    });
  }

  txs.forEach(tx => {
    if (tx.status !== "success") return;
    const txDate = parseTxTime(tx.time);
    const found = data.find(item => item.year === txDate.getFullYear() && item.monthIndex === txDate.getMonth());
    if (found) {
      if (tx.type === "receive") {
        found.income += tx.amount;
      } else if (tx.type === "send") {
        found.expense += tx.amount;
      }
    }
  });
  return data;
};

const getCategoryData = (txs, filter) => {
  const now = new Date();

  let durationMs = 30 * 24 * 60 * 60 * 1000;
  if (filter === "1d") durationMs = 24 * 60 * 60 * 1000;
  else if (filter === "1w") durationMs = 7 * 24 * 60 * 60 * 1000;
  else if (filter === "1m") durationMs = 30 * 24 * 60 * 60 * 1000;
  else if (filter === "1y") durationMs = 365 * 24 * 60 * 60 * 1000;

  const categorySums = {
    "Ăn uống": 0,
    "Di chuyển": 0,
    "Mua sắm": 0,
    "Giải trí": 0,
    "Hóa đơn": 0,
    "Khác": 0
  };

  let totalExpense = 0;

  txs.forEach(tx => {
    if (tx.status !== "success" || tx.type !== "send") return;
    const txDate = parseTxTime(tx.time);
    const diffTime = now.getTime() - txDate.getTime();

    if (diffTime >= 0 && diffTime <= durationMs) {
      let cat = tx.category || "Khác";
      if (!categorySums.hasOwnProperty(cat)) {
        cat = "Khác";
      }
      categorySums[cat] += tx.amount;
      totalExpense += tx.amount;
    }
  });

  const colors = {
    "Ăn uống": "#2563eb",
    "Di chuyển": "#f59e0b",
    "Mua sắm": "#3b82f6",
    "Giải trí": "#8b5cf6",
    "Hóa đơn": "#ec4899",
    "Khác": "#22c55e"
  };

  const data = Object.keys(categorySums).map(name => {
    const val = categorySums[name];
    const pct = totalExpense > 0 ? Math.round((val / totalExpense) * 100) : 0;
    return {
      name,
      value: pct,
      amount: val,
      color: colors[name]
    };
  });

  return {
    chartData: totalExpense > 0 ? data.filter(d => d.value > 0) : [{ name: "Chưa có chi tiêu", value: 100, color: "#27272a", amount: 0 }],
    listData: data,
    totalExpense
  };
};

const formatTxDateAndTime = (timeStr) => {
  if (!timeStr) return { time: "", date: "" };
  try {
    const parts = timeStr.trim().split(" ");
    if (parts.length < 2) return { time: timeStr, date: "" };

    const timePart = parts[0];
    const datePart = parts[1];

    const now = new Date();
    const nowStr = now.toLocaleDateString("vi-VN");

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toLocaleDateString("vi-VN");

    let dateDisplay = datePart;
    if (datePart === nowStr) {
      dateDisplay = "Hôm nay";
    } else if (datePart === yesterdayStr) {
      dateDisplay = "Hôm qua";
    }

    return { time: timePart, date: dateDisplay };
  } catch (e) {
    return { time: timeStr, date: "" };
  }
};

const getMockUserEmailByName = (name) => {
  if (!name) return null;
  const lower = name.toLowerCase();
  if (lower.includes("nguyễn văn a")) return "nva@email.com";
  if (lower.includes("trần thị b")) return "ttb@email.com";
  if (lower.includes("lê văn c")) return "lvc@email.com";
  if (lower.includes("phạm thị d")) return "ptd@email.com";
  if (lower.includes("hoàng minh e")) return "hme@email.com";
  return null;
};

const mapBackendTx = (tx, currentEmail) => {
  const isSender = tx.sender_wallet && tx.sender_wallet.user && tx.sender_wallet.user.email === currentEmail;
  const type = isSender ? "send" : "receive";

  let name = "";
  if (tx.transaction_type === 'DEPOSIT') name = "Nạp tiền vào ví";
  else if (tx.transaction_type === 'WITHDRAW') name = `Rút tiền về ${tx.bank_code || 'ngân hàng'}`;
  else if (tx.transaction_type === 'TRANSFER') {
    name = isSender
      ? `Chuyển tiền đến ${tx.receiver_wallet?.user?.email || 'người nhận'}`
      : `Nhận tiền từ ${tx.sender_wallet?.user?.email || 'người gửi'}`;
  } else name = tx.message || "Giao dịch khác";

  const date = new Date(tx.created_at || tx.createdAt);
  const timeStr = date.toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' }) + " " + date.toLocaleDateString("vi-VN");

  return {
    id: tx.reference_code || `TX${tx.id}`,
    type,
    name,
    amount: Number(tx.amount),
    time: timeStr,
    status: tx.status.toLowerCase(),
    note: tx.message || "",
    category: tx.category?.name || "Other"
  };
};

const getMonthlyStats = (txs) => {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  let monthlyIncome = 0;
  let monthlyExpense = 0;

  txs.forEach(tx => {
    if (tx.status !== "success") return;
    const txDate = parseTxTime(tx.time);
    if (txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear) {
      if (tx.type === "receive") monthlyIncome += tx.amount;
      else if (tx.type === "send") monthlyExpense += tx.amount;
    }
  });

  return { monthlyIncome, monthlyExpense };
};

const fmtCurrency = (n) => {
  const abs = Math.abs(n);
  return (n < 0 ? "-" : "+") + formatVND(abs);
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius: 10, padding: "12px 16px" }}>
      <p style={{ color: "var(--text-secondary)", fontSize: 12, marginBottom: 8 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color, fontSize: 13, fontWeight: 600 }}>
          {p.name}: {formatVND(p.value)}
        </p>
      ))}
    </div>
  );
};

const fmtCleanCurrency = (n) => formatVND(n);

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [timeFilterMonth, setTimeFilterMonth] = useState("1y");
  const [timeFilterCategory, setTimeFilterCategory] = useState("month");
  const [categoryStats, setCategoryStats] = useState({ chartData: [], listData: [], totalExpense: 0 });
  const [transactions, setTransactions] = useState([]);
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [selectedNews, setSelectedNews] = useState(null);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState([
    { role: "ai", text: "Chào bạn! Tôi là trợ lý tài chính SmartWallet AI. Bạn cần tôi tư vấn gì về quản lý chi tiêu hay tối ưu hóa dòng tiền hôm nay?" }
  ]);
  const [aiTyping, setAiTyping] = useState(false);
  const [balance, setBalance] = useState(0);
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState("");

  const handleSendChatMessage = async () => {
    if (!chatInput.trim() || aiTyping) return;
    const userText = chatInput.trim();
    setChatInput("");

    const newMsgList = [...chatMessages, { role: "user", text: userText }];
    setChatMessages(newMsgList);
    setAiTyping(true);

    try {
      const currentMonthCategoryData = getCategoryData(transactions, "1m");
      const categoryBreakdownStr = currentMonthCategoryData.listData
        .map(c => `${c.name} (${c.value}%)`)
        .join(", ");

      const prompt = `Bạn là trợ lý tư vấn tài chính cá nhân của ví điện tử SmartWallet Wallet. Bạn tên là SmartWallet AI. Hãy tư vấn cho người dùng thật chuyên nghiệp, lịch sự, ngắn gọn và hữu ích về các mẹo tiết kiệm tiền, tối ưu hóa ngân sách, quản lý chi tiêu. Số dư hiện tại của người dùng là ${balance.toLocaleString("vi-VN")} ₫. Chi tiêu tháng này là ${currentMonthCategoryData.totalExpense.toLocaleString("vi-VN")} ₫ cho các khoản: ${categoryBreakdownStr}. Trả lời thân thiện, ngắn gọn bằng tiếng Việt.\n\nLịch sử trò chuyện:\n${newMsgList.map(m => `${m.role === 'user' ? 'Người dùng' : 'SmartWallet AI'}: ${m.text}`).join('\n')}\nSmartWallet AI:`;

      let savedKey = localStorage.getItem("bw_gemini_api_key") || "";

      if (!savedKey) {
        setAiTyping(false);
        setShowApiKeyInput(true);
        setApiKeyInput("");
        setChatMessages(prev => [...prev, {
          role: "ai",
          text: "🔑 Vui lòng cấu hình Gemini API Key cá nhân để sử dụng tính năng AI. Nhấn vào ⚙️ ở góc trên bên phải khung chat, sau đó lấy key miễn phí tại aistudio.google.com."
        }]);
        return;
      }

      const attempts = [
        { model: "gemini-1.5-flash", version: "v1beta" },
        { model: "gemini-1.5-flash", version: "v1" },
        { model: "gemini-2.0-flash", version: "v1beta" },
        { model: "gemini-2.5-flash", version: "v1beta" },
        { model: "gemini-pro", version: "v1beta" }
      ];
      let replyText = "";
      let lastErrorMessage = "";
      let keyInvalid = false;

      for (const att of attempts) {
        try {
          const res = await fetch(`https://generativelanguage.googleapis.com/${att.version}/models/${att.model}:generateContent?key=${savedKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }]
            })
          });

          if (res.status === 200) {
            const data = await res.json();
            replyText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
            if (replyText) break;
          } else {
            const errData = await res.json().catch(() => ({}));
            lastErrorMessage = errData?.error?.message || `HTTP ${res.status}`;
            const errLower = lastErrorMessage.toLowerCase();
            const isKeyError = res.status === 401
              || errLower.includes("api key not valid")
              || errLower.includes("api_key_invalid")
              || errLower.includes("invalid api key")
              || errLower.includes("expired")
              || errLower.includes("api key expired");
            if (isKeyError) {
              keyInvalid = true;
              break;
            }
          }
        } catch (e) {
          lastErrorMessage = e.message || "Network Error";
        }
      }

      if (keyInvalid) {
        localStorage.removeItem("bw_gemini_api_key");
        setShowApiKeyInput(true);
        setApiKeyInput("");
        setChatMessages(prev => [...prev, {
          role: "ai",
          text: "🔑 API Key của bạn đã hết hạn hoặc không hợp lệ. Vui lòng nhập API Key mới trong khung bên dưới (lấy miễn phí tại aistudio.google.com)."
        }]);
      } else {
        const reply = replyText || `Xin lỗi, tôi đang gặp sự cố kết nối. Vui lòng thử lại sau. (${lastErrorMessage})`;
        setChatMessages(prev => [...prev, { role: "ai", text: reply }]);
      }
    } catch (err) {
      setChatMessages(prev => [...prev, { role: "ai", text: "Xin lỗi, hiện tại tôi đang gặp khó khăn kết nối với máy chủ AI. Bạn vui lòng thử lại sau nhé!" }]);
    } finally {
      setAiTyping(false);
    }
  };

  const loadUserData = async () => {
    const u = localStorage.getItem("bw_user");
    if (!u) return;
    try {
      const parsedUser = JSON.parse(u);
      setUser(parsedUser);
      if (parsedUser.email) {
        // Fetch stats (current balance) from live database
        const statsRes = await walletAPI.getStats();
        if (statsRes.success) {
          setBalance(Number(statsRes.stats.currentBalance));
        }

        // Fetch transactions from live database
        const txsRes = await walletAPI.getTransactions();
        if (txsRes.success) {
          const mapped = txsRes.transactions.map(t => mapBackendTx(t, parsedUser.email));
          setTransactions(mapped);
        }
      }
    } catch (e) {
      console.error("Failed to load user data from API:", e);
    }
  };

  useEffect(() => {
    const initData = async () => {
      setLoading(true);
      try {
        await Promise.all([
          loadUserData(),
          (async () => {
            try {
              const res = await newsAPI.getNews();
              if (res.success) {
                setPosts(res.posts);
              }
            } catch (error) {
              console.error("Failed to fetch news posts:", error);
            }
          })()
        ]);
      } catch (e) {
        console.error("Error loading dashboard data:", e);
      } finally {
        setLoading(false);
      }
    };
    initData();

    const handleUpdate = () => {
      loadUserData();
    };
    window.addEventListener("balance_updated", handleUpdate);

    return () => {
      window.removeEventListener("balance_updated", handleUpdate);
    };
  }, []);

  // Pie "chi tiêu theo danh mục" lấy từ backend /statistics/spending (server-authoritative, theo tuần/tháng/năm)
  useEffect(() => {
    statisticsAPI.spending(timeFilterCategory).then(res => {
      if (!res?.success) return;
      const total = res.totalSpending || 0;
      const COLORS = ["#2563eb", "#f59e0b", "#3b82f6", "#8b5cf6", "#ec4899", "#22c55e", "#06b6d4", "#ef4444"];
      const listData = res.byCategory.map((c, i) => ({
        name: c.categoryName,
        value: total > 0 ? Math.round((c.total / total) * 100) : 0,
        amount: c.total,
        color: COLORS[i % COLORS.length],
      }));
      setCategoryStats({
        chartData: total > 0 ? listData.filter(d => d.value > 0) : [{ name: "Chưa có chi tiêu", value: 100, color: "#27272a", amount: 0 }],
        listData,
        totalExpense: total,
      });
    }).catch(() => {});
  }, [timeFilterCategory]);

  const { monthlyIncome, monthlyExpense } = getMonthlyStats(transactions);
  const dynamicSpendingData = getSpendingData(transactions, timeFilterMonth);
  const { chartData: dynamicCategoryData, listData: categoryLegendData } = categoryStats;

  const stats = [
    {
      label: "Số dư ví",
      value: fmtCleanCurrency(balance),
      change: "--",
      up: true,
      icon: Wallet,
      color: "#2563eb",
    },
    {
      label: "Thu nhập tháng",
      value: fmtCleanCurrency(monthlyIncome),
      change: "--",
      up: true,
      icon: TrendingUp,
      color: "#22c55e",
    },
    {
      label: "Chi tiêu tháng",
      value: fmtCleanCurrency(monthlyExpense),
      change: "--",
      up: false,
      icon: TrendingDown,
      color: "#f59e0b",
    },
    {
      label: "Giao dịch",
      value: `${transactions.length} GD`,
      change: "--",
      up: true,
      icon: BarChart3,
      color: "#3b82f6",
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 1400 }}>
      {/* Welcome */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>
          Xin chào, {user?.name || "bạn"} 👋
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
          Đây là tổng quan tài chính của bạn hôm nay, {new Date().toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "long" })}
        </p>
      </motion.div>

      {/* Stats Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
        {stats.map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08, duration: 0.4 }}
            style={{
              background: "var(--bg-card)", border: "1px solid var(--border)",
              borderRadius: 16, padding: 20, position: "relative", overflow: "hidden"
            }}
          >
            {loading ? (
              <div>
                <div className="skeleton" style={{ height: 14, width: "60%", marginBottom: 12 }} />
                <div className="skeleton" style={{ height: 24, width: "80%", marginBottom: 8 }} />
                <div className="skeleton" style={{ height: 12, width: "40%" }} />
              </div>
            ) : (
              <>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>{s.label}</p>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: `${s.color}20`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <s.icon size={18} style={{ color: s.color }} />
                  </div>
                </div>
                <p style={{ fontSize: 20, fontWeight: 800, marginBottom: 6 }}>{s.value}</p>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  {s.up ? <TrendingUp size={12} style={{ color: "#22c55e" }} /> : <TrendingDown size={12} style={{ color: "#ef4444" }} />}
                  <span style={{ fontSize: 12, color: s.up ? "#22c55e" : "#ef4444", fontWeight: 600 }}>{s.change}</span>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>so với tháng trước</span>
                </div>
                {/* background accent */}
                <div style={{ position: "absolute", bottom: -20, right: -20, width: 80, height: 80, borderRadius: "50%", background: `${s.color}08` }} />
              </>
            )}
          </motion.div>
        ))}
      </div>

      {/* Charts Row */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>
        {/* Area Chart */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: 24 }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 700 }}>Thu chi theo tháng</h3>
              <p style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>Tổng quan dòng tiền</p>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {[
                { key: "1d", label: "1 ngày" },
                { key: "1w", label: "1 tuần" },
                { key: "1m", label: "1 tháng" },
                { key: "1y", label: "1 năm" }
              ].map(f => (
                <button key={f.key} onClick={() => setTimeFilterMonth(f.key)} style={{
                  padding: "4px 10px", borderRadius: 6, fontSize: 12, fontWeight: 500,
                  background: timeFilterMonth === f.key ? "rgba(37,99,235,0.15)" : "#ffffff",
                  border: `1px solid ${timeFilterMonth === f.key ? "rgba(37,99,235,0.3)" : "var(--border)"}`,
                  color: timeFilterMonth === f.key ? "#2563eb" : "#000000", cursor: "pointer"
                }}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          {loading ? (
            <div className="skeleton" style={{ height: 200 }} />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={dynamicSpendingData}>
                <defs>
                  <linearGradient id="income" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22c55e" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="expense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563eb" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" tick={{ fill: "var(--text-secondary)", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "var(--text-secondary)", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => {
                  if (v >= 1000000) return `${v / 1000000}M`;
                  if (v >= 1000) return `${v / 1000}K`;
                  return v;
                }} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="income" name="Thu nhập" stroke="#22c55e" strokeWidth={2} fill="url(#income)" />
                <Area type="monotone" dataKey="expense" name="Chi tiêu" stroke="#2563eb" strokeWidth={2} fill="url(#expense)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </motion.div>

        {/* Pie Chart */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: 24 }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700 }}>Chi tiêu theo danh mục</h3>
            <div style={{ display: "flex", gap: 6 }}>
              {[
                { key: "week", label: "Tuần" },
                { key: "month", label: "Tháng" },
                { key: "year", label: "Năm" }
              ].map(f => (
                <button key={f.key} onClick={() => setTimeFilterCategory(f.key)} style={{
                  padding: "4px 10px", borderRadius: 6, fontSize: 12, fontWeight: 500,
                  background: timeFilterCategory === f.key ? "rgba(37,99,235,0.15)" : "#ffffff",
                  border: `1px solid ${timeFilterCategory === f.key ? "rgba(37,99,235,0.3)" : "var(--border)"}`,
                  color: timeFilterCategory === f.key ? "#2563eb" : "#000000", cursor: "pointer"
                }}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          {loading ? (
            <div className="skeleton" style={{ height: 200 }} />
          ) : (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={dynamicCategoryData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                    {dynamicCategoryData.map((c, i) => (
                      <Cell key={i} fill={c.color} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => `${v}%`} contentStyle={{ background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
                {categoryLegendData.map((c, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: 2, background: c.color }} />
                      <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{c.name}</span>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 600 }}>{c.value}%</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </motion.div>
      </div>

      {/* AI Tips + News + Recent Tx */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* AI Chatbot widget */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          style={{
            background: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)",
            border: "1px solid rgba(37,99,235,0.15)",
            borderRadius: 16, padding: 24, display: "flex", flexDirection: "column", height: 380
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(37,99,235,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Sparkles size={16} style={{ color: "var(--primary)" }} />
              </div>
              <div>
                <h3 style={{ fontSize: 14, fontWeight: 700 }}>AI Tư vấn chi tiêu</h3>
                <p style={{ fontSize: 11, color: "var(--primary-dark)" }}>Powered by AI (Gemini Pro)</p>
              </div>
            </div>

            <button
              onClick={() => {
                setShowApiKeyInput(!showApiKeyInput);
                const k = localStorage.getItem("bw_gemini_api_key") || "";
                setApiKeyInput(k);
              }}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--primary)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 6,
                borderRadius: "50%",
                transition: "background 0.2s"
              }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(139,92,246,0.1)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              <Settings size={16} />
            </button>
          </div>

          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
              {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 50 }} />)}
            </div>
          ) : (
            <>
              {showApiKeyInput ? (
                <div style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  padding: 16,
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  flex: 1,
                  justifyContent: "center"
                }}>
                  <h4 style={{ fontSize: 13, fontWeight: 700, color: "white" }}>Cấu hình Gemini API Key</h4>
                  <p style={{ fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.4 }}>
                    Nhập Gemini API Key cá nhân của bạn để sử dụng tính năng AI tư vấn. API Key được lưu hoàn toàn trên thiết bị của bạn, không gửi đi đâu cả.
                  </p>
                  <input
                    type="password"
                    value={apiKeyInput}
                    onChange={e => setApiKeyInput(e.target.value)}
                    placeholder="Dán Gemini API Key của bạn tại đây..."
                    style={{
                      width: "100%",
                      background: "var(--bg-card2)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      padding: "8px 12px",
                      color: "white",
                      fontSize: 12,
                      outline: "none"
                    }}
                  />
                  <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                    <button
                      onClick={() => {
                        const trimmedKey = apiKeyInput.trim();
                        if (trimmedKey) {
                          localStorage.setItem("bw_gemini_api_key", trimmedKey);
                          setShowApiKeyInput(false);
                          setChatMessages(prev => [
                            ...prev,
                            { role: "ai", text: "✅ Đã lưu API Key thành công! Bây giờ bạn có thể hỏi tôi bất kỳ điều gì về tài chính." }
                          ]);
                        } else {
                          alert("Vui lòng nhập API Key hợp lệ!");
                        }
                      }}
                      style={{
                        flex: 1,
                        background: "linear-gradient(135deg,#8b5cf6,#6d28d9)",
                        border: "none",
                        borderRadius: 8,
                        padding: "8px 0",
                        color: "white",
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer"
                      }}
                    >
                      Lưu cấu hình
                    </button>
                    <button
                      onClick={() => window.open("https://aistudio.google.com/app/apikey", "_blank")}
                      style={{
                        flex: 1,
                        background: "var(--bg-card2)",
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                        padding: "8px 0",
                        color: "var(--primary)",
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: "pointer"
                      }}
                    >
                      Lấy API Key miễn phí ↗
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Message scroll container */}
                  <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10, marginBottom: 12, paddingRight: 6 }}>
                    {chatMessages.map((msg, i) => (
                      <div key={i} style={{
                        maxWidth: "85%",
                        padding: "10px 14px",
                        borderRadius: msg.role === "user" ? "14px 14px 2px 14px" : "14px 14px 14px 2px",
                        fontSize: 12,
                        lineHeight: 1.5,
                        alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                        background: msg.role === "user" ? "rgba(37,99,235,0.08)" : "#ffffff",
                        border: msg.role === "user" ? "1px solid rgba(37,99,235,0.18)" : "1px solid rgba(37,99,235,0.12)",
                        color: msg.role === "user" ? "#1e3a8a" : "#111827"
                      }}>
                        {msg.text}
                      </div>
                    ))}
                    {aiTyping && (
                      <div style={{
                        alignSelf: "flex-start",
                        padding: "8px 12px",
                        borderRadius: "14px 14px 14px 2px",
                        fontSize: 11,
                        background: "rgba(255,255,255,0.6)",
                        border: "1px dashed rgba(37,99,235,0.3)",
                        color: "#1e3a8a",
                        display: "flex",
                        alignItems: "center",
                        gap: 6
                      }}>
                        <div className="pulse-dot" style={{ width: 6, height: 6, borderRadius: "50%", background: "#3b82f6" }} />
                        AI đang phân tích chi tiêu của bạn...
                      </div>
                    )}
                  </div>

                  {/* Chat Input form */}
                  <div style={{ display: "flex", gap: 8, marginTop: "auto" }}>
                    <input
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") handleSendChatMessage(); }}
                      placeholder="Hỏi trợ lý AI về quản lý chi tiêu..."
                      style={{
                        flex: 1,
                        background: "#ffffff",
                        border: "1px solid rgba(37,99,235,0.2)",
                        borderRadius: 8,
                        padding: "10px 12px",
                        color: "#111827",
                        fontSize: 12,
                        outline: "none"
                      }}
                    />
                    <button
                      onClick={handleSendChatMessage}
                      disabled={aiTyping}
                      style={{
                        background: aiTyping ? "var(--border)" : "linear-gradient(135deg,#2563eb,#1d4ed8)",
                        border: "none",
                        borderRadius: 8,
                        width: 38,
                        height: 38,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: aiTyping ? "not-allowed" : "pointer",
                        color: "white",
                        transition: "opacity 0.2s"
                      }}
                      onMouseEnter={e => { if (!aiTyping) e.currentTarget.style.opacity = 0.9; }}
                      onMouseLeave={e => { if (!aiTyping) e.currentTarget.style.opacity = 1; }}
                    >
                      <Send size={14} />
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </motion.div>

        {/* News */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: 16,
            padding: 24,
            display: "flex",
            flexDirection: "column",
            height: 380
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <Newspaper size={18} style={{ color: "#2563eb" }} />
            <h3 style={{ fontSize: 15, fontWeight: 700 }}>Tin tức tài chính</h3>
          </div>

          <div style={{ flex: 1, overflowY: "auto", paddingRight: 6 }}>
            {loading ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 60 }} />)}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {posts.map((n, i) => (
                  <div key={n.id}
                    onClick={() => {
                      if (n.link) {
                        window.open(n.link, "_blank");
                      } else {
                        setSelectedNews(n);
                      }
                    }}
                    style={{ padding: "12px 0", borderBottom: i < posts.length - 1 ? "1px solid var(--border)" : "none", cursor: "pointer", transition: "transform 0.2s" }}
                    onMouseEnter={e => e.currentTarget.style.transform = "translateX(4px)"}
                    onMouseLeave={e => e.currentTarget.style.transform = "none"}
                  >
                    <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                      <div style={{ width: 72, height: 50, borderRadius: 8, background: "var(--bg-card2)", overflow: "hidden", border: "1px solid var(--border)", flexShrink: 0 }}>
                        {n.image ? (
                          <img src={n.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <Newspaper size={14} style={{ color: "#222" }} />
                          </div>
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: 9, background: "rgba(37,99,235,0.15)", color: "#2563eb", padding: "2px 8px", borderRadius: 6, fontWeight: 600 }}>{n.tag}</span>
                        <p style={{ fontSize: 13, fontWeight: 500, marginTop: 4, lineHeight: 1.4, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n.title}</p>
                        <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>{n.time}</p>
                      </div>
                      <ChevronRight size={14} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
                    </div>
                  </div>
                ))}
                {posts.length === 0 && (
                  <div style={{ textAlign: "center", padding: "20px 0", color: "var(--text-muted)", fontSize: 13 }}>Chưa có tin tức tài chính mới</div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Recent Transactions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: 24 }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700 }}>Giao dịch gần đây</h3>
          <Link to="/dashboard/wallets" style={{ fontSize: 13, color: "#2563eb", textDecoration: "none", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
            Xem tất cả <ChevronRight size={14} />
          </Link>
        </div>
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[1, 2, 3, 4].map(i => <div key={i} className="skeleton" style={{ height: 52 }} />)}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {transactions.slice(0, 5).map((tx) => {
              const formattedTime = formatTxDateAndTime(tx.time);
              return (
                <div key={tx.id} style={{
                  display: "flex", alignItems: "center", padding: "12px 14px", borderRadius: 10,
                  cursor: "pointer", transition: "background 0.2s"
                }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                >
                  <div style={{
                    width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                    background: tx.type === "receive" ? "rgba(34,197,94,0.12)" : "rgba(37,99,235,0.12)",
                    display: "flex", alignItems: "center", justifyContent: "center", marginRight: 14
                  }}>
                    {tx.type === "receive" ? <ArrowDownLeft size={18} style={{ color: "#22c55e" }} /> : <ArrowUpRight size={18} style={{ color: "#2563eb" }} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tx.name}</p>
                    <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
                      {formattedTime.date && `${formattedTime.date} • `}{formattedTime.time}
                      {tx.category && (
                        <span style={{ marginLeft: 8, fontSize: 10, background: "rgba(255,255,255,0.06)", color: "var(--text-secondary)", padding: "2px 6px", borderRadius: 4 }}>
                          {tx.category}
                        </span>
                      )}
                    </p>
                  </div>
                  <div style={{ textAlign: "right", marginLeft: 10, flexShrink: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: tx.type === "receive" ? "#22c55e" : "#2563eb" }}>
                      {fmtCurrency(tx.type === "receive" ? tx.amount : -tx.amount)}
                    </p>
                    <span style={{
                      fontSize: 10, padding: "2px 8px", borderRadius: 6, fontWeight: 600,
                      background: tx.status === "success" ? "rgba(34,197,94,0.12)" : tx.status === "failed" ? "rgba(239,68,68,0.12)" : "rgba(245,158,11,0.12)",
                      color: tx.status === "success" ? "#22c55e" : tx.status === "failed" ? "#ef4444" : "#f59e0b"
                    }}>
                      {tx.status === "success" ? "Thành công" : tx.status === "failed" ? "Thất bại" : "Chờ xử lý"}
                    </span>
                  </div>
                </div>
              );
            })}
            {transactions.length === 0 && (
              <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-muted)", fontSize: 14 }}>
                <Wallet size={36} style={{ color: "#222", marginBottom: 10 }} />
                <p>Chưa có giao dịch gần đây</p>
              </div>
            )}
          </div>
        )}
      </motion.div>

      {/* Article Detail Modal */}
      <AnimatePresence>
        {selectedNews && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedNews(null)}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, backdropFilter: "blur(8px)" }}>
            <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }} onClick={e => e.stopPropagation()}
              style={{ background: "var(--bg-dark)", border: "1px solid #222", borderRadius: 24, width: "100%", maxWidth: 550, overflow: "hidden", position: "relative" }}>

              {/* Cover Image banner */}
              <div style={{ height: 220, position: "relative", background: "var(--bg-card2)", borderBottom: "1px solid var(--border)" }}>
                {selectedNews.image ? (
                  <img src={selectedNews.image} alt={selectedNews.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Newspaper size={48} style={{ color: "#222" }} />
                  </div>
                )}
                <span style={{ position: "absolute", top: 18, left: 18, fontSize: 11, background: "rgba(37,99,235,0.9)", color: "white", padding: "4px 12px", borderRadius: 8, fontWeight: 700 }}>
                  {selectedNews.tag}
                </span>

                {/* Floating close button */}
                <button onClick={() => setSelectedNews(null)}
                  style={{ position: "absolute", top: 18, right: 18, width: 34, height: 34, borderRadius: "50%", background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", cursor: "pointer", transition: "background 0.2s" }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(0,0,0,0.8)"}
                  onMouseLeave={e => e.currentTarget.style.background = "rgba(0,0,0,0.5)"}
                >
                  <X size={16} />
                </button>
              </div>

              {/* Text body container */}
              <div style={{ padding: "24px 28px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-secondary)", fontSize: 12, marginBottom: 12 }}>
                  <Calendar size={13} />
                  <span>Đăng {selectedNews.time}</span>
                  <span>•</span>
                  <span>Tin tức SmartWallet</span>
                </div>

                <h3 style={{ fontSize: 18, fontWeight: 800, color: "var(--text-primary)", lineHeight: 1.4, marginBottom: 16 }}>
                  {selectedNews.title}
                </h3>

                <div style={{ maxHeight: 200, overflowY: "auto", color: "var(--text-secondary)", fontSize: 13, lineHeight: 1.7, paddingRight: 6 }}>
                  {selectedNews.content ? (
                    selectedNews.content.split("\n").map((p, idx) => (
                      <p key={idx} style={{ marginBottom: 14 }}>{p}</p>
                    ))
                  ) : (
                    <p>Không có nội dung chi tiết bài viết.</p>
                  )}
                </div>

                <div style={{ marginTop: 24, paddingTop: 16, borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end" }}>
                  <button onClick={() => setSelectedNews(null)}
                    style={{ background: "linear-gradient(135deg,#2563eb,#1d4ed8)", color: "white", border: "none", borderRadius: 10, padding: "10px 24px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
                  >
                    Đóng bài viết
                  </button>
                </div>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
