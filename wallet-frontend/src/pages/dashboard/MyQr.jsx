import { useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Download, Copy, Send, QrCode } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import { useModal } from "../../context/ModalContext";
import "./MyQr.css";

const generateUserHash = (userId, email, name) => {
  if (!userId || !email) return "";
  const input = `${userId}:${email}:${name || ""}:smartwallet-secure-salt`;
  
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const part1 = (h1 >>> 0).toString(16).padStart(8, '0');
  const part2 = (h2 >>> 0).toString(16).padStart(8, '0');
  
  let h3 = 0x85ebca6b, h4 = 0xc2b2ae35;
  const input2 = part1 + part2 + "extra-salt";
  for (let i = 0; i < input2.length; i++) {
    const ch = input2.charCodeAt(i);
    h3 = Math.imul(h3 ^ ch, 2246822507);
    h4 = Math.imul(h4 ^ ch, 3266489909);
  }
  const part3 = (h3 >>> 0).toString(16).padStart(8, '0');
  const part4 = (h4 >>> 0).toString(16).padStart(8, '0');
  
  return (part1 + part2 + part3 + part4).toLowerCase();
};

export default function MyQr() {
  const { t } = useLanguage();
  const { showAlert } = useModal();
  const qrRef = useRef(null);
  const [copied, setCopied] = useState(false);

  const user = JSON.parse(localStorage.getItem("bw_user") || "null");
  const userHash = generateUserHash(user?.id, user?.email, user?.name);

  const qrPayload = JSON.stringify({
    type: "SMARTWALLET_USER_QR",
    userId: user?.id,
    name: user?.name,
    hash: userHash,
  });

  const downloadQr = () => {
    const canvas = qrRef.current?.querySelector("canvas");
    if (!canvas) return;

    const url = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = url;
    const namePart = user?.name ? user.name.toLowerCase().replace(/\s+/g, "") : "user";
    link.download = `smartwallet-qr-${namePart}-${user?.id || "user"}.png`;
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

          <div className="qr-info-row">
            <span>Security Hash</span>
            <b style={{ fontSize: 10, fontFamily: "monospace", color: "var(--text-secondary)", wordBreak: "break-all", maxWidth: 180, textAlign: "right" }}>{userHash}</b>
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

          <button type="button" className="qr-action-btn" onClick={() => showAlert("Demo: QR scanner form", "info")}>
            <Send size={18} />
            {t.myQr.transfer}
          </button>
        </div>
      </section>
    </div>
  );
}