import React from "react";
import { Wallet } from "lucide-react";
import "../pages/Index.css";

export default function FullAdBanner() {
  return (
    <section className="full-ad-banner">
      <div className="full-ad-content">
        <Wallet className="ad-icon" />
        <h3>Ưu đãi đặc biệt</h3>
        <p>Nhận ngay 50.000đ khi nạp lần đầu – Chương trình chỉ có trong 7 ngày tới!</p>
        <a href="/register" className="ad-cta">Mở ví ngay</a>
      </div>
    </section>
  );
}
