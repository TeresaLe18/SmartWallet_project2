import { Link } from "react-router-dom";
import { Mail, Phone, MapPin, Clock, Headphones, Users } from "lucide-react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useLanguage } from "../context/LanguageContext";
import "./Contact.css";

const CONTACT = {
  email: "group4@fpt.edu.vn",
  supportEmail: "support@smartwallet.com",
  phone: "+84 28 7300 8866",
  phoneHref: "tel:+842873008866",
  mapEmbed:
    "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3918.443661450942!2d106.6252445758832!3d10.8538210577626!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x317529de26c36777%3A0xc3f1737e89a544d0!2zRlBUIEFwdGVjaCBIQ00!5e0!3m2!1svi!2s!4v1715150000000!5m2!1svi!2s",
};

export default function Contact() {
  const { t, lang } = useLanguage();
  const c = t.contact;
  const isLoggedIn = !!localStorage.getItem("bw_token");

  const cards = [
    {
      icon: Mail,
      label: c.emailLabel,
      desc: c.emailDesc,
      value: CONTACT.email,
      href: `mailto:${CONTACT.email}`,
    },
    {
      icon: Mail,
      label: c.supportEmailLabel,
      desc: c.supportEmailDesc,
      value: CONTACT.supportEmail,
      href: `mailto:${CONTACT.supportEmail}`,
    },
    {
      icon: Phone,
      label: c.phoneLabel,
      desc: c.phoneDesc,
      value: CONTACT.phone,
      href: CONTACT.phoneHref,
    },
    {
      icon: MapPin,
      label: c.addressLabel,
      desc: null,
      value: c.addressValue,
      href: null,
    },
    {
      icon: Clock,
      label: c.hoursLabel,
      desc: null,
      value: c.hoursValue,
      href: null,
      multiline: true,
    },
  ];

  return (
    <div className="contact-page">
      <Navbar />

      <main className="contact-main">
        <section className="contact-hero">
          <p className="contact-eyebrow">{c.eyebrow}</p>
          <h1 className="contact-title">{c.title}</h1>
          <p className="contact-subtitle">{c.subtitle}</p>
        </section>

        <section className="contact-grid">
          {cards.map((card) => {
            const Icon = card.icon;
            const inner = (
              <>
                <div className="contact-card-icon">
                  <Icon size={22} />
                </div>
                <div>
                  <p className="contact-card-label">{card.label}</p>
                  {card.desc && <p className="contact-card-desc">{card.desc}</p>}
                  <p className={`contact-card-value ${card.multiline ? "multiline" : ""}`}>{card.value}</p>
                </div>
              </>
            );

            return card.href ? (
              <a key={card.label} href={card.href} className="contact-card contact-card-link">
                {inner}
              </a>
            ) : (
              <div key={card.label} className="contact-card">
                {inner}
              </div>
            );
          })}
        </section>

        <section className="contact-bottom">
          <div className="contact-panel support-panel">
            <div className="contact-panel-icon">
              <Headphones size={28} />
            </div>
            <div>
              <h2>{c.liveSupport}</h2>
              <p>{c.liveSupportDesc}</p>
              <Link
                to={isLoggedIn ? "/dashboard/support" : "/login"}
                className="contact-cta-btn"
              >
                {isLoggedIn ? c.openSupport : c.loginToSupport}
              </Link>
            </div>
          </div>

          <div className="contact-panel team-panel">
            <div className="contact-panel-icon team">
              <Users size={28} />
            </div>
            <div>
              <h2>{c.teamTitle}</h2>
              <p className="contact-team-desc">{c.teamDesc}</p>
              <ul className="contact-team-list">
                {t.footer.devs?.map((name) => (
                  <li key={name}>{name}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="contact-map-section">
          <h2 className="contact-map-title">{c.mapTitle}</h2>
          <div className="contact-map-wrap">
            <iframe
              src={CONTACT.mapEmbed}
              title={lang === "vi" ? "Bản đồ FPT Aptech HCM" : "FPT Aptech HCM map"}
              loading="lazy"
              allowFullScreen
            />
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
