import { useState, useEffect } from "react";
import { 
  TrendingUp, Users, Search, AlertCircle, ArrowUpRight, Lock, CheckCircle, Clock, ShieldAlert, FileText, ArrowRightLeft, DollarSign
} from "lucide-react";
import { motion } from "framer-motion";
import { investmentAPI, formatVND } from "../../services/api";
import { useLanguage } from "../../context/LanguageContext";

export default function AdminInvestment() {
  const { t } = useLanguage();
  const [investments, setInvestments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await investmentAPI.getAdminAll();
      if (res.success) {
        setInvestments(res.investments || []);
      } else {
        console.error("Admin investments API error:", res.message);
        setInvestments([]);
      }
    } catch (error) {
      console.error("Failed to load admin investments data:", error);
      setInvestments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter & Search logic
  const filteredInvestments = investments.filter((inv) => {
    const matchesStatus = filterStatus === "ALL" || inv.status === filterStatus;
    
    const userEmail = inv.user?.email ? inv.user.email.toLowerCase() : "";
    const userPhone = inv.user?.phone ? inv.user.phone : "";
    const query = searchQuery.toLowerCase();
    
    const matchesSearch = 
      userEmail.includes(query) || 
      userPhone.includes(query) ||
      inv.id.toString().includes(query) ||
      inv.amount.toString().includes(query);

    return matchesStatus && matchesSearch;
  });

  // Aggregated system-wide stats
  const getAggregatedStats = () => {
    const active = investments.filter(inv => inv.status === "ACTIVE");
    const withdrawn = investments.filter(inv => inv.status === "WITHDRAWN");
    
    const totalActivePrincipal = active.reduce((sum, inv) => sum + Number(inv.amount), 0);
    const totalActiveInterest = active.reduce((sum, inv) => sum + Number(inv.accruedInterest || 0), 0);
    
    const totalWithdrawnPrincipal = withdrawn.reduce((sum, inv) => sum + Number(inv.amount), 0);
    const totalWithdrawnInterest = withdrawn.reduce((sum, inv) => sum + Number(inv.accumulated_interest || 0), 0);

    return {
      activeCount: active.length,
      withdrawnCount: withdrawn.length,
      totalActivePrincipal,
      totalActiveInterest,
      totalWithdrawnPrincipal,
      totalWithdrawnInterest,
      totalSystemSavings: totalActivePrincipal + totalWithdrawnPrincipal
    };
  };

  const stats = getAggregatedStats();

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto", paddingBottom: 60 }} className="animate-fade-in">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>{t.adminInvestment.pageTitle}</h1>
        <p style={{ color: "var(--text-secondary)", fontSize: 13 }}>{t.adminInvestment.pageSubtitle}</p>
      </div>

      {/* Aggregate Stats Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16, marginBottom: 30 }}>
        {/* Total active savings capital */}
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 600 }}>{t.adminInvestment.activeSavingsPrincipal}</span>
            <Lock size={18} style={{ color: "var(--primary)" }} />
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)" }}>{formatVND(stats.totalActivePrincipal)}</h2>
          <p style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 12 }}>
            {t.adminInvestment.activeSavingsPrincipalDesc.replace("{count}", stats.activeCount)}
          </p>
        </div>

        {/* Total active yield liabilities */}
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 600 }}>{t.adminInvestment.accruedInterestActive}</span>
            <TrendingUp size={18} style={{ color: "#22c55e" }} />
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: "#22c55e" }}>{formatVND(stats.totalActiveInterest)}</h2>
          <p style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 12 }}>
            {t.adminInvestment.accruedInterestActiveDesc}
          </p>
        </div>

        {/* Total closed payout volume */}
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 600 }}>{t.adminInvestment.totalSettledPrincipal}</span>
            <CheckCircle size={18} style={{ color: "#71717a" }} />
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)" }}>{formatVND(stats.totalWithdrawnPrincipal)}</h2>
          <p style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 12 }}>
            {t.adminInvestment.totalSettledPrincipalDesc.replace("{count}", stats.withdrawnCount)}
          </p>
        </div>

        {/* Total actual interest paid out */}
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 600 }}>{t.adminInvestment.totalInterestPaidOut}</span>
            <ArrowRightLeft size={18} style={{ color: "#ec4899" }} />
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: "#ec4899" }}>{formatVND(stats.totalWithdrawnInterest)}</h2>
          <p style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 12 }}>
            {t.adminInvestment.totalInterestPaidOutDesc}
          </p>
        </div>
      </div>

      {/* Audit List Controls */}
      <div style={{
        background: "var(--bg-card)", border: "1px solid var(--border)",
        borderRadius: 20, padding: 24
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16, marginBottom: 20 }}>
          {/* Status filter tabs */}
          <div style={{ display: "flex", gap: 8 }}>
            {[
              { id: "ALL", label: t.adminInvestment.filterAll },
              { id: "ACTIVE", label: t.adminInvestment.filterActive },
              { id: "WITHDRAWN", label: t.adminInvestment.filterSettled }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilterStatus(tab.id)}
                style={{
                  padding: "6px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer",
                  background: filterStatus === tab.id ? "rgba(37,99,235,0.12)" : "transparent",
                  border: `1px solid ${filterStatus === tab.id ? "rgba(37,99,235,0.2)" : "transparent"}`,
                  color: filterStatus === tab.id ? "#2563eb" : "#71717a", transition: "all 0.2s"
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div style={{ position: "relative", minWidth: 260 }}>
            <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
            <input
              type="text"
              placeholder={t.adminInvestment.searchPlaceholder}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="input-field"
              style={{ paddingLeft: 36, fontSize: 13, height: 38 }}
            />
          </div>
        </div>

        {/* Records Table */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <div style={{
              width: 30, height: 30, border: "3px solid var(--border)", borderTopColor: "var(--primary)",
              borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 12px"
            }} />
            <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>{t.adminInvestment.loadingRecords}</p>
          </div>
        ) : filteredInvestments.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-muted)" }}>
            <span style={{ fontSize: 32 }}>📁</span>
            <p style={{ fontSize: 13, fontWeight: 600, marginTop: 12 }}>{t.adminInvestment.noRecordsFound}</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {[t.adminInvestment.colId, t.adminInvestment.colCustomer, t.adminInvestment.colPrincipal, t.adminInvestment.colTerm, t.adminInvestment.colInterestRate, t.adminInvestment.colOpenDate, t.adminInvestment.colAccruedInterest, t.adminInvestment.colStatus].map((header, idx) => (
                    <th key={idx} style={{ padding: "12px 16px", fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredInvestments.map((inv) => {
                  const isClosed = inv.status === "WITHDRAWN";
                  const start = new Date(inv.start_date || inv.startDate);
                  const end = inv.end_date || inv.endDate ? new Date(inv.end_date || inv.endDate) : null;

                  return (
                    <tr 
                      key={inv.id} 
                      style={{ 
                        borderBottom: "1px solid var(--border)", 
                        background: isClosed ? "rgba(248, 249, 250, 0.4)" : "transparent",
                        transition: "background 0.2s" 
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-card2)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = isClosed ? "rgba(248, 249, 250, 0.4)" : "transparent"; }}
                    >
                      <td style={{ padding: "14px 16px", fontSize: 13, fontWeight: 700 }}>
                        #SWINV-{inv.id}
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <p style={{ fontSize: 13, fontWeight: 600 }}>{inv.user?.email?.split("@")[0] || t.adminInvestment.unknown}</p>
                        <p style={{ fontSize: 11, color: "var(--text-muted)" }}>{inv.user?.email || t.adminInvestment.noEmail}</p>
                      </td>
                      <td style={{ padding: "14px 16px", fontSize: 13, fontWeight: 700 }}>
                        {formatVND(Number(inv.amount))}
                      </td>
                      <td style={{ padding: "14px 16px", fontSize: 13, fontWeight: 600 }}>
                        {inv.term_months === 0 ? t.adminInvestment.flexible : t.adminInvestment.termMonths.replace("{count}", inv.term_months)}
                      </td>
                      <td style={{ padding: "14px 16px", fontSize: 13, fontWeight: 700, color: "var(--primary)" }}>
                        {inv.interest_rate}%/yr
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <p style={{ fontSize: 12, fontWeight: 500 }}>{start.toLocaleDateString("vi-VN")}</p>
                        <p style={{ fontSize: 10, color: "var(--text-muted)" }}>
                          {t.adminInvestment.maturity.replace("{date}", end ? end.toLocaleDateString("vi-VN") : t.adminInvestment.notAvailable)}
                        </p>
                      </td>
                      <td style={{ padding: "14px 16px", fontSize: 13, fontWeight: 700, color: "#22c55e" }}>
                        +{formatVND(isClosed ? Number(inv.accumulated_interest || 0) : Number(inv.accruedInterest || 0))}
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 20,
                          background: isClosed ? "rgba(113, 113, 122, 0.1)" : "rgba(34, 197, 94, 0.1)",
                          color: isClosed ? "#71717a" : "#22c55e"
                        }}>
                          {isClosed ? t.adminInvestment.statusSettled : t.adminInvestment.statusActive}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
