import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowDownLeft,
  ArrowUpRight,
  BarChart3,
  CreditCard,
  Newspaper,
  Send,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { newsAPI, walletAPI, formatVND } from "../../services/api";
import { useLanguage } from "../../context/LanguageContext";

const safeParse = (value) => {
  try {
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
};

const parseDate = (dateValue) => {
  const d = new Date(dateValue || Date.now());
  return Number.isNaN(d.getTime()) ? new Date() : d;
};

const mapTx = (tx, currentEmail, t) => {
  const isSender = tx.sender_wallet?.user?.email === currentEmail;
  const isDeposit = tx.transaction_type === "DEPOSIT";
  const isWithdraw = tx.transaction_type === "WITHDRAW";
  const date = parseDate(tx.created_at || tx.createdAt);

  return {
    id: tx.reference_code || tx.id,
    name: isDeposit
      ? (t.wallets.depositAmount || "Wallet Deposit")
      : isWithdraw
        ? (t.wallets.withdrawTitle || "Bank Withdrawal")
        : isSender
          ? `${t.wallets.transferTitle || "Transfer to"} ${tx.receiver_wallet?.user?.email || "recipient"}`
          : `${t.dashboard.receive || "Received from"} ${tx.sender_wallet?.user?.email || "sender"}`,
    type: isDeposit || (!isSender && !isWithdraw) ? "income" : "expense",
    amount: Number(tx.amount || 0),
    status: String(tx.status || "PENDING").toLowerCase(),
    date,
  };
};

const buildCashFlow = (transactions, filterType = "7days", lang = "vi") => {
  const rows = [];
  const successfulTx = transactions.filter((tx) => tx.status === "success");

  if (filterType === "7days") {
    const now = new Date();
    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      rows.push({
        key: d.toLocaleDateString("vi-VN"),
        label: d.toLocaleDateString(lang === "vi" ? "vi-VN" : "en-US", { weekday: "short" }),
        income: 0,
        expense: 0,
      });
    }
    successfulTx.forEach((tx) => {
      const key = tx.date.toLocaleDateString("vi-VN");
      const row = rows.find((item) => item.key === key);
      if (row) row[tx.type] += tx.amount;
    });
  } else if (filterType === "30days") {
    const now = new Date();
    for (let i = 29; i >= 0; i -= 1) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      rows.push({
        key: d.toLocaleDateString("vi-VN"),
        label: `${d.getDate()}/${d.getMonth() + 1}`,
        income: 0,
        expense: 0,
      });
    }
    successfulTx.forEach((tx) => {
      const key = tx.date.toLocaleDateString("vi-VN");
      const row = rows.find((item) => item.key === key);
      if (row) row[tx.type] += tx.amount;
    });
  } else if (filterType === "1year") {
    const now = new Date();
    for (let i = 11; i >= 0; i -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthNum = d.getMonth() + 1;
      const yearNum = d.getFullYear();
      rows.push({
        key: `${monthNum}/${yearNum}`,
        label: lang === "vi" ? `Th ${monthNum}` : d.toLocaleString("en-US", { month: "short" }),
        income: 0,
        expense: 0,
      });
    }
    successfulTx.forEach((tx) => {
      const key = `${tx.date.getMonth() + 1}/${tx.date.getFullYear()}`;
      const row = rows.find((item) => item.key === key);
      if (row) row[tx.type] += tx.amount;
    });
  } else if (filterType === "all") {
    const years = [];
    if (successfulTx.length === 0) {
      const currentYear = new Date().getFullYear();
      years.push(currentYear);
    } else {
      successfulTx.forEach((tx) => {
        const y = tx.date.getFullYear();
        if (!years.includes(y)) years.push(y);
      });
      years.sort((a, b) => a - b);
    }
    const minYear = years[0];
    const maxYear = years[years.length - 1];
    for (let y = minYear; y <= maxYear; y++) {
      rows.push({
        key: String(y),
        label: String(y),
        income: 0,
        expense: 0,
      });
    }
    successfulTx.forEach((tx) => {
      const key = String(tx.date.getFullYear());
      const row = rows.find((item) => item.key === key);
      if (row) row[tx.type] += tx.amount;
    });
  }

  return rows;
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="modern-tooltip">
      <strong>{label}</strong>
      {payload.map((item) => (
        <p key={item.name} style={{ color: item.color }}>
          {item.name}: {formatVND(item.value)}
        </p>
      ))}
    </div>
  );
};

export default function DashboardPage() {
  const { t, lang } = useLanguage();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(() => safeParse(localStorage.getItem("bw_user")));
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [posts, setPosts] = useState([]);
  const [filterType, setFilterType] = useState("7days");

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      const savedUser = safeParse(localStorage.getItem("bw_user"));
      if (savedUser) setUser(savedUser);

      try {
        const [statsRes, txRes, newsRes] = await Promise.allSettled([
          walletAPI.getStats(),
          walletAPI.getTransactions(),
          newsAPI.getNews(),
        ]);

        if (!mounted) return;

        if (statsRes.status === "fulfilled" && statsRes.value?.success) {
          setBalance(Number(statsRes.value.stats.currentBalance || 0));
        }

        if (txRes.status === "fulfilled" && txRes.value?.success) {
          const email = savedUser?.email || "";
          setTransactions(txRes.value.transactions.map((tx) => mapTx(tx, email, t)));
        }

        if (newsRes.status === "fulfilled" && newsRes.value?.success) {
          setPosts(newsRes.value.posts || []);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    window.addEventListener("balance_updated", load);
    return () => {
      mounted = false;
      window.removeEventListener("balance_updated", load);
    };
  }, [t]);

  const cashFlow = useMemo(() => buildCashFlow(transactions, filterType, lang), [transactions, filterType, lang]);
  
  const categoryData = useMemo(() => {
    const income = transactions
      .filter((tx) => tx.status === "success" && tx.type === "income")
      .reduce((sum, tx) => sum + tx.amount, 0);
    const expense = transactions
      .filter((tx) => tx.status === "success" && tx.type === "expense")
      .reduce((sum, tx) => sum + tx.amount, 0);

    return [
      { name: t.home.income, value: income, color: "#11c981" },
      { name: t.home.expense, value: expense, color: "#f05278" },
    ].filter((item) => item.value > 0);
  }, [transactions, t]);

  const monthlyIncome = cashFlow.reduce((sum, row) => sum + row.income, 0);
  const monthlyExpense = cashFlow.reduce((sum, row) => sum + row.expense, 0);
  const successfulTx = transactions.filter((tx) => tx.status === "success");

  const getPeriodLabel = () => {
    if (filterType === "7days") return t.home.last7Days;
    if (filterType === "30days") return lang === "vi" ? "30 ngày qua" : "Last 30 Days";
    if (filterType === "1year") return lang === "vi" ? "1 năm qua" : "Last 1 Year";
    return lang === "vi" ? "Tất cả lịch sử" : "All-time History";
  };

  const stats = [
    {
      label: t.home.walletBalance,
      value: formatVND(balance),
      icon: Wallet,
      tone: "teal",
      footer: t.home.availableBalance,
    },
    {
      label: t.home.totalIncome,
      value: formatVND(monthlyIncome),
      icon: TrendingUp,
      tone: "green",
      footer: getPeriodLabel(),
    },
    {
      label: t.home.totalExpenses,
      value: formatVND(monthlyExpense),
      icon: TrendingDown,
      tone: "pink",
      footer: getPeriodLabel(),
    },
    {
      label: t.home.transactions,
      value: `${successfulTx.length}`,
      icon: BarChart3,
      tone: "blue",
      footer: t.home.successfulRecords,
    },
  ];

  return (
    <div className="modern-dashboard">
      <style>{dashboardHomeCss}</style>

      <section className="welcome-card">
        <div>
          <span>{t.home.analytics}</span>
          <h2>{t.home.welcome.replace("{name}", user?.name || "there")}</h2>
          <p>{t.home.lead}</p>
        </div>
        <div className="welcome-actions">
          <button type="button" onClick={() => navigate("/dashboard/wallets?tab=deposit")}>
            <ArrowDownLeft size={17} /> {t.home.deposit}
          </button>
          <button type="button" onClick={() => navigate("/dashboard/wallets?tab=transfer")}>
            <Send size={17} /> {t.home.transfer}
          </button>
        </div>
      </section>

      <section className="stats-grid">
        {stats.map((stat) => (
          <article className={`stat-card ${stat.tone}`} key={stat.label}>
            {loading ? (
              <div className="skeleton-block" />
            ) : (
              <>
                <div className="stat-top">
                  <div>
                    <h3>{stat.value}</h3>
                    <p>{stat.label}</p>
                  </div>
                  <span>
                    <stat.icon size={24} />
                  </span>
                </div>
                <div className="stat-bottom">
                  <small>{stat.footer}</small>
                  <ArrowUpRight size={17} />
                </div>
              </>
            )}
          </article>
        ))}
      </section>

      <section className="dashboard-grid-main">
        <article className="panel large-panel">
          <div className="panel-head" style={{ flexWrap: "wrap", gap: "12px" }}>
            <div>
              <h3>{t.home.visitors}</h3>
              <p>{t.home.cashFlowOverview}</p>
            </div>
            
            <div style={{ display: "flex", gap: "16px", alignItems: "center", flexWrap: "wrap" }}>
              <div className="chart-filter-controls" style={{ display: "flex", gap: "6px", background: "var(--bg-card2)", padding: "4px", borderRadius: "20px", border: "1px solid var(--border)" }}>
                {[
                  { id: "7days", labelVi: "7 Ngày", labelEn: "7 Days" },
                  { id: "30days", labelVi: "30 Ngày", labelEn: "30 Days" },
                  { id: "1year", labelVi: "1 Năm", labelEn: "1 Year" },
                  { id: "all", labelVi: "Tổng quan", labelEn: "All-Time" }
                ].map((btn) => {
                  const isActive = filterType === btn.id;
                  return (
                    <button
                      key={btn.id}
                      type="button"
                      onClick={() => setFilterType(btn.id)}
                      style={{
                        padding: "4px 12px",
                        borderRadius: "16px",
                        border: "none",
                        fontSize: "11px",
                        fontWeight: 700,
                        cursor: "pointer",
                        background: isActive ? "var(--primary)" : "transparent",
                        color: isActive ? "white" : "var(--text-secondary)",
                        transition: "all 0.2s"
                      }}
                    >
                      {lang === "vi" ? btn.labelVi : btn.labelEn}
                    </button>
                  );
                })}
              </div>

              <div className="chart-legend" style={{ margin: 0 }}>
                <span><i className="green" /> {t.home.income}</span>
                <span><i className="pink" /> {t.home.expense}</span>
              </div>
            </div>
          </div>

          <div className="chart-wrap">
            {loading ? (
              <div className="skeleton-block tall" />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={cashFlow}>
                  <defs>
                    <linearGradient id="incomeGradient" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#11c981" stopOpacity={0.34} />
                      <stop offset="100%" stopColor="#11c981" stopOpacity={0.03} />
                    </linearGradient>
                    <linearGradient id="expenseGradient" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#f05278" stopOpacity={0.26} />
                      <stop offset="100%" stopColor="#f05278" stopOpacity={0.03} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#eef2f7" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: "#7a879a", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#7a879a", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="income" name={t.home.income} stroke="#11c981" strokeWidth={3} fill="url(#incomeGradient)" />
                  <Area type="monotone" dataKey="expense" name={t.home.expense} stroke="#f05278" strokeWidth={3} fill="url(#expenseGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </article>

        <article className="panel green-panel">
          <div className="panel-head inverse">
            <div>
              <h3>{t.home.completed}</h3>
              <p>{t.home.transactionSummary}</p>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={190}>
            <BarChart data={cashFlow}>
              <XAxis dataKey="label" tick={{ fill: "rgba(255,255,255,.8)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="income" fill="rgba(255,255,255,.9)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>

          <div className="green-panel-footer">
            <strong>{successfulTx.length} {t.home.transactionsCompleted}</strong>
            <span>{t.home.totalIncomeLabel} {formatVND(monthlyIncome)}</span>
          </div>
        </article>
      </section>

      <section className="bottom-grid">
        <article className="panel">
          <div className="panel-head">
            <div>
              <h3>{t.home.walletDistribution}</h3>
              <p>{t.home.incomeVsExpense}</p>
            </div>
            <CreditCard size={20} />
          </div>

          <div className="pie-row">
            <ResponsiveContainer width="46%" height={170}>
              <PieChart>
                <Pie data={categoryData.length ? categoryData : [{ name: t.home.noData, value: 1, color: "#d8e0ec" }]} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={4}>
                  {(categoryData.length ? categoryData : [{ color: "#d8e0ec" }]).map((item, index) => (
                    <Cell key={index} fill={item.color} stroke="none" />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>

            <div className="pie-list">
              {(categoryData.length ? categoryData : [{ name: t.home.noData, value: 0, color: "#d8e0ec" }]).map((item) => (
                <div key={item.name}>
                  <span><i style={{ background: item.color }} /> {item.name}</span>
                  <strong>{formatVND(item.value)}</strong>
                </div>
              ))}
            </div>
          </div>
        </article>

        <article className="panel">
          <div className="panel-head">
            <div>
              <h3>{t.home.recentTransactions}</h3>
              <p>{t.home.latestActivity}</p>
            </div>
            <Wallet size={20} />
          </div>

          <div className="tx-list">
            {loading ? (
              <div className="skeleton-block tall" />
            ) : successfulTx.slice(0, 5).length ? (
              successfulTx.slice(0, 5).map((tx) => (
                <div className="tx-item" key={tx.id}>
                  <span className={tx.type}>{tx.type === "income" ? <ArrowDownLeft size={17} /> : <ArrowUpRight size={17} />}</span>
                  <div>
                    <strong>{tx.name}</strong>
                    <small>{tx.date.toLocaleDateString("vi-VN")}</small>
                  </div>
                  <b className={tx.type}>{tx.type === "income" ? "+" : "-"}{formatVND(tx.amount)}</b>
                </div>
              ))
            ) : (
              <p className="empty-state">{t.home.noRecentTxs}</p>
            )}
          </div>
        </article>

        <article className="panel news-panel">
          <div className="panel-head">
            <div>
              <h3>{t.home.financialNews}</h3>
              <p>{t.home.adminUpdates}</p>
            </div>
            <Newspaper size={20} />
          </div>

          <div className="news-list">
            {posts.slice(0, 4).map((post) => (
              <button key={post.id} type="button" onClick={() => post.link && window.open(post.link, "_blank") }>
                <span>{(lang === "en" && post.tag_en) ? post.tag_en : (post.tag || "News")}</span>
                <strong>{(lang === "en" && post.title_en) ? post.title_en : post.title}</strong>
                <small>{post.time || "Just now"}</small>
              </button>
            ))}
            {!posts.length && <p className="empty-state">{t.home.noNews}</p>}
          </div>
        </article>

        <article className="panel ai-panel">
          <div>
            <Sparkles size={24} />
            <h3>{t.home.aiAdvisorTitle}</h3>
            <p>{t.home.aiAdvisorDesc}</p>
          </div>
          <button type="button" onClick={() => navigate("/dashboard/ai-chatbot")}>{t.home.openAdvisor}</button>
        </article>
      </section>
    </div>
  );
}

const dashboardHomeCss = `
.modern-dashboard {
  display: flex;
  flex-direction: column;
  gap: 24px;
  max-width: 1480px;
  margin: 0 auto;
}

.welcome-card {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  align-items: center;
  border-radius: 28px;
  padding: 28px;
  color: #fff;
  background:
    radial-gradient(circle at 8% 20%, rgba(255,255,255,.24), transparent 22%),
    linear-gradient(135deg, #30415c 0%, #3b4c68 42%, #09b6b6 100%);
  box-shadow: 0 24px 70px rgba(48, 65, 92, .22);
  overflow: hidden;
  position: relative;
}

.welcome-card::after {
  content: "";
  position: absolute;
  right: -90px;
  top: -120px;
  width: 280px;
  height: 280px;
  border: 2px dashed rgba(255,255,255,.32);
  border-radius: 50%;
}

.welcome-card span {
  position: relative;
  z-index: 1;
  display: inline-flex;
  margin-bottom: 10px;
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 1.4px;
  text-transform: uppercase;
  color: rgba(255,255,255,.78);
}

.welcome-card h2 {
  position: relative;
  z-index: 1;
  margin: 0 0 8px;
  font-size: clamp(25px, 4vw, 42px);
  letter-spacing: -0.04em;
}

.welcome-card p {
  position: relative;
  z-index: 1;
  max-width: 660px;
  color: rgba(255,255,255,.8);
  margin: 0;
  line-height: 1.65;
}

.welcome-actions {
  position: relative;
  z-index: 1;
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.welcome-actions button {
  border: 0;
  border-radius: 15px;
  padding: 13px 17px;
  color: #fff;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-weight: 900;
  cursor: pointer;
  background: rgba(255,255,255,.16);
  backdrop-filter: blur(10px);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 20px;
}

.stat-card,
.panel {
  background: #fff;
  border: 1px solid #e7edf5;
  box-shadow: 0 18px 44px rgba(29, 45, 70, .06);
}

.stat-card {
  border-radius: 9px;
  overflow: hidden;
}

.stat-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 24px 22px;
}

.stat-top h3 {
  margin: 0 0 6px;
  font-size: 26px;
  letter-spacing: -0.03em;
}

.stat-top p {
  margin: 0;
  color: #7a879a;
  font-weight: 700;
}

.stat-top span {
  color: #30415c;
}

.stat-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #fff;
  padding: 15px 24px;
  font-weight: 900;
}

.stat-card.teal .stat-top h3 { color: #09b6b6; }
.stat-card.green .stat-top h3 { color: #11c981; }
.stat-card.pink .stat-top h3 { color: #f05278; }
.stat-card.blue .stat-top h3 { color: #2563eb; }
.stat-card.teal .stat-bottom { background: linear-gradient(90deg, #09b6b6, #10c8bf); }
.stat-card.green .stat-bottom { background: linear-gradient(90deg, #11c981, #17dea4); }
.stat-card.pink .stat-bottom { background: linear-gradient(90deg, #f05278, #ff6b8d); }
.stat-card.blue .stat-bottom { background: linear-gradient(90deg, #2563eb, #06b6d4); }

.dashboard-grid-main {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(280px, .95fr);
  gap: 24px;
}

.panel {
  border-radius: 9px;
  padding: 24px;
  overflow: hidden;
}

.panel-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 20px;
}

.panel-head h3 {
  margin: 0 0 5px;
  font-size: 20px;
}

.panel-head p {
  margin: 0;
  color: #7a879a;
  font-size: 13px;
}

.chart-legend {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  color: #637083;
  font-size: 12px;
  font-weight: 800;
}

.chart-legend span {
  display: inline-flex;
  align-items: center;
  gap: 7px;
}

.chart-legend i,
.pie-list i {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  display: inline-block;
}

.chart-legend .green { background: #11c981; }
.chart-legend .pink { background: #f05278; }

.chart-wrap {
  min-height: 300px;
}

.green-panel {
  color: #fff;
  background: linear-gradient(135deg, #08b7b5 0%, #11c981 100%);
  border: 0;
  box-shadow: 0 24px 70px rgba(17, 201, 129, .22);
}

.green-panel .panel-head p,
.green-panel .panel-head h3 {
  color: #fff;
}

.green-panel-footer {
  margin: 10px -24px -24px;
  padding: 20px 24px;
  background: #fff;
  color: #172033;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.green-panel-footer span {
  color: #7a879a;
  font-size: 13px;
}

.bottom-grid {
  display: grid;
  grid-template-columns: 1.1fr 1.2fr 1fr 1fr;
  gap: 24px;
}

.pie-row {
  display: flex;
  align-items: center;
  gap: 18px;
}

.pie-list {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.pie-list div,
.tx-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.pie-list span {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: #637083;
  font-size: 13px;
}

.tx-list,
.news-list {
  display: flex;
  flex-direction: column;
  gap: 11px;
}

.tx-item {
  padding: 12px;
  border: 1px solid #edf2f8;
  border-radius: 14px;
  background: #fbfdff;
}

.tx-item > span {
  width: 38px;
  height: 38px;
  border-radius: 12px;
  display: grid;
  place-items: center;
}

.tx-item > span.income { background: rgba(17,201,129,.1); color: #11c981; }
.tx-item > span.expense { background: rgba(240,82,120,.1); color: #f05278; }
.tx-item div { flex: 1; min-width: 0; }
.tx-item strong, .tx-item small { display: block; }
.tx-item strong { font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tx-item small { color: #7a879a; margin-top: 3px; }
.tx-item b { font-size: 13px; }
.tx-item b.income { color: #11c981; }
.tx-item b.expense { color: #f05278; }

.news-list button {
  border: 1px solid #edf2f8;
  border-radius: 14px;
  background: #fbfdff;
  padding: 13px;
  text-align: left;
  cursor: pointer;
}

.news-list span,
.news-list small {
  display: block;
  color: #7a879a;
  font-size: 11px;
}

.news-list strong {
  display: block;
  margin: 5px 0;
  font-size: 13px;
  line-height: 1.35;
}

.ai-panel {
  color: #fff;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  background: linear-gradient(135deg, #30415c, #f05278);
  border: 0;
  min-height: 250px;
}

.ai-panel h3 {
  margin: 14px 0 8px;
  font-size: 22px;
}

.ai-panel p {
  color: rgba(255,255,255,.75);
  line-height: 1.55;
}

.ai-panel button {
  border: 0;
  border-radius: 14px;
  padding: 12px 15px;
  color: #30415c;
  background: #fff;
  font-weight: 900;
  cursor: pointer;
}

.modern-tooltip {
  background: #fff;
  border: 1px solid #e7edf5;
  border-radius: 13px;
  padding: 12px 14px;
  box-shadow: 0 12px 35px rgba(29,45,70,.12);
}

.modern-tooltip strong,
.modern-tooltip p {
  display: block;
  margin: 0 0 5px;
  font-size: 12px;
}

.empty-state {
  color: #7a879a;
  margin: 0;
  font-size: 13px;
}

.skeleton-block {
  min-height: 90px;
  border-radius: 14px;
  background: linear-gradient(90deg, #eef2f7 25%, #f8fafc 50%, #eef2f7 75%);
  background-size: 200% 100%;
  animation: skeleton 1.2s infinite;
}

.skeleton-block.tall { min-height: 240px; }

@keyframes skeleton {
  to { background-position: -200% 0; }
}

@media (max-width: 1180px) {
  .stats-grid,
  .bottom-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .dashboard-grid-main { grid-template-columns: 1fr; }
}

@media (max-width: 720px) {
  .welcome-card { align-items: flex-start; flex-direction: column; padding: 22px; }
  .stats-grid,
  .bottom-grid { grid-template-columns: 1fr; }
  .panel { padding: 18px; }
  .pie-row { flex-direction: column; align-items: stretch; }
}
`;
