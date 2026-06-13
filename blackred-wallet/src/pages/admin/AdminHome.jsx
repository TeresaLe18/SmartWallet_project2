import { useState, useEffect } from "react";
import { Users, CreditCard, TrendingUp, Activity } from "lucide-react";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { adminAPI } from "../../services/api";

export default function AdminPage() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [usersRes, txsRes] = await Promise.all([
          adminAPI.getUsers(),
          adminAPI.getTransactions()
        ]);

        if (usersRes.success && usersRes.users) {
          setUsers(usersRes.users);
        }
        if (txsRes.success && txsRes.transactions) {
          setTransactions(txsRes.transactions);
        }
      } catch (error) {
        console.error("Failed to load admin stats from server:", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Compute live statistics
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  const txTodayCount = transactions.filter(t => {
    const d = new Date(t.created_at || t.createdAt);
    return d >= startOfDay;
  }).length;

  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const monthlyRevenue = transactions.reduce((sum, t) => {
    if (t.status === 'SUCCESS' || t.status === 'success') {
      const d = new Date(t.created_at || t.createdAt);
      if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
        return sum + Number(t.fee_amount || 0);
      }
    }
    return sum;
  }, 0);

  const activeWalletsCount = users.filter(u => u.wallet && u.wallet.status === 'ACTIVE').length;

  const stats = [
    { label: "Tổng Users", value: loading ? "..." : users.length.toLocaleString("vi-VN"), change: "Tài khoản hệ thống", icon: Users, color: "#2563eb" },
    { label: "Giao dịch hôm nay", value: loading ? "..." : txTodayCount.toLocaleString("vi-VN"), change: "Mọi trạng thái", icon: Activity, color: "#22c55e" },
    { label: "Doanh thu tháng (phí)", value: loading ? "..." : Number(monthlyRevenue).toLocaleString("vi-VN") + " ₫", change: "Giao dịch thành công", icon: TrendingUp, color: "#3b82f6" },
    { label: "Ví đang hoạt động", value: loading ? "..." : activeWalletsCount.toLocaleString("vi-VN"), change: "Trạng thái ACTIVE", icon: CreditCard, color: "#f59e0b" },
  ];

  // Group transactions for the last 7 days chart
  const get7DaysTxChart = (txs) => {
    const weekdays = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
    const data = [];
    const baseDate = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(baseDate.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const dateStr = d.toLocaleDateString("vi-VN");
      data.push({
        dateStr,
        day: weekdays[d.getDay()],
        count: 0
      });
    }
    txs.forEach(t => {
      const txDate = new Date(t.created_at || t.createdAt);
      txDate.setHours(0, 0, 0, 0);
      const txDateStr = txDate.toLocaleDateString("vi-VN");
      const found = data.find(item => item.dateStr === txDateStr);
      if (found) {
        found.count += 1;
      }
    });
    return data;
  };

  const chartData = get7DaysTxChart(transactions);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 1100 }}>
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>Tổng quan hệ thống</h1>
        <p style={{ color: "var(--text-secondary)", fontSize: 13 }}>SmartWallet Wallet Admin Dashboard</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
        {stats.map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
              <p style={{ fontSize: 12, color: "var(--text-secondary)" }}>{s.label}</p>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: `${s.color}18`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <s.icon size={15} style={{ color: s.color }} />
              </div>
            </div>
            <p style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>{s.value}</p>
            <p style={{ fontSize: 11, color: "var(--text-muted)" }}>{s.change}</p>
          </motion.div>
        ))}
      </div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, padding: 22 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 20 }}>Giao dịch 7 ngày qua</h3>
        {loading ? (
          <div style={{ height: 220, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 24, height: 24, borderRadius: "50%", border: "2px solid #2563eb", borderTopColor: "transparent", animation: "spin 1s linear infinite" }} />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="day" tick={{ fill: "#71717a", fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#71717a", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius: 8, color: "white" }} />
              <Bar dataKey="count" name="Giao dịch" fill="#2563eb" radius={[6, 6, 0, 0]} opacity={0.85} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </motion.div>
    </div>
  );
}
