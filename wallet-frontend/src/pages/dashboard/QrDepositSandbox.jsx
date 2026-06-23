import { useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { CheckCircle, Loader2, QrCode, XCircle } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import "./QrDepositSandbox.css";

const API_URL = "http://localhost:5000/api";

export default function QrDepositSandbox() {
  const { lang, t } = useLanguage();
  const [amount, setAmount] = useState("");
  const [qrData, setQrData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState(null);

  const token = localStorage.getItem("bw_token");

  const createQr = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    setQrData(null);

    try {
      const res = await fetch(`${API_URL}/wallet/qr-deposit/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount: Number(amount),
          bank_code: "QR_SANDBOX_BANK",
        }),
      });

      const data = await res.json();

      if (!data.success) {
        setResult(data);
        return;
      }

      setQrData(data);
    } catch (error) {
      setResult({
        success: false,
        message: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const confirmPayment = async () => {
    if (!qrData?.transactionId) return;

    setConfirming(true);
    setResult(null);

    try {
      const res = await fetch(`${API_URL}/wallet/qr-deposit/confirm`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          transactionId: qrData.transactionId,
        }),
      });

      const data = await res.json();
      setResult(data);

      if (data.success) {
        window.dispatchEvent(new Event("balance_updated"));
      }
    } catch (error) {
      setResult({
        success: false,
        message: error.message,
      });
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="qr-sandbox-page">
      <section className="qr-hero">
        <div>
          <span>SmartWallet Sandbox</span>
          <h1>{t.qrSandbox.title}</h1>
          <p>{t.qrSandbox.subtitle}</p>
        </div>

        <div className="qr-hero-icon">
          <QrCode size={48} />
        </div>
      </section>

      <div className="qr-grid">
        <form className="qr-card" onSubmit={createQr}>
          <h2>{t.qrSandbox.createTitle}</h2>

          <label>
            {t.qrSandbox.amountLabel}
            <input
              type="number"
              min="1000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={t.qrSandbox.amountPlaceholder}
              required
            />
          </label>

          <button disabled={loading}>
            {loading ? (
              <>
                <Loader2 size={18} className="spin" />
                {t.qrSandbox.creating}
              </>
            ) : (
              t.qrSandbox.createBtn
            )}
          </button>

          <div className="sandbox-note">
            <b>{t.qrSandbox.demoFlowTitle}</b>
            <p>{t.qrSandbox.step1}</p>          
            <p>{t.qrSandbox.step2}</p>
          </div>
        </form>

        <section className="qr-card qr-display-card">
          <h2>{t.qrSandbox.paymentTitle}</h2>

          {!qrData ? (
            <div className="empty-qr">
              <QrCode size={80} />
              <p>{t.qrSandbox.noQrText}</p>
            </div>
          ) : (
            <>
              <div className="qr-box">
                <QRCodeCanvas
                  value={qrData.qrPayload}
                  size={230}
                  level="H"
                  includeMargin
                />
              </div>

              <div className="qr-info">
                <div>
                  <span>{t.qrSandbox.amount}</span>
                  <b>{Number(qrData.amount).toLocaleString("vi-VN")} ₫</b>
                </div>

                <div>
                  <span>{t.qrSandbox.reference}</span>
                  <b>{qrData.referenceCode}</b>
                </div>

                <div>
                  <span>{t.qrSandbox.status}</span>
                  <b>{qrData.status === "PENDING" ? (lang === "vi" ? "Đang chờ" : "Pending") : qrData.status}</b>
                </div>
              </div>

              <button
                className="confirm-btn"
                type="button"
                onClick={confirmPayment}
                disabled={confirming || result?.success}
              >
                {confirming ? (
                  <>
                    <Loader2 size={18} className="spin" />
                    {t.qrSandbox.simulating}
                  </>
                ) : (
                  t.qrSandbox.simulateScanBtn
                )}
              </button>
            </>
          )}
        </section>
      </div>

      {result && (
        <section className={`result-box ${result.success ? "success" : "failed"}`}>
          {result.success ? <CheckCircle size={38} /> : <XCircle size={38} />}
          <div>
            <h3>{result.success ? t.qrSandbox.successTitle : t.qrSandbox.failedTitle}</h3>
            <p>{result.message}</p>

            {result.wallet?.balance !== undefined && (
              <strong>
                {t.qrSandbox.newBalance}: {Number(result.wallet.balance).toLocaleString("vi-VN")} ₫
              </strong>
            )}
          </div>
        </section>
      )}
    </div>
  );
}