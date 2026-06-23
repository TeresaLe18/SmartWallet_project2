import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Percent, Ticket, TrendingUp, Clock, ArrowUpRight, X } from "lucide-react";

import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import useLandingAnimation from "../hooks/useLandingAnimation";
import "./Index.css";

import { useLanguage } from "../context/LanguageContext";

const initialCards = [
  {
    id: 1,
    title: "💳 Deposit",
    desc: "Nạp tiền nhanh chóng từ ngân hàng vào ví.",
    img: `url("https://images.unsplash.com/photo-1556740749-887f6717d7e4?w=800")`,
  },
  {
    id: 2,
    title: "💸 Transfer",
    desc: "Chuyển tiền an toàn và tức thì.",
    img: `url("https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=800")`,
  },
  {
    id: 3,
    title: "🎁 Offers & Vouchers",
    desc: "Ưu đãi độc quyền dành cho người dùng SmartWallet.",
    img: `url("https://images.unsplash.com/photo-1607082350899-7e105aa886ae?w=800")`,
  },
  {
    id: 4,
    title: "📈 Investment",
    desc: "Đầu tư thông minh với các gói tài chính linh hoạt.",
    img: `url("https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800")`,
  },
];

const fallbackOffers = [
  {
    id: 1,
    title: "Giảm 20% phí giao dịch",
    percent: 20,
    code: "SMART20",
    description: "Áp dụng cho chuyển tiền và thanh toán QR.",
  },
  {
    id: 2,
    title: "Voucher nạp ví",
    percent: 15,
    code: "TOPUP15",
    description: "Nhận ưu đãi khi nạp ví lần đầu.",
  },
  {
    id: 3,
    title: "Hoàn tiền QR",
    percent: 10,
    code: "QR10",
    description: "Hoàn tiền khi thanh toán QR tại cửa hàng.",
  },
];

const fallbackNews = [
  {
    id: "fallback-1",
    title: "SmartWallet cập nhật bảo mật giao dịch thời gian thực",
    tag: "Tài chính số",
    time: "Vừa xong",
    image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80",
    content:
      "Theo dõi biến động số dư, cảnh báo giao dịch và bảo vệ ví điện tử với trải nghiệm nhanh, rõ ràng hơn cho người dùng SmartWallet.",
  },
  {
    id: "fallback-2",
    title: "Ưu đãi phí chuyển tiền cho người dùng mới",
    tag: "Ưu đãi",
    time: "Hôm nay",
    image: "https://images.unsplash.com/photo-1563013544-824ae1b704d3?auto=format&fit=crop&w=900&q=80",
    content: "Các chương trình voucher mới giúp người dùng tiết kiệm chi phí khi chuyển tiền, nạp ví và thanh toán QR.",
  },
  {
    id: "fallback-3",
    title: "Quản lý chi tiêu cá nhân bằng biểu đồ thông minh",
    tag: "Quản lý tiền",
    time: "1 ngày trước",
    image: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=900&q=80",
    content: "SmartWallet giúp phân loại dòng tiền, thống kê thu chi và hỗ trợ người dùng đưa ra quyết định tài chính tốt hơn.",
  },
];

const features = [
  {
    icon: "🛂",
    title: "Passport Application",
    desc: "Clean card movement, hover depth and soft glass-like feeling.",
  },
  {
    icon: "✈️",
    title: "Travel Consulting",
    desc: "Animated layout with staggered reveal and responsive spacing.",
  },
  {
    icon: "📄",
    title: "Visa Processing",
    desc: "Modern dark blue and pink theme with smooth transitions.",
  },
];

export default function Index() {
  useLandingAnimation();

  const { t } = useLanguage();
  const [cards, setCards] = useState(initialCards);
  const [offers, setOffers] = useState(fallbackOffers);
  const [activeOffer, setActiveOffer] = useState(0);
  const [news, setNews] = useState(fallbackNews);
  const [selectedNews, setSelectedNews] = useState(null);

  useEffect(() => {
    const fetchOffers = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/offers");
        if (!res.ok) throw new Error("Cannot load offers");

        const data = await res.json();
        const nextOffers = data.offers || data || [];

        if (Array.isArray(nextOffers) && nextOffers.length > 0) {
          setOffers(nextOffers);
          setActiveOffer(0);
        }
      } catch (error) {
        console.error("Load offers failed:", error);
      }
    };

    fetchOffers();
  }, []);


  useEffect(() => {
    const fetchNews = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/news");
        if (!res.ok) throw new Error("Cannot load news");

        const data = await res.json();
        const nextNews = data.posts || data.news || data || [];

        if (Array.isArray(nextNews) && nextNews.length > 0) {
          setNews(nextNews);
        }
      } catch (error) {
        console.error("Load news failed:", error);
      }
    };

    fetchNews();
  }, []);

  useEffect(() => {
    if (!offers.length) return;

    const timer = setInterval(() => {
      setActiveOffer((prev) => (prev + 1) % offers.length);
    }, 3000);

    return () => clearInterval(timer);
  }, [offers.length]);

  const nextSlide = () => {
    setCards((prev) => [...prev.slice(1), prev[0]]);
  };

  const prevSlide = () => {
    setCards((prev) => [prev[prev.length - 1], ...prev.slice(0, -1)]);
  };

  const featuredNews = news[0];
  const sideNews = news.slice(1, 5);

  const openNews = (item) => {
    if (item.link) {
      window.open(item.link, "_blank", "noopener,noreferrer");
      return;
    }

    setSelectedNews(item);
  };

  const shortText = (text = "", max = 120) =>
    text.length > max ? `${text.slice(0, max).trim()}...` : text;

  const translatedCards = cards.map((card, index) => ({
    ...card,
    title: t.cards[index]?.title || card.title,
    desc: t.cards[index]?.desc || card.desc,
  }));

  const translatedFeatures = features.map((feature, index) => ({
    ...feature,
    title: t.features[index]?.title || feature.title,
    desc: t.features[index]?.desc || feature.desc,
  }));

  const getOfferTitle = (item, index) => t.offers[index]?.title || item.title;
  const getOfferDescription = (item, index) =>
    t.offers[index]?.description || item.description;

  const getNewsTitle = (item, index) => t.news[index]?.title || item.title;
  const getNewsTag = (item, index) => t.news[index]?.tag || item.tag;
  const getNewsTime = (item, index) => t.news[index]?.time || item.time;
  const getNewsContent = (item, index) => t.news[index]?.content || item.content;

  return (
    <>
      <div className="preloader">
        <div className="loader" />
      </div>

      <Navbar />

      <main>
        <section className="hero">
          <div className="top-shape" />
          <div className="blob one" />
          <div className="blob two" />

          <div className="hero-grid">
            <div className="reveal">
              <div className="eyebrow">{t.index.eyebrow}</div>

              <h1>
                {t.index.heroTitle1} <span>{t.index.heroTitle2}</span>{" "}
                {t.index.heroTitle3}
              </h1>

              <p className="lead">{t.index.heroLead}</p>

              <div className="hero-buttons">
                <Link className="btn btn-primary" to="/register">
                  {t.index.getStarted}
                </Link>

                <a className="btn btn-dark" href="#services">
                  {t.index.ourServices}
                </a>
              </div>
            </div>

            <div className="hero-card reveal">
              <div className="hero-card-glow" />

              <div className="hero-offer-slider">
                <div
                  className="hero-offer-track"
                  style={{
                    transform: `translateX(-${activeOffer * 100}%)`,
                  }}
                >
                  {offers.map((item, index) => (
                    <div className="hero-offer-slide" key={item.id || index}>
                      <div className="offer-top">
                        <span>{t.index.offerPrefix}{index + 1}</span>
                        <b>{offers.length} {t.index.offersCount}</b>
                      </div>

                      <div className="offer-badge">
                        <Percent size={34} />
                        <strong>{item.percent || item.discount || 0}%</strong>
                      </div>

                      <div className="offer-content">
                        <span>{t.index.offerRunning}</span>
                        <h5>{getOfferTitle(item, index)}</h5>
                        <p>{getOfferDescription(item, index)}</p>

                        <div className="offer-code">
                          <Ticket size={18} />
                          <b>{item.code || "SMARTWALLET"}</b>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="offer-dots">
                  {offers.map((_, index) => (
                    <button
                      key={index}
                      type="button"
                      className={index === activeOffer ? "active" : ""}
                      onClick={() => setActiveOffer(index)}
                      aria-label={`Offer ${index + 1}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="section" id="training">
          <div className="section-title reveal">
            <h2>{t.index.serviceTitle}</h2>

            <div className="slider-controls">
              <button
                className="arrow"
                type="button"
                onClick={prevSlide}
                aria-label="Previous card"
              >
                ‹
              </button>

              <button
                className="arrow"
                type="button"
                onClick={nextSlide}
                aria-label="Next card"
              >
                ›
              </button>
            </div>
          </div>

          <div className="cards">
            {translatedCards.map((card) => (
              <article
                className="card"
                key={card.id}
                style={{ "--img": card.img }}
              >
                <div className="photo" />
                <span className="num">{card.id}</span>

                <div className="content">
                  <h3>{card.title}</h3>
                  <p>{card.desc}</p>
                </div>
              </article>
            ))}
          </div>
        </section>


        <section className="section finance-news-section" id="news">
          <div className="finance-news-head reveal">
            <div>
              <div className="eyebrow news-eyebrow">{t.index.newsEyebrow}</div>
              <h2>{t.index.newsTitle}</h2>
              <p>{t.index.newsDesc}</p>
            </div>

            <Link className="news-view-all" to="/news">
              {t.index.viewAll}
              <ArrowUpRight size={18} />
            </Link>
          </div>

          {featuredNews && (
            <div className="finance-news-layout reveal">
              <button
                className="finance-featured-news"
                type="button"
                onClick={() => openNews(featuredNews)}
              >
                <div className="featured-news-image-wrap">
                  {featuredNews.image ? (
                    <img src={featuredNews.image} alt={featuredNews.title} />
                  ) : (
                    <div className="news-image-fallback">SW</div>
                  )}

                  <div className="market-chip">
                    <TrendingUp size={16} />
                    {t.index.marketUpdate}
                  </div>
                </div>

                <div className="featured-news-body">
                  <div className="news-meta">
                    <span>{getNewsTag(featuredNews, 0) || t.index.finance}</span>
                    <small>
                      <Clock size={14} />
                      {getNewsTime(featuredNews, 0) || t.index.justNow}
                    </small>
                  </div>

                  <h3>{getNewsTitle(featuredNews, 0)}</h3>
                  <p>{shortText(getNewsContent(featuredNews, 0), 180)}</p>

                  <div className="news-read-more">
                    {t.index.readPost}
                    <ArrowUpRight size={18} />
                  </div>
                </div>
              </button>

              <div className="finance-news-list">
                {sideNews.map((item, index) => (
                  <button
                    className="finance-news-item"
                    key={item.id}
                    type="button"
                    onClick={() => openNews(item)}
                  >
                    <div className="mini-news-image">
                      {item.image ? (
                        <img src={item.image} alt={item.title} />
                      ) : (
                        <span>SW</span>
                      )}
                    </div>

                    <div>
                      <div className="news-meta compact">
                        <span>{getNewsTag(item, index + 1) || "SmartWallet"}</span>
                        <small>{getNewsTime(item, index + 1) || t.index.newText}</small>
                      </div>

                      <h4>{getNewsTitle(item, index + 1)}</h4>
                      <p>{shortText(getNewsContent(item, index + 1), 90)}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        {selectedNews && (
          <div
            className="news-modal-backdrop"
            onClick={() => setSelectedNews(null)}
            role="presentation"
          >
            <article
              className="news-modal"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                className="news-modal-close"
                type="button"
                onClick={() => setSelectedNews(null)}
                aria-label={t.index.closeNews}
              >
                <X size={20} />
              </button>

              {selectedNews.image && (
                <img
                  className="news-modal-image"
                  src={selectedNews.image}
                  alt={selectedNews.title}
                />
              )}

              <div className="news-modal-content">
                <div className="news-meta">
                  <span>{selectedNews.tag || t.index.finance}</span>
                  <small>{selectedNews.time || t.index.justNow}</small>
                </div>

                <h3>{selectedNews.title}</h3>
                <p>{selectedNews.content}</p>
              </div>
            </article>
          </div>
        )}

        <section className="section features" id="services">
          <div className="section-title reveal">
            <h2>{t.index.featureTitle}</h2>
          </div>

          <div className="feature-grid">
            {translatedFeatures.map((feature) => (
              <div className="feature" key={feature.title}>
                <div className="ico">{feature.icon}</div>
                <h3>{feature.title}</h3>
                <p>{feature.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
