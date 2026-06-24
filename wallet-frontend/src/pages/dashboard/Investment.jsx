import { useState, useEffect, useRef } from "react";
import { 
  TrendingUp, Wallet, Calculator, ShieldAlert, CheckCircle, 
  Clock, ArrowUpRight, Lock, PlusCircle, AlertTriangle, ArrowRightLeft, HelpCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { investmentAPI, walletAPI, formatVND } from "../../services/api";

const TERMS = [
  { term: 0, label: "Flexible", rate: 0.20, bankRate: 0.10, desc: "Interest paid daily, withdraw anytime" },
  { term: 1, label: "1 Month", rate: 5.00, bankRate: 2.50, desc: "Interest at maturity, ideal for short-term" },
  { term: 3, label: "3 Months", rate: 5.80, bankRate: 2.90, desc: "Optimize short-term cash flow" },
  { term: 6, label: "6 Months", rate: 7.60, bankRate: 3.80, desc: "Superior interest rate vs. bank" },
  { term: 12, label: "12 Months", rate: 9.40, bankRate: 4.70, desc: "Effective long-term savings" },
  { term: 24, label: "24 Months", rate: 9.80, bankRate: 4.90, desc: "Maximize your returns" }
];

export default function Investment() {
  const [walletBalance, setWalletBalance] = useState(0);
  const [investments, setInvestments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [depositAmount, setDepositAmount] = useState("1000000");
  const [selectedTerm, setSelectedTerm] = useState(3);

  // Withdraw confirmation modal states
  const [showEarlyModal, setShowEarlyModal] = useState(false);
  const [selectedInv, setSelectedInv] = useState(null);

  // Success/Error Toasts
  const [toast, setToast] = useState(null);
  const toastTimeoutRef = useRef(null);

  const showToast = (message, type = "success") => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToast({ message, type });
    toastTimeoutRef.current = setTimeout(() => setToast(null), 5000);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Fetch wallet stats/balance
      const statsRes = await walletAPI.getStats();
      if (statsRes.success) {
        setWalletBalance(Number(statsRes.stats.currentBalance));
      }

      // 2. Fetch user investments
      const invRes = await investmentAPI.getAll();
      if (invRes.success) {
        setInvestments(invRes.investments);
      }
    } catch (error) {
      console.error("Failed to load savings/investment data:", error);
      showToast("Unable to connect to server. Please try again later.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Recheck on balance update events
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

  const handleOpenSavings = async (e) => {
    e.preventDefault();
    const amount = Number(depositAmount);
    
    if (isNaN(amount) || amount < 50000) {
      showToast("Minimum deposit amount is 50,000 ₫.", "error");
      return;
    }

    if (amount > walletBalance) {
      showToast("Insufficient wallet balance to make this deposit.", "error");
      return;
    }

    setSubmitting(true);
    try {
      const res = await investmentAPI.create(amount, selectedTerm);
      if (res.success) {
        showToast(`Savings account opened: ${formatVND(amount)} for ${selectedTerm === 0 ? "flexible term" : selectedTerm + " months"} — success!`);
        setDepositAmount("1000000");
        
        // Sync layout and reload
        window.dispatchEvent(new CustomEvent("balance_updated"));
        loadData();
      } else {
        showToast(res.message || "Failed to open savings account.", "error");
      }
    } catch (error) {
      console.error("Create investment error:", error);
      showToast(error.response?.data?.message || "System error while opening savings account.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleWithdrawClick = (inv) => {
    const isEarly = checkIfEarly(inv);
    if (isEarly && inv.term_months > 0) {
      setSelectedInv(inv);
      setShowEarlyModal(true);
    } else {
      executeWithdraw(inv.id);
    }
  };

  const executeWithdraw = async (id) => {
    setSubmitting(true);
    try {
      const res = await investmentAPI.withdraw(id);
      if (res.success) {
        showToast(`Withdrawal successful! ${formatVND(res.payout)} returned to your main wallet.`);
        setShowEarlyModal(false);
        setSelectedInv(null);
        
        // Sync layouts and refresh
        window.dispatchEvent(new CustomEvent("balance_updated"));
        loadData();
      } else {
        showToast(res.message || "Failed to close savings account.", "error");
      }
    } catch (error) {
      console.error("Withdraw investment error:", error);
      showToast(error.response?.data?.message || "System error during withdrawal.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Helpers
  const checkIfEarly = (inv) => {
    if (inv.term_months === 0) return false;
    const now = new Date();
    const endDate = new Date(inv.end_date || inv.endDate);
    return now < endDate;
  };

  const getActiveVaultStats = () => {
    const active = investments.filter(inv => inv.status === "ACTIVE");
    const totalPrincipal = active.reduce((sum, inv) => sum + Number(inv.amount), 0);
    const totalInterest = active.reduce((sum, inv) => sum + Number(inv.accruedInterest || 0), 0);
    return {
      count: active.length,
      totalPrincipal,
      totalInterest
    };
  };

  const getTermDetails = (termMonths) => {
    return TERMS.find(t => t.term === termMonths) || { label: "Unknown", rate: 0, tcbRate: 0 };
  };

  // Calculator helper
  const calculateEstimatedReturns = () => {
    const amount = Number(depositAmount) || 0;
    const termPkg = TERMS.find(t => t.term === selectedTerm);
    if (!termPkg) return { interest: 0, total: 0 };
    
    let interest = 0;
    if (selectedTerm === 0) {
      // Show estimated 1-day interest
      interest = amount * (0.002 / 365);
    } else {
      interest = amount * (termPkg.rate / 100) * (selectedTerm / 12);
    }
    return {
      interest,
      total: amount + interest
    };
  };

  const activeStats = getActiveVaultStats();
  const estReturns = calculateEstimatedReturns();

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", paddingBottom: 60 }} className="animate-fade-in">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            style={{
              position: "fixed", top: 20, right: 20, zIndex: 9999,
              background: toast.type === "error" ? "rgba(239, 68, 68, 0.95)" : "rgba(34, 197, 94, 0.95)",
              color: "white", padding: "12px 24px", borderRadius: 12,
              backdropFilter: "blur(10px)", fontWeight: 600, fontSize: 14,
              boxShadow: "0 10px 25px rgba(0,0,0,0.15)", display: "flex", alignItems: "center", gap: 10
            }}
          >
            {toast.type === "error" ? <AlertTriangle size={18} /> : <CheckCircle size={18} />}
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main savings stats banner */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20, marginBottom: 30 }}>
        {/* Wallet Balance Card */}
        <div style={{
          background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
          borderRadius: 20, padding: 24, color: "white", display: "flex", flexDirection: "column", justifyContent: "space-between",
          boxShadow: "0 8px 30px rgba(37, 99, 235, 0.2)"
        }}>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <span style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", fontWeight: 500 }}>Payment Wallet Balance</span>
              <Wallet size={20} color="rgba(255,255,255,0.8)" />
            </div>
            <h2 style={{ fontSize: 26, fontWeight: 800 }}>{formatVND(walletBalance)}</h2>
          </div>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", marginTop: 20 }}>
            Cash available to transfer into high-yield savings
          </p>
        </div>

        {/* Total Principal Card */}
        <div style={{
          background: "var(--bg-card)", border: "1px solid var(--border)",
          borderRadius: 20, padding: 24, display: "flex", flexDirection: "column"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontSize: 13, color: "var(--text-secondary)", fontWeight: 500 }}>Active Savings</span>
            <Lock size={20} style={{ color: "var(--primary)" }} />
          </div>
          <h2 style={{ fontSize: 26, fontWeight: 800, color: "var(--text-primary)" }}>{formatVND(activeStats.totalPrincipal)}</h2>
          <p style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 20 }}>
            Earning interest across {activeStats.count} active savings accounts
          </p>
        </div>

        {/* Accrued Interest Card */}
        <div style={{
          background: "var(--bg-card)", border: "1px solid var(--border)",
          borderRadius: 20, padding: 24, display: "flex", flexDirection: "column"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontSize: 13, color: "var(--text-secondary)", fontWeight: 500 }}>Projected Interest (Accrued)</span>
            <TrendingUp size={20} style={{ color: "#22c55e" }} />
          </div>
          <h2 style={{ fontSize: 26, fontWeight: 800, color: "#22c55e" }}>{formatVND(activeStats.totalInterest)}</h2>
          <p style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 20 }}>
            Interest accruing daily in real time
          </p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr", lg: "7fr 5fr", gap: 24, marginBottom: 30 }}>
        {/* Open Saving / Calculator Card */}
        <div style={{
          background: "var(--bg-card)", border: "1px solid var(--border)",
          borderRadius: 20, padding: 28
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(37, 99, 235, 0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <PlusCircle size={18} style={{ color: "var(--primary)" }} />
            </div>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 800 }}>Open a Savings Account</h3>
              <p style={{ fontSize: 12, color: "var(--text-secondary)" }}>Register online to earn double the bank interest rate</p>
            </div>
          </div>

          <form onSubmit={handleOpenSavings}>
            <div style={{ marginBottom: 18 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>
                Deposit amount (Minimum 50,000 ₫)
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type="number"
                  value={depositAmount}
                  onChange={e => setDepositAmount(e.target.value)}
                  className="input-field"
                  placeholder="Enter deposit amount"
                  style={{ paddingRight: 60, fontWeight: 700 }}
                  required
                />
                <span style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)", fontWeight: 600, fontSize: 13 }}>
                  VND
                </span>
              </div>
            </div>

            <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 8 }}>
              Select savings term
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 10, marginBottom: 20 }}>
              {TERMS.map((t) => {
                const active = selectedTerm === t.term;
                return (
                  <button
                    key={t.term}
                    type="button"
                    onClick={() => setSelectedTerm(t.term)}
                    style={{
                      padding: "12px 8px", borderRadius: 12, border: `1px solid ${active ? "var(--primary)" : "var(--border)"}`,
                      background: active ? "rgba(37,99,235,0.06)" : "#ffffff", cursor: "pointer", transition: "all 0.2s",
                      textAlign: "center"
                    }}
                  >
                    <p style={{ fontSize: 12, fontWeight: 700, color: active ? "var(--primary)" : "var(--text-primary)" }}>{t.label}</p>
                    <p style={{ fontSize: 14, fontWeight: 800, color: active ? "var(--primary)" : "var(--text-primary)", margin: "4px 0" }}>
                      {t.rate}%/year
                    </p>
                    <p style={{ fontSize: 9, color: active ? "rgba(37,99,235,0.6)" : "var(--text-muted)" }}>
                      Bank: {t.bankRate}%
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Comparison Yield and expected interest returns */}
            <div style={{
              background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius: 14, padding: 18, marginBottom: 20
            }}>
              <h4 style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                📊 Estimated Return Calculator
              </h4>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Savings term:</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
                    {selectedTerm === 0 ? "Flexible (No Fixed Term)" : `${selectedTerm} Months`}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>SmartWallet Rate:</span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: "var(--primary)" }}>
                    {getTermDetails(selectedTerm).rate}% / year
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Standard Bank Rate:</span>
                  <span style={{ fontSize: 13, color: "var(--text-muted)", textDecoration: "line-through" }}>
                    {getTermDetails(selectedTerm).bankRate}% / year
                  </span>
                </div>
                <div style={{ height: "1px", background: "var(--border)", margin: "4px 0" }} />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, color: "var(--text-secondary)", fontWeight: 600 }}>Estimated Interest:</span>
                  <span style={{ fontSize: 14, fontWeight: 800, color: "#22c55e" }}>
                    {selectedTerm === 0 ? `+${formatVND(estReturns.interest)} / day` : `+${formatVND(estReturns.interest)}`}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, color: "var(--text-secondary)", fontWeight: 600 }}>Total Principal + Interest at Maturity:</span>
                  <span style={{ fontSize: 15, fontWeight: 800, color: "var(--text-primary)" }}>
                    {selectedTerm === 0 ? "N/A" : formatVND(estReturns.total)}
                  </span>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="btn-primary"
              style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
            >
              {submitting ? "Processing transaction..." : `Confirm Deposit ${formatVND(Number(depositAmount) || 0)}`}
            </button>
          </form>
        </div>

        {/* Benefits description side box */}
        <div style={{
          background: "var(--bg-card)", border: "1px solid var(--border)",
          borderRadius: 20, padding: 28, display: "flex", flexDirection: "column", justifyContent: "space-between"
        }}>
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 14 }}>Why Choose SmartWallet Savings?</h3>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {[
                { 
                  icon: TrendingUp, 
                  title: "Double the bank interest rate", 
                  desc: "SmartWallet's savings rate is always maintained at twice the standard bank savings rate for the same term." 
                },
                { 
                  icon: ShieldAlert, 
                  title: "Fully secure", 
                  desc: "Your savings are guaranteed by trusted financial funds and partner banks." 
                },
                { 
                  icon: ArrowRightLeft, 
                  title: "Instant withdrawal", 
                  desc: "Upon withdrawal, both principal and earned interest are credited instantly to your available balance 24/7." 
                },
                { 
                  icon: HelpCircle, 
                  title: "Important notice", 
                  desc: "If you withdraw before maturity (fixed term), the interest rate for the entire deposit reverts to the flexible rate (0.2%/year) calculated from the deposit date." 
                }
              ].map((item, i) => (
                <div key={i} style={{ display: "flex", gap: 12 }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--bg-card2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
                    <item.icon size={13} style={{ color: "var(--primary)" }} />
                  </div>
                  <div>
                    <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>{item.title}</h4>
                    <p style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.4 }}>{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Active vaults list */}
      <div style={{
        background: "var(--bg-card)", border: "1px solid var(--border)",
        borderRadius: 20, padding: 28
      }}>
        <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 20 }}>My Savings Accounts</h3>

        {loading ? (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <div style={{
              width: 30, height: 30, border: "3px solid var(--border)", borderTopColor: "var(--primary)",
              borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 12px"
            }} />
            <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>Loading your savings accounts...</p>
          </div>
        ) : investments.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-muted)" }}>
            <span style={{ fontSize: 40 }}>💰</span>
            <p style={{ fontSize: 14, fontWeight: 600, marginTop: 12 }}>You have no active savings accounts yet</p>
            <p style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>Open your first account using the form above and earn double the bank rate!</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {investments.map((inv) => {
              const details = getTermDetails(inv.term_months);
              const isClosed = inv.status === "WITHDRAWN";
              const isEarly = checkIfEarly(inv);
              
              // Calculate date calculations
              const start = new Date(inv.start_date || inv.startDate);
              const now = new Date();
              const diffTime = Math.max(0, now.getTime() - start.getTime());
              const daysPassed = Math.floor(diffTime / (1000 * 60 * 60 * 24));
              
              let progress = 100;
              let totalDays = 0;
              if (inv.term_months > 0) {
                const end = new Date(inv.end_date || inv.endDate);
                const totalTime = end.getTime() - start.getTime();
                totalDays = Math.floor(totalTime / (1000 * 60 * 60 * 24));
                progress = Math.min(100, Math.max(0, (daysPassed / totalDays) * 100));
              }

              return (
                <div
                  key={inv.id}
                  style={{
                    border: "1px solid var(--border)", borderRadius: 16, padding: 20,
                    background: isClosed ? "var(--bg-card2)" : "#ffffff", opacity: isClosed ? 0.75 : 1,
                    position: "relative"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 14 }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 14, fontWeight: 800 }}>Account #SWINV-{inv.id}</span>
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 12,
                          background: isClosed ? "rgba(113, 113, 122, 0.1)" : "rgba(34, 197, 94, 0.1)",
                          color: isClosed ? "#71717a" : "#22c55e"
                        }}>
                          {isClosed ? "CLOSED" : "ACTIVE"}
                        </span>
                        {inv.term_months === 0 ? (
                          <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 12, background: "rgba(59, 130, 246, 0.1)", color: "#3b82f6" }}>
                            FLEXIBLE
                          </span>
                        ) : (
                          <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 12, background: "rgba(139, 92, 246, 0.1)", color: "#8b5cf6" }}>
                            {inv.term_months}-MONTH TERM
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>
                        Opened: {start.toLocaleDateString("en-US")} {inv.term_months > 0 && `| Matures: ${new Date(inv.end_date || inv.endDate).toLocaleDateString("en-US")}`}
                      </p>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <p style={{ fontSize: 11, color: "var(--text-secondary)" }}>Applied Interest Rate</p>
                      <p style={{ fontSize: 15, fontWeight: 800, color: "var(--primary)" }}>{inv.interest_rate}% / year</p>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 14, marginBottom: 16 }}>
                    <div>
                      <p style={{ fontSize: 11, color: "var(--text-secondary)" }}>Principal Amount</p>
                      <p style={{ fontSize: 15, fontWeight: 700 }}>{formatVND(Number(inv.amount))}</p>
                    </div>

                    <div>
                      <p style={{ fontSize: 11, color: "var(--text-secondary)" }}>Days Accumulated</p>
                      <p style={{ fontSize: 15, fontWeight: 700 }}>{daysPassed} days {totalDays > 0 && `/ ${totalDays} days`}</p>
                    </div>

                    <div>
                      <p style={{ fontSize: 11, color: "var(--text-secondary)" }}>Accrued Interest</p>
                      <p style={{ fontSize: 15, fontWeight: 800, color: "#22c55e" }}>
                        +{formatVND(isClosed ? Number(inv.accumulated_interest || 0) : Number(inv.accruedInterest || 0))}
                      </p>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
                      {!isClosed && (
                        <button
                          disabled={submitting}
                          onClick={() => handleWithdrawClick(inv)}
                          className={isEarly ? "btn-secondary" : "btn-primary"}
                          style={{
                            padding: "8px 16px", borderRadius: 10, fontSize: 12, fontWeight: 700, width: "100%", sm: "auto",
                            background: isEarly ? "transparent" : "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                            color: isEarly ? "var(--text-primary)" : "white",
                            border: isEarly ? "1px solid var(--border)" : "none",
                            boxShadow: isEarly ? "none" : "0 4px 10px rgba(16, 185, 129, 0.2)"
                          }}
                        >
                          Close Account
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Progress bar */}
                  {inv.term_months > 0 && !isClosed && (
                    <div style={{ marginTop: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--text-secondary)", marginBottom: 4 }}>
                        <span>Term Progress</span>
                        <span>{Math.round(progress)}%</span>
                      </div>
                      <div style={{ width: "100%", height: 6, background: "var(--bg-card2)", borderRadius: 3, overflow: "hidden" }}>
                        <div style={{ width: `${progress}%`, height: "100%", background: progress >= 100 ? "#22c55e" : "var(--primary)", borderRadius: 3, transition: "width 0.4s ease" }} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Early Withdrawal Warning Modal */}
      <AnimatePresence>
        {showEarlyModal && selectedInv && (
          <div style={{
            position: "fixed", inset: 0, zIndex: 99999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20
          }}>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowEarlyModal(false)}
              style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
            />

            {/* Modal Body */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              style={{
                background: "white", borderRadius: 24, padding: 30, maxWidth: 500, width: "100%",
                position: "relative", zIndex: 1, boxShadow: "0 20px 50px rgba(0,0,0,0.2)",
                textAlign: "center"
              }}
            >
              <div style={{
                width: 56, height: 56, borderRadius: "50%", background: "rgba(239, 68, 68, 0.1)",
                display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px"
              }}>
                <AlertTriangle size={26} style={{ color: "#ef4444" }} />
              </div>

              <h3 style={{ fontSize: 18, fontWeight: 800, color: "#1e293b", marginBottom: 12 }}>
                Warning: Early Withdrawal!
              </h3>
              
              <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: 20 }}>
                You are closing your <strong>{selectedInv.term_months}-month</strong> savings account early. 
                Per policy, early withdrawal will only receive the <strong>flexible rate (0.2%/year)</strong> calculated from the deposit date.
              </p>

              <div style={{
                background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius: 12, padding: 16, marginBottom: 24,
                textAlign: "left", display: "flex", flexDirection: "column", gap: 8
              }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Principal Amount:</span>
                  <span style={{ fontSize: 12, fontWeight: 700 }}>{formatVND(Number(selectedInv.amount))}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Original Term Rate:</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--primary)" }}>{selectedInv.interest_rate}%/year</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Effective Rate Applied:</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#ef4444" }}>0.2%/year (Early withdrawal penalty)</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 600 }}>Estimated Interest Forfeited:</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#ef4444" }}>
                    -{formatVND(Math.max(0, (Number(selectedInv.amount) * (Number(selectedInv.interest_rate) / 100) * (selectedInv.term_months / 12)) - Number(selectedInv.accruedInterest || 0)))}
                  </span>
                </div>
              </div>

              <div style={{ display: "flex", gap: 12 }}>
                <button
                  type="button"
                  onClick={() => setShowEarlyModal(false)}
                  style={{
                    flex: 1, padding: "12px", borderRadius: 10, border: "1px solid var(--border)",
                    background: "#ffffff", color: "var(--text-secondary)", fontWeight: 700, fontSize: 14, cursor: "pointer"
                  }}
                >
                  Cancel, keep account
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => executeWithdraw(selectedInv.id)}
                  style={{
                    flex: 1, padding: "12px", borderRadius: 10, border: "none",
                    background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)", color: "white",
                    fontWeight: 700, fontSize: 14, cursor: "pointer", boxShadow: "0 4px 12px rgba(239, 68, 68, 0.2)"
                  }}
                >
                  {submitting ? "Processing..." : "Accept penalty & Withdraw"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
