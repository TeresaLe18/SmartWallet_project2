import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, Newspaper, Tag, Calendar, Eye, EyeOff, Link as LinkIcon, Upload, ChevronRight, Check, AlertTriangle, ShieldAlert, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { newsAPI } from "../../services/api";
import { useLanguage } from "../../context/LanguageContext";
import { relativeTime } from "../../utils/relativeTime";
import { useNow } from "../../hooks/useNow";

const VI_TAG_PRESETS = ["Kinh tế", "Fintech", "Công nghệ", "Đầu tư", "Thị trường"];
const EN_TAG_PRESETS = ["Economy", "Fintech", "Technology", "Investment", "Markets"];
// Dịch tag bài viết VI -> EN cho cột danh mục (chỉ với tập preset cố định; tag tự do giữ nguyên)
const TAG_VI_TO_EN = Object.fromEntries(VI_TAG_PRESETS.map((vi, i) => [vi, EN_TAG_PRESETS[i]]));

const getFormattedTime = () => {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(now.getHours())}:${pad(now.getMinutes())} ${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`;
};

export default function AdminMedia() {
  const { lang, t } = useLanguage();
  useNow(); // tự re-render mỗi phút để thời gian tương đối luôn cập nhật
  const [posts, setPosts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [editorLanguageTab, setEditorLanguageTab] = useState("vi");
  const [isGenerating, setIsGenerating] = useState(false);

  const [customConfirm, setCustomConfirm] = useState(null); // { message, onConfirm, onCancel, danger }
  const [customAlert, setCustomAlert] = useState(null); // { message, type }

  const showAlert = (message, type = "info") => {
    setCustomAlert({ message, type });
  };

  const showConfirm = (message, onConfirm, onCancel = null, danger = false) => {
    setCustomConfirm({ message, onConfirm, onCancel, danger });
  };
  
  // Expanded form state to support both VI and EN fields
  const [form, setForm] = useState({ 
    title: "", 
    title_en: "",
    tag: "Kinh tế", 
    tag_en: "Economy",
    time: getFormattedTime(), 
    content: "", 
    content_en: "",
    image: "", 
    link: "", 
    active: true 
  });

  const fetchPosts = async () => {
    try {
      const res = await newsAPI.getAdminNews();
      if (res.success) {
        setPosts(res.posts);
      }
    } catch (error) {
      console.error("Failed to fetch admin news:", error);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const openAdd = () => {
    setEditItem(null);
    setEditorLanguageTab("vi");
    setForm({ 
      title: "", 
      title_en: "",
      tag: "Kinh tế", 
      tag_en: "Economy",
      time: getFormattedTime(), 
      content: "", 
      content_en: "",
      image: "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=800&auto=format&fit=crop&q=60", 
      link: "", 
      active: true 
    });
    setShowModal(true);
  };

  const openEdit = (p) => {
    setEditItem(p);
    setEditorLanguageTab("vi");
    setForm({ 
      title: p.title || "", 
      title_en: p.title_en || "", 
      tag: p.tag || "Kinh tế", 
      tag_en: p.tag_en || "Economy", 
      time: p.time || getFormattedTime(), 
      content: p.content || "", 
      content_en: p.content_en || "", 
      image: p.image || "", 
      link: p.link || "", 
      active: p.active 
    });
    setShowModal(true);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setForm(prev => ({ ...prev, image: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAiGenerate = async () => {
    const currentTitle = editorLanguageTab === "vi" ? form.title : form.title_en;
    if (!currentTitle || !currentTitle.trim()) {
      showAlert(t.adminMedia.enterTitleFirst, "error");
      return;
    }
    setIsGenerating(true);
    try {
      const res = await newsAPI.generateAiPost(currentTitle.trim());
      if (res.success && res.data) {
        setForm(p => ({
          ...p,
          title: res.data.title_vi || p.title,
          title_en: res.data.title_en || p.title_en,
          content: res.data.content_vi || p.content,
          content_en: res.data.content_en || p.content_en,
          tag: res.data.tag_vi || p.tag,
          tag_en: res.data.tag_en || p.tag_en
        }));
      } else {
        showAlert(res.message || t.adminMedia.aiGenerateFail, "error");
      }
    } catch (e) {
      console.error("AI Generation error:", e);
      showAlert(e.response?.data?.message || t.adminMedia.aiGenerateError, "error");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!form.title.trim()) return;
    try {
      let res;
      if (editItem) {
        res = await newsAPI.updatePost(editItem.id, form);
      } else {
        res = await newsAPI.createPost(form);
      }
      if (res.success) {
        fetchPosts();
        setShowModal(false);
      }
    } catch (error) {
      console.error("Failed to save post:", error);
      showAlert(error.response?.data?.message || t.adminMedia.saveError, "error");
    }
  };

  const handleDelete = (id) => {
    showConfirm(t.adminMedia.confirmDelete, async () => {
      try {
        const res = await newsAPI.deletePost(id);
        if (res.success) {
          fetchPosts();
        }
      } catch (error) {
        console.error("Failed to delete post:", error);
        showAlert(error.response?.data?.message || t.adminMedia.deleteError, "error");
      }
    }, null, true);
  };

  const toggleActive = async (id) => {
    try {
      const res = await newsAPI.toggleActive(id);
      if (res.success) {
        fetchPosts();
      }
    } catch (error) {
      console.error("Failed to toggle active status:", error);
      showAlert(error.response?.data?.message || t.adminMedia.toggleError, "error");
    }
  };

  return (
    <div style={{ maxWidth: 1000 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 800, marginBottom: 2 }}>{t.adminMedia.title}</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 13 }}>{t.adminMedia.activeCount.replace("{count}", posts.length)}</p>
        </div>
        <button onClick={openAdd} style={{ display: "flex", alignItems: "center", gap: 6, background: "linear-gradient(135deg,#2563eb,#1d4ed8)", color: "white", border: "none", borderRadius: 8, padding: "9px 16px", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
          <Plus size={14} /> {t.adminMedia.newArticle}
        </button>
      </div>

      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "80px 1.5fr 130px 110px 100px 90px", padding: "12px 18px", borderBottom: "1px solid var(--border)", background: "var(--bg-dark)", alignItems: "center" }}>
          {[t.adminMedia.coverImage, t.adminMedia.articleTitle, t.adminMedia.category, t.adminMedia.timestamp, t.adminMedia.visibility, ""].map(h => (
            <span key={h} style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>{h}</span>
          ))}
        </div>

        {posts.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>{t.adminMedia.noArticles}</div>
        ) : (
          posts.map((p, i) => (
            <motion.div key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}
              style={{ display: "grid", gridTemplateColumns: "80px 1.5fr 130px 110px 100px 90px", padding: "14px 18px", borderBottom: "1px solid var(--border)", alignItems: "center" }}>
              <div style={{ width: 50, height: 34, borderRadius: 6, background: "var(--bg-card2)", overflow: "hidden", border: "1px solid var(--border)" }}>
                {p.image ? (
                  <img src={p.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Newspaper size={12} style={{ color: "var(--text-muted)" }} />
                  </div>
                )}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 3, paddingRight: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{p.title}</span>
                {p.link && (
                  <span style={{ fontSize: 10, color: "#2563eb", display: "flex", alignItems: "center", gap: 3 }}>
                    <LinkIcon size={8} /> {t.adminMedia.redirectPrefix} {p.link}
                  </span>
                )}
              </div>
              <span style={{ fontSize: 11, background: "rgba(37,99,235,0.12)", color: "#2563eb", padding: "3px 8px", borderRadius: 6, fontWeight: 600, display: "inline-block", width: "fit-content" }}>
                {lang === "en" ? (TAG_VI_TO_EN[p.tag] || p.tag) : p.tag}
              </span>
              <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{relativeTime(p.created_at, lang) || p.time}</span>
              <button onClick={() => toggleActive(p.id)} style={{
                fontSize: 11, padding: "3px 8px", borderRadius: 6, fontWeight: 600, cursor: "pointer", border: "none", width: "fit-content",
                background: p.active ? "rgba(34,197,94,0.12)" : "rgba(100,116,139,0.12)",
                color: p.active ? "#22c55e" : "#94a3b8"
              }}>
                {p.active ? t.adminMedia.visible : t.adminMedia.hidden}
              </button>
              <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                <button onClick={() => openEdit(p)} style={{ background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius: 6, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--text-secondary)" }}>
                  <Pencil size={12} />
                </button>
                <button onClick={() => handleDelete(p.id)} style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)", borderRadius: 6, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#ef4444" }}>
                  <Trash2 size={12} />
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Expanded Write/Edit Post Modal with side-by-side Live Preview */}
      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowModal(false)}
            style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.3)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={e => e.stopPropagation()}
              style={{ background: "var(--bg-dark)", border: "1px solid #222", borderRadius: 20, padding: 28, width: "100%", maxWidth: 840, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28 }}>
              
              {/* Left Column: Form Editor */}
              <div style={{ borderRight: "1px solid var(--border)", paddingRight: 24 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14, color: "var(--text-primary)" }}>
                  {editItem ? t.adminMedia.editArticle : t.adminMedia.writeNewArticle}
                </h3>
                
                {/* Language Tabs Selector */}
                <div style={{ display: "flex", gap: 8, borderBottom: "1px solid var(--border)", paddingBottom: 10, marginBottom: 14 }}>
                  <button type="button" onClick={() => setEditorLanguageTab("vi")} style={{
                    background: editorLanguageTab === "vi" ? "rgba(37,99,235,0.15)" : "transparent",
                    border: `1px solid ${editorLanguageTab === "vi" ? "rgba(37,99,235,0.3)" : "transparent"}`,
                    color: editorLanguageTab === "vi" ? "#2563eb" : "var(--text-secondary)",
                    padding: "6px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.2s"
                  }}>Tiếng Việt</button>
                  <button type="button" onClick={() => setEditorLanguageTab("en")} style={{
                    background: editorLanguageTab === "en" ? "rgba(37,99,235,0.15)" : "transparent",
                    border: `1px solid ${editorLanguageTab === "en" ? "rgba(37,99,235,0.3)" : "transparent"}`,
                    color: editorLanguageTab === "en" ? "#2563eb" : "var(--text-secondary)",
                    padding: "6px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.2s"
                  }}>English</button>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {/* Title & AI Generation */}
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <label style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                        {editorLanguageTab === "vi" ? t.adminMedia.titleVi : t.adminMedia.titleEn}
                      </label>
                      <button type="button" onClick={handleAiGenerate} disabled={isGenerating} style={{
                        background: "linear-gradient(135deg, #a855f7, #6366f1)",
                        color: "white", border: "none", borderRadius: 6, padding: "4px 10px",
                        fontSize: 11, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
                        boxShadow: "0 2px 8px rgba(139, 92, 246, 0.3)", opacity: isGenerating ? 0.7 : 1, transition: "all 0.2s"
                      }}>
                        {isGenerating ? t.adminMedia.aiWriting : t.adminMedia.aiGenerate}
                      </button>
                    </div>
                    {editorLanguageTab === "vi" ? (
                      <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder={t.adminMedia.titlePlaceholderVi}
                        style={{ width: "100%", background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 12px", color: "var(--text-primary)", fontSize: 13, outline: "none" }} />
                    ) : (
                      <input value={form.title_en} onChange={e => setForm(p => ({ ...p, title_en: e.target.value }))} placeholder={t.adminMedia.titlePlaceholderEn}
                        style={{ width: "100%", background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 12px", color: "var(--text-primary)", fontSize: 13, outline: "none" }} />
                    )}
                  </div>

                  {/* Category */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
                    <div>
                      <label style={{ fontSize: 12, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>
                        {t.adminMedia.category}
                      </label>
                      {editorLanguageTab === "vi" ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          <select 
                            value={VI_TAG_PRESETS.includes(form.tag) ? form.tag : t.adminMedia.otherOption}
                            onChange={e => {
                              const val = e.target.value;
                              if (val === "Khác..." || val === "Other...") {
                                setForm(p => ({ ...p, tag: "" }));
                              } else {
                                setForm(p => ({ ...p, tag: val }));
                              }
                            }}
                            style={{ width: "100%", background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 12px", color: "var(--text-primary)", fontSize: 13, outline: "none" }}
                          >
                            {VI_TAG_PRESETS.map(tag => (
                              <option key={tag} value={tag}>{tag}</option>
                            ))}
                            <option value={t.adminMedia.otherOption}>{t.adminMedia.otherOption}</option>
                          </select>
                          {!VI_TAG_PRESETS.includes(form.tag) && (
                            <input 
                              value={form.tag} 
                              onChange={e => setForm(p => ({ ...p, tag: e.target.value }))} 
                              placeholder={t.adminMedia.customCategoryPlaceholder}
                              style={{ width: "100%", background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 12px", color: "var(--text-primary)", fontSize: 13, outline: "none" }}
                            />
                          )}
                        </div>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          <select 
                            value={EN_TAG_PRESETS.includes(form.tag_en) ? form.tag_en : t.adminMedia.otherOption}
                            onChange={e => {
                              const val = e.target.value;
                              if (val === "Khác..." || val === "Other...") {
                                setForm(p => ({ ...p, tag_en: "" }));
                              } else {
                                setForm(p => ({ ...p, tag_en: val }));
                              }
                            }}
                            style={{ width: "100%", background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 12px", color: "var(--text-primary)", fontSize: 13, outline: "none" }}
                          >
                            {EN_TAG_PRESETS.map(tag => (
                              <option key={tag} value={tag}>{tag}</option>
                            ))}
                            <option value={t.adminMedia.otherOption}>{t.adminMedia.otherOption}</option>
                          </select>
                          {!EN_TAG_PRESETS.includes(form.tag_en) && (
                            <input 
                              value={form.tag_en} 
                              onChange={e => setForm(p => ({ ...p, tag_en: e.target.value }))} 
                              placeholder={t.adminMedia.customCategoryPlaceholder}
                              style={{ width: "100%", background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 12px", color: "var(--text-primary)", fontSize: 13, outline: "none" }}
                            />
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Image */}
                  <div>
                    <label style={{ fontSize: 12, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>{t.adminMedia.image}</label>
                    <div style={{ display: "flex", gap: 10 }}>
                      <input value={form.image} onChange={e => setForm(p => ({ ...p, image: e.target.value }))} placeholder={t.adminMedia.imagePlaceholder}
                        style={{ flex: 1, background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 12px", color: "var(--text-primary)", fontSize: 13, outline: "none" }} />
                      <label style={{ background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 14px", color: "var(--text-secondary)", cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
                        <Upload size={14} /> {t.adminMedia.upload}
                        <input type="file" accept="image/*" style={{ display: "none" }} onChange={handleImageUpload} />
                      </label>
                    </div>
                  </div>

                  {/* Redirect Link */}
                  <div>
                    <label style={{ fontSize: 12, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>{t.adminMedia.redirectLink}</label>
                    <input value={form.link} onChange={e => setForm(p => ({ ...p, link: e.target.value }))} placeholder={t.adminMedia.redirectDesc}
                      style={{ width: "100%", background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 12px", color: "var(--text-primary)", fontSize: 13, outline: "none" }} />
                  </div>

                  {/* Content Body */}
                  <div>
                    <label style={{ fontSize: 12, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>
                      {editorLanguageTab === "vi" ? t.adminMedia.contentVi : t.adminMedia.contentEn}
                    </label>
                    {editorLanguageTab === "vi" ? (
                      <textarea value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} placeholder={t.adminMedia.writeViPlaceholder} rows={4}
                        style={{ width: "100%", background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 12px", color: "var(--text-primary)", fontSize: 13, outline: "none", resize: "none", lineHeight: 1.5 }} />
                    ) : (
                      <textarea value={form.content_en} onChange={e => setForm(p => ({ ...p, content_en: e.target.value }))} placeholder={t.adminMedia.writeEnPlaceholder} rows={4}
                        style={{ width: "100%", background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 12px", color: "var(--text-primary)", fontSize: 13, outline: "none", resize: "none", lineHeight: 1.5 }} />
                    )}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
                  <button onClick={() => setShowModal(false)} style={{ flex: 1, background: "var(--bg-card2)", border: "1px solid var(--border)", color: "var(--text-secondary)", borderRadius: 8, padding: "11px", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>{t.adminMedia.cancel}</button>
                  <button onClick={handleSave} style={{ flex: 2, background: "linear-gradient(135deg,#2563eb,#1d4ed8)", color: "white", border: "none", borderRadius: 8, padding: "11px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                    {editItem ? t.adminMedia.update : t.adminMedia.publish}
                  </button>
                </div>
              </div>

              {/* Right Column: Real-time Live Preview */}
              <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 18 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 8px #22c55e" }} />
                    <h3 style={{ fontSize: 13, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>{t.adminMedia.previewTitle} ({editorLanguageTab.toUpperCase()})</h3>
                  </div>

                  {/* Dynamic user news card simulation */}
                  <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden", boxShadow: "0 10px 30px rgba(0,0,0,0.5)" }}>
                    {/* Simulated image header */}
                    <div style={{ height: 140, background: "var(--bg-card2)", position: "relative", overflow: "hidden" }}>
                      {form.image ? (
                        <img src={form.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <Newspaper size={32} style={{ color: "#2a2a2a" }} />
                        </div>
                      )}
                      <span style={{ position: "absolute", top: 12, left: 12, fontSize: 10, background: "rgba(37,99,235,0.85)", backdropFilter: "blur(4px)", color: "#ffffff", padding: "3px 10px", borderRadius: 6, fontWeight: 700 }}>
                        {editorLanguageTab === "vi" ? form.tag : form.tag_en}
                      </span>
                    </div>

                    {/* Simulated card content */}
                    <div style={{ padding: 18 }}>
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                        <h4 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.4, margin: 0 }}>
                          {(editorLanguageTab === "vi" ? form.title : form.title_en) || t.adminMedia.titleSampleFallback}
                        </h4>
                        <ChevronRight size={16} style={{ color: "var(--text-muted)", flexShrink: 0, marginTop: 2 }} />
                      </div>
                      <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}>{relativeTime(editItem?.created_at || Date.now(), lang)}</p>
                      
                      {/* Short simulated body copy */}
                      <p style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 10, lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                        {(editorLanguageTab === "vi" ? form.content : form.content_en) || t.adminMedia.previewPlaceholder}
                      </p>
                    </div>
                  </div>
                </div>

                <div style={{ background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.08)", borderRadius: 10, padding: 14 }}>
                  <p style={{ fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                    📝 <strong style={{ color: "var(--text-secondary)" }}>{t.adminMedia.tipLabel}</strong> {t.adminMedia.tipText}
                  </p>
                </div>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CUSTOM CONFIRMATION & ALERT MODAL */}
      <AnimatePresence>
        {customConfirm && (
          <div style={{
            position: "fixed", inset: 0, zIndex: 10000,
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 20, background: "rgba(15, 23, 42, 0.4)", backdropFilter: "blur(4px)"
          }}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              style={{
                background: "var(--bg-card)", border: "1px solid var(--border)",
                borderRadius: 20, padding: 24, maxWidth: 400, width: "100%",
                boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)", position: "relative",
                color: "var(--text-primary)"
              }}
            >
              <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                <AlertTriangle size={20} style={{ color: "#ef4444" }} />
                {t.adminMedia.confirmDeleteTitle}
              </h3>
              <p style={{ fontSize: 13, lineHeight: 1.5, color: "var(--text-secondary)", marginBottom: 20, whiteSpace: "pre-line" }}>
                {customConfirm.message}
              </p>
              <div style={{ display: "flex", gap: 12 }}>
                <button
                  onClick={() => {
                    customConfirm.onCancel?.();
                    setCustomConfirm(null);
                  }}
                  style={{
                    flex: 1, padding: 10, borderRadius: 10, fontSize: 12,
                    background: "var(--bg-card2)", border: "1px solid var(--border)",
                    color: "var(--text-secondary)", cursor: "pointer"
                  }}
                >
                  {t.adminMedia.cancel}
                </button>
                <button
                  onClick={() => {
                    customConfirm.onConfirm();
                    setCustomConfirm(null);
                  }}
                  style={{
                    flex: 1, padding: 10, borderRadius: 10, fontSize: 12, border: "none",
                    background: "#ef4444", color: "white", cursor: "pointer", fontWeight: 700
                  }}
                >
                  {t.adminMedia.deleteLabel}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {customAlert && (
          <div style={{
            position: "fixed", inset: 0, zIndex: 10000,
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 20, background: "rgba(15, 23, 42, 0.4)", backdropFilter: "blur(4px)"
          }}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              style={{
                background: "var(--bg-card)", border: "1px solid var(--border)",
                borderRadius: 20, padding: 24, maxWidth: 400, width: "100%",
                boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)", position: "relative",
                color: "var(--text-primary)"
              }}
            >
              <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                {customAlert.type === "error" ? (
                  <X size={20} style={{ color: "#ef4444", background: "rgba(239,68,68,0.1)", borderRadius: "50%", padding: 2 }} />
                ) : customAlert.type === "success" ? (
                  <Check size={20} style={{ color: "#22c55e", background: "rgba(34,197,94,0.1)", borderRadius: "50%", padding: 2 }} />
                ) : (
                  <ShieldAlert size={20} style={{ color: "var(--primary)" }} />
                )}
                {customAlert.type === "error" ? t.adminMedia.errorAlertTitle : t.adminMedia.notificationTitle}
              </h3>
              <p style={{ fontSize: 13, lineHeight: 1.5, color: "var(--text-secondary)", marginBottom: 20 }}>
                {customAlert.message}
              </p>
              <button
                onClick={() => setCustomAlert(null)}
                style={{
                  width: "100%", padding: 10, borderRadius: 10, fontSize: 12, border: "none",
                  background: "var(--primary)", color: "white", cursor: "pointer", fontWeight: 700
                }}
              >
                {t.adminMedia.close}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
