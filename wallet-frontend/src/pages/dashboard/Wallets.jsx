import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowDownLeft, ArrowUpRight, QrCode, Building2, Plus,
  X, CreditCard, Check, Search,
  Wallet, Upload, Smartphone, AlertCircle, Gift, Tag, Flame, Download, Copy,
  Shield, Snowflake, PhoneCall
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { QRCodeCanvas as QRCode } from "qrcode.react";
import { walletAPI, authAPI, bankAPI, payosAPI, categoryAPI, voucherAPI, formatVND } from "../../services/api";
import { useLanguage } from "../../context/LanguageContext";
import { useModal } from "../../context/ModalContext";
import jsQR from "jsqr";
import "./Wallets.css";

const BANKS = ["Vietcombank","Techcombank","BIDV","VietinBank","Agribank","MB Bank","VPBank","TPBank","ACB","Sacombank"];

// Nhãn giảm giá + ngày suy từ voucher DB
const discountLabel = (v, lang) => {
  if (v.discount_type === "PERCENT") return `${Number(v.discount_value)}%`;
  const formatted = Number(v.discount_value).toLocaleString(lang === "en" ? "en-US" : "vi-VN");
  return lang === "en" ? `${formatted} VND` : `${formatted}₫`;
};

const fmtVoucherDate = (d) => { try { return new Date(d).toLocaleDateString("vi-VN"); } catch { return ""; } };

const tagColors = {
  "Chuyển tiền":"#2563eb","Mua sắm":"#3b82f6","Rút tiền":"#22c55e",
  "Referral":"#8b5cf6","Nạp tiền":"#f59e0b","Hóa đơn":"#ec4899"
};

const tagClassMap = {
  "Transfer": "tag-transfer",
  "Shopping": "tag-shopping",
  "Withdraw": "tag-withdraw",
  "Referral": "tag-referral",
  "Deposit": "tag-deposit",
  "Bills": "tag-bill",
  "Chuyển tiền": "tag-transfer",
  "Mua sắm": "tag-shopping",
  "Rút tiền": "tag-withdraw",
  "Nạp tiền": "tag-deposit",
  "Hóa đơn": "tag-bill",
};

const TAG_MAP = {
  "Chuyển tiền":"Transfer","Mua sắm":"Shopping","Rút tiền":"Withdraw",
  "Referral":"Referral","Nạp tiền":"Deposit","Hóa đơn":"Bills"
};

const normalizeTag = (tag) => TAG_MAP[tag] || tag;

const getTagLabel = (tagKey, lang) => {
  if (lang === "vi") {
    if (tagKey === "All") return "Tất cả";
    if (tagKey === "Transfer") return "Chuyển tiền";
    if (tagKey === "Shopping") return "Mua sắm";
    if (tagKey === "Withdraw") return "Rút tiền";
    if (tagKey === "Referral") return "Giới thiệu";
    if (tagKey === "Deposit") return "Nạp tiền";
    if (tagKey === "Bills") return "Hóa đơn";
    return tagKey;
  }
  if (tagKey === "Chuyển tiền") return "Transfer";
  if (tagKey === "Mua sắm") return "Shopping";
  if (tagKey === "Rút tiền") return "Withdraw";
  if (tagKey === "Referral") return "Referral";
  if (tagKey === "Nạp tiền") return "Deposit";
  if (tagKey === "Hóa đơn") return "Bills";
  return tagKey;
};

const translateVoucher = (v, lang) => {
  if (lang !== "en" || !v) return v;
  const translations = {
    "CHUYENTIEN50": {
      title: "50K discount on transfer fee",
      description: "For transactions from 500K"
    },
    "MUASAM10": {
      title: "10% off shopping",
      description: "Max 200K"
    },
    "BILL30": {
      title: "30K discount on bills",
      description: "Bill payment"
    }
  };
  const trans = translations[v.code];
  if (trans) {
    return {
      ...v,
      title: trans.title,
      description: trans.description
    };
  }
  
  const titleMap = {
    "Giảm 50K phí chuyển tiền": "50K discount on transfer fee",
    "Giảm 10% mua sắm": "10% off shopping",
    "Giảm 30K hóa đơn": "30K discount on bills"
  };
  const descMap = {
    "Áp dụng giao dịch từ 500K": "For transactions from 500K",
    "Tối đa 200K": "Max 200K",
    "Thanh toán hóa đơn": "Bill payment"
  };
  return {
    ...v,
    title: titleMap[v.title] || v.title,
    description: descMap[v.description] || v.description
  };
};


const fmtCurrency = (n) => formatVND(n);


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

const mapBackendTx = (tx, currentEmail) => {
  const isSender = tx.sender_wallet && tx.sender_wallet.user && tx.sender_wallet.user.email === currentEmail;
  const type = isSender ? "send" : "receive";
  
  let name = "";
  if (tx.transaction_type === 'DEPOSIT') name = "Wallet Deposit";
  else if (tx.transaction_type === 'WITHDRAW') name = `Withdraw to ${tx.bank_code || 'bank'}`;
  else if (tx.transaction_type === 'PAYMENT') name = `Bank payment to ${tx.bank_code || 'bank'}`;
  else if (tx.transaction_type === 'TRANSFER') {
    name = isSender 
      ? `Transfer to ${tx.receiver_wallet?.user?.email || 'recipient'}`
      : `Received from ${tx.sender_wallet?.user?.email || 'sender'}`;
  } else name = tx.message || "Other Transaction";

  const date = new Date(tx.created_at || tx.createdAt);
  const timeStr = date.toLocaleTimeString("vi-VN", {hour: '2-digit', minute:'2-digit'}) + " " + date.toLocaleDateString("vi-VN");

  return {
    id: tx.reference_code || `TX${tx.id}`,
    type,
    name,
    amount: Number(tx.amount),
    fee: Number(tx.fee_amount || 0),
    finalAmount: Number(tx.final_amount ?? tx.amount),
    time: timeStr,
    status: tx.status.toLowerCase(),
    note: tx.message || "",
    category: tx.category?.name || "",
  };
};

export default function WalletsPage() {
  const { lang, t } = useLanguage();
  const { showConfirm } = useModal();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState("all");
  const [userEmail, setUserEmail] = useState("");
  const [modal, setModal] = useState(null); // null | 'deposit' | 'withdraw' | 'transfer' | 'qr' | 'bank' | 'tx'
  const [selectedTx, setSelectedTx] = useState(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  
  // PIN states
  const [hasPin, setHasPin] = useState(() => {
    try {
      const u = localStorage.getItem("bw_user");
      return u ? !!JSON.parse(u).has_pin : false;
    } catch {
      return false;
    }
  });

  const [kycStatus, setKycStatus] = useState(() => {
    try {
      const u = localStorage.getItem("bw_user");
      return u ? (JSON.parse(u).kycStatus || "none") : "none";
    } catch {
      return "none";
    }
  });
  const [walletStatus, setWalletStatus] = useState("active");
  const [showFreezeConfirm, setShowFreezeConfirm] = useState(false);
  const [pinSetupInputs, setPinSetupInputs] = useState(["", "", "", ""]);
  const [pinSetupConfirmInputs, setPinSetupConfirmInputs] = useState(["", "", "", ""]);
  const [pinTransactionInputs, setPinTransactionInputs] = useState(["", "", "", ""]);
  const [pinStep, setPinStep] = useState(false);
  const [pinActionType, setPinActionType] = useState(""); // 'withdraw' | 'transfer'

  const pinSetupRefs = useRef([]);
  const pinSetupConfirmRefs = useRef([]);
  const pinTransactionRefs = useRef([]);

  const handlePinSetupChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newPin = [...pinSetupInputs];
    newPin[index] = value.slice(-1);
    setPinSetupInputs(newPin);
    if (value && index < 3) {
      pinSetupRefs.current[index + 1]?.focus();
    }
  };

  const handlePinSetupKeyDown = (index, e) => {
    if (e.key === "Backspace" && !pinSetupInputs[index] && index > 0) {
      pinSetupRefs.current[index - 1]?.focus();
    }
  };

  const handlePinSetupConfirmChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newPin = [...pinSetupConfirmInputs];
    newPin[index] = value.slice(-1);
    setPinSetupConfirmInputs(newPin);
    if (value && index < 3) {
      pinSetupConfirmRefs.current[index + 1]?.focus();
    }
  };

  const handlePinSetupConfirmKeyDown = (index, e) => {
    if (e.key === "Backspace" && !pinSetupConfirmInputs[index] && index > 0) {
      pinSetupConfirmRefs.current[index - 1]?.focus();
    }
  };

  const handlePinTransactionChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newPin = [...pinTransactionInputs];
    newPin[index] = value.slice(-1);
    setPinTransactionInputs(newPin);
    if (value && index < 3) {
      pinTransactionRefs.current[index + 1]?.focus();
    }
  };

  const handlePinTransactionKeyDown = (index, e) => {
    if (e.key === "Backspace" && !pinTransactionInputs[index] && index > 0) {
      pinTransactionRefs.current[index - 1]?.focus();
    }
  };

  const submitPinSetup = async () => {
    const pin = pinSetupInputs.join("");
    const confirmPin = pinSetupConfirmInputs.join("");

    if (pin.length < 4 || confirmPin.length < 4) {
      showToast("Please enter all 4 digits for your PIN.", "error");
      return;
    }

    if (pin !== confirmPin) {
      showToast("PIN confirmation does not match. Please try again.", "error");
      return;
    }

    try {
      const res = await authAPI.setPin(pin);
      if (res.success) {
        setHasPin(true);
        const bwUser = localStorage.getItem("bw_user");
        if (bwUser) {
          const u = JSON.parse(bwUser);
          u.has_pin = true;
          localStorage.setItem("bw_user", JSON.stringify(u));
        }
        showToast("Transaction PIN set up successfully!");
        
        // Reset states
        setPinSetupInputs(["", "", "", ""]);
        setPinSetupConfirmInputs(["", "", "", ""]);

        // Open the originally requested modal
        if (pinActionType) {
          setModal(pinActionType);
          setPinActionType("");
        } else {
          closeModal();
        }
      } else {
        showToast(res.message || "Unable to set up PIN.", "error");
      }
    } catch (err) {
      showToast(err.response?.data?.message || "System error while setting up PIN.", "error");
    }
  };

  const handleSelfFreeze = async () => {
    try {
      const res = await walletAPI.freezeWallet();
      if (res.success) {
        setWalletStatus("frozen");
        setShowFreezeConfirm(false);
        showToast("Your wallet has been frozen. Contact support to unfreeze it.", "success");
      } else {
        showToast(res.message || "Failed to freeze wallet.", "error");
      }
    } catch (err) {
      showToast(err.response?.data?.message || "System error. Please try again.", "error");
    }
  };

  const handleActionClick = (targetModal) => {
    if ((targetModal === "deposit" || targetModal === "withdraw" || targetModal === "transfer" || targetModal === "qr_scan") && walletStatus === "frozen") {
      showToast("Your wallet is frozen. Please contact support to unfreeze it.", "error");
      return;
    }
    if ((targetModal === "deposit" || targetModal === "withdraw" || targetModal === "transfer" || targetModal === "qr_scan") && kycStatus !== "verified") {
      showToast(
        kycStatus === "pending"
          ? `Your KYC is under review. Please wait for approval before you can proceed.`
          : `KYC verification required before you can proceed. Go to the KYC section to complete it.`,
        "error"
      );
      return;
    }
    if (targetModal === "withdraw" || targetModal === "transfer" || targetModal === "qr_scan") {
      if (!hasPin) {
        setPinActionType(targetModal);
        setModal("pin_setup");
        return;
      }
    }
    if (targetModal === "qr_scan") {
      setTransferMethod("bank");
    }
    setModal(targetModal);
  };
  const [bankForm, setBankForm] = useState({ bank:"", account:"", owner:"" });
  const [txForm, setTxForm] = useState({ amount:"", target:"", note:"", category:"" });
  const [categories, setCategories] = useState([]);
  const [depositForm, setDepositForm] = useState({ amount:"", note:"" });
  const [activeDepositTx, setActiveDepositTx] = useState(null);
  const [step, setStep] = useState(1);
  const [depositMethod, setDepositMethod] = useState(null); // null | 'bank' | 'qr' | 'pending'
  const [depositPaymentData, setDepositPaymentData] = useState(null); // { orderCode, transferNote, vietQrUrl, amount }
  const [depositLoading, setDepositLoading] = useState(false);
  const qrCanvasRef = useRef(null);
  const [txList, setTxList] = useState([]);
  const [linkedBanks, setLinkedBanks] = useState([]);
  const [selectedBankId, setSelectedBankId] = useState("");
  const [toast, setToast] = useState(null);
  const toastTimeoutRef = useRef(null);
  const [transferMethod, setTransferMethod] = useState("smartwallet"); // 'smartwallet' | 'bank'
  const [bankTransferForm, setBankTransferForm] = useState({ bank: "", account: "", ownerName: "" });
  const [qrUploadFile, setQrUploadFile] = useState(null);
  const [qrUploadPreview, setQrUploadPreview] = useState(null);
  const qrInputRef = useRef(null);
  const [balance, setBalance] = useState(0);

  // Promo / Voucher states
  const [promoCode, setPromoCode] = useState("");
  const [appliedVoucher, setAppliedVoucher] = useState(null);
  const [showPromoSelector, setShowPromoSelector] = useState(false);
  const [activePromoTab, setActivePromoTab] = useState("All");
  const [voucherList, setVoucherList] = useState([]);
  const [feeRules, setFeeRules] = useState({});

  const getTxnFee = (type) => {
    const v = feeRules[type];
    if (v == null) return 0;
    return Number(v) || 0;
  };

  const loadFeeRules = async () => {
    try {
      const feesData = await walletAPI.getFees();
      if (feesData?.success) setFeeRules(feesData.fees || {});
    } catch (err) {
      console.error("Failed to load transaction fees:", err);
    }
  };

  const calcChargeSummary = (amount, feeType, discount = 0) => {
    const amt = Number(amount) || 0;
    const unitFee = getTxnFee(feeType);
    const fee = amt > 0 ? unitFee : 0;
    const disc = Number(discount) || 0;
    return { amount: amt, fee, discount: disc, total: Math.max(0, amt + fee - disc), unitFee };
  };

  const renderFeeSummary = (summary, feeType) => {
    const configuredFee = feeType ? getTxnFee(feeType) : summary.fee;

    if (summary.amount <= 0) {
      if (configuredFee <= 0) return null;
      return (
        <div className="fee-summary-box">
          <div className="fee-summary-row">
            <span>{t.wallets.serviceFee}</span>
            <span>{fmtCurrency(configuredFee)}</span>
          </div>
          <p className="fee-hint-text">{t.wallets.feePerTxnHint}</p>
        </div>
      );
    }

    return (
      <div className="fee-summary-box">
        <div className="fee-summary-row">
          <span>{t.wallets.txDetailAmount}</span>
          <span>{fmtCurrency(summary.amount)}</span>
        </div>
        <div className="fee-summary-row">
          <span>{t.wallets.serviceFee}</span>
          <span>{summary.fee > 0 ? fmtCurrency(summary.fee) : t.wallets.noFee}</span>
        </div>
        {summary.discount > 0 && (
          <div className="fee-summary-row fee-discount">
            <span>{t.wallets.discount}</span>
            <span>-{fmtCurrency(summary.discount)}</span>
          </div>
        )}
        <div className="fee-summary-row fee-total">
          <span>{t.wallets.totalDeduction}</span>
          <span>{fmtCurrency(summary.total)}</span>
        </div>
      </div>
    );
  };

  const loadVouchers = async () => {
    try { const res = await voucherAPI.publicList(); if (res.success) setVoucherList(res.data); }
    catch (e) { console.error("Load vouchers failed:", e); }
  };

  // Áp mã: hỏi backend (voucherAPI.check) -> giảm giá THẬT + validate (min/HSD/số lượng).
  const handleApplyPromo = async () => {
    if (!promoCode.trim()) { showToast("Please enter a promo code!", "error"); return; }
    const amt = Number(txForm.amount) || 0;
    if (amt <= 0) { showToast("Please enter an amount before applying a promo code!", "error"); return; }
    try {
      const res = await voucherAPI.check(promoCode.trim(), amt);
      const v = voucherList.find(x => x.code.toUpperCase() === promoCode.trim().toUpperCase()) || { code: res.code, title: res.code };
      setAppliedVoucher({ ...v, code: res.code, discountAmount: res.discountAmount });
      setPromoCode(res.code);
      showToast(`Code ${res.code} applied — you save ${fmtCurrency(res.discountAmount)}!`);
    } catch (e) {
      showToast(e.response?.data?.message || "Invalid or expired promo code!", "error");
    }
  };

  const handleSelectVoucher = async (v) => {
    const amt = Number(txForm.amount) || 0;
    if (amt <= 0) { showToast("Please enter an amount before selecting a promo code!", "error"); return; }
    try {
      const res = await voucherAPI.check(v.code, amt);
      setAppliedVoucher({ ...v, discountAmount: res.discountAmount });
      setPromoCode(v.code);
      setShowPromoSelector(false);
      showToast(`Code ${v.code} applied — you save ${fmtCurrency(res.discountAmount)}!`);
    } catch (e) {
      showToast(e.response?.data?.message || "This promo code could not be applied!", "error");
    }
  };


  // Normalize a bank record from the backend to the shape used by the UI
  const mapBank = (b) => ({
    id: b.id,
    bank: b.bank_code,
    account: b.account_number,
    owner: b.account_name,
    is_verified: b.is_verified,
  });

  const fetchBanks = async () => {
    try {
      const data = await bankAPI.getMyBanks();
      if (Array.isArray(data)) {
        const mapped = data.map(mapBank);
        setLinkedBanks(mapped);
        if (mapped.length > 0 && !selectedBankId) setSelectedBankId(mapped[0].id);
      }
    } catch (err) {
      console.error("Failed to load linked banks:", err);
    }
  };

  const handleUnlinkBank = (bankId, bankName) => {
    showConfirm(`Are you sure you want to unlink ${bankName}?`, async () => {
      try {
        const res = await bankAPI.unlinkBank(bankId);
        if (res.success) {
          await fetchBanks();
          if (selectedBankId === bankId) {
            const remaining = linkedBanks.filter(x => x.id !== bankId);
            setSelectedBankId(remaining[0]?.id || "");
          }
          showToast("Bank account unlinked successfully!");
        } else {
          showToast(res.message || "Failed to unlink bank account.", "error");
        }
      } catch (err) {
        showToast(err.response?.data?.message || "Connection error. Please try again.", "error");
      }
    }, null, true);
  };

  const fetchWalletData = async () => {
    const bwUser = localStorage.getItem("bw_user");
    const currentEmail = bwUser ? JSON.parse(bwUser).email : null;
    if (!currentEmail) return;
    loadFeeRules();
    try {
      const [statsData, txsData, profileData] = await Promise.all([
        walletAPI.getStats(),
        walletAPI.getTransactions(),
        authAPI.getProfile(),
      ]);

      if (statsData.success) setBalance(Number(statsData.stats.currentBalance));

      if (txsData.success) {
        const mapped = txsData.transactions.map(t => mapBackendTx(t, currentEmail));
        setTxList(mapped);
      }

      if (profileData.success && profileData.user) {
        const kyc = (profileData.user.kyc_status || "none").toLowerCase();
        const wStatus = (profileData.user.wallet_status || "ACTIVE").toLowerCase();
        setHasPin(!!profileData.user.has_pin);
        setKycStatus(kyc);
        setWalletStatus(wStatus);
        const u = JSON.parse(bwUser);
        u.has_pin = !!profileData.user.has_pin;
        u.kycStatus = kyc;
        localStorage.setItem("bw_user", JSON.stringify(u));

        // Mở modal theo URL (?modal=) CHỈ sau khi đã biết KYC/PIN mới nhất, đi qua cùng
        // guard như nút bấm: chưa KYC / ví đóng băng -> KHÔNG mở bảng nạp/rút/chuyển.
        const modalParam = searchParams.get("modal");
        const promoParam = searchParams.get("promo");
        if (modalParam) {
          const needsKyc = modalParam === "deposit" || modalParam === "withdraw" || modalParam === "transfer";
          let opened = false;
          if (needsKyc && wStatus === "frozen") {
            showToast("Your wallet is frozen. Please contact support to unfreeze it.", "error");
          } else if (needsKyc && kyc !== "verified") {
            showToast(
              kyc === "pending"
                ? `Your KYC is under review. Please wait for approval before you can ${modalParam}.`
                : `KYC verification required before you can ${modalParam}. Go to the KYC section to complete it.`,
              "error"
            );
          } else if ((modalParam === "withdraw" || modalParam === "transfer") && !profileData.user.has_pin) {
            setPinActionType(modalParam);
            setModal("pin_setup");
            opened = true;
          } else {
            setModal(modalParam);
            opened = true;
          }
          // Chỉ gợi ý "đã điền mã / nhập số tiền" khi modal THỰC SỰ mở (đã qua gate KYC/đóng băng).
          if (opened && promoParam) {
            setPromoCode(promoParam);
            setTimeout(() => { showToast(`Promo code applied: ${promoParam}. Enter an amount then click "Apply".`); }, 900);
          }
          setSearchParams({}, { replace: true });
        }
      }
    } catch (err) {
      console.error("Failed to load live wallet data from server:", err);
    }
  };

  useEffect(() => {
    categoryAPI.list().then(r => { if (r?.success) setCategories(r.data); }).catch(() => {});
  }, []);

  useEffect(() => {
    if (modal === "withdraw" || modal === "transfer" || modal === "qr_scan") {
      loadFeeRules();
    }
  }, [modal]);

  useEffect(() => {
    loadVouchers();

    const bwUser = localStorage.getItem("bw_user");
    const currentEmail = bwUser ? JSON.parse(bwUser).email : null;
    if (currentEmail) setUserEmail(currentEmail);

    if (currentEmail) {
      fetchWalletData();
      fetchBanks();
    }

    // (URL ?modal= / ?promo= được xử lý trong fetchWalletData, sau khi đã biết KYC/PIN mới nhất)

    setTimeout(() => setLoading(false), 800);

    return () => {
    };
  }, [searchParams]);

  // Poll transaction status when depositMethod is 'pending' and orderCode is available
  useEffect(() => {
    if (depositMethod !== "pending" || !depositPaymentData?.orderCode) return;

    let intervalId = setInterval(async () => {
      try {
        const data = await payosAPI.checkPaymentStatus(depositPaymentData.orderCode);
        if (data.success) {
          if (data.status === "PAID") {
            showToast("✅ Deposit successful! Your wallet balance has been updated.");
            fetchWalletData();
            closeModal();
          } else if (data.status === "CANCELLED") {
            showToast("❌ Transaction was cancelled.", "error");
            closeModal();
          }
        }
      } catch (err) {
        console.error("Error polling payment status:", err);
      }
    }, 3000);

    return () => clearInterval(intervalId);
  }, [depositMethod, depositPaymentData]);

  // Deposit via linked bank account
  const handleInitiateDeposit = async () => {
    if (!depositForm.amount || Number(depositForm.amount) <= 0) {
      showToast("Please enter a valid amount to deposit!", "error");
      return;
    }
    if (Number(depositForm.amount) < 1000) {
      showToast("Minimum deposit amount is 1,000₫!", "error");
      return;
    }
    if (!selectedBankId) {
      showToast("Please select or link a bank account first!", "error");
      return;
    }

    setDepositLoading(true);
    try {
      const amount = Number(depositForm.amount);
      const note = depositForm.note || "SmartWallet Deposit";
      const data = await walletAPI.deposit(selectedBankId, amount, note);

      if (data.success) {
        showToast("Deposit successful! Your balance has been updated.");
        setBalance(prev => prev + amount);
        await fetchWalletData();
        closeModal();
      } else {
        showToast(data.message || "Unable to process deposit.", "error");
      }
    } catch (err) {
      console.error("Deposit error:", err);
      showToast(err.response?.data?.message || "Connection error. Please try again.", "error");
    } finally {
      setDepositLoading(false);
    }
  };

  // Người dùng xác nhận đã chuyển tiền -> đóng modal, lệnh PENDING chờ webhook
  const handleConfirmTransferred = () => {
    closeModal();
    showToast("✅ Deposit request pending confirmation! Your balance will be updated once the transaction is verified.");
  };

  const handleCopyText = (text, label) => {
    navigator.clipboard.writeText(text);
    showToast(`${label} copied!`);
  };

  // Aliases kept for button wiring
  const handleConfirmDepositBank = () => handleInitiateDeposit();

  // Nạp tiền qua QR ngân hàng THẬT (PayOS): tạo link thanh toán rồi chuyển sang
  // trang PayOS (hiển thị QR ngân hàng thật). PayOS redirect về /payment/success
  // sau khi trả; webhook/polling cộng tiền vào ví.
  const handleConfirmDepositQR = async () => {
    if (!depositForm.amount || Number(depositForm.amount) <= 0) {
      showToast("Please enter a valid amount to deposit!", "error");
      return;
    }
    if (Number(depositForm.amount) < 1000) {
      showToast("Minimum deposit amount is 1,000₫!", "error");
      return;
    }
    setDepositLoading(true);
    try {
      const amount = Number(depositForm.amount);
      const note = depositForm.note || "Nap tien SmartWallet";
      const data = await payosAPI.createPaymentLink(amount, note, window.location.origin);
      if (data.success && data.data?.checkoutUrl) {
        closeModal();
        window.location.href = data.data.checkoutUrl;
      } else {
        showToast(data.message || "Unable to create deposit order.", "error");
      }
    } catch (err) {
      console.error("Deposit QR (PayOS) error:", err);
      showToast(err.response?.data?.message || "Connection error. Please try again.", "error");
    } finally {
      setDepositLoading(false);
    }
  };

  const handleDownloadQR = () => {
    const canvas = qrCanvasRef.current?.querySelector("canvas");
    if (canvas) {
      const url = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = url;
      const bwUser = localStorage.getItem("bw_user");
      const u = bwUser ? JSON.parse(bwUser) : null;
      const namePart = u?.name ? u.name.toLowerCase().replace(/\s+/g, "") : "user";
      link.download = `smartwallet-qr-${namePart}-${u?.id || "user"}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast("QR code downloaded!");
    } else {
      showToast("Unable to download QR code, please try again.", "error");
    }
  };

  const showToast = (message, type = "success") => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToast({ message, type });
    toastTimeoutRef.current = setTimeout(() => setToast(null), 3000);
  };

  // Sau khi trả PayOS, returnUrl đưa user về Ví với ?deposit=<orderCode>.
  // Đối soát NGAY tại đây 10 lần (mỗi ~10s, tối đa ~90s): PAID -> cộng tiền (backend) + refresh số dư.
  // Gặp PAID (hoặc CANCELLED) là DỪNG ngay, không chờ hết 10 lần.
  // CHỈ chạy khi quay về từ thanh toán (có param), KHÔNG chạy mỗi lần mở Ví.
  const depositPolledRef = useRef(false);
  useEffect(() => {
    const orderCode = searchParams.get("deposit");
    if (!orderCode || depositPolledRef.current) return;
    depositPolledRef.current = true;
    setSearchParams({}, { replace: true }); // dọn URL, tránh chạy lại khi refresh

    const pollDeposit = async (tries) => {
      try {
        const res = await payosAPI.checkPaymentStatus(orderCode);
        if (res.status === "PAID") {
          showToast("Deposit successful! Your balance has been updated.", "success");
          fetchWalletData();
          return;
        }
        if (res.status === "CANCELLED") {
          showToast("Deposit transaction was cancelled.", "error");
          return;
        }
      } catch (e) { /* bỏ qua, thử lại lần sau */ }
      if (tries < 9) setTimeout(() => pollDeposit(tries + 1), 10000);
      // hết 10 lần vẫn chưa PAID -> im lặng, không báo thành công giả.
    };
    pollDeposit(0);
  }, [searchParams]);

  const MAX_BANKS = 3;

  const handleLinkBank = async () => {
    if (linkedBanks.length >= MAX_BANKS) {
      showToast(`You can link up to ${MAX_BANKS} banks only!`, "error");
      return;
    }
    if (!bankForm.bank || !bankForm.account || !bankForm.owner) {
      showToast("Please fill in all bank information!", "error");
      return;
    }
    try {
      const res = await bankAPI.linkBank({
        bank_code: bankForm.bank,
        account_number: bankForm.account,
        account_name: bankForm.owner,
      });
      if (res.success) {
        await fetchBanks();
        setBankForm({ bank: "", account: "", owner: "" });
        showToast("Bank account linked successfully!");
        closeModal();
      } else {
        showToast(res.message || "Unable to link bank account.", "error");
      }
    } catch (err) {
      showToast(err.response?.data?.message || "Connection error while linking bank account.", "error");
    }
  };

  const handleConfirmWithdraw = async () => {
    if (!depositForm.amount || Number(depositForm.amount) < 10000) {
      showToast("Minimum withdrawal amount is 10,000₫!", "error");
      return;
    }
    if (!selectedBankId) {
      showToast("Please select a bank account to withdraw to!", "error");
      return;
    }

    const selectedBank = linkedBanks.find(b => b.id === selectedBankId);
    if (!selectedBank) {
      showToast("Invalid bank account!", "error");
      return;
    }

    if (!pinStep) {
      setPinStep(true);
      setPinTransactionInputs(["", "", "", ""]);
      return;
    }

    const pin = pinTransactionInputs.join("");
    if (pin.length < 4) {
      showToast("Please enter all 4 PIN digits.", "error");
      return;
    }

    try {
      const amount = Number(depositForm.amount);
      const payload = {
        amount,
        bank_code: selectedBank.bank,
        account_number: selectedBank.account,
        account_name: selectedBank.owner,
        note: depositForm.note || `Withdraw to account ${selectedBank.account} - ${selectedBank.owner}`,
        pin_code: pin,
      };
      
      const res = await walletAPI.withdraw(payload);
      
      if (res.success) {
        const summary = calcChargeSummary(amount, "WITHDRAW");
        if (res.transaction) {
          const newTx = mapBackendTx(res.transaction, userEmail);
          setTxList(prev => [newTx, ...prev]);
        }
        if (res.wallet?.balance !== undefined) setBalance(Number(res.wallet.balance));
        showToast(
          summary.fee > 0
            ? `Withdrawal successful! Total deducted: ${fmtCurrency(summary.total)} (fee: ${fmtCurrency(summary.fee)})`
            : "Withdrawal successful!",
        );
        closeModal();
        await fetchWalletData();
      }
    } catch (err) {
      console.error("Withdrawal submission error:", err);
      showToast(err.response?.data?.message || "System error during withdrawal.", "error");
      setPinTransactionInputs(["", "", "", ""]);
    }
  };



  const filtered = txList.filter(tx => {
    const matchTab = tab === "all" || tx.type === tab || (tab === "send" && tx.type === "send") || (tab === "receive" && tx.type === "receive");
    const matchSearch = !search || tx.name.toLowerCase().includes(search.toLowerCase()) || tx.id.includes(search);
    return matchTab && matchSearch;
  }).sort((a, b) => parseTxTime(b.time) - parseTxTime(a.time));

  const closeModal = () => { 
    setModal(null); 
    setStep(1); 
    setTxForm({ amount:"", target:"", note:"", category:"" }); 
    setDepositForm({ amount:"", note:"" }); 
    setActiveDepositTx(null);
    setTransferMethod("smartwallet");
    setBankTransferForm({ bank: "", account: "", ownerName: "" });
    setQrUploadFile(null);
    setQrUploadPreview(null);
    setPromoCode("");
    setAppliedVoucher(null);
    setShowPromoSelector(false);
    setPinStep(false);
    setPinSetupInputs(["", "", "", ""]);
    setPinSetupConfirmInputs(["", "", "", ""]);
    setPinTransactionInputs(["", "", "", ""]);
    setDepositMethod(null);
    setDepositPaymentData(null);
    setDepositLoading(false);
  };

  const handleQrFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setQrUploadFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setQrUploadPreview(ev.target.result);
      showToast(t.wallets.scanningQr || "Scanning QR Code...", "success");

      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);

        if (code && code.data) {
          try {
            const parsed = JSON.parse(code.data);
            if (parsed.type === "SMARTWALLET_USER_QR" && parsed.email) {
              setTransferMethod("smartwallet");
              setTxForm(prev => ({
                ...prev,
                target: parsed.email,
                amount: "100000",
                note: `Chuyển khoản QR cho ${parsed.name || parsed.email}`,
                category: categories[0]?.id ? String(categories[0].id) : "1"
              }));
              showToast(lang === "vi" ? "Nhận diện mã QR SmartWallet thành công!" : "Detected SmartWallet User QR successfully!", "success");
              return;
            }
          } catch (err) {
            console.log("Parsed QR data is not JSON or missing fields. Falling back to filename parsing.");
          }
        }

        // Fallback: Filename based parsing
        const fileNameLower = file.name.toLowerCase();
        let parsedName = "";
        let parsedAccount = "";
        let parsedBank = "Vietcombank";

        const isRaj = fileNameLower.includes("rajpham") || 
                      fileNameLower.includes("raj") || 
                      fileNameLower.includes("-5") || 
                      fileNameLower.includes("_5") || 
                      fileNameLower.includes("qr-5") ||
                      fileNameLower === "5.png" || 
                      fileNameLower === "5.jpg";
        const isThuan = fileNameLower.includes("thuan") || 
                        fileNameLower.includes("nguyenvanthuan") || 
                        fileNameLower.includes("-2") || 
                        fileNameLower.includes("_2") || 
                        fileNameLower.includes("qr-2") ||
                        fileNameLower === "2.png" || 
                        fileNameLower === "2.jpg";
        const isDuyen = fileNameLower.includes("duyen") || 
                        fileNameLower.includes("lethikieuduyen") || 
                        fileNameLower.includes("-3") || 
                        fileNameLower.includes("_3") || 
                        fileNameLower.includes("qr-3") ||
                        fileNameLower === "3.png" || 
                        fileNameLower === "3.jpg";
        const isPhong = fileNameLower.includes("phong") || 
                        fileNameLower.includes("chauquoclamphong") || 
                        fileNameLower.includes("-4") || 
                        fileNameLower.includes("_4") || 
                        fileNameLower.includes("qr-4") ||
                        fileNameLower === "4.png" || 
                        fileNameLower === "4.jpg";

        if (isRaj) {
          parsedName = "Raj Pham";
          parsedAccount = "0967373148";
        } else if (isThuan) {
          parsedName = "Nguyễn Văn Thuận";
          parsedAccount = "1234567890";
        } else if (isDuyen) {
          parsedName = "Lê Thị Kiều Duyên";
          parsedAccount = "1112223334";
        } else if (isPhong) {
          parsedName = "Châu Quốc Lâm Phong";
          parsedAccount = "4445556667";
        } else {
          const match = fileNameLower.match(/smartwallet-qr-([a-z0-9]+)-(\d+)/);
          if (match) {
            const rawName = match[1];
            const userId = match[2];
            if (rawName.includes("duyen") || rawName.includes("kieuduyen")) {
              parsedName = "Lê Thị Kiều Duyên";
              parsedAccount = "1112223334";
            } else if (rawName.includes("phong") || rawName.includes("lamphong")) {
              parsedName = "Châu Quốc Lâm Phong";
              parsedAccount = "4445556667";
            } else if (rawName.includes("thuan")) {
              parsedName = "Nguyễn Văn Thuận";
              parsedAccount = "1234567890";
            } else if (rawName.includes("raj")) {
              parsedName = "Raj Pham";
              parsedAccount = "0967373148";
            } else {
              parsedName = rawName.toUpperCase();
              parsedAccount = "999888777" + userId;
            }
          } else {
            parsedName = "NGUYEN VAN A";
            parsedAccount = "9998887776";
          }
        }

        setTransferMethod("bank");
        setBankTransferForm({
          bank: parsedBank,
          account: parsedAccount,
          ownerName: parsedName
        });

        setTxForm(prev => ({
          ...prev,
          amount: isRaj || isThuan ? "100000" : (isDuyen || isPhong ? "150000" : "50000"),
          note: `Chuyển khoản QR Sandbox cho ${parsedName}`,
          category: categories[0]?.id ? String(categories[0].id) : "1"
        }));

        showToast(t.wallets.qrScanSuccess, "success");
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleConfirmTransfer = async () => {
    if (!txForm.category) {
      showToast("Please select a transfer category!", "error");
      return;
    }
    
    if (transferMethod === "smartwallet") {
      if (!txForm.target) {
        showToast("Please enter the recipient's email!", "error");
        return;
      }
      if (!txForm.amount || Number(txForm.amount) <= 0) {
        showToast("Please enter a valid amount!", "error");
        return;
      }

      if (!pinStep) {
        setPinStep(true);
        setPinTransactionInputs(["", "", "", ""]);
        return;
      }

      const pin = pinTransactionInputs.join("");
      if (pin.length < 4) {
        showToast("Please enter all 4 PIN digits.", "error");
        return;
      }
      
      try {
        const dest_email = txForm.target;
        const amount = Number(txForm.amount);
        const note = txForm.note || `SmartWallet transfer to ${txForm.target}`;
        
        const res = await walletAPI.transfer(dest_email, amount, note, pin, txForm.category ? Number(txForm.category) : null, appliedVoucher?.code || null);
        
        if (res.success) {
          if (res.transaction) {
            const newTx = mapBackendTx(res.transaction, userEmail);
            setTxList(prev => [newTx, ...prev]);
          }
          if (res.wallet?.balance !== undefined) setBalance(Number(res.wallet.balance));
          showToast("Transfer successful!");
          closeModal();
          await fetchWalletData();
        }
      } catch (err) {
        console.error("Transfer submission error:", err);
        showToast(err.response?.data?.message || "System error during transfer.", "error");
        setPinTransactionInputs(["", "", "", ""]);
      }
    } else {
      // Bank Transfer (flows out capital)
      if (!bankTransferForm.bank) { showToast("Please select the recipient's bank!", "error"); return; }
      if (!bankTransferForm.account) { showToast("Please enter the recipient's account number!", "error"); return; }
      if (!txForm.amount || Number(txForm.amount) < 10000) { showToast("Minimum transfer amount is 10,000₫!", "error"); return; }

      if (!pinStep) {
        setPinStep(true);
        setPinTransactionInputs(["", "", "", ""]);
        return;
      }

      const pin = pinTransactionInputs.join("");
      if (pin.length < 4) {
        showToast("Please enter all 4 PIN digits.", "error");
        return;
      }
      
      try {
        const amount = Number(txForm.amount);
        const res = await walletAPI.payment({
          amount,
          bank_code: bankTransferForm.bank,
          account_number: bankTransferForm.account,
          account_name: bankTransferForm.ownerName || "Interbank Recipient",
          note: txForm.note || `Interbank transfer to account ${bankTransferForm.account} - ${bankTransferForm.bank}`,
          pin_code: pin,
          category_id: txForm.category ? Number(txForm.category) : null,
        });

        if (res.success) {
          if (res.transaction) {
            const newTx = mapBackendTx(res.transaction, userEmail);
            setTxList(prev => [newTx, ...prev]);
          }
          if (res.wallet?.balance !== undefined) setBalance(Number(res.wallet.balance));

          showToast("Bank payment successful!");
          closeModal();
          await fetchWalletData();
        }
      } catch (err) {
        console.error("Bank payment error:", err);
        showToast(err.response?.data?.message || "System error during bank payment.", "error");
        setPinTransactionInputs(["", "", "", ""]);
      }
    }
  };

  const btnStyle = (color="#2563eb") => ({
    display:"flex", flexDirection:"column", alignItems:"center", gap:8,
    background:"transparent", border:"none", cursor:"pointer", padding:"12px 16px",
    borderRadius:12, transition:"all 0.2s"
  });

  return (
    <div className="wallets-container">
      {/* Toast Notification */}
      {/* Freeze Wallet Confirmation Modal */}
      <AnimatePresence>
        {showFreezeConfirm && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            className="modal-overlay z-index-250"
            onClick={() => setShowFreezeConfirm(false)}
          >
            <motion.div initial={{scale:0.92,opacity:0}} animate={{scale:1,opacity:1}} exit={{scale:0.92,opacity:0}}
              onClick={e => e.stopPropagation()}
              className="modal-dialog modal-sm"
            >
              <div className="modal-header-row">
                <div className="freeze-icon-wrap">
                  <Shield size={22} />
                </div>
                <div className="text-left">
                  <h3 className="modal-title text-left margin-bottom-2 font-size-16">{t.wallets.freezeConfirmTitle}</h3>
                  <p className="modal-subtitle text-left margin-bottom-0 font-size-11">{t.wallets.cannotBeUndone}</p>
                </div>
              </div>
              <p className="modal-subtitle text-left font-size-13 margin-bottom-20 line-height-1-6">
                {t.wallets.freezeConfirmText}
              </p>
              <div className="btn-group-row">
                <button onClick={() => setShowFreezeConfirm(false)} className="btn-cancel">
                  {t.wallets.cancel}
                </button>
                <button onClick={handleSelfFreeze} className="btn-submit btn-danger-outline">
                  {t.wallets.freezeButton}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity:0, y:-50 }}
            animate={{ opacity:1, y:0 }}
            exit={{ opacity:0, y:-50 }}
            className={`toast-notification ${toast.type === "success" ? "toast-success" : "toast-error"}`}
          >
            {toast.type === "success" ? <Check size={18} /> : <X size={18} />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Frozen Wallet Banner */}
      {walletStatus === "frozen" && (
        <motion.div initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}}
          className="wallet-frozen-banner">
          <div className="frozen-banner-icon-wrap">
            <Snowflake size={24} className="frozen-banner-icon" />
          </div>
          <div className="frozen-banner-content">
            <p className="frozen-banner-text">{t.wallets.walletFrozenBanner}</p>
          </div>
          <div className="frozen-banner-action">
            <PhoneCall size={14} className="frozen-banner-action-icon" />
            <span className="frozen-banner-action-text">{t.wallets.contactSupport}</span>
          </div>
        </motion.div>
      )}

      {/* Balance Card */}
      <motion.div initial={{opacity:0,y:-10}} animate={{opacity:1,y:0}}
        className="balance-card">
        {/* Wallet status pill */}
        <div className="balance-card-header">
          <p className="balance-label">{t.dashboard.availableBalance}</p>
          <div className={`status-pill ${walletStatus === 'frozen' ? 'status-frozen' : 'status-active'}`}>
            {walletStatus === "frozen"
              ? <><Snowflake size={11} /><span>{t.dashboard.frozen}</span></>
              : <><div className="kyc-dot kyc-verified" /><span>{t.dashboard.active}</span></>
            }
          </div>
        </div>

        {loading
          ? <div className="skeleton height-40 min-width-160 margin-bottom-12 skeleton-balance" />
          : <h2 className={`balance-value ${walletStatus === 'frozen' ? 'frozen' : ''}`}>{fmtCurrency(balance)}</h2>
        }
        <div className="kyc-badge">
          <div className={`kyc-dot ${kycStatus === "verified" ? "kyc-verified" : kycStatus === "pending" ? "kyc-pending" : "kyc-none"}`} />
          <span>
            {kycStatus === "verified" ? t.wallets.kycVerifiedStatus : kycStatus === "pending" ? t.wallets.kycPendingStatus : t.wallets.kycUnverifiedStatus}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="actions-grid">
          {[
            { label: t.dashboard.deposit,  icon:ArrowDownLeft, className: "action-deposit", modal:"deposit" },
            { label: t.dashboard.withdraw, icon:ArrowUpRight,  className: "action-withdraw", modal:"withdraw" },
            { label: t.dashboard.transfer, icon:CreditCard,    className: "action-transfer", modal:"transfer" },
            { label: t.dashboard.qrCode,  icon:QrCode,        className: "action-qr",       modal:"qr" },
            { label: lang === "vi" ? "Quét VietQR" : "Scan VietQR", icon: QrCode, className: "action-qr-scan", modal: "qr_scan" }
          ].map(({ label, icon:Icon, className: cls, modal:m }) => {
            const isFrozen = walletStatus === "frozen" && m !== "qr";
            const isKycLocked = !isFrozen && (m === "deposit" || m === "withdraw" || m === "transfer" || m === "qr_scan") && kycStatus !== "verified";
            const isLocked = isFrozen || isKycLocked;
            return (
              <button key={m} onClick={() => handleActionClick(m)}
                className={`action-btn ${cls}`}
                disabled={isLocked}
                title={isFrozen ? "Wallet is frozen" : isKycLocked ? "KYC verification required" : undefined}
              >
                <div className="action-icon-wrap">
                  <Icon size={20} />
                </div>
                <span className="action-btn-text">{label}</span>
              </button>
            );
          })}
        </div>

        {/* Self-Freeze Button */}
        {walletStatus !== "frozen" && (
          <div className="freeze-trigger-wrap">
            <button
              onClick={() => setShowFreezeConfirm(true)}
              className="btn-freeze"
            >
              <Shield size={13} />
              {t.wallets.freezeButton}
            </button>
            <p className="freeze-desc">
              {t.wallets.freezeConfirmText.slice(0, 80)}...
            </p>
          </div>
        )}
      </motion.div>

      <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.15}}
        className="linked-banks-card">
        <div 
          onClick={() => setModal("linked_banks_list")}
          className="linked-banks-info"
        >
          <div className="linked-banks-icon">
            <Building2 size={18} />
          </div>
          <div>
            <p className="linked-banks-title">{t.dashboard.linkedBanks}</p>
            <p className="linked-banks-count">
              {linkedBanks.length}/3 {t.dashboard.accountsLinked}
            </p>
          </div>
        </div>
        <button
          onClick={() => linkedBanks.length < MAX_BANKS && setModal("bank")}
          disabled={linkedBanks.length >= MAX_BANKS}
          className="btn-add-bank"
        >
          {linkedBanks.length >= MAX_BANKS
            ? <><Check size={14} /> 3 {t.dashboard.accountsLinked}</>
            : <><Plus size={14} /> {t.dashboard.addBank}</>}
        </button>
      </motion.div>

      {/* Transactions */}
      <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.2}}
        className="transactions-card">
        <h3 className="transactions-title">{t.dashboard.transactionHistory}</h3>

        {/* Filters */}
        <div className="tx-filters">
          <div className="tx-search-wrap">
            <Search size={14} className="tx-search-icon" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t.dashboard.searchTransactions} className="tx-search-input" />
          </div>
          <div className="tx-tab-group">
            {[{v:"all",l:t.dashboard.all},{v:"receive",l:t.dashboard.receive},{v:"send",l:t.dashboard.send}].map(tb => (
              <button key={tb.v} onClick={() => setTab(tb.v)} className={`tx-tab-btn ${tab===tb.v ? "active" : "inactive"}`}>{tb.l}</button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="tx-list">
          {loading
            ? [1,2,3,4].map(i => <div key={i} className="skeleton height-60 margin-bottom-4" />)
            : filtered.map(tx => (
              <div key={tx.id} onClick={() => { setSelectedTx(tx); setModal("tx"); }}
                className="tx-row"
              >
                <div className={`tx-icon-wrap ${tx.type==="receive" ? "tx-icon-receive" : "tx-icon-send"}`}>
                  {tx.type==="receive" ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
                </div>
                <div className="tx-info">
                  <div className="tx-title-row">
                    <p className="tx-name">{tx.name}</p>
                    {tx.category && (
                      <span className="tx-category-badge">
                        {tx.category}
                      </span>
                    )}
                  </div>
                  <p className="tx-subtext">{tx.id} • {tx.time}</p>
                </div>
                <div className="tx-amount-col">
                  <p className={`tx-amount ${tx.type==="receive" ? "tx-amount-receive" : "tx-amount-send"}`}>
                    {tx.type==="receive" ? "+" : "-"}{fmtCurrency(tx.amount)}
                  </p>
                  <span className={`tx-status-badge ${tx.status==="success" ? "status-success" : tx.status==="pending" ? "status-pending" : "status-failed"}`}>
                    {tx.status==="success" ? t.dashboard.success : tx.status==="pending" ? t.dashboard.pending : t.dashboard.failed}
                  </span>
                </div>
              </div>
            ))
          }
          {!loading && filtered.length === 0 && (
            <div className="tx-empty-state">
              <p className="tx-empty-text">{t.dashboard.noTransactions}</p>
            </div>
          )}
        </div>
      </motion.div>

      {/* ============ MODALS ============ */}
      <AnimatePresence>
        {modal && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            className="modal-overlay" onClick={closeModal}>
            <motion.div initial={{scale:0.9,opacity:0}} animate={{scale:1,opacity:1}} exit={{scale:0.9,opacity:0}}
              onClick={(e) => e.stopPropagation()}
              className="modal-dialog">
              <button onClick={closeModal} className="modal-close-btn">
                <X size={16} />
              </button>

              {/* PIN SETUP MODAL */}
              {modal==="pin_setup" && (
                <div className="text-center">
                  <h3 className="modal-title">🔒 {t.wallets.pinSetupTitle}</h3>
                  <p className="modal-subtitle">
                    {t.wallets.pinSetupText}
                  </p>
                  
                  <div className="form-group">
                    <label className="form-label text-center">{t.wallets.enterNewPin}</label>
                    <div className="pin-grid">
                      {pinSetupInputs.map((digit, i) => (
                        <input
                          key={`setup-${i}`}
                          ref={el => pinSetupRefs.current[i] = el}
                          type="password"
                          inputMode="numeric"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handlePinSetupChange(i, e.target.value)}
                          onKeyDown={(e) => handlePinSetupKeyDown(i, e)}
                          className={`pin-box ${digit ? "filled" : ""}`}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="form-group margin-bottom-24">
                    <label className="form-label text-center">{t.wallets.confirmNewPin}</label>
                    <div className="pin-grid">
                      {pinSetupConfirmInputs.map((digit, i) => (
                        <input
                          key={`confirm-${i}`}
                          ref={el => pinSetupConfirmRefs.current[i] = el}
                          type="password"
                          inputMode="numeric"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handlePinSetupConfirmChange(i, e.target.value)}
                          onKeyDown={(e) => handlePinSetupConfirmKeyDown(i, e)}
                          className={`pin-box ${digit ? "filled" : ""}`}
                        />
                      ))}
                    </div>
                  </div>

                  <button onClick={submitPinSetup} className="btn-submit">
                    {t.wallets.confirmAndSet}
                  </button>
                </div>
              )}

              {/* DEPOSIT MODAL */}
              {modal==="deposit" && (
                <div>
                  {/* Step 1: Input Amount & Select Method */}
                  {depositMethod === null && (
                    <div>
                      <h3 className="modal-title">💳 {t.dashboard.deposit}</h3>
                      <p className="modal-subtitle">
                        {t.wallets.depositDesc}
                      </p>
                      
                      <div className="form-group">
                        <label className="form-label">{t.wallets.amountToDeposit}</label>
                        <div className="currency-input-wrap">
                          <input
                            type="text" inputMode="numeric"
                            value={depositForm.amount ? Number(depositForm.amount).toLocaleString("vi-VN") : ""}
                            onChange={e => { const raw = e.target.value.replace(/\D/g,""); setDepositForm({...depositForm, amount:raw}); }}
                            placeholder="0"
                            className="form-input"
                          />
                          <span className="currency-suffix">₫</span>
                        </div>
                        <div className="quick-amounts-grid">
                          {[100000,200000,500000,1000000].map(v => (
                            <button key={v} onClick={() => setDepositForm({...depositForm, amount:String(v)})} className="btn-quick-amount">
                              +{fmtCurrency(v)}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="form-group">
                        <label className="form-label">{t.wallets.note}</label>
                        <input value={depositForm.note} onChange={e => setDepositForm({...depositForm, note:e.target.value})} placeholder={t.wallets.depositNotePlaceholder} className="form-input" />
                      </div>

                      <label className="form-label">{t.wallets.selectDepositMethod}</label>
                      <div className="deposit-methods-list">
                        <button
                          disabled={!depositForm.amount || Number(depositForm.amount) <= 0}
                          onClick={() => setDepositMethod("bank")}
                          className="deposit-method-btn"
                        >
                          <div className="deposit-method-icon-wrap method-bank-icon">
                            <Building2 size={20} />
                          </div>
                          <div className="deposit-method-info">
                            <p className="deposit-method-title">{t.wallets.depositViaBank}</p>
                            <p className="deposit-method-desc">{t.wallets.depositViaBankDesc}</p>
                          </div>
                        </button>

                        <button
                          disabled={!depositForm.amount || Number(depositForm.amount) <= 0}
                          onClick={handleConfirmDepositQR}
                          className="deposit-method-btn"
                        >
                          <div className="deposit-method-icon-wrap method-qr-icon">
                            <QrCode size={20} />
                          </div>
                          <div className="deposit-method-info">
                            <p className="deposit-method-title">{t.wallets.depositViaPayos}</p>
                            <p className="deposit-method-desc">{t.wallets.depositViaPayosDesc}</p>
                          </div>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Step 2A: Bank Deposit */}
                  {depositMethod === "bank" && (
                    <div>
                      <h3 className="modal-title">{t.wallets.depositFromLinkedBankTitle}</h3>
                      <p className="modal-subtitle">
                        {t.wallets.depositAmount}: <strong className="text-primary">{depositForm.amount ? fmtCurrency(Number(depositForm.amount)) : ""}</strong>
                      </p>

                      {linkedBanks.length === 0 ? (
                        <div className="kyc-warning-box">
                          <Building2 size={24} className="kyc-warning-icon" />
                          <h4 className="kyc-warning-title">{t.wallets.noLinkedBanks}</h4>
                          <p className="kyc-warning-desc">
                            {t.wallets.noLinkedBanksDesc}
                          </p>
                          <button onClick={() => setModal("bank")} className="btn-kyc-link">
                            <Plus size={14} /> {t.wallets.linkBankNow}
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="form-group">
                            <label className="form-label">{t.wallets.selectLinkedBank}</label>
                            <div className="linked-banks-scroll">
                              {linkedBanks.map(b => {
                                const isSelected = selectedBankId === b.id;
                                return (
                                  <div
                                    key={b.id}
                                    onClick={() => setSelectedBankId(b.id)}
                                    className={`linked-bank-item ${isSelected ? "selected" : ""}`}
                                  >
                                    <div className="linked-bank-item-info">
                                      <div className="linked-bank-item-icon">
                                        <Building2 size={15} />
                                      </div>
                                      <div className="linked-bank-item-text">
                                        <p className="linked-bank-item-title">{b.bank}</p>
                                        <p className="linked-bank-item-subtitle">{b.account.replace(/.(?=.{4})/g, "*")} • {b.owner}</p>
                                      </div>
                                    </div>
                                    {isSelected && (
                                      <div className="linked-bank-check-dot">
                                        <Check size={9} color="white" />
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          <div className="btn-group-row">
                            <button onClick={() => setDepositMethod(null)} className="btn-cancel">
                              {t.wallets.cancel}
                            </button>
                            <button onClick={handleConfirmDepositBank} className="btn-submit">
                              {t.wallets.confirmDeposit}
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* Step 2B: Pending Deposit via PayOS (Admin QR Code) */}
                  {depositMethod === "pending" && depositPaymentData && (
                    <div className="text-center">
                      <h3 className="modal-title">{t.wallets.bankTransferDepositTitle}</h3>
                      <p className="modal-subtitle">
                        {t.wallets.bankTransferDepositDesc}
                      </p>

                      <div className="admin-qr-wrapper">
                        <div className="admin-qr-container">
                          <img 
                            src={depositPaymentData.vietQrUrl} 
                            className="admin-qr-image"
                            alt="MBBank Admin QR Code" 
                          />
                        </div>
                      </div>

                      <div className="admin-details-card">
                        {[
                          { label: t.wallets.bankNameLabel, value: t.wallets.mbBankAdmin, canCopy: false },
                          { label: t.wallets.accountNumberLabel, value: "0967373148", canCopy: true, copyLabel: t.wallets.accountNumberLabel },
                          { label: t.wallets.accountHolderLabel, value: "CHAU QUOC LAM PHONG", canCopy: false },
                          { label: t.wallets.amountLabel, value: fmtCurrency(depositPaymentData.amount), copyValue: String(depositPaymentData.amount), canCopy: true, copyLabel: t.wallets.amountLabel },
                          { label: t.wallets.transferNoteLabel, value: depositPaymentData.transferNote, canCopy: true, copyLabel: t.wallets.transferNoteLabel }
                        ].map(r => (
                          <div key={r.label} className="admin-detail-row">
                            <div>
                              <span className="admin-detail-label">{r.label}</span>
                              <span className="admin-detail-value">{r.value}</span>
                            </div>
                            {r.canCopy && (
                              <button 
                                onClick={() => handleCopyText(r.copyValue || r.value, r.copyLabel)}
                                className="btn-copy"
                              >
                                <Copy size={12} /> {t.wallets.copyBtn}
                              </button>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Loading status check */}
                      <div className="payos-checking-status">
                        <div className="spinner" />
                        <span>{t.wallets.checkingStatus}</span>
                      </div>

                      {depositPaymentData.checkoutUrl && (
                        <a 
                          href={depositPaymentData.checkoutUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="payos-test-link"
                        >
                          {t.wallets.openPayosPage}
                        </a>
                      )}

                      <div className="btn-group-row">
                        <button onClick={() => setDepositMethod(null)} className="btn-cancel">
                          {t.wallets.cancel}
                        </button>
                        <button onClick={handleConfirmTransferred} className="btn-submit btn-success-gradient">
                          {t.wallets.iHaveTransferred}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* WITHDRAW */}
              {modal==="withdraw" && (
                <div>
                  {pinStep ? (
                    <div className="text-center">
                      <h3 className="modal-title">🔒 {t.wallets.enterPinToConfirm}</h3>
                      <p className="modal-subtitle">
                        {t.wallets.withdrawPinDesc}
                      </p>

                      {renderFeeSummary(calcChargeSummary(depositForm.amount, "WITHDRAW"), "WITHDRAW")}

                      <div className="pin-grid">
                        {pinTransactionInputs.map((digit, i) => (
                          <input
                            key={`tx-pin-${i}`}
                            ref={el => pinTransactionRefs.current[i] = el}
                            type="password"
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            onChange={(e) => handlePinTransactionChange(i, e.target.value)}
                            onKeyDown={(e) => handlePinTransactionKeyDown(i, e)}
                            className={`pin-box ${digit ? "filled" : ""}`}
                          />
                        ))}
                      </div>

                      <div className="btn-group-row">
                        <button onClick={() => setPinStep(false)} className="btn-cancel">
                          {t.wallets.cancel}
                        </button>
                        <button onClick={handleConfirmWithdraw} className="btn-submit btn-warning-gradient">
                          {t.wallets.confirmWithdrawBtn}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <h3 className="modal-title">🏦 {t.dashboard.withdraw}</h3>
                      <p className="modal-subtitle">
                        {t.wallets.withdrawDesc}
                      </p>

                      {linkedBanks.length === 0 ? (
                        <div className="kyc-warning-box">
                          <Building2 size={24} className="kyc-warning-icon" />
                          <h4 className="kyc-warning-title">{t.wallets.noLinkedBanks}</h4>
                          <p className="kyc-warning-desc">
                            {t.wallets.noLinkedBanksDescWithdraw}
                          </p>
                          <button onClick={() => setModal("bank")} className="btn-kyc-link">
                            <Plus size={14} /> {t.wallets.linkBankNow}
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="form-group">
                            <label className="form-label">{t.wallets.selectBankWithdraw}</label>
                            <div className="linked-banks-scroll">
                              {linkedBanks.map(b => {
                                const isSelected = selectedBankId === b.id;
                                return (
                                  <div
                                    key={b.id}
                                    onClick={() => setSelectedBankId(b.id)}
                                    className={`linked-bank-item ${isSelected ? "selected" : ""}`}
                                  >
                                    <div className="linked-bank-item-info">
                                      <div className="linked-bank-item-icon">
                                        <Building2 size={15} />
                                      </div>
                                      <div className="linked-bank-item-text">
                                        <p className="linked-bank-item-title">{b.bank}</p>
                                        <p className="linked-bank-item-subtitle">{b.account.replace(/.(?=.{4})/g, "*")} • {b.owner}</p>
                                      </div>
                                    </div>
                                    {isSelected && (
                                      <div className="linked-bank-check-dot">
                                        <Check size={9} color="white" />
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          <div className="form-group">
                            <label className="form-label">{t.wallets.withdrawAmountLabel}</label>
                            <div className="currency-input-wrap">
                              <input
                                type="text" inputMode="numeric"
                                value={depositForm.amount ? Number(depositForm.amount).toLocaleString("vi-VN") : ""}
                                onChange={e => { const raw = e.target.value.replace(/\D/g,""); setDepositForm({...depositForm, amount:raw}); }}
                                placeholder="0"
                                className="form-input"
                              />
                              <span className="currency-suffix">₫</span>
                            </div>
                            <div className="quick-amounts-grid">
                              {[100000,200000,500000,1000000].map(v => (
                                <button key={v} onClick={() => setDepositForm({...depositForm, amount:String(v)})} className="btn-quick-amount">
                                  +{fmtCurrency(v)}
                                </button>
                              ))}
                            </div>
                          </div>

                          {renderFeeSummary(calcChargeSummary(depositForm.amount, "WITHDRAW"), "WITHDRAW")}

                          <button onClick={handleConfirmWithdraw} className="btn-submit btn-warning-gradient">
                            {(() => {
                              const summary = calcChargeSummary(depositForm.amount, "WITHDRAW");
                              const label = summary.fee > 0
                                ? `${t.wallets.confirmWithdrawBtn} ${fmtCurrency(summary.total)}`
                                : `${t.wallets.confirmWithdrawBtn} ${depositForm.amount ? fmtCurrency(summary.amount) : ""}`;
                              return label;
                            })()}
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* TRANSFER */}
              {modal==="transfer" && (
                <div className="transfer-scroll-container">
                  {pinStep ? (
                    <div className="pin-step-container">
                      <h3 className="modal-title">🔒 {t.wallets.enterPinToConfirm}</h3>
                      <p className="modal-subtitle">
                        {t.wallets.enterPinTransferDesc}
                      </p>

                      {renderFeeSummary(
                        calcChargeSummary(
                          txForm.amount,
                          transferMethod === "bank" ? "PAYMENT" : "TRANSFER",
                          appliedVoucher?.discountAmount || 0,
                        ),
                        transferMethod === "bank" ? "PAYMENT" : "TRANSFER",
                      )}

                      <div className="pin-grid">
                        {pinTransactionInputs.map((digit, i) => (
                          <input
                            key={`tx-pin-${i}`}
                            ref={el => pinTransactionRefs.current[i] = el}
                            type="password"
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            onChange={(e) => handlePinTransactionChange(i, e.target.value)}
                            onKeyDown={(e) => handlePinTransactionKeyDown(i, e)}
                            className={`pin-box ${digit ? "filled" : ""}`}
                          />
                        ))}
                      </div>

                      <div className="btn-group-row">
                        <button onClick={() => setPinStep(false)} className="btn-cancel">
                          {t.wallets.cancel}
                        </button>
                        <button onClick={handleConfirmTransfer} className="btn-submit">
                          {t.wallets.confirmTransferBtn}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <h3 className="modal-title">💸 {t.dashboard.transfer}</h3>
                      <p className="modal-subtitle">{t.wallets.transferDesc}</p>

                      {/* Method Selector */}
                      <div className="form-group">
                        <label className="form-label">{t.wallets.transferMethod}</label>
                        <div className="transfer-methods-grid">
                          {[
                            { id: "smartwallet", icon: Wallet, label: "SmartWallet", desc: t.wallets.viaEmailPhone },
                            { id: "bank", icon: Building2, label: t.wallets.bankLabel, desc: t.wallets.viaBankSandbox },
                          ].map(m => {
                            const active = transferMethod === m.id;
                            return (
                              <button key={m.id} onClick={() => {
                                setTransferMethod(m.id);
                                if (m.id === "bank") {
                                  setAppliedVoucher(null);
                                  setPromoCode("");
                                }
                              }}
                                className={`transfer-method-btn ${active ? "active" : ""}`}
                              >
                                <div className="transfer-method-icon-box">
                                  <m.icon size={18} />
                                </div>
                                <span className="transfer-method-title">{m.label}</span>
                                <span className="transfer-method-desc">{m.desc}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* ---- SMARTWALLET TRANSFER ---- */}
                      {transferMethod === "smartwallet" && (
                        <div>
                          <div className="alert-box-info">
                            <Smartphone size={14} className="flex-shrink-0" />
                            <p className="alert-box-info-text">{t.wallets.smartwalletTransferInfo}</p>
                          </div>
                          <div className="form-group">
                            <label className="form-label">{t.wallets.recipientEmail}</label>
                            <input value={txForm.target} onChange={e => setTxForm({...txForm, target:e.target.value})}
                              placeholder={t.wallets.enterPhoneEmailPlaceholder}
                              className="form-input" />
                          </div>
                        </div>
                      )}

                      {/* ---- BANK TRANSFER ---- */}
                      {transferMethod === "bank" && (
                        <div>
                          <div className="alert-box-info alert-box-info-bank">
                            <AlertCircle size={14} className="flex-shrink-0" />
                            <p className="alert-box-info-text">{t.wallets.bankTransferInfo}</p>
                          </div>
                          {/* Bank selector */}
                          <div className="form-group">
                            <label className="form-label">{t.wallets.selectBank} *</label>
                            <select value={bankTransferForm.bank} onChange={e => setBankTransferForm({...bankTransferForm, bank:e.target.value})} className="form-select">
                              <option value="">-- {t.wallets.selectBank} --</option>
                              {BANKS.map(b => <option key={b} value={b}>{b}</option>)}
                            </select>
                          </div>

                          {/* Account number */}
                          <div className="form-group">
                            <label className="form-label">{t.wallets.recipientAccount}</label>
                            <input value={bankTransferForm.account} onChange={e => setBankTransferForm({...bankTransferForm, account:e.target.value})}
                              placeholder={t.wallets.enterAccountPlaceholder}
                              className="form-input" />
                          </div>

                          {/* Owner name */}
                          <div className="form-group">
                            <label className="form-label">{t.wallets.recipientOwner}</label>
                            <input value={bankTransferForm.ownerName} onChange={e => setBankTransferForm({...bankTransferForm, ownerName:e.target.value})}
                              placeholder={t.wallets.enterOwnerPlaceholder}
                              className="form-input" />
                          </div>
                        </div>
                      )}

                      {/* Category Selection */}
                      <div className="form-group">
                        <label className="form-label">{t.wallets.selectCategory} *</label>
                        <select value={txForm.category} onChange={e => setTxForm({...txForm, category: e.target.value})} className="form-select">
                          <option value="">-- {t.wallets.selectCategory} --</option>
                          {categories.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>

                      {/* Common fields: Amount + Note */}
                      <div className="form-group">
                        <label className="form-label">{t.wallets.amountToTransfer} *</label>
                        <div className="currency-input-wrap">
                          <input
                            type="text" inputMode="numeric"
                            value={txForm.amount ? Number(txForm.amount).toLocaleString("vi-VN") : ""}
                            onChange={e => { const raw = e.target.value.replace(/\D/g,""); setTxForm({...txForm, amount:raw}); }}
                            placeholder="0"
                            className="form-input"
                          />
                          <span className="currency-suffix">₫</span>
                        </div>
                        <div className="quick-amounts-grid">
                          {[50000,100000,200000,500000].map(v => (
                            <button key={v} onClick={() => setTxForm({...txForm, amount:String(v)})} className="btn-quick-amount">
                              +{fmtCurrency(v)}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="form-group">
                        <label className="form-label">{t.wallets.note}</label>
                        <input value={txForm.note} onChange={e => setTxForm({...txForm, note:e.target.value})}
                          placeholder={t.wallets.transferNotePlaceholder}
                          className="form-input" />
                      </div>

                      {/* Promo Code Selection */}
                      {transferMethod === "smartwallet" && (
                        <div className="promo-section-card">
                          <div className="promo-section-header">
                            <Gift size={16} />
                            <span className="promo-section-title">{t.wallets.promoRewardTitle}</span>
                          </div>
                          
                          <div className="promo-input-row">
                            <input 
                              value={promoCode} 
                              onChange={e => setPromoCode(e.target.value)} 
                              placeholder={t.wallets.placeholderVoucher} 
                              className="form-input"
                            />
                            <button onClick={handleApplyPromo} className="btn-promo-apply">
                              {t.wallets.apply}
                            </button>
                          </div>

                          <div className="promo-actions-row">
                            <button onClick={() => setShowPromoSelector(true)} className="btn-browse-promo">
                              <Tag size={12} /> {t.wallets.chooseVoucher}
                            </button>
                            
                            {appliedVoucher && (
                              <button onClick={() => { setAppliedVoucher(null); setPromoCode(""); }} className="btn-remove-promo">
                                {t.wallets.unlink}
                              </button>
                            )}
                          </div>

                          {appliedVoucher && (() => {
                            const discount = appliedVoucher.discountAmount || 0;
                            return (
                              <div className="applied-promo-info">
                                <p className="applied-promo-status">
                                  ✓ {t.wallets.appliedVoucher}: {appliedVoucher.code}
                                </p>
                                <p className="applied-promo-title">
                                  {translateVoucher(appliedVoucher, lang).title}
                                </p>
                                {appliedVoucher.min_transaction_amount > 0 && (
                                  <p className="applied-promo-min-alert">
                                    * {t.wallets.minTxnAmount}: {fmtCurrency(appliedVoucher.min_transaction_amount)}
                                  </p>
                                )}
                                {discount > 0 ? (
                                  <p className="applied-promo-discount">
                                    {t.wallets.discountPromo}: -{fmtCurrency(discount)}
                                  </p>
                                ) : (
                                  <p className="applied-promo-min-alert text-warning">
                                    {t.wallets.enterVoucherAmountAlert}
                                  </p>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      )}

                      {/* Available balance display */}
                      <div className="balance-display-row">
                        <span className="balance-display-label">{t.dashboard.availableBalance}</span>
                        <span className="balance-display-value">{fmtCurrency(balance)}</span>
                      </div>

                      {renderFeeSummary(
                        calcChargeSummary(
                          txForm.amount,
                          transferMethod === "bank" ? "PAYMENT" : "TRANSFER",
                          appliedVoucher?.discountAmount || 0,
                        ),
                        transferMethod === "bank" ? "PAYMENT" : "TRANSFER",
                      )}

                      {appliedVoucher ? (() => {
                        const summary = calcChargeSummary(txForm.amount, "TRANSFER", appliedVoucher.discountAmount || 0);
                        return (
                          <button onClick={handleConfirmTransfer} className="btn-submit">
                            💸 {t.wallets.confirmTransferDiscountedBtn} {fmtCurrency(summary.total)}
                          </button>
                        );
                      })() : (
                        <button onClick={handleConfirmTransfer} className="btn-submit">
                          {(() => {
                            const feeType = transferMethod === "bank" ? "PAYMENT" : "TRANSFER";
                            const summary = calcChargeSummary(txForm.amount, feeType);
                            const totalLabel = summary.fee > 0
                              ? fmtCurrency(summary.total)
                              : (txForm.amount ? fmtCurrency(summary.amount) : "");
                            return <>💸 {t.wallets.confirmTransferBtn} {totalLabel}</>;
                          })()}
                        </button>
                      )}
                    </div>
                  )}
                  {/* Voucher Picker Overlay Sheet */}
                  {showPromoSelector && (
                    <div className="voucher-selector-overlay">
                      <div className="voucher-selector-header">
                        <h4 className="voucher-selector-title">
                          <Gift size={16} /> {t.wallets.selectPromoTitle}
                        </h4>
                        <button onClick={() => setShowPromoSelector(false)} className="modal-close-btn">
                          <X size={14} />
                        </button>
                      </div>
                      
                      <div className="voucher-categories-scroll">
                        {["All", "Transfer", "Shopping", "Withdraw", "Referral", "Deposit", "Bills"].map(cat => (
                          <button 
                            key={cat} 
                            onClick={() => setActivePromoTab(cat)} 
                            className={`btn-voucher-tab ${activePromoTab===cat ? "active" : "inactive"}`}
                          >
                            {getTagLabel(cat, lang)}
                          </button>
                        ))}
                      </div>

                      <div className="voucher-list-scroll">
                        {voucherList.filter(v => activePromoTab === "All" || normalizeTag(v.tag) === activePromoTab).map(rawV => {
                          const v = translateVoucher(rawV, lang);
                          const isApplicable = !v.min_transaction_amount || (Number(txForm.amount) || 0) >= Number(v.min_transaction_amount);
                          return (
                            <div 
                              key={v.id} 
                              onClick={() => isApplicable && handleSelectVoucher(v)}
                              className={`voucher-card-item ${isApplicable ? "" : "disabled"}`}
                            >
                              <div className="voucher-card-item-header">
                                <div className="text-left">
                                  <span className={`voucher-tag-badge ${tagClassMap[normalizeTag(v.tag)] || ""}`}>{getTagLabel(normalizeTag(v.tag), lang)}</span>
                                  <h5 className="voucher-info-title">{v.title}</h5>
                                  <p className="voucher-info-desc">{v.description}</p>
                                  {v.min_transaction_amount > 0 && (
                                    <p className="voucher-info-min-tx">
                                      * {t.wallets.minTxnAmount}: {fmtCurrency(v.min_transaction_amount)}
                                    </p>
                                  )}
                                  <p className="voucher-info-exp">{t.wallets.expDate}: {fmtVoucherDate(v.expired_at)}</p>
                                </div>
                                <div className="text-right">
                                  <span className="voucher-discount-val">{discountLabel(v, lang)}</span>
                                  <div className="voucher-code-text">Code: {v.code}</div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* QR SCAN TRANSFER MODAL */}
              {modal==="qr_scan" && (
                <div>
                  {pinStep ? (
                    <div className="pin-step-container text-center">
                      <h3 className="modal-title">🔒 {t.wallets.enterPinToConfirm}</h3>
                      <p className="modal-subtitle">
                        {t.wallets.enterPinTransferDesc}
                      </p>

                      {renderFeeSummary(calcChargeSummary(txForm.amount, "PAYMENT"), "PAYMENT")}

                      <div className="pin-grid">
                        {pinTransactionInputs.map((digit, i) => (
                          <input
                            key={`tx-pin-${i}`}
                            ref={el => pinTransactionRefs.current[i] = el}
                            type="password"
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            onChange={(e) => handlePinTransactionChange(i, e.target.value)}
                            onKeyDown={(e) => handlePinTransactionKeyDown(i, e)}
                            className={`pin-box ${digit ? "filled" : ""}`}
                          />
                        ))}
                      </div>

                      <div className="btn-group-row">
                        <button onClick={() => setPinStep(false)} className="btn-cancel">
                          {t.wallets.cancel}
                        </button>
                        <button onClick={handleConfirmTransfer} className="btn-submit">
                          {t.wallets.confirmTransferBtn}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <h3 className="modal-title">📷 {lang === "vi" ? "Quét mã VietQR" : "Scan VietQR"}</h3>
                      <p className="modal-subtitle">{lang === "vi" ? "Tải lên hình ảnh mã QR ngân hàng để tự động nhận diện thông tin nhận tiền." : "Upload a bank QR image to auto-detect payment details."}</p>

                      {/* QR Upload Area */}
                      {!qrUploadPreview ? (
                        <div className="form-group">
                          <input ref={qrInputRef} type="file" accept="image/*" onChange={handleQrFileChange} className="display-none" />
                          <button onClick={() => qrInputRef.current?.click()} className="qr-upload-dashed-btn" style={{ width: "100%", padding: "40px 20px", border: "2px dashed var(--border)", borderRadius: "16px", background: "var(--bg-card2)", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
                            <div className="qr-upload-icon-wrap" style={{ background: "rgba(37,99,235,0.08)", width: "48px", height: "48px", borderRadius: "50%", display: "grid", placeItems: "center", color: "#2563eb" }}>
                              <Upload size={20} />
                            </div>
                            <span className="qr-upload-title" style={{ fontWeight: 700, fontSize: "14px", color: "var(--text-primary)" }}>{t.wallets.clickToUploadQr}</span>
                            <span className="qr-upload-subtitle" style={{ fontSize: "12px", color: "var(--text-muted)" }}>PNG, JPG, JPEG (max 5MB)</span>
                          </button>
                        </div>
                      ) : (
                        <div>
                          <div className="qr-upload-preview-container" style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", background: "var(--bg-card2)", padding: "16px", borderRadius: "16px", marginBottom: "20px", border: "1px solid var(--border)" }}>
                            <img src={qrUploadPreview} alt="QR preview" className="qr-upload-preview-img" style={{ maxHeight: "150px", objectFit: "contain", borderRadius: "8px" }} />
                            <button onClick={() => { setQrUploadFile(null); setQrUploadPreview(null); setBankTransferForm({ bank: "", account: "", ownerName: "" }); }} className="qr-upload-btn-delete" style={{ position: "absolute", top: "10px", right: "10px", background: "rgba(239, 68, 68, 0.1)", border: "none", color: "#ef4444", borderRadius: "50%", width: "24px", height: "24px", display: "grid", placeItems: "center", cursor: "pointer" }}>
                              <X size={14} />
                            </button>
                            <button onClick={() => qrInputRef.current?.click()} className="btn-quick-amount" style={{ marginTop: "12px", width: "100%" }}>
                              {t.wallets.changeImage}
                            </button>
                          </div>

                          {/* Scanned & Parsed Details */}
                          <div style={{ background: "rgba(34, 197, 94, 0.06)", border: "1px solid rgba(34, 197, 94, 0.15)", borderRadius: "14px", padding: "16px", marginBottom: "20px" }}>
                            <h4 style={{ color: "#22c55e", fontSize: "14px", fontWeight: "800", marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" }}>✓ {lang === "vi" ? "Thông tin nhận tiền từ VietQR" : "Scanned VietQR Payment Details"}</h4>
                            <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "13px" }}>
                              <div><span style={{ color: "var(--text-muted)" }}>{t.wallets.bankNameLabel}:</span> <strong style={{ color: "var(--text-primary)" }}>{bankTransferForm.bank || "—"}</strong></div>
                              <div><span style={{ color: "var(--text-muted)" }}>{t.wallets.accountNumberLabel}:</span> <strong style={{ color: "var(--text-primary)" }}>{bankTransferForm.account || "—"}</strong></div>
                              <div><span style={{ color: "var(--text-muted)" }}>{t.wallets.accountHolderLabel}:</span> <strong style={{ color: "var(--text-primary)" }}>{bankTransferForm.ownerName || "—"}</strong></div>
                            </div>
                          </div>

                          {/* Category Selection */}
                          <div className="form-group">
                            <label className="form-label">{t.wallets.selectCategory} *</label>
                            <select value={txForm.category} onChange={e => setTxForm({...txForm, category: e.target.value})} className="form-select">
                              <option value="">-- {t.wallets.selectCategory} --</option>
                              {categories.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                              ))}
                            </select>
                          </div>

                          {/* Amount */}
                          <div className="form-group">
                            <label className="form-label">{t.wallets.amountToTransfer} *</label>
                            <div className="currency-input-wrap">
                              <input
                                type="text" inputMode="numeric"
                                value={txForm.amount ? Number(txForm.amount).toLocaleString("vi-VN") : ""}
                                onChange={e => { const raw = e.target.value.replace(/\D/g,""); setTxForm({...txForm, amount:raw}); }}
                                placeholder="0"
                                className="form-input"
                              />
                              <span className="currency-suffix">₫</span>
                            </div>
                          </div>

                          {/* Note */}
                          <div className="form-group">
                            <label className="form-label">{t.wallets.note}</label>
                            <input value={txForm.note} onChange={e => setTxForm({...txForm, note:e.target.value})}
                              placeholder={t.wallets.transferNotePlaceholder}
                              className="form-input" />
                          </div>

                          {/* Available balance display */}
                          <div className="balance-display-row" style={{ display: "flex", justifyContent: "space-between", margin: "16px 0", fontSize: "13px" }}>
                            <span className="balance-display-label" style={{ color: "var(--text-secondary)" }}>{t.dashboard.availableBalance}</span>
                            <span className="balance-display-value" style={{ fontWeight: 800, color: "var(--text-primary)" }}>{fmtCurrency(balance)}</span>
                          </div>

                          {renderFeeSummary(calcChargeSummary(txForm.amount, "PAYMENT"), "PAYMENT")}

                          <button onClick={handleConfirmTransfer} className="btn-submit" style={{ background: "linear-gradient(135deg, #11c981 0%, #0b784a 100%)", boxShadow: "0 4px 12px rgba(17, 201, 129, 0.25)" }}>
                            {(() => {
                              const summary = calcChargeSummary(txForm.amount, "TRANSFER");
                              const totalLabel = summary.fee > 0
                                ? fmtCurrency(summary.total)
                                : (txForm.amount ? fmtCurrency(summary.amount) : "");
                              return <>💸 {t.wallets.confirmTransferBtn} {totalLabel}</>;
                            })()}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* QR */}
              {modal==="qr" && (
                <div className="my-qr-wrapper">
                  <h3 className="my-qr-title">📱 {t.myQr.title}</h3>
                  <p className="modal-subtitle">{t.myQr.subtitle}</p>
                  <div className="my-qr-container" ref={qrCanvasRef}>
                    <QRCode value={(() => {
                      const bwUser = localStorage.getItem("bw_user");
                      const u = bwUser ? JSON.parse(bwUser) : null;
                      return JSON.stringify({
                        type: "SMARTWALLET_USER_QR",
                        userId: u?.id,
                        name: u?.name,
                        email: u?.email || userEmail,
                        wallet: "SMARTWALLET",
                      });
                    })()} size={180} level="H" />
                  </div>
                  <p className="my-qr-label-id">{t.myQr.userId}: <strong className="text-primary">{userEmail || "SW-DEMO-123"}</strong></p>
                  <button onClick={handleDownloadQR} className="btn-my-qr-action">
                    {t.myQr.downloadQr}
                  </button>
                </div>
              )}

              {/* BANK */}
              {modal==="bank" && (
                <div>
                  <div className="modal-header-between">
                    <h3 className="modal-title text-left margin-bottom-0">{t.wallets.linkNewBank}</h3>
                    <span className={`status-pill ${linkedBanks.length >= MAX_BANKS ? "status-frozen" : "status-active"} font-size-12`}>
                      {linkedBanks.length}/{MAX_BANKS} {t.wallets.banksCountLabel}
                    </span>
                  </div>

                  {linkedBanks.length >= MAX_BANKS ? (
                    <div className="link-bank-limit-alert-box">
                      <div className="link-bank-limit-alert-icon">🔒</div>
                      <h4 className="link-bank-limit-alert-title">
                        {t.wallets.linkLimitReachedTitle}
                      </h4>
                      <p className="link-bank-limit-alert-desc">
                        {t.wallets.linkLimitReachedDesc}
                      </p>
                      <div className="linked-banks-mini-list">
                        {linkedBanks.map(b => (
                          <div key={b.id} className="linked-banks-mini-item">
                            <div className="linked-banks-mini-item-info">
                              <Building2 size={15} />
                              <div className="linked-banks-mini-item-text">
                                <p className="linked-banks-mini-item-title">{b.bank}</p>
                                <p className="linked-banks-mini-item-subtitle">{b.account.replace(/.(?=.{4})/g,"*")} • {b.owner}</p>
                              </div>
                            </div>
                            <button
                              onClick={() => handleUnlinkBank(b.id, b.bank)}
                              className="btn-unlink-mini"
                            >
                              {t.wallets.removeBtn}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="link-bank-progress-wrapper">
                        <div className="link-bank-progress-header">
                          <span className="link-bank-progress-label">{t.wallets.linkedBanksProgress}</span>
                          <span className="link-bank-progress-count">{linkedBanks.length}/{MAX_BANKS}</span>
                        </div>
                        <div className="link-bank-progress-bar-bg">
                          <div className={`link-bank-progress-bar-fill ${linkedBanks.length === 2 ? "bar-warning" : "bar-primary"}`} style={{
                            width:`${(linkedBanks.length / MAX_BANKS) * 100}%`
                          }} />
                        </div>
                        {linkedBanks.length === 2 && (
                          <p className="text-warning font-size-11 margin-top-8 text-left">{t.wallets.onlyOneSlotRemaining}</p>
                        )}
                      </div>

                      <div className="form-group">
                        <label className="form-label">{t.wallets.bankName}</label>
                        <select value={bankForm.bank} onChange={e => setBankForm({...bankForm,bank:e.target.value})} className="form-select">
                          <option value="">-- {t.wallets.selectBank} --</option>
                          {BANKS.map(b => <option key={b} value={b}>{b}</option>)}
                        </select>
                      </div>

                      <div className="form-group">
                        <label className="form-label">{t.wallets.accountNumber}</label>
                        <input value={bankForm.account} onChange={e => setBankForm({...bankForm, account: e.target.value})}
                          placeholder={t.wallets.enterAccountPlaceholder}
                          className="form-input" />
                      </div>

                      <div className="form-group margin-bottom-20">
                        <label className="form-label">{t.wallets.accountHolder}</label>
                        <input value={bankForm.owner} onChange={e => setBankForm({...bankForm, owner: e.target.value})}
                          placeholder={t.wallets.enterOwnerPlaceholder}
                          className="form-input" />
                      </div>

                      <button onClick={handleLinkBank} className="btn-submit">
                        {t.wallets.linkNewBank}
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* LINKED BANKS LIST & UNLINK */}
              {modal==="linked_banks_list" && (
                <div>
                  <div className="modal-header-between">
                    <h3 className="modal-title text-left margin-bottom-0">{t.wallets.linkedBanksList}</h3>
                    <span className="status-pill status-active font-size-12">
                      {linkedBanks.length}/3 {t.wallets.linkedCountLabel}
                    </span>
                  </div>

                  {linkedBanks.length === 0 ? (
                    <div className="kyc-warning-box">
                      <Building2 size={36} className="kyc-warning-icon" />
                      <p className="kyc-warning-title">{t.wallets.noLinkedBanks}</p>
                      <p className="kyc-warning-desc">{t.wallets.noLinkedBanksDescWithdraw}</p>
                      <button
                        onClick={() => setModal("bank")}
                        className="btn-submit"
                      >
                        + {t.wallets.linkNewBank}
                      </button>
                    </div>
                  ) : (
                    <div className="linked-banks-list-scroll">
                      <p className="linked-bank-list-subtitle">
                        {t.wallets.bankAccountsLinkedToWallet}
                      </p>
                      {linkedBanks.map(b => (
                        <div key={b.id} className="linked-bank-list-item">
                          <div className="linked-bank-list-item-info">
                            <div className="linked-bank-list-item-icon-box">
                              <Building2 size={16} />
                            </div>
                            <div className="linked-bank-list-item-text">
                              <p className="linked-bank-list-item-title">{b.bank}</p>
                              <p className="linked-bank-list-item-subtitle">{b.account.replace(/.(?=.{4})/g,"*")} • {b.owner}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleUnlinkBank(b.id, b.bank)}
                            className="btn-unlink-action"
                          >
                            {t.wallets.unlink}
                          </button>
                        </div>
                      ))}
                      
                      {linkedBanks.length < MAX_BANKS && (
                        <button
                          onClick={() => setModal("bank")}
                          className="btn-add-bank-link"
                        >
                          + {t.wallets.linkNewBank}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* TX DETAIL */}
              {modal==="tx" && selectedTx && (
                <div>
                  <h3 className="modal-title margin-bottom-20">{t.wallets.txDetailTitle}</h3>
                  <div className="tx-detail-summary-card">
                    <p className={`tx-detail-amount ${selectedTx.type==="receive" ? "tx-detail-amount-receive" : "tx-detail-amount-send"}`}>
                      {selectedTx.type==="receive" ? "+" : "-"}{fmtCurrency(selectedTx.amount)}
                    </p>
                    <span className={`tx-status-badge ${selectedTx.status==="success" ? "status-success" : selectedTx.status==="pending" ? "status-pending" : "status-failed"}`}>
                      {selectedTx.status==="success" ? t.dashboard.success : selectedTx.status==="pending" ? t.dashboard.pending : t.dashboard.failed}
                    </span>
                  </div>
                  {[
                    { label: t.wallets.txDetailId, value:selectedTx.id },
                    { label: t.wallets.txDetailType, value: selectedTx.type==="receive" ? t.dashboard.receive : t.dashboard.send },
                    ...(selectedTx.category ? [{ label: t.wallets.txDetailCategory, value: selectedTx.category }] : []),
                    { label: selectedTx.type==="receive" ? t.wallets.txDetailSender : t.wallets.txDetailRecipient, value:selectedTx.name },
                    { label: t.wallets.txDetailDate, value:selectedTx.time },
                    ...(selectedTx.type === "send" && selectedTx.fee > 0 ? [
                      { label: t.wallets.txDetailFee, value: fmtCurrency(selectedTx.fee) },
                      { label: t.wallets.txDetailTotal, value: fmtCurrency(selectedTx.finalAmount) },
                    ] : []),
                    { label: t.wallets.txDetailNote, value:selectedTx.note || "—" },
                  ].map(r => (
                    <div key={r.label} className="admin-detail-row">
                      <span className="admin-detail-label">{r.label}</span>
                      <span className="admin-detail-value">{r.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
