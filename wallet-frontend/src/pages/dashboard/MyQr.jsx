import { useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Download, Copy, Send, QrCode } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import "./MyQr.css";

export default function MyQr() {
  const { t } = useLanguage();
  const qrRef = useRef(null);
  const [copied, setCopied] = useState(false);

  const user = JSON.parse(localStorage.getItem("bw_user") || "null");

  const qrPayload = JSON.stringify({
    type: "SMARTWALLET_USER_QR",
    userId: user?.id,
    name: user?.name,
    email: user?.email,
    wallet: "SMARTWALLET",
  });

  const downloadQr = () => {
    const canvas = qrRef.current?.querySelector("canvas");
    if (!canvas) return;

    const url = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = url;
    link.download = `smartwallet-qr-${user?.id || "user"}.png`;
    link.click();
  };

  const copyQr = async () => {
    await navigator.clipboard.writeText(qrPayload);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="my-qr-page">
      <section className="qr-header">
        <div>
          <span>SmartWallet QR</span>
          <h1>{t.myQr.title}</h1>
          <p>{t.myQr.subtitle}</p>
        </div>

        <div className="qr-header-icon">
          <QrCode size={46} />
        </div>
      </section>

      <section className="qr-card">
        <div className="qr-user">
          <div className="qr-user-avatar">
            {user?.name?.charAt(0)?.toUpperCase() || "U"}
          </div>

          <div>
            <h2>{user?.name || "SmartWallet User"}</h2>
            <p>{user?.email}</p>
          </div>
        </div>

        <div className="qr-display-box" ref={qrRef}>
          <QRCodeCanvas
            value={qrPayload}
            size={260}
            level="H"
            includeMargin
          />
        </div>

        <div className="qr-info-table">
          <div className="qr-info-row">
            <span>{t.myQr.userId}</span>
            <b>{user?.id}</b>
          </div>

          <div className="qr-info-row">
            <span>{t.myQr.email}</span>
            <b>{user?.email}</b>
          </div>
        </div>

        <div className="qr-actions-grid">
          <button type="button" className="qr-action-btn" onClick={downloadQr}>
            <Download size={18} />
            {t.myQr.downloadQr}
          </button>

          <button type="button" className="qr-action-btn" onClick={copyQr}>
            <Copy size={18} />
            {copied ? t.myQr.copied : t.myQr.copyQr}
          </button>

          <button type="button" className="qr-action-btn" onClick={() => alert("Demo: QR scanner form")}>
            <Send size={18} />
            {t.myQr.transfer}
          </button>
        </div>
      </section>
    </div>
  );
}