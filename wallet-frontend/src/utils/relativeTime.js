// Relative "time ago" formatting for news timestamps (VI/EN). No external dependency.
// Returns null for empty/invalid input so callers can fall back to a legacy text field.

const STRINGS = {
  vi: {
    justNow: "Vừa xong",
    minutes: (n) => `${n} phút trước`,
    hours: (n) => `${n} giờ trước`,
    yesterday: "Hôm qua",
    days: (n) => `${n} ngày trước`,
  },
  en: {
    justNow: "Just now",
    minutes: (n) => `${n} minute${n === 1 ? "" : "s"} ago`,
    hours: (n) => `${n} hour${n === 1 ? "" : "s"} ago`,
    yesterday: "Yesterday",
    days: (n) => `${n} day${n === 1 ? "" : "s"} ago`,
  },
};

export function relativeTime(dateInput, lang = "vi") {
  if (!dateInput) return null;
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (Number.isNaN(date.getTime())) return null;

  const s = STRINGS[lang] || STRINGS.vi;
  const sec = Math.floor((Date.now() - date.getTime()) / 1000);

  if (sec < 60) return s.justNow; // also covers small clock skew / future dates
  const min = Math.floor(sec / 60);
  if (min < 60) return s.minutes(min);
  const hour = Math.floor(min / 60);
  if (hour < 24) return s.hours(hour);
  const day = Math.floor(hour / 24);
  if (day === 1) return s.yesterday;
  if (day < 7) return s.days(day);

  // Older than a week: show an absolute date
  return date.toLocaleDateString(lang === "en" ? "en-US" : "vi-VN");
}
