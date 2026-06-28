import { useState, useEffect } from "react";
import { Users, CreditCard, TrendingUp, Activity } from "lucide-react";
import { motion } from "framer-motion";
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line } from "recharts";
import { adminAPI } from "../../services/api";
import { useLanguage } from "../../context/LanguageContext";

export default function AdminPage() {
  const { t } = useLanguage();
  const [period, setPeriod] = useState("month"); // 'today', 'month', 'year', 'all'
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [usersCount, setUsersCount] = useState(0);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const [statsRes, usersRes] = await Promise.all([
        adminAPI.getStatistics(period),
        adminAPI.getUsers()
      ]);

      if (statsRes.success && statsRes.statistics) {
        setStatistics(statsRes.statistics);
      }
      if (usersRes.success && usersRes.users) {
        setUsersCount(usersRes.users.length);
      }
    } catch (error) {
      console.error("Failed to load admin stats:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [period]);

  const stats = [
    {
      label: t.admin.feeRevenue,
      value: loading || !statistics ? "..." : Number(statistics.feeRevenue).toLocaleString("vi-VN") + " ₫",
      desc: period === "today" ? t.admin.today : period === "month" ? t.admin.thisMonth : period === "year" ? t.admin.thisYear : t.admin.allTime,
      icon: TrendingUp,
      color: "#22c55e"
    },
    {
      label: t.admin.savingsAccounts,
      value: loading || !statistics ? "..." : (statistics.savingsVaultCount + statistics.activeInvestmentCount).toLocaleString("vi-VN"),
      desc: t.admin.savingsAccountsDesc,
      icon: Users,
      color: "#2563eb"
    },
    {
      label: t.admin.idleMoney,
      value: loading || !statistics ? "..." : Number(statistics.totalIdleMoney).toLocaleString("vi-VN") + " ₫",
      desc: t.admin.idleMoneyDesc,
      icon: CreditCard,
      color: "#3b82f6"
    },
    {
      label: t.admin.projectedPayout,
      value: loading || !statistics ? "..." : Number(statistics.projectedInterestPayout).toLocaleString("vi-VN") + " ₫",
      desc: t.admin.projectedPayoutDesc,
      icon: Activity,
      color: "#ef4444"
    },
    {
      label: t.admin.actualPaid,
      value: loading || !statistics ? "..." : Number(statistics.actualInterestPaid).toLocaleString("vi-VN") + " ₫",
      desc: t.admin.actualPaidDesc,
      icon: Activity,
      color: "#f59e0b"
    },
    {
      label: t.admin.totalUsers,
      value: loading ? "..." : usersCount.toLocaleString("vi-VN"),
      desc: t.admin.registeredAccounts,
      icon: Users,
      color: "#6366f1"
    }
  ];

  // Group chartData transactions by date/time
  const getChartData = () => {
    if (!statistics || !statistics.chartData || statistics.chartData.length === 0) return [];
    
    const grouped = {};
    statistics.chartData.forEach(item => {
      const d = new Date(item.created_at || item.createdAt);
      let key;
      if (period === 'today') {
        key = `${String(d.getHours()).padStart(2, '0')}:00`;
      } else if (period === 'month') {
        key = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
      } else {
        key = `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
      }
      if (!grouped[key]) {
        grouped[key] = { name: key, fee: 0, amount: 0, count: 0 };
      }
      grouped[key].fee += Number(item.fee_amount || 0);
      grouped[key].amount += Number(item.amount || 0);
      grouped[key].count += 1;
    });
    
    return Object.values(grouped);
  };

  const chartData = getChartData();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 1100, color: "var(--text-primary)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>{t.admin.systemOverview}</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 13 }}>{t.admin.adminDashboard}</p>
        </div>

        {/* Period selection dropdown */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{t.admin.selectPeriod}:</span>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              color: "var(--text-primary)",
              borderRadius: 8,
              padding: "6px 12px",
              fontSize: 13,
              fontWeight: 600,
              outline: "none",
              cursor: "pointer"
            }}
          >
            <option value="today">{t.admin.today}</option>
            <option value="month">{t.admin.thisMonth}</option>
            <option value="year">{t.admin.thisYear}</option>
            <option value="all">{t.admin.allTime}</option>
          </select>
        </div>
      </div>

      {/* Grid of stats cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
        {stats.map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
              <p style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 600 }}>{s.label}</p>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: `${s.color}18`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <s.icon size={15} style={{ color: s.color }} />
              </div>
            </div>
            <p style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>{s.value}</p>
            <p style={{ fontSize: 11, color: "var(--text-muted)" }}>{s.desc}</p>
          </motion.div>
        ))}
      </div>

      {/* Chart Section */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, padding: 22 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 20 }}>{t.admin.chartTitle}</h3>
        {loading ? (
          <div style={{ height: 260, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 24, height: 24, borderRadius: "50%", border: "2px solid #2563eb", borderTopColor: "transparent", animation: "spin 1s linear infinite" }} />
          </div>
        ) : chartData.length === 0 ? (
          <div style={{ height: 260, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: 13 }}>
            {t.admin.noChartData}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fill: "#71717a", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="left" tick={{ fill: "#71717a", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="right" orientation="right" tick={{ fill: "#71717a", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-primary)" }} />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="fee" name={t.admin.feeRevenue} stroke="#22c55e" strokeWidth={2.5} activeDot={{ r: 6 }} />
              <Line yAxisId="right" type="monotone" dataKey="amount" name={t.admin.totalTxVolume} stroke="#3b82f6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </motion.div>
    </div>
  );
}
