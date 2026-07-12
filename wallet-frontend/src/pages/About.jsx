import { Link } from "react-router-dom";
import {
  Wallet,
  ShieldCheck,
  Send,
  Landmark,
  PiggyBank,
  Gift,
  UserCheck,
  Headphones,
} from "lucide-react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useLanguage } from "../context/LanguageContext";
import "./About.css";

const COPY = {
  en: {
    eyebrow: "About SmartWallet",
    title: "Your digital wallet for everyday money",
    subtitle:
      "SmartWallet is a digital wallet built for modern users — deposit, transfer, pay, save, and track your finances in one secure place.",
    missionTitle: "Our mission",
    mission:
      "We make personal finance simple, transparent, and accessible. Whether you send money to a friend, pay a bill, or build savings goals, SmartWallet helps you move money safely and stay in control of your balance.",
    featuresTitle: "What you can do",
    features: [
      {
        icon: Landmark,
        title: "Deposit & withdraw",
        desc: "Top up from linked banks or withdraw funds back when you need them.",
      },
      {
        icon: Send,
        title: "Transfer & pay",
        desc: "Send money to other SmartWallet users or pay directly to bank accounts.",
      },
      {
        icon: PiggyBank,
        title: "Save & invest",
        desc: "Create savings goals and grow your money with flexible accumulation options.",
      },
      {
        icon: Gift,
        title: "Offers & vouchers",
        desc: "Enjoy exclusive promo codes and rewards on eligible transactions.",
      },
      {
        icon: UserCheck,
        title: "KYC verification",
        desc: "Verify your identity once to unlock higher limits and full wallet features.",
      },
      {
        icon: ShieldCheck,
        title: "Security first",
        desc: "PIN protection, account controls, and wallet freeze options keep your funds safer.",
      },
    ],
    whyTitle: "Why SmartWallet",
    why: [
      "Real-time balance and clear transaction history",
      "Fast transfers between wallets and banks",
      "Built-in notifications for every important action",
      "Friendly support when you need help",
    ],
    ctaTitle: "Ready to get started?",
    ctaSubtitle: "Create an account and manage your money with SmartWallet today.",
    ctaPrimary: "Get started",
    ctaSecondary: "Contact support",
  },
  vi: {
    eyebrow: "Giới thiệu SmartWallet",
    title: "Ví điện tử cho nhu cầu tài chính hàng ngày",
    subtitle:
      "SmartWallet là ví điện tử dành cho người dùng hiện đại — nạp, chuyển, thanh toán, tiết kiệm và theo dõi tài chính trong một nơi an toàn.",
    missionTitle: "Sứ mệnh của chúng tôi",
    mission:
      "Chúng tôi giúp tài chính cá nhân trở nên đơn giản, minh bạch và dễ tiếp cận. Dù bạn chuyển tiền cho bạn bè, thanh toán hóa đơn hay xây dựng mục tiêu tiết kiệm, SmartWallet giúp bạn giao dịch an toàn và kiểm soát số dư dễ dàng.",
    featuresTitle: "Bạn có thể làm gì",
    features: [
      {
        icon: Landmark,
        title: "Nạp & rút tiền",
        desc: "Nạp tiền từ ngân hàng liên kết hoặc rút về tài khoản khi cần.",
      },
      {
        icon: Send,
        title: "Chuyển tiền & thanh toán",
        desc: "Gửi tiền tới người dùng SmartWallet khác hoặc thanh toán về tài khoản ngân hàng.",
      },
      {
        icon: PiggyBank,
        title: "Tiết kiệm & đầu tư",
        desc: "Tạo mục tiêu tích lũy và phát triển số dư với các tùy chọn linh hoạt.",
      },
      {
        icon: Gift,
        title: "Ưu đãi & voucher",
        desc: "Nhận mã khuyến mãi và phần thưởng cho các giao dịch đủ điều kiện.",
      },
      {
        icon: UserCheck,
        title: "Xác thực KYC",
        desc: "Xác minh danh tính một lần để mở hạn mức cao hơn và đầy đủ tính năng ví.",
      },
      {
        icon: ShieldCheck,
        title: "Bảo mật ưu tiên",
        desc: "Mã PIN, kiểm soát tài khoản và đóng băng ví giúp bảo vệ số dư của bạn.",
      },
    ],
    whyTitle: "Vì sao chọn SmartWallet",
    why: [
      "Số dư thời gian thực và lịch sử giao dịch rõ ràng",
      "Chuyển tiền nhanh giữa ví và ngân hàng",
      "Thông báo cho mọi thao tác quan trọng",
      "Hỗ trợ thân thiện khi bạn cần trợ giúp",
    ],
    ctaTitle: "Sẵn sàng bắt đầu?",
    ctaSubtitle: "Tạo tài khoản và quản lý tiền của bạn với SmartWallet ngay hôm nay.",
    ctaPrimary: "Bắt đầu ngay",
    ctaSecondary: "Liên hệ hỗ trợ",
  },
};

export default function About() {
  const { lang } = useLanguage();
  const c = COPY[lang] || COPY.en;
  const isLoggedIn = !!localStorage.getItem("bw_token");

  return (
    <div className="about-page">
      <Navbar />

      <main className="about-main">
        <section className="about-hero">
          <div className="about-hero-icon">
            <Wallet size={28} />
          </div>
          <p className="about-eyebrow">{c.eyebrow}</p>
          <h1 className="about-title">{c.title}</h1>
          <p className="about-subtitle">{c.subtitle}</p>
        </section>

        <section className="about-mission">
          <h2>{c.missionTitle}</h2>
          <p>{c.mission}</p>
        </section>

        <section className="about-features">
          <h2>{c.featuresTitle}</h2>
          <div className="about-feature-grid">
            {c.features.map((f) => {
              const Icon = f.icon;
              return (
                <article key={f.title} className="about-feature-card">
                  <div className="about-feature-icon">
                    <Icon size={20} />
                  </div>
                  <h3>{f.title}</h3>
                  <p>{f.desc}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="about-why">
          <h2>{c.whyTitle}</h2>
          <ul>
            {c.why.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="about-cta">
          <div className="about-cta-icon">
            <Headphones size={22} />
          </div>
          <h2>{c.ctaTitle}</h2>
          <p>{c.ctaSubtitle}</p>
          <div className="about-cta-actions">
            <Link
              to={isLoggedIn ? "/dashboard" : "/register"}
              className="about-btn about-btn-primary"
            >
              {c.ctaPrimary}
            </Link>
            <Link to="/contact" className="about-btn about-btn-secondary">
              {c.ctaSecondary}
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
