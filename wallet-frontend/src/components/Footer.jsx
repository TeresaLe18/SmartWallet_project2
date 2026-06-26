import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Users, Mail, MapPin } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";

export default function Footer() {
  const { t, lang } = useLanguage();
  const [clockText, setClockText] = useState("");

  // Live clock
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit' 
      };
      setClockText(now.toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-US', options));
    };
    updateClock();
    const clockTimer = setInterval(updateClock, 1000);
    return () => clearInterval(clockTimer);
  }, [lang]);

  return (
    <footer className="w-full bg-slate-900 text-slate-300 pt-16 pb-8 z-10 relative flex flex-col items-center">
      <div className="w-full max-w-5xl px-6 grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Contact US */}
        <div className="space-y-4">
          <h5 className="text-sm font-bold uppercase tracking-wider text-red-500">{t.footer.contactUs}</h5>
          <ul className="space-y-4 text-sm">
            <li className="flex items-start gap-3">
              <Users className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="text-white">{t.footer.devTeam}</strong>
                <ul className="mt-1.5 space-y-1 text-slate-300 pl-4 list-disc">
                  {t.footer.devs && t.footer.devs.map((dev, index) => (
                    <li key={index} className="text-slate-300">{dev}</li>
                  ))}
                </ul>
              </div>
            </li>
            <li className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-red-500 flex-shrink-0" />
              <a href="mailto:group4@fpt.edu.vn" className="text-slate-200 hover:text-white transition-colors font-semibold">
                group4@fpt.edu.vn
              </a>
            </li>
            <li className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <span className="text-slate-300 font-medium">
                FPT Software Academy, Ho Chi Minh City
              </span>
            </li>
          </ul>
        </div>

        {/* Our Services */}
        <div className="space-y-4 md:pl-12">
          <h5 className="text-sm font-bold uppercase tracking-wider text-red-500">{t.footer.ourServices}</h5>
          <ul className="space-y-3 text-sm font-bold">
            <li><Link to="/shop" className="text-slate-300 hover:text-white transition-colors">{t.footer.shop}</Link></li>
            <li><Link to="/food" className="text-slate-300 hover:text-white transition-colors">{t.footer.food}</Link></li>
            <li><Link to="/dashboard" className="text-slate-300 hover:text-white transition-colors">{t.footer.reports}</Link></li>
            <li><a href="#" className="text-slate-300 hover:text-white transition-colors">{t.footer.qr}</a></li>
          </ul>
        </div>

        {/* Embedded Map */}
        <div className="space-y-4 w-full">
          <h5 className="text-sm font-bold uppercase tracking-wider text-red-500">{t.footer.map}</h5>
          <div className="aspect-[16/9] rounded-2xl overflow-hidden border border-slate-800 shadow-md">
            <iframe 
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3918.443661450942!2d106.6252445758832!3d10.8538210577626!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x317529de26c36777%3A0xc3f1737e89a544d0!2zRlBUIEFwdGVjaCBIQ00!5e0!3m2!1svi!2s!4v1715150000000!5m2!1svi!2s" 
              className="w-full h-full border-0"
              allowFullScreen="" 
              loading="lazy"
              title="FPT Aptech Map"
            />
          </div>
        </div>

      </div>

      <hr className="w-full max-w-5xl border-slate-800 my-8 px-6" />

      {/* Footer bottom */}
      <div className="w-full max-w-5xl px-6 flex flex-col md:flex-row items-center justify-between gap-6 text-sm">
        <div className="text-center md:text-left">
          <p className="text-slate-300">© 2026 <strong className="text-white font-bold">{t.footer.ecosystem}</strong>. {t.footer.academicProject}.</p>
          <p className="text-xs text-red-400 font-mono mt-1.5" id="clock">{clockText}</p>
        </div>

        <div className="flex items-center gap-4">
          <a href="#" className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-red-600 hover:text-white flex items-center justify-center transition-colors">
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M9 8H7v3h2v9h3v-9h3.6l.4-3H12V6c0-.9.2-1.2 1-1.2h2V2h-3c-2.5 0-4 1.2-4 3.8V8z"/></svg>
          </a>
          <a href="#" className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-red-600 hover:text-white flex items-center justify-center transition-colors">
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.577.688.479C19.138 20.161 22 16.418 22 12c0-5.523-4.477-10-10-10z"/></svg>
          </a>
          <a href="#" className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-red-650 hover:text-white flex items-center justify-center transition-colors">
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.779-1.75-1.75s.784-1.75 1.75-1.75 1.75.779 1.75 1.75-.784 1.75-1.75 1.75zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
          </a>
          <a href="#" className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-red-650 hover:text-white flex items-center justify-center transition-colors">
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M23.498 6.163a3.003 3.003 0 00-2.11-2.11C19.518 3.545 12 3.545 12 3.545s-7.518 0-9.388.508a3.003 3.003 0 00-2.11 2.11C0 8.033 0 12 0 12s0 3.967.502 5.837a3.003 3.003 0 002.11 2.11c1.87.508 9.388.508 9.388.508s7.518 0 9.388-.508a3.003 3.003 0 002.11-2.11C24 15.967 24 12 24 12s0-3.967-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
          </a>
        </div>
      </div>
    </footer>
  );
}
