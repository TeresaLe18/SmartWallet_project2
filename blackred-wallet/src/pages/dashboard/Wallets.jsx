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

const BANKS = ["Vietcombank","Techcombank","BIDV","VietinBank","Agribank","MB Bank","VPBank","TPBank","ACB","Sacombank"];

// Nhãn giảm giá + ngày suy từ voucher DB
const discountLabel = (v) => v.discount_type === "PERCENT" ? `${Number(v.discount_value)}%` : `${Number(v.discount_value).toLocaleString("vi-VN")}₫`;
const fmtVoucherDate = (d) => { try { return new Date(d).toLocaleDateString("vi-VN"); } catch { return ""; } };

const tagColors = {
  "Chuyển tiền":"#2563eb","Mua sắm":"#3b82f6","Rút tiền":"#22c55e",
  "Referral":"#8b5cf6","Nạp tiền":"#f59e0b","Hóa đơn":"#ec4899"
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
    time: timeStr,
    status: tx.status.toLowerCase(),
    note: tx.message || "",
    category: tx.category?.name || "",
  };
};

export default function WalletsPage() {
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
    if ((targetModal === "deposit" || targetModal === "withdraw" || targetModal === "transfer") && walletStatus === "frozen") {
      showToast("Your wallet is frozen. Please contact support to unfreeze it.", "error");
      return;
    }
    if ((targetModal === "deposit" || targetModal === "withdraw" || targetModal === "transfer") && kycStatus !== "verified") {
      showToast(
        kycStatus === "pending"
          ? `Your KYC is under review. Please wait for approval before you can ${targetModal}.`
          : `KYC verification required before you can ${targetModal}. Go to the KYC section to complete it.`,
        "error"
      );
      return;
    }
    if (targetModal === "withdraw" || targetModal === "transfer") {
      if (!hasPin) {
        setPinActionType(targetModal);
        setModal("pin_setup");
        return;
      }
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

  const handleUnlinkBank = async (bankId, bankName) => {
    if (!confirm(`Are you sure you want to unlink ${bankName}?`)) return;
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
  };

  const fetchWalletData = async () => {
    const bwUser = localStorage.getItem("bw_user");
    const currentEmail = bwUser ? JSON.parse(bwUser).email : null;
    if (!currentEmail) return;
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
      const data = await payosAPI.createPaymentLink(amount, note);
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
      link.download = `smartwallet-qr-${depositForm.amount || "deposit"}.png`;
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
        if (res.transaction) {
          const newTx = mapBackendTx(res.transaction, userEmail);
          setTxList(prev => [newTx, ...prev]);
        }
        if (res.wallet?.balance !== undefined) setBalance(Number(res.wallet.balance));
        showToast("Withdrawal successful!");
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
    reader.onload = (ev) => setQrUploadPreview(ev.target.result);
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
    <div style={{ display:"flex", flexDirection:"column", gap:20, maxWidth:1000 }}>
      {/* Toast Notification */}
      {/* Freeze Wallet Confirmation Modal */}
      <AnimatePresence>
        {showFreezeConfirm && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.65)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}
            onClick={() => setShowFreezeConfirm(false)}
          >
            <motion.div initial={{scale:0.92,opacity:0}} animate={{scale:1,opacity:1}} exit={{scale:0.92,opacity:0}}
              onClick={e => e.stopPropagation()}
              style={{ background:"var(--bg-card)", borderRadius:20, padding:28, width:"100%", maxWidth:400, boxShadow:"0 20px 60px rgba(0,0,0,0.4)", border:"1px solid var(--border)" }}
            >
              <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16 }}>
                <div style={{ width:48, height:48, borderRadius:14, background:"rgba(239,68,68,0.12)", border:"1px solid rgba(239,68,68,0.2)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <Shield size={22} style={{ color:"#ef4444" }} />
                </div>
                <div>
                  <h3 style={{ fontSize:16, fontWeight:700 }}>Freeze Your Wallet?</h3>
                  <p style={{ fontSize:12, color:"var(--text-muted)" }}>This action cannot be undone by you</p>
                </div>
              </div>
              <p style={{ fontSize:13, color:"var(--text-secondary)", lineHeight:1.6, marginBottom:20 }}>
                Freezing your wallet will <strong>immediately disable</strong> all deposits, withdrawals, and transfers.
                Only our support team can unfreeze it. Use this if you suspect unauthorized access.
              </p>
              <div style={{ display:"flex", gap:10 }}>
                <button onClick={() => setShowFreezeConfirm(false)}
                  style={{ flex:1, background:"var(--bg-card2)", border:"1px solid var(--border)", borderRadius:10, padding:"11px", fontSize:13, fontWeight:600, color:"var(--text-secondary)", cursor:"pointer" }}>
                  Cancel
                </button>
                <button onClick={handleSelfFreeze}
                  style={{ flex:1, background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.25)", borderRadius:10, padding:"11px", fontSize:13, fontWeight:700, color:"#ef4444", cursor:"pointer" }}>
                  Yes, Freeze Now
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
            style={{
              position:"fixed", top:24, right:24, zIndex:300,
              background: toast.type === "success" ? "rgba(34,197,94,0.95)" : "rgba(239,68,68,0.95)",
              backdropFilter:"blur(10px)", color: "#ffffff",
              padding:"12px 24px", borderRadius:10, boxShadow:"0 10px 30px rgba(0,0,0,0.5)",
              display:"flex", alignItems:"center", gap:10, fontWeight:600, fontSize:14
            }}
          >
            {toast.type === "success" ? <Check size={18} /> : <X size={18} />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Frozen Wallet Banner */}
      {walletStatus === "frozen" && (
        <motion.div initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}}
          style={{
            background:"linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)",
            border:"1px solid rgba(99,102,241,0.4)", borderRadius:16, padding:"18px 22px",
            display:"flex", alignItems:"center", gap:16,
            boxShadow:"0 4px 24px rgba(99,102,241,0.2)"
          }}>
          <div style={{ width:48, height:48, borderRadius:14, background:"rgba(99,102,241,0.25)", border:"1px solid rgba(99,102,241,0.4)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            <Snowflake size={24} style={{ color:"#a5b4fc" }} />
          </div>
          <div style={{ flex:1 }}>
            <p style={{ fontWeight:700, fontSize:15, color:"#e0e7ff", marginBottom:3 }}>Wallet Frozen</p>
            <p style={{ fontSize:12, color:"#a5b4fc", lineHeight:1.5 }}>
              Your wallet has been frozen. All transactions (deposit, withdraw, transfer) are disabled.
              To restore access, please contact our support team.
            </p>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
            <PhoneCall size={14} style={{ color:"#a5b4fc" }} />
            <span style={{ fontSize:12, color:"#a5b4fc", fontWeight:600 }}>Contact Support</span>
          </div>
        </motion.div>
      )}

      {/* Balance Card */}
      <motion.div initial={{opacity:0,y:-10}} animate={{opacity:1,y:0}}
        style={{
          background: walletStatus === "frozen"
            ? "linear-gradient(135deg, #f0f4ff 0%, #e0e7ff 100%)"
            : "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)",
          border: walletStatus === "frozen" ? "1px solid rgba(99,102,241,0.25)" : "1px solid rgba(37,99,235,0.15)",
          borderRadius:20, padding:28, position:"relative", overflow:"hidden",
          boxShadow:"0 4px 20px rgba(37,99,235,0.05)"
        }}>
        <div style={{ position:"absolute", top:-50, right:-50, width:200, height:200, background:"radial-gradient(circle, rgba(37,99,235,0.08) 0%, transparent 70%)", borderRadius:"50%" }} />

        {/* Wallet status pill */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
          <p style={{ color: "var(--text-secondary)", fontSize:13 }}>Available Balance</p>
          <div style={{
            display:"flex", alignItems:"center", gap:5, padding:"3px 10px", borderRadius:20,
            background: walletStatus === "frozen" ? "rgba(99,102,241,0.12)" : "rgba(34,197,94,0.1)",
            border: walletStatus === "frozen" ? "1px solid rgba(99,102,241,0.25)" : "1px solid rgba(34,197,94,0.2)",
          }}>
            {walletStatus === "frozen"
              ? <><Snowflake size={11} style={{ color:"#6366f1" }} /><span style={{ fontSize:11, fontWeight:700, color:"#6366f1" }}>FROZEN</span></>
              : <><div style={{ width:7, height:7, borderRadius:"50%", background:"#22c55e" }} /><span style={{ fontSize:11, fontWeight:700, color:"#22c55e" }}>ACTIVE</span></>
            }
          </div>
        </div>

        {loading
          ? <div className="skeleton" style={{ height:40, width:220, marginBottom:12 }} />
          : <h2 style={{ fontSize:36, fontWeight:900, letterSpacing:"-1px", marginBottom:12,
              color: walletStatus === "frozen" ? "#6366f1" : "inherit"
            }}>{fmtCurrency(balance)}</h2>
        }
        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
          <div style={{ width:8, height:8, borderRadius:"50%", background: kycStatus === "verified" ? "#22c55e" : kycStatus === "pending" ? "#f59e0b" : "#ef4444" }} />
          <span style={{ fontSize:12, color: "var(--text-muted)" }}>
            {kycStatus === "verified" ? "Account verified ✓" : kycStatus === "pending" ? "KYC pending review ⏳" : "KYC not verified ⚠️"}
          </span>
        </div>

        {/* Action Buttons */}
        <div style={{ display:"flex", gap:4, marginTop:24, flexWrap:"wrap" }}>
          {[
            { label:"Deposit",  icon:ArrowDownLeft, color:"#22c55e", modal:"deposit" },
            { label:"Withdraw", icon:ArrowUpRight,  color:"#f59e0b", modal:"withdraw" },
            { label:"Transfer", icon:CreditCard,    color:"#3b82f6", modal:"transfer" },
            { label:"QR Code",  icon:QrCode,        color:"#2563eb", modal:"qr" },
          ].map(({ label, icon:Icon, color, modal:m }) => {
            const isFrozen = walletStatus === "frozen" && m !== "qr";
            const isKycLocked = !isFrozen && (m === "deposit" || m === "withdraw" || m === "transfer") && kycStatus !== "verified";
            const isLocked = isFrozen || isKycLocked;
            const btnColor = isLocked ? "#94a3b8" : color;
            return (
              <button key={m} onClick={() => handleActionClick(m)}
                style={{ ...btnStyle(btnColor), opacity: isLocked ? 0.5 : 1 }}
                title={isFrozen ? "Wallet is frozen" : isKycLocked ? "KYC verification required" : undefined}
                onMouseEnter={(e) => { if (!isLocked) e.currentTarget.style.background = `${color}15`; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                <div style={{ width:44, height:44, borderRadius:12, background:`${btnColor}20`, border:`1px solid ${btnColor}40`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <Icon size={20} style={{ color: btnColor }} />
                </div>
                <span style={{ fontSize:12, fontWeight:500, color: "var(--text-secondary)" }}>{label}</span>
              </button>
            );
          })}
        </div>

        {/* Self-Freeze Button */}
        {walletStatus !== "frozen" && (
          <div style={{ marginTop:20, paddingTop:16, borderTop:"1px solid rgba(37,99,235,0.1)" }}>
            <button
              onClick={() => setShowFreezeConfirm(true)}
              style={{
                display:"flex", alignItems:"center", gap:8,
                background:"transparent", border:"1px solid rgba(239,68,68,0.25)",
                borderRadius:8, padding:"7px 14px", color:"#ef4444",
                fontSize:12, fontWeight:600, cursor:"pointer", transition:"all 0.2s"
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.06)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
              <Shield size={13} />
              Freeze My Wallet
            </button>
            <p style={{ fontSize:11, color:"var(--text-muted)", marginTop:5 }}>
              Temporarily disable all transactions if you suspect unauthorized access.
            </p>
          </div>
        )}
      </motion.div>

      <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.15}}
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius:16, padding:20, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div 
          onClick={() => setModal("linked_banks_list")}
          style={{ display:"flex", alignItems:"center", gap:12, cursor:"pointer" }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = 0.8}
          onMouseLeave={(e) => e.currentTarget.style.opacity = 1}
        >
          <div style={{ width:40, height:40, borderRadius:10, background:"rgba(59,130,246,0.12)", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <Building2 size={18} style={{ color:"#3b82f6" }} />
          </div>
          <div>
            <p style={{ fontSize:14, fontWeight:600, textDecoration:"underline", textDecorationStyle:"dotted" }}>Linked Banks</p>
            <p style={{ fontSize:12, color: "var(--text-muted)" }}>
              {linkedBanks.length}/3 accounts linked
            </p>
          </div>
        </div>
        <button
          onClick={() => linkedBanks.length < MAX_BANKS && setModal("bank")}
          disabled={linkedBanks.length >= MAX_BANKS}
          style={{
            display:"flex", alignItems:"center", gap:6,
            background: linkedBanks.length >= MAX_BANKS ? "rgba(63,63,70,0.3)" : "rgba(59,130,246,0.1)",
            border: `1px solid ${linkedBanks.length >= MAX_BANKS ? "rgba(63,63,70,0.3)" : "rgba(59,130,246,0.2)"}`,
            borderRadius:8, padding:"8px 14px",
            color: linkedBanks.length >= MAX_BANKS ? "#3f3f46" : "#3b82f6",
            cursor: linkedBanks.length >= MAX_BANKS ? "not-allowed" : "pointer",
            fontSize:13, fontWeight:600, transition:"all 0.2s"
          }}
        >
          {linkedBanks.length >= MAX_BANKS
            ? <><Check size={14} /> 3 banks linked</>
            : <><Plus size={14} /> Add Bank</>}
        </button>
      </motion.div>

      {/* Transactions */}
      <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.2}}
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius:16, padding:24 }}>
        <h3 style={{ fontSize:15, fontWeight:700, marginBottom:16 }}>Transaction History</h3>

        {/* Filters */}
        <div style={{ display:"flex", gap:8, marginBottom:16, flexWrap:"wrap" }}>
          <div style={{ position:"relative", flex:1, minWidth:160 }}>
            <Search size={14} style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", color: "var(--text-muted)" }} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search transactions..." style={{ width:"100%", background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius:8, padding:"8px 12px 8px 34px", color: "#000000", fontSize:13, outline:"none" }} />
          </div>
          <div style={{ display:"flex", gap:4 }}>
            {[{v:"all",l:"All"},{v:"receive",l:"Receive"},{v:"send",l:"Send"}].map(t => (
              <button key={t.v} onClick={() => setTab(t.v)} style={{
                padding:"8px 14px", borderRadius:8, fontSize:13, fontWeight:500,
                background: tab===t.v ? "rgba(37,99,235,0.15)" : "#ffffff",
                border:`1px solid ${tab===t.v ? "rgba(37,99,235,0.3)" : "var(--border)"}`,
                color: tab===t.v ? "#2563eb" : "#000000", cursor:"pointer"
              }}>{t.l}</button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div style={{ display:"flex", flexDirection:"column", gap:2 }}>
          {loading
            ? [1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height:60, marginBottom:4 }} />)
            : filtered.map(tx => (
              <div key={tx.id} onClick={() => { setSelectedTx(tx); setModal("tx"); }}
                style={{ display:"flex", alignItems:"center", padding:"12px 14px", borderRadius:10, cursor:"pointer", transition:"background 0.2s" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                <div style={{ width:40, height:40, borderRadius:12, flexShrink:0, background: tx.type==="receive" ? "rgba(34,197,94,0.12)" : "rgba(37,99,235,0.12)", display:"flex", alignItems:"center", justifyContent:"center", marginRight:14 }}>
                  {tx.type==="receive" ? <ArrowDownLeft size={18} style={{ color:"#22c55e" }} /> : <ArrowUpRight size={18} style={{ color:"#2563eb" }} />}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                    <p style={{ fontSize:13, fontWeight:600 }}>{tx.name}</p>
                    {tx.category && (
                      <span style={{ fontSize:9, background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:4, padding:"0 4px", color: "var(--text-secondary)", fontWeight:500 }}>
                        {tx.category}
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize:11, color: "var(--text-muted)" }}>{tx.id} • {tx.time}</p>
                </div>
                <div style={{ textAlign:"right" }}>
                  <p style={{ fontSize:14, fontWeight:700, color: tx.type==="receive" ? "#22c55e" : "#2563eb" }}>
                    {tx.type==="receive" ? "+" : "-"}{fmtCurrency(tx.amount)}
                  </p>
                  <span style={{ fontSize:10, padding:"2px 7px", borderRadius:6, fontWeight:600,
                    background: tx.status==="success" ? "rgba(34,197,94,0.12)" : tx.status==="pending" ? "rgba(245,158,11,0.12)" : "rgba(239,68,68,0.12)",
                    color: tx.status==="success" ? "#22c55e" : tx.status==="pending" ? "#f59e0b" : "#ef4444"
                  }}>
                    {tx.status==="success" ? "Success" : tx.status==="pending" ? "Pending" : "Failed"}
                  </span>
                </div>
              </div>
            ))
          }
          {!loading && filtered.length === 0 && (
            <div style={{ textAlign:"center", padding:40, color: "var(--text-muted)" }}>
              <p style={{ fontSize:14 }}>No transactions found</p>
            </div>
          )}
        </div>
      </motion.div>

      {/* ============ MODALS ============ */}
      <AnimatePresence>
        {modal && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            onClick={closeModal}
            style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
            <motion.div initial={{scale:0.9,opacity:0}} animate={{scale:1,opacity:1}} exit={{scale:0.9,opacity:0}}
              onClick={(e) => e.stopPropagation()}
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius:20, padding:28, width:"100%", maxWidth:440, position:"relative" }}>
              <button onClick={closeModal} style={{ position:"absolute", top:16, right:16, background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius:8, width:32, height:32, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color: "var(--text-secondary)" }}>
                <X size={16} />
              </button>

              {/* PIN SETUP MODAL */}
              {modal==="pin_setup" && (
                <div style={{ textAlign:"center" }}>
                  <h3 style={{ fontSize:18, fontWeight:800, marginBottom:8, color: "var(--text-primary)" }}>🔒 Set Up Transaction PIN</h3>
                  <p style={{ color: "var(--text-secondary)", fontSize:13, lineHeight:1.5, marginBottom:20 }}>
                    Please choose a 4-digit PIN to use when transferring or withdrawing funds.
                  </p>
                  
                  <div style={{ marginBottom:20 }}>
                    <label style={{ fontSize:12, color: "var(--text-secondary)", display:"block", marginBottom:8, fontWeight:600 }}>Enter new PIN (4 digits)</label>
                    <div style={{ display: "flex", gap: 10, justifyContent: "center", marginBottom: 16 }}>
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
                          style={{
                            width: 44, height: 48, textAlign: "center", fontSize: 22, fontWeight: 700,
                            background: digit ? "rgba(37,99,235,0.08)" : "var(--bg-card2)",
                            border: `2px solid ${digit ? "#2563eb" : "var(--border)"}`,
                            borderRadius: 10, color: "#000000", outline: "none"
                          }}
                        />
                      ))}
                    </div>
                  </div>

                  <div style={{ marginBottom:24 }}>
                    <label style={{ fontSize:12, color: "var(--text-secondary)", display:"block", marginBottom:8, fontWeight:600 }}>Confirm new PIN</label>
                    <div style={{ display: "flex", gap: 10, justifyContent: "center", marginBottom: 16 }}>
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
                          style={{
                            width: 44, height: 48, textAlign: "center", fontSize: 22, fontWeight: 700,
                            background: digit ? "rgba(37,99,235,0.08)" : "var(--bg-card2)",
                            border: `2px solid ${digit ? "#2563eb" : "var(--border)"}`,
                            borderRadius: 10, color: "#000000", outline: "none"
                          }}
                        />
                      ))}
                    </div>
                  </div>

                  <button onClick={submitPinSetup} style={{ width:"100%", background:"linear-gradient(135deg,#2563eb,#1d4ed8)", color: "#000000", border:"none", borderRadius:10, padding:"13px", fontWeight:700, fontSize:14, cursor:"pointer" }}>
                    Confirm &amp; Set Up
                  </button>
                </div>
              )}

              {/* DEPOSIT MODAL */}
              {modal==="deposit" && (
                <div>
                  {/* Step 1: Input Amount & Select Method */}
                  {depositMethod === null && (
                    <div>
                      <h3 style={{ fontSize:18, fontWeight:700, marginBottom:6, color: "var(--text-primary)" }}>💳 Deposit</h3>
                      <p style={{ color: "var(--text-muted)", fontSize:13, marginBottom:20 }}>
                        Add funds to your SmartWallet
                      </p>
                      
                      <div style={{ marginBottom:16 }}>
                        <label style={{ fontSize:13, color: "var(--text-secondary)", display:"block", marginBottom:8 }}>Amount (₫)</label>
                        <div style={{ position:"relative" }}>
                          <input
                            type="text" inputMode="numeric"
                            value={depositForm.amount ? Number(depositForm.amount).toLocaleString("vi-VN") : ""}
                            onChange={e => { const raw = e.target.value.replace(/\D/g,""); setDepositForm({...depositForm, amount:raw}); }}
                            placeholder="0"
                            style={{ width:"100%", background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius:10, padding:"12px 60px 12px 16px", color: "#000000", fontSize:18, fontWeight:700, outline:"none", boxSizing:"border-box" }}
                          />
                          <span style={{ position:"absolute", right:16, top:"50%", transform:"translateY(-50%)", fontSize:14, fontWeight:600, color:"var(--text-muted)", pointerEvents:"none" }}>₫</span>
                        </div>
                        <div style={{ display:"flex", gap:8, marginTop:10, flexWrap:"wrap" }}>
                          {[100000,200000,500000,1000000].map(v => (
                            <button key={v} onClick={() => setDepositForm({...depositForm, amount:String(v)})} style={{ fontSize:12, padding:"6px 12px", borderRadius:8, background: "var(--bg-card2)", border: "1px solid var(--border)", color: "var(--text-secondary)", cursor:"pointer" }}>
                              +{fmtCurrency(v)}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div style={{ marginBottom:24 }}>
                        <label style={{ fontSize:13, color: "var(--text-secondary)", display:"block", marginBottom:8 }}>Deposit note (optional)</label>
                        <input value={depositForm.note} onChange={e => setDepositForm({...depositForm, note:e.target.value})} placeholder="Deposit description" style={{ width:"100%", background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius:10, padding:"12px 16px", color: "#000000", fontSize:14, outline:"none" }} />
                      </div>

                      <label style={{ fontSize:13, color: "var(--text-secondary)", display:"block", marginBottom:10, fontWeight:600 }}>Select deposit method</label>
                      <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                        <button
                          disabled={!depositForm.amount || Number(depositForm.amount) <= 0}
                          onClick={() => setDepositMethod("bank")}
                          style={{
                            display:"flex", alignItems:"center", gap:14, width:"100%",
                            padding:"14px 18px", borderRadius:12, cursor: (!depositForm.amount || Number(depositForm.amount) <= 0) ? "not-allowed" : "pointer",
                            background: "var(--bg-card2)", border: "1.5px solid var(--border)",
                            transition: "all 0.2s", opacity: (!depositForm.amount || Number(depositForm.amount) <= 0) ? 0.5 : 1,
                            textAlign: "left"
                          }}
                          onMouseEnter={(e) => { if (depositForm.amount && Number(depositForm.amount) > 0) e.currentTarget.style.borderColor = "#2563eb"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
                        >
                          <div style={{ width:40, height:40, borderRadius:10, background:"rgba(37,99,235,0.12)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                            <Building2 size={20} style={{ color:"#2563eb" }} />
                          </div>
                          <div style={{ flex:1 }}>
                            <p style={{ fontSize:13, fontWeight:700, color: "#000000" }}>Deposit from linked bank</p>
                            <p style={{ fontSize:11, color: "var(--text-muted)" }}>Instant deposit from your linked bank account</p>
                          </div>
                        </button>

                        <button
                          disabled={!depositForm.amount || Number(depositForm.amount) <= 0}
                          onClick={handleConfirmDepositQR}
                          style={{
                            display:"flex", alignItems:"center", gap:14, width:"100%",
                            padding:"14px 18px", borderRadius:12, cursor: (!depositForm.amount || Number(depositForm.amount) <= 0) ? "not-allowed" : "pointer",
                            background: "var(--bg-card2)", border: "1.5px solid var(--border)",
                            transition: "all 0.2s", opacity: (!depositForm.amount || Number(depositForm.amount) <= 0) ? 0.5 : 1,
                            textAlign: "left"
                          }}
                          onMouseEnter={(e) => { if (depositForm.amount && Number(depositForm.amount) > 0) e.currentTarget.style.borderColor = "#22c55e"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
                        >
                          <div style={{ width:40, height:40, borderRadius:10, background:"rgba(34,197,94,0.12)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                            <QrCode size={20} style={{ color:"#22c55e" }} />
                          </div>
                          <div style={{ flex:1 }}>
                            <p style={{ fontSize:13, fontWeight:700, color: "#000000" }}>Pay via QR Code</p>
                            <p style={{ fontSize:11, color: "var(--text-muted)" }}>Generate a QR code for the deposit amount</p>
                          </div>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Step 2A: Bank Deposit */}
                  {depositMethod === "bank" && (
                    <div>
                      <h3 style={{ fontSize:18, fontWeight:700, marginBottom:6, color: "var(--text-primary)" }}>🏦 Deposit from Linked Bank</h3>
                      <p style={{ color: "var(--text-muted)", fontSize:13, marginBottom:20 }}>
                        Deposit amount: <strong style={{ color:"#2563eb" }}>{depositForm.amount ? fmtCurrency(Number(depositForm.amount)) : ""}</strong>
                      </p>

                      {linkedBanks.length === 0 ? (
                        <div style={{
                          background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)",
                          borderRadius: 12, padding: "18px 20px", marginBottom: 20, textAlign: "center"
                        }}>
                          <Building2 size={24} style={{ color: "#ef4444", marginBottom: 8, marginLeft: "auto", marginRight: "auto" }} />
                          <h4 style={{ fontSize: 14, fontWeight: 700, color: "#000000", marginBottom: 4 }}>No linked bank accounts</h4>
                          <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 14, lineHeight: 1.5 }}>
                            Please link your bank account to make a deposit
                          </p>
                          <button
                            onClick={() => setModal("bank")}
                            style={{
                              display: "inline-flex", alignItems: "center", gap: 6,
                              background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.25)",
                              borderRadius: 8, padding: "8px 16px", color: "#3b82f6",
                              fontSize: 12, fontWeight: 700, cursor: "pointer", transition: "all 0.2s"
                            }}
                          >
                            <Plus size={14} /> Link a Bank Now
                          </button>
                        </div>
                      ) : (
                        <>
                          <div style={{ marginBottom: 20 }}>
                            <label style={{ fontSize: 13, color: "var(--text-secondary)", display: "block", marginBottom: 8 }}>Select bank account to deposit from</label>
                            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 180, overflowY: "auto", paddingRight: 4 }}>
                              {linkedBanks.map(b => {
                                const isSelected = selectedBankId === b.id;
                                return (
                                  <div
                                    key={b.id}
                                    onClick={() => setSelectedBankId(b.id)}
                                    style={{
                                      display: "flex", alignItems: "center", justifyContent: "space-between",
                                      padding: "10px 12px", borderRadius: 10, cursor: "pointer",
                                      background: isSelected ? "rgba(59,130,246,0.08)" : "#ffffff",
                                      border: `1px solid ${isSelected ? "#3b82f6" : "var(--border)"}`,
                                      transition: "all 0.2s"
                                    }}
                                  >
                                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                      <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(59,130,246,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                        <Building2 size={15} style={{ color: "#3b82f6" }} />
                                      </div>
                                      <div style={{ textAlign: "left" }}>
                                        <p style={{ fontSize: 12, fontWeight: 700, color: "#000000" }}>{b.bank}</p>
                                        <p style={{ fontSize: 10, color: "var(--text-secondary)" }}>{b.account.replace(/.(?=.{4})/g, "*")} • {b.owner}</p>
                                      </div>
                                    </div>
                                    {isSelected && (
                                      <div style={{ width: 14, height: 14, borderRadius: "50%", background: "#3b82f6", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                        <Check size={9} color="white" />
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          <div style={{ display:"flex", gap:10 }}>
                            <button
                              onClick={() => setDepositMethod(null)}
                              style={{
                                flex: 1, background: "var(--bg-card2)", border: "1px solid var(--border)",
                                color: "var(--text-secondary)", borderRadius: 10, padding: "13px", fontWeight: 600,
                                fontSize: 14, cursor: "pointer"
                              }}
                            >
                              Back
                            </button>
                            <button
                              onClick={handleConfirmDepositBank}
                              style={{
                                flex: 2, background: "linear-gradient(135deg,#2563eb,#1d4ed8)",
                                color: "#000000", border: "none", borderRadius: 10, padding: "13px",
                                fontWeight: 700, fontSize: 14, cursor: "pointer"
                              }}
                            >
                              Confirm Deposit
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* Step 2B: Pending Deposit via PayOS (Admin QR Code) */}
                  {depositMethod === "pending" && depositPaymentData && (
                    <div style={{ textAlign:"center" }}>
                      <h3 style={{ fontSize:18, fontWeight:700, marginBottom:6, color: "var(--text-primary)" }}>📱 Bank Transfer Deposit</h3>
                      <p style={{ color: "var(--text-secondary)", fontSize:13, marginBottom:20 }}>
                        Please scan the QR code or manually transfer to the admin account below
                      </p>

                      <div style={{ display:"inline-block", background:"white", borderRadius:16, padding:16, marginBottom:20, boxShadow: "0 10px 15px -3px rgba(0,0,0,0.05)" }}>
                        <img 
                          src={depositPaymentData.vietQrUrl} 
                          style={{ width:200, height:200, objectFit:"contain", borderRadius:8 }} 
                          alt="MBBank Admin QR Code" 
                        />
                      </div>

                      <div style={{ background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius:12, padding:"14px 18px", marginBottom:20, textAlign:"left" }}>
                        {[
                          { label: "Bank", value: "MB Bank (Military Bank)", canCopy: false },
                          { label: "Account Number", value: "0967373148", canCopy: true, copyLabel: "Account Number" },
                          { label: "Account Holder", value: "CHAU QUOC LAM PHONG", canCopy: false },
                          { label: "Amount", value: fmtCurrency(depositPaymentData.amount), copyValue: String(depositPaymentData.amount), canCopy: true, copyLabel: "Amount" },
                          { label: "Transfer Note", value: depositPaymentData.transferNote, canCopy: true, copyLabel: "Note" }
                        ].map(r => (
                          <div key={r.label} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 0", borderBottom:"1px solid var(--border)" }}>
                            <div>
                              <span style={{ fontSize:12, color: "var(--text-secondary)", display:"block" }}>{r.label}</span>
                              <span style={{ fontSize:13, fontWeight:700, color: "var(--text-primary)" }}>{r.value}</span>
                            </div>
                            {r.canCopy && (
                              <button 
                                onClick={() => handleCopyText(r.copyValue || r.value, r.copyLabel)}
                                style={{ background: "rgba(59,130,246,0.08)", border: "none", color: "#3b82f6", borderRadius: 6, padding: "5px 8px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 11 }}
                              >
                                <Copy size={12} /> Copy
                              </button>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Loading status check */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 20, color: "var(--text-secondary)", fontSize: 13 }}>
                        <div style={{ width: 16, height: 16, border: "2px solid rgba(59,130,246,0.3)", borderTopColor: "#3b82f6", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
                        <span>System is automatically checking transaction status...</span>
                      </div>

                      {depositPaymentData.checkoutUrl && (
                        <a 
                          href={depositPaymentData.checkoutUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          style={{
                            display:"flex",
                            alignItems:"center",
                            justifyContent:"center",
                            gap:8,
                            width:"100%",
                            background:"rgba(37,99,235,0.08)",
                            border:"1px solid rgba(37,99,235,0.25)",
                            borderRadius:10,
                            padding:"12px",
                            color:"#2563eb",
                            fontWeight:700,
                            fontSize:13,
                            cursor:"pointer",
                            transition:"all 0.2s",
                            marginBottom:20,
                            textDecoration:"none"
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = "rgba(37,99,235,0.15)"}
                          onMouseLeave={(e) => e.currentTarget.style.background = "rgba(37,99,235,0.08)"}
                        >
                          🔗 Open PayOS Payment Page (Test Mode)
                        </a>
                      )}

                      <div style={{ display:"flex", gap:10 }}>
                        <button
                          onClick={() => setDepositMethod(null)}
                          style={{
                            flex: 1, background: "var(--bg-card2)", border: "1px solid var(--border)",
                            color: "var(--text-secondary)", borderRadius: 10, padding: "13px", fontWeight: 600,
                            fontSize: 14, cursor: "pointer"
                          }}
                        >
                          Back
                        </button>
                        <button 
                          onClick={handleConfirmTransferred}
                          style={{ 
                            flex: 2,
                            background: "linear-gradient(135deg, #22c55e, #15803d)", 
                            color: "#000000", 
                            border: "none", 
                            borderRadius: 10, 
                            padding: "13px", 
                            fontWeight: 700, 
                            fontSize: 14, 
                            cursor: "pointer" 
                          }}
                        >
                          I Have Transferred
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
                    <div style={{ textAlign:"center" }}>
                      <h3 style={{ fontSize:18, fontWeight:700, marginBottom:6, color: "var(--text-primary)" }}>🔒 Enter Transaction PIN</h3>
                      <p style={{ color: "var(--text-secondary)", fontSize:13, marginBottom:20 }}>
                        Please enter your 4-digit transaction PIN to confirm the withdrawal.
                      </p>

                      <div style={{ display: "flex", gap: 12, justifyContent: "center", marginBottom: 24 }}>
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
                            style={{
                              width: 48, height: 52, textAlign: "center", fontSize: 24, fontWeight: 700,
                              background: digit ? "rgba(245,158,11,0.08)" : "var(--bg-card2)",
                              border: `2px solid ${digit ? "#f59e0b" : "var(--border)"}`,
                              borderRadius: 12, color: "#000000", outline: "none"
                            }}
                          />
                        ))}
                      </div>

                      <div style={{ display: "flex", gap: 10 }}>
                        <button
                          onClick={() => setPinStep(false)}
                          style={{
                            flex: 1, background: "var(--bg-card2)", border: "1px solid var(--border)",
                            color: "var(--text-secondary)", borderRadius: 10, padding: "12px", fontWeight: 600,
                            fontSize: 13, cursor: "pointer"
                          }}
                        >
                          Back
                        </button>
                        <button
                          onClick={handleConfirmWithdraw}
                          style={{
                            flex: 2, background: "linear-gradient(135deg,#f59e0b,#d97706)",
                            color: "#000000", border: "none", borderRadius: 10, padding: "12px",
                            fontWeight: 700, fontSize: 13, cursor: "pointer"
                          }}
                        >
                          Confirm Withdrawal
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <h3 style={{ fontSize:18, fontWeight:700, marginBottom:6, color: "var(--text-primary)" }}>🏦 Withdraw</h3>
                      <p style={{ color: "var(--text-muted)", fontSize:13, marginBottom:20 }}>
                        Withdraw to your bank account
                      </p>

                      {linkedBanks.length === 0 ? (
                        <div style={{
                          background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)",
                          borderRadius: 12, padding: "18px 20px", marginBottom: 20, textAlign: "center"
                        }}>
                          <Building2 size={24} style={{ color: "#ef4444", marginBottom: 8, marginLeft: "auto", marginRight: "auto" }} />
                          <h4 style={{ fontSize: 14, fontWeight: 700, color: "#000000", marginBottom: 4 }}>No linked bank accounts</h4>
                          <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 14, lineHeight: 1.5 }}>
                            Please link your bank account to make a withdrawal
                          </p>
                          <button
                            onClick={() => setModal("bank")}
                            style={{
                              display: "inline-flex", alignItems: "center", gap: 6,
                              background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.25)",
                              borderRadius: 8, padding: "8px 16px", color: "#3b82f6",
                              fontSize: 12, fontWeight: 700, cursor: "pointer", transition: "all 0.2s"
                            }}
                          >
                            <Plus size={14} /> Link a Bank Now
                          </button>
                        </div>
                      ) : (
                        <>
                          <div style={{ marginBottom: 16 }}>
                            <label style={{ fontSize: 13, color: "var(--text-secondary)", display: "block", marginBottom: 8 }}>Select receiving bank account</label>
                            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 180, overflowY: "auto", paddingRight: 4 }}>
                              {linkedBanks.map(b => {
                                const isSelected = selectedBankId === b.id;
                                return (
                                  <div
                                    key={b.id}
                                    onClick={() => setSelectedBankId(b.id)}
                                    style={{
                                      display: "flex", alignItems: "center", justifyContent: "space-between",
                                      padding: "10px 12px", borderRadius: 10, cursor: "pointer",
                                      background: isSelected ? "rgba(59,130,246,0.08)" : "#ffffff",
                                      border: `1px solid ${isSelected ? "#3b82f6" : "var(--border)"}`,
                                      transition: "all 0.2s"
                                    }}
                                  >
                                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                      <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(59,130,246,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                        <Building2 size={15} style={{ color: "#3b82f6" }} />
                                      </div>
                                      <div style={{ textAlign: "left" }}>
                                        <p style={{ fontSize: 12, fontWeight: 700, color: "#000000" }}>{b.bank}</p>
                                        <p style={{ fontSize: 10, color: "var(--text-secondary)" }}>{b.account.replace(/.(?=.{4})/g, "*")} • {b.owner}</p>
                                      </div>
                                    </div>
                                    {isSelected && (
                                      <div style={{ width: 14, height: 14, borderRadius: "50%", background: "#3b82f6", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                        <Check size={9} color="white" />
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          <div style={{ marginBottom: 20 }}>
                            <label style={{ fontSize:13, color: "var(--text-secondary)", display:"block", marginBottom:8 }}>Withdrawal amount (₫)</label>
                            <div style={{ position:"relative" }}>
                              <input
                                type="text" inputMode="numeric"
                                value={depositForm.amount ? Number(depositForm.amount).toLocaleString("vi-VN") : ""}
                                onChange={e => { const raw = e.target.value.replace(/\D/g,""); setDepositForm({...depositForm, amount:raw}); }}
                                placeholder="0"
                                style={{ width:"100%", background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius:10, padding:"12px 60px 12px 16px", color: "#000000", fontSize:18, fontWeight:700, outline:"none", boxSizing:"border-box" }}
                              />
                              <span style={{ position:"absolute", right:16, top:"50%", transform:"translateY(-50%)", fontSize:14, fontWeight:600, color:"var(--text-muted)", pointerEvents:"none" }}>₫</span>
                            </div>
                            <div style={{ display:"flex", gap:8, marginTop:10, flexWrap:"wrap" }}>
                              {[100000,200000,500000,1000000].map(v => (
                                <button key={v} onClick={() => setDepositForm({...depositForm, amount:String(v)})} style={{ fontSize:12, padding:"6px 12px", borderRadius:8, background: "var(--bg-card2)", border: "1px solid var(--border)", color: "var(--text-secondary)", cursor:"pointer" }}>
                                  +{fmtCurrency(v)}
                                </button>
                              ))}
                            </div>
                          </div>

                          <button onClick={handleConfirmWithdraw} style={{ width:"100%", background:"linear-gradient(135deg,#2563eb,#1d4ed8)", color: "#000000", border:"none", borderRadius:10, padding:"13px", fontWeight:700, fontSize:14, cursor:"pointer" }}>
                            Confirm Withdraw {depositForm.amount ? fmtCurrency(Number(depositForm.amount)) : ""}
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* TRANSFER */}
              {modal==="transfer" && (
                <div style={{ maxHeight: "80vh", overflowY: "auto", paddingRight: 2 }}>
                  {pinStep ? (
                    <div style={{ textAlign:"center", padding: "10px 0" }}>
                      <h3 style={{ fontSize:18, fontWeight:700, marginBottom:6, color: "var(--text-primary)" }}>🔒 Enter Transaction PIN</h3>
                      <p style={{ color: "var(--text-secondary)", fontSize:13, marginBottom:20 }}>
                        Please enter your 4-digit transaction PIN to confirm the transfer.
                      </p>

                      <div style={{ display: "flex", gap: 12, justifyContent: "center", marginBottom: 24 }}>
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
                            style={{
                              width: 48, height: 52, textAlign: "center", fontSize: 24, fontWeight: 700,
                              background: digit ? "rgba(37,99,235,0.08)" : "var(--bg-card2)",
                              border: `2px solid ${digit ? "#3b82f6" : "var(--border)"}`,
                              borderRadius: 12, color: "#000000", outline: "none"
                            }}
                          />
                        ))}
                      </div>

                      <div style={{ display: "flex", gap: 10 }}>
                        <button
                          onClick={() => setPinStep(false)}
                          style={{
                            flex: 1, background: "var(--bg-card2)", border: "1px solid var(--border)",
                            color: "var(--text-secondary)", borderRadius: 10, padding: "12px", fontWeight: 600,
                            fontSize: 13, cursor: "pointer"
                          }}
                        >
                          Back
                        </button>
                        <button
                          onClick={handleConfirmTransfer}
                          style={{
                            flex: 2, background: "linear-gradient(135deg,#2563eb,#1d4ed8)",
                            color: "#000000", border: "none", borderRadius: 10, padding: "12px",
                            fontWeight: 700, fontSize: 13, cursor: "pointer"
                          }}
                        >
                          Confirm Transfer
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <h3 style={{ fontSize:18, fontWeight:700, marginBottom:6, color: "var(--text-primary)" }}>💸 Transfer</h3>
                      <p style={{ color: "var(--text-muted)", fontSize:13, marginBottom:20 }}>Fast and secure money transfer</p>

                  {/* Method Selector */}
                  <div style={{ marginBottom: 20 }}>
                    <label style={{ fontSize:13, color: "var(--text-secondary)", display:"block", marginBottom:10 }}>Transfer method</label>
                    <div style={{ display:"flex", gap:10 }}>
                      {[
                        { id: "smartwallet", icon: Wallet, label: "SmartWallet", desc: "Transfer via phone / email", color: "#2563eb" },
                        { id: "bank",     icon: Building2, label: "Bank", desc: "Transfer to another bank", color: "#3b82f6" },
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
                            style={{
                              flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:6,
                              padding:"14px 10px", borderRadius:12, cursor:"pointer", transition:"all 0.2s",
                              background: active ? `${m.color}15` : "var(--bg-card2)",
                              border: `1.5px solid ${active ? m.color : "var(--border)"}`
                            }}
                          >
                            <div style={{ width:38, height:38, borderRadius:10, background: active ? `${m.color}25` : "var(--bg-card)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                              <m.icon size={18} style={{ color: active ? m.color : "var(--text-muted)" }} />
                            </div>
                            <span style={{ fontSize:12, fontWeight:700, color: active ? m.color : "#71717a" }}>{m.label}</span>
                            <span style={{ fontSize:10, color: "var(--text-muted)", textAlign:"center" }}>{m.desc}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* ---- BLACKRED WALLET ---- */}
                  {transferMethod === "smartwallet" && (
                    <div>
                      <div style={{ background:"rgba(37,99,235,0.06)", border:"1px solid rgba(37,99,235,0.15)", borderRadius:10, padding:"10px 14px", marginBottom:16, display:"flex", alignItems:"center", gap:8 }}>
                        <Smartphone size={14} style={{ color:"#2563eb", flexShrink:0 }} />
                        <p style={{ fontSize:12, color: "var(--text-secondary)", lineHeight:1.5 }}>Transfer directly to a SmartWallet account using a registered phone number or email.</p>
                      </div>
                      <div style={{ marginBottom:14 }}>
                        <label style={{ fontSize:13, color: "var(--text-secondary)", display:"block", marginBottom:6 }}>Recipient's phone / email *</label>
                        <input value={txForm.target} onChange={e => setTxForm({...txForm, target:e.target.value})}
                          placeholder="Enter phone number or email"
                          style={{ width:"100%", background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius:10, padding:"11px 14px", color: "#000000", fontSize:14, outline:"none" }} />
                      </div>
                    </div>
                  )}

                  {/* ---- BANK TRANSFER ---- */}
                  {transferMethod === "bank" && (
                    <div>
                      <div style={{ background:"rgba(59,130,246,0.06)", border:"1px solid rgba(59,130,246,0.15)", borderRadius:10, padding:"10px 14px", marginBottom:16, display:"flex", alignItems:"center", gap:8 }}>
                        <AlertCircle size={14} style={{ color:"#3b82f6", flexShrink:0 }} />
                        <p style={{ fontSize:12, color: "var(--text-secondary)", lineHeight:1.5 }}>Upload a bank QR image or manually enter the recipient's bank and account number.</p>
                      </div>

                      {/* QR Upload */}
                      <div style={{ marginBottom:16 }}>
                        <label style={{ fontSize:13, color: "var(--text-secondary)", display:"block", marginBottom:8 }}>Upload bank QR code image (optional)</label>
                        <input ref={qrInputRef} type="file" accept="image/*" onChange={handleQrFileChange} style={{ display:"none" }} />
                        {qrUploadPreview ? (
                          <div style={{ position:"relative", display:"inline-block", width:"100%" }}>
                            <img src={qrUploadPreview} alt="QR preview"
                              style={{ width:"100%", maxHeight:180, objectFit:"contain", borderRadius:12, border: "1px solid var(--border)", background: "var(--bg-card2)" }} />
                            <button onClick={() => { setQrUploadFile(null); setQrUploadPreview(null); }}
                              style={{ position:"absolute", top:8, right:8, background:"rgba(0,0,0,0.7)", border:"none", borderRadius:6, width:28, height:28, display:"flex", alignItems:"center", justifyContent:"center", color: "#000000" }}>
                              <X size={14} />
                            </button>
                            <button onClick={() => qrInputRef.current?.click()}
                              style={{ marginTop:8, width:"100%", background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius:8, padding:"7px", color: "var(--text-secondary)", fontSize:12, cursor:"pointer" }}>
                              Change Image
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => qrInputRef.current?.click()}
                            style={{
                              width:"100%", background: "var(--bg-card2)", border:"2px dashed var(--border)",
                              borderRadius:12, padding:"22px 16px", display:"flex", flexDirection:"column",
                              alignItems:"center", gap:8, cursor:"pointer", transition:"all 0.2s"
                            }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor="#3b82f6"; e.currentTarget.style.background="rgba(59,130,246,0.05)"; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor="var(--border)"; e.currentTarget.style.background="var(--bg-card2)"; }}
                          >
                            <div style={{ width:44, height:44, borderRadius:12, background:"rgba(59,130,246,0.1)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                              <Upload size={20} style={{ color:"#3b82f6" }} />
                            </div>
                            <span style={{ fontSize:13, fontWeight:600, color: "var(--text-secondary)" }}>Click to upload QR image</span>
                            <span style={{ fontSize:11, color: "var(--text-muted)" }}>PNG, JPG, JPEG (max 5MB)</span>
                          </button>
                        )}
                      </div>

                      {/* Divider */}
                      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
                        <div style={{ flex:1, height:1, background:"var(--border)" }} />
                        <span style={{ fontSize:11, color: "var(--text-muted)", whiteSpace:"nowrap" }}>or enter manually</span>
                        <div style={{ flex:1, height:1, background:"var(--border)" }} />
                      </div>

                      {/* Bank selector */}
                      <div style={{ marginBottom:12 }}>
                        <label style={{ fontSize:13, color: "var(--text-secondary)", display:"block", marginBottom:6 }}>Recipient's bank *</label>
                        <select value={bankTransferForm.bank} onChange={e => setBankTransferForm({...bankTransferForm, bank:e.target.value})}
                          style={{ width:"100%", background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius:10, padding:"11px 14px", color: bankTransferForm.bank ? "#000000" : "#52525b", fontSize:14, outline:"none" }}>
                          <option value="">-- Select bank --</option>
                          {BANKS.map(b => <option key={b} value={b}>{b}</option>)}
                        </select>
                      </div>

                      {/* Account number */}
                      <div style={{ marginBottom:12 }}>
                        <label style={{ fontSize:13, color: "var(--text-secondary)", display:"block", marginBottom:6 }}>Recipient's account number *</label>
                        <input value={bankTransferForm.account} onChange={e => setBankTransferForm({...bankTransferForm, account:e.target.value})}
                          placeholder="Enter account number"
                          style={{ width:"100%", background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius:10, padding:"11px 14px", color: "#000000", fontSize:14, outline:"none" }} />
                      </div>

                      {/* Owner name */}
                      <div style={{ marginBottom:4 }}>
                        <label style={{ fontSize:13, color: "var(--text-secondary)", display:"block", marginBottom:6 }}>Account holder name (optional)</label>
                        <input value={bankTransferForm.ownerName} onChange={e => setBankTransferForm({...bankTransferForm, ownerName:e.target.value})}
                          placeholder="Full name of recipient"
                          style={{ width:"100%", background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius:10, padding:"11px 14px", color: "#000000", fontSize:14, outline:"none" }} />
                      </div>
                    </div>
                  )}

                  {/* Category Selection */}
                  <div style={{ marginBottom: 16, textAlign: "left" }}>
                    <label style={{ fontSize: 13, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>Transfer category *</label>
                    <select value={txForm.category} onChange={e => setTxForm({...txForm, category: e.target.value})}
                      style={{ width: "100%", background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius: 10, padding: "11px 14px", color: txForm.category ? "#000000" : "#52525b", fontSize: 14, outline: "none" }}>
                      <option value="">-- Select category --</option>
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Common fields: Amount + Note */}
                  <div style={{ marginTop:16, marginBottom:14, textAlign:"left" }}>
                    <label style={{ fontSize:13, color: "var(--text-secondary)", display:"block", marginBottom:6 }}>Amount (₫) *</label>
                    <div style={{ position:"relative" }}>
                      <input
                        type="text" inputMode="numeric"
                        value={txForm.amount ? Number(txForm.amount).toLocaleString("vi-VN") : ""}
                        onChange={e => { const raw = e.target.value.replace(/\D/g,""); setTxForm({...txForm, amount:raw}); }}
                        placeholder="0"
                        style={{ width:"100%", background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius:10, padding:"12px 60px 12px 16px", color: "#000000", fontSize:18, fontWeight:700, outline:"none", boxSizing:"border-box" }}
                      />
                      <span style={{ position:"absolute", right:16, top:"50%", transform:"translateY(-50%)", fontSize:14, fontWeight:600, color:"var(--text-muted)", pointerEvents:"none" }}>₫</span>
                    </div>
                    <div style={{ display:"flex", gap:8, marginTop:10, flexWrap:"wrap" }}>
                      {[50000,100000,200000,500000].map(v => (
                        <button key={v} onClick={() => setTxForm({...txForm, amount:String(v)})}
                          style={{ fontSize:12, padding:"5px 10px", borderRadius:8, background: "var(--bg-card2)", border: "1px solid var(--border)", color: "var(--text-secondary)", cursor:"pointer" }}>
                          +{fmtCurrency(v)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div style={{ marginBottom:16, textAlign:"left" }}>
                    <label style={{ fontSize:13, color: "var(--text-secondary)", display:"block", marginBottom:6 }}>Note (optional)</label>
                    <input value={txForm.note} onChange={e => setTxForm({...txForm, note:e.target.value})}
                      placeholder="Transfer note"
                      style={{ width:"100%", background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius:10, padding:"11px 14px", color: "#000000", fontSize:14, outline:"none" }} />
                  </div>

                  {/* Promo Code Selection */}
                  {transferMethod === "smartwallet" && (
                    <div style={{ marginTop:16, marginBottom:16, border: "1px solid var(--border)", borderRadius:12, padding:14, background: "var(--bg-card2)", textAlign:"left" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:8 }}>
                        <Gift size={16} style={{ color:"#3b82f6" }} />
                        <span style={{ fontSize:13, fontWeight:700, color: "#000000" }}>Promo Codes &amp; Rewards</span>
                      </div>
                      
                      <div style={{ display:"flex", gap:8, marginBottom:10 }}>
                        <input 
                          value={promoCode} 
                          onChange={e => setPromoCode(e.target.value)} 
                          placeholder="Enter promo code (e.g. TRANSFER50)" 
                          style={{ flex:1, background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius:8, padding:"8px 12px", color: "#000000", fontSize:12, outline:"none" }} 
                        />
                        <button 
                          onClick={handleApplyPromo}
                          style={{ background:"#3b82f6", color: "#000000", border:"none", borderRadius:8, padding:"0 14px", fontSize:12, fontWeight:600, cursor:"pointer" }}
                        >
                          Apply
                        </button>
                      </div>

                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                        <button 
                          onClick={() => setShowPromoSelector(true)}
                          style={{ background:"none", border:"none", color:"#3b82f6", fontSize:12, fontWeight:600, cursor:"pointer", display:"flex", alignItems: "center", gap: 4, padding: 0 }}
                        >
                          <Tag size={12} /> Browse available codes
                        </button>
                        
                        {appliedVoucher && (
                          <button 
                            onClick={() => { setAppliedVoucher(null); setPromoCode(""); }}
                            style={{ background:"none", border:"none", color:"#ef4444", fontSize:11, cursor:"pointer" }}
                          >
                            Remove
                          </button>
                        )}
                      </div>

                      {appliedVoucher && (() => {
                        const discount = appliedVoucher.discountAmount || 0;
                        return (
                          <div style={{ marginTop:10, padding:"8px 12px", background:"rgba(34,197,94,0.06)", border:"1px solid rgba(34,197,94,0.15)", borderRadius:8 }}>
                            <p style={{ fontSize:12, color:"#22c55e", fontWeight:700 }}>
                              ✓ Applied: {appliedVoucher.code}
                            </p>
                            <p style={{ fontSize:11, color: "var(--text-secondary)", marginTop:2 }}>
                              {appliedVoucher.title}
                            </p>
                            {appliedVoucher.min_transaction_amount > 0 && (
                              <p style={{ fontSize:10, color:"#f59e0b", marginTop:2 }}>
                                * Minimum transaction: {fmtCurrency(appliedVoucher.min_transaction_amount)}
                              </p>
                            )}
                            {discount > 0 ? (
                              <p style={{ fontSize:12, color:"#22c55e", fontWeight:700, marginTop:4 }}>
                                Discount: -{fmtCurrency(discount)}
                              </p>
                            ) : (
                              <p style={{ fontSize:11, color:"#f59e0b", marginTop:4 }}>
                                Enter a valid transfer amount to apply the discount!
                              </p>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* Available balance display */}
                    <div style={{ display:"flex", justifyContent:"space-between", padding:"8px 12px", background: "var(--bg-card2)", borderRadius:8, marginBottom:16 }}>
                    <span style={{ fontSize:12, color: "var(--text-secondary)" }}>Available balance</span>
                    <span style={{ fontSize:12, fontWeight:700, color:"#22c55e" }}>{fmtCurrency(balance)}</span>
                  </div>

                  {appliedVoucher ? (() => {
                    const discount = appliedVoucher.discountAmount || 0;
                    const finalAmt = Math.max(0, (Number(txForm.amount) || 0) - discount);
                    return (
                      <button onClick={handleConfirmTransfer}
                        style={{ width:"100%", background:"linear-gradient(135deg,#2563eb,#1d4ed8)", color: "#000000", border:"none", borderRadius:10, padding:"13px", fontWeight:700, fontSize:14, cursor:"pointer" }}>
                        💸 Confirm Transfer {fmtCurrency(finalAmt)} (Discounted)
                      </button>
                    );
                  })() : (
                    <button onClick={handleConfirmTransfer}
                      style={{ width:"100%", background:"linear-gradient(135deg,#2563eb,#1d4ed8)", color: "#000000", border:"none", borderRadius:10, padding:"13px", fontWeight:700, fontSize:14, cursor:"pointer" }}>
                      💸 Confirm Transfer {txForm.amount ? fmtCurrency(Number(txForm.amount)) : "funds"}
                    </button>
                  )}
                    </div>
                  )}

                  {/* Voucher Picker Overlay Sheet */}
                  {showPromoSelector && (
                    <div style={{ position:"absolute", inset:0, background: "var(--bg-card)", borderRadius:20, padding:24, zIndex:210, display:"flex", flexDirection:"column" }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
                        <h4 style={{ fontSize:15, fontWeight:700, display:"flex", alignItems:"center", gap:6, color: "#000000" }}>
                          <Gift size={16} style={{ color:"#3b82f6" }} /> Select Promo Code
                        </h4>
                        <button onClick={() => setShowPromoSelector(false)} style={{ background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius:8, width:28, height:28, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color: "var(--text-secondary)" }}>
                          <X size={14} />
                        </button>
                      </div>
                      
                      <div style={{ display:"flex", gap:6, marginBottom:16, overflowX:"auto", paddingBottom:6 }}>
                        {["All", "Chuyển tiền", "Mua sắm", "Rút tiền", "Referral", "Nạp tiền", "Hóa đơn"].map(cat => (
                          <button 
                            key={cat} 
                            onClick={() => setActivePromoTab(cat)} 
                            style={{
                              padding:"4px 10px", borderRadius:20, fontSize:11, fontWeight:500, whiteSpace:"nowrap",
                              background: activePromoTab===cat ? "rgba(59,130,246,0.15)" : "#ffffff",
                              border:`1px solid ${activePromoTab===cat ? "rgba(59,130,246,0.4)" : "var(--border)"}`,
                              color: activePromoTab===cat ? "#3b82f6" : "#000000", cursor:"pointer"
                            }}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>

                      <div style={{ flex:1, overflowY:"auto", display:"flex", flexDirection:"column", gap:10 }}>
                        {voucherList.filter(v => activePromoTab === "All" || v.tag === activePromoTab).map(v => {
                          const isApplicable = !v.min_transaction_amount || (Number(txForm.amount) || 0) >= Number(v.min_transaction_amount);
                          return (
                            <div 
                              key={v.id} 
                              onClick={() => isApplicable && handleSelectVoucher(v)}
                              style={{
                                padding:12, borderRadius:12, background: "var(--bg-card2)", border: "1px solid var(--border)",
                                cursor: isApplicable ? "pointer" : "not-allowed", opacity: isApplicable ? 1 : 0.6,
                                transition:"all 0.2s", textAlign:"left"
                              }}
                            >
                              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"start" }}>
                                <div style={{ textAlign:"left" }}>
                                  <span style={{ fontSize:10, padding:"2px 6px", borderRadius:4, background:`${tagColors[v.tag]}18`, color:tagColors[v.tag], fontWeight:600 }}>{v.tag}</span>
                                  <h5 style={{ fontSize:13, fontWeight:700, color: "#000000", marginTop:6 }}>{v.title}</h5>
                                  <p style={{ fontSize:11, color: "var(--text-secondary)", marginTop:2 }}>{v.description}</p>
                                  {v.min_transaction_amount > 0 && (
                                    <p style={{ fontSize:10, color:"#f59e0b", marginTop:2 }}>
                                      Min Txn: {fmtCurrency(v.min_transaction_amount)}
                                    </p>
                                  )}
                                  <p style={{ fontSize:10, color: "var(--text-muted)", marginTop:4 }}>Exp: {fmtVoucherDate(v.expired_at)}</p>
                                </div>
                                <div style={{ textAlign:"right" }}>
                                  <span style={{ fontSize:14, fontWeight:900, color:"#3b82f6" }}>{discountLabel(v)}</span>
                                  <div style={{ fontSize:10, fontWeight:700, color: "var(--text-muted)", marginTop:4 }}>Code: {v.code}</div>
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

              {/* QR */}
              {modal==="qr" && (
                <div style={{ textAlign:"center" }}>
                  <h3 style={{ fontSize:18, fontWeight:700, marginBottom:6 }}>📱 My QR Code</h3>
                  <p style={{ color: "var(--text-muted)", fontSize:13, marginBottom:24 }}>Let others scan to send money to you</p>
                  <div style={{ display:"inline-block", background:"white", borderRadius:16, padding:16, marginBottom:20 }}>
                    <QRCode value="smartwallet://user/demo_user_123" size={180} level="H" />
                  </div>
                  <p style={{ fontSize:13, color: "var(--text-secondary)", marginBottom:4 }}>ID: <strong style={{ color:"#2563eb" }}>SW-DEMO-123</strong></p>
                  <button style={{ marginTop:12, background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius:10, padding:"10px 24px", color: "var(--text-secondary)", cursor:"pointer", fontSize:13 }}>
                    Download QR
                  </button>
                </div>
              )}

              {/* BANK */}
              {modal==="bank" && (
                <div>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
                    <h3 style={{ fontSize:18, fontWeight:700 }}>🏦 Link Bank Account</h3>
                    <span style={{
                      fontSize:12, fontWeight:700, padding:"4px 10px", borderRadius:20,
                      background: linkedBanks.length >= MAX_BANKS ? "rgba(239,68,68,0.12)" : "rgba(59,130,246,0.12)",
                      color: linkedBanks.length >= MAX_BANKS ? "#ef4444" : "#3b82f6",
                      border: `1px solid ${linkedBanks.length >= MAX_BANKS ? "rgba(239,68,68,0.25)" : "rgba(59,130,246,0.25)"}`
                    }}>
                      {linkedBanks.length}/{MAX_BANKS} banks
                    </span>
                  </div>

                  {linkedBanks.length >= MAX_BANKS ? (
                    <div style={{
                      background:"rgba(239,68,68,0.07)", border:"1px solid rgba(239,68,68,0.2)",
                      borderRadius:12, padding:"20px 16px", textAlign:"center"
                    }}>
                      <div style={{ fontSize:32, marginBottom:10 }}>🔒</div>
                      <p style={{ fontSize:14, fontWeight:700, color: "#000000", marginBottom:6 }}>
                        Link Limit Reached
                      </p>
                      <p style={{ fontSize:13, color: "var(--text-secondary)", lineHeight:1.6, marginBottom:16 }}>
                        You have reached the maximum of <strong style={{ color:"#ef4444" }}>3 linked banks</strong>.<br/>
                        Please remove an existing bank before adding a new one.
                      </p>
                      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                        {linkedBanks.map(b => (
                          <div key={b.id} style={{
                            display:"flex", alignItems:"center", justifyContent:"space-between",
                            background: "var(--bg-card2)", border: "1px solid var(--border)",
                            borderRadius:10, padding:"10px 14px"
                          }}>
                            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                              <Building2 size={15} style={{ color:"#3b82f6" }} />
                              <div style={{ textAlign:"left" }}>
                                <p style={{ fontSize:12, fontWeight:700 }}>{b.bank}</p>
                                <p style={{ fontSize:11, color: "var(--text-secondary)" }}>{b.account.replace(/.(?=.{4})/g,"*")} • {b.owner}</p>
                              </div>
                            </div>
                            <button
                              onClick={() => handleUnlinkBank(b.id, b.bank)}
                              style={{
                                background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.2)",
                                borderRadius:6, padding:"4px 10px", color:"#ef4444",
                                fontSize:11, fontWeight:700, cursor:"pointer"
                              }}
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <>
                      <div style={{ marginBottom:16 }}>
                        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                          <span style={{ fontSize:11, color: "var(--text-secondary)" }}>Linked banks</span>
                          <span style={{ fontSize:11, color:"#3b82f6", fontWeight:700 }}>{linkedBanks.length}/{MAX_BANKS}</span>
                        </div>
                        <div style={{ height:4, background: "var(--bg-card2)", borderRadius:4 }}>
                          <div style={{
                            height:"100%", borderRadius:4, transition:"width 0.4s",
                            width:`${(linkedBanks.length / MAX_BANKS) * 100}%`,
                            background: linkedBanks.length === 2 ? "linear-gradient(90deg,#f59e0b,#d97706)" : "linear-gradient(90deg,#3b82f6,#1d4ed8)"
                          }} />
                        </div>
                        {linkedBanks.length === 2 && (
                          <p style={{ fontSize:11, color:"#f59e0b", marginTop:6 }}>⚠️ Only 1 slot remaining!</p>
                        )}
                      </div>

                      <div style={{ marginBottom:14 }}>
                        <label style={{ fontSize:13, color: "var(--text-secondary)", display:"block", marginBottom:6 }}>Bank name</label>
                        <select value={bankForm.bank} onChange={e => setBankForm({...bankForm,bank:e.target.value})}
                          style={{ width:"100%", background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius:10, padding:"11px 14px", color: bankForm.bank ? "#000000" : "#52525b", fontSize:14, outline:"none" }}>
                          <option value="">-- Select bank --</option>
                          {BANKS.map(b => <option key={b} value={b}>{b}</option>)}
                        </select>
                      </div>
                      {[
                        { label:"Account number", key:"account", placeholder:"Enter account number" },
                        { label:"Account holder name", key:"owner", placeholder:"Enter full name" },
                      ].map(f => (
                        <div key={f.key} style={{ marginBottom:14 }}>
                          <label style={{ fontSize:13, color: "var(--text-secondary)", display:"block", marginBottom:6 }}>{f.label}</label>
                          <input value={bankForm[f.key]} onChange={e => setBankForm({...bankForm,[f.key]:e.target.value})}
                            placeholder={f.placeholder}
                            style={{ width:"100%", background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius:10, padding:"11px 14px", color: "#000000", fontSize:14, outline:"none" }} />
                        </div>
                      ))}
                      <button onClick={handleLinkBank} style={{ width:"100%", background:"linear-gradient(135deg,#3b82f6,#1d4ed8)", color: "#000000", border:"none", borderRadius:10, padding:"13px", fontWeight:700, fontSize:14, cursor:"pointer", marginTop:8 }}>
                        Link Bank
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* LINKED BANKS LIST & UNLINK */}
              {modal==="linked_banks_list" && (
                <div>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
                    <h3 style={{ fontSize:18, fontWeight:700 }}>🏦 Linked Banks</h3>
                    <span style={{
                      fontSize:12, fontWeight:700, padding:"4px 10px", borderRadius:20,
                      background: "rgba(59,130,246,0.12)", color: "#3b82f6",
                      border: "1px solid rgba(59,130,246,0.25)"
                    }}>
                      {linkedBanks.length}/3 linked
                    </span>
                  </div>

                  {linkedBanks.length === 0 ? (
                    <div style={{ padding: "30px 16px", textAlign: "center", background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius: 16 }}>
                      <Building2 size={36} style={{ color: "var(--text-muted)", marginBottom: 12, margin: "0 auto" }} />
                      <p style={{ fontSize:14, fontWeight:600, color: "var(--text-secondary)", marginBottom: 4 }}>No linked banks</p>
                      <p style={{ fontSize:12, color: "var(--text-muted)", marginBottom: 16 }}>Please add a bank account to easily deposit and withdraw funds.</p>
                      <button
                        onClick={() => setModal("bank")}
                        style={{
                          background: "linear-gradient(135deg,#3b82f6,#1d4ed8)", color: "#000000", border: "none",
                          borderRadius: 8, padding: "8px 16px", fontWeight: 700, fontSize: 13, cursor: "pointer"
                        }}
                      >
                        + Link Now
                      </button>
                    </div>
                  ) : (
                    <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                      <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 6 }}>
                        Bank accounts linked to your wallet:
                      </p>
                      {linkedBanks.map(b => (
                        <div key={b.id} style={{
                          display:"flex", alignItems:"center", justifyContent:"space-between",
                          background: "var(--bg-card2)", border: "1px solid var(--border)",
                          borderRadius:12, padding:"12px 16px"
                        }}>
                          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                            <div style={{ width: 36, height: 36, borderRadius: 8, background: "rgba(59,130,246,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <Building2 size={16} style={{ color:"#3b82f6" }} />
                            </div>
                            <div style={{ textAlign:"left" }}>
                              <p style={{ fontSize:13, fontWeight:700 }}>{b.bank}</p>
                              <p style={{ fontSize:11, color: "var(--text-secondary)" }}>{b.account.replace(/.(?=.{4})/g,"*")} • {b.owner}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleUnlinkBank(b.id, b.bank)}
                            style={{
                              background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.2)",
                              borderRadius:8, padding:"6px 12px", color:"#ef4444",
                              fontSize:12, fontWeight:700, cursor:"pointer", transition: "all 0.2s"
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.15)"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.08)"; }}
                          >
                            Unlink
                          </button>
                        </div>
                      ))}
                      
                      {linkedBanks.length < MAX_BANKS && (
                        <button
                          onClick={() => setModal("bank")}
                          style={{
                            width: "100%", background: "none", border: "1px dashed var(--border)",
                            borderRadius: 12, padding: "12px", color: "#3b82f6", fontSize: 13,
                            fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center",
                            justifyContent: "center", gap: 6, marginTop: 8, transition: "all 0.2s"
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(59,130,246,0.04)"; e.currentTarget.style.borderColor = "#3b82f6"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = "none"; e.currentTarget.style.borderColor = "var(--border)"; }}
                        >
                          + Add New Bank Link
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* TX DETAIL */}
              {modal==="tx" && selectedTx && (
                <div>
                  <h3 style={{ fontSize:18, fontWeight:700, marginBottom:20 }}>Transaction Details</h3>
                  <div style={{ background: "var(--bg-card2)", borderRadius:12, padding:20, marginBottom:20, textAlign:"center" }}>
                    <p style={{ fontSize:32, fontWeight:900, color: selectedTx.type==="receive" ? "#22c55e" : "#2563eb" }}>
                      {selectedTx.type==="receive" ? "+" : "-"}{fmtCurrency(selectedTx.amount)}
                    </p>
                    <span style={{ fontSize:12, padding:"4px 12px", borderRadius:8, fontWeight:600,
                      background: selectedTx.status==="success" ? "rgba(34,197,94,0.12)" : selectedTx.status==="pending" ? "rgba(245,158,11,0.12)" : "rgba(239,68,68,0.12)",
                      color: selectedTx.status==="success" ? "#22c55e" : selectedTx.status==="pending" ? "#f59e0b" : "#ef4444"
                    }}>
                      {selectedTx.status==="success" ? "Success" : selectedTx.status==="pending" ? "Pending" : "Failed"}
                    </span>
                  </div>
                  {[
                    { label:"Transaction ID", value:selectedTx.id },
                    { label:"Type", value: selectedTx.type==="receive" ? "Received" : "Transfer" },
                    ...(selectedTx.category ? [{ label:"Category", value: selectedTx.category }] : []),
                    { label:selectedTx.type==="receive" ? "Sender" : "Recipient", value:selectedTx.name },
                    { label:"Date & Time", value:selectedTx.time },
                    { label:"Note", value:selectedTx.note || "—" },
                  ].map(r => (
                    <div key={r.label} style={{ display:"flex", justifyContent:"space-between", padding:"10px 0", borderBottom:"1px solid #1f1f1f" }}>
                      <span style={{ fontSize:13, color: "var(--text-secondary)" }}>{r.label}</span>
                      <span style={{ fontSize:13, fontWeight:600 }}>{r.value}</span>
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
