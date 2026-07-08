import React from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';

export default function HeroRight({ slides, currentSlide, setCurrentSlide, prevSlide, nextSlide, imgErrors, handleImageError }) {
  return (
    <div className="relative reveal-up is-visible">
      <div className="hero-prev hero-nav-arrow" onClick={prevSlide}>
        <ArrowLeft size={22} />
      </div>
      <div className="hero-next hero-nav-arrow" onClick={nextSlide}>
        <ArrowRight size={22} />
      </div>

      <div className="hero-preview-card ewallet-preview-card group relative w-full">
        {slides.map((slide, idx) => {
          const isActive = currentSlide === idx;
          const hasError = imgErrors[idx];
          return (
            <div
              key={slide.title}
              className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${isActive ? "opacity-100 z-10" : "opacity-0 z-0"}`}
            >
              {!hasError ? (
                <img
                  src={slide.image}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  alt={slide.title}
                />
              ) : null}
              <div className="slide-caption-overlay">
                <p className="text-xs text-red-400 font-black uppercase tracking-widest mb-2">{slide.small}</p>
                <h5 className="text-xl font-black text-white leading-tight">{slide.title}</h5>
                <p className="text-sm text-slate-300 font-semibold mt-2">{slide.desc}</p>
              </div>
            </div>
          );
        })}
        <div className="carousel-indicator-box">
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentSlide(idx)}
              className={`rounded-full transition-all duration-300 ${currentSlide === idx ? "w-7 bg-red-500" : "w-2 bg-white/60"} h-2`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
