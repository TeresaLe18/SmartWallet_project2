import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Smartphone } from 'lucide-react';

export default function HeroLeft() {
  return (
    <div className="lg:col-span-1 space-y-8 text-center lg:text-left reveal-up is-visible">
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-slate-200 shadow-sm text-xs font-black uppercase tracking-widest text-red-600">
        <Smartphone className="w-4 h-4" /> Digital Wallet Platform
      </div>

      <div className="space-y-5">
        <h1 className="text-4xl md:text-5xl xl:text-6xl font-black text-slate-950 leading-[1.02]">
          Ví điện tử thông minh cho <span className="text-red-600">quản lý tài chính cá nhân</span>
        </h1>
        <p className="text-lg text-slate-500 font-medium max-w-xl mx-auto lg:mx-0 leading-relaxed">
          Chuyển tiền, thanh toán QR, theo dõi chi tiêu, tạo hũ tiết kiệm và nhận cảnh báo bảo mật trong một nền tảng ví điện tử hiện đại.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
        <Link to="/register" className="ewallet-btn-primary">
          Mở ví miễn phí <ArrowRight className="w-5 h-5" />
        </Link>
        <Link to="/login" className="ewallet-btn-secondary">
          Đăng nhập hệ thống
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-4 max-w-xl mx-auto lg:mx-0 pt-3">
        <div className="ewallet-stat"><b>0đ</b><span>Phí chuyển nội bộ</span></div>
        <div className="ewallet-stat"><b>24/7</b><span>Thanh toán mọi lúc</span></div>
        <div className="ewallet-stat"><b>2FA</b><span>Bảo vệ tài khoản</span></div>
      </div>
    </div>
  );
}
