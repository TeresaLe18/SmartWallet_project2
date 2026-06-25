import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, Newspaper, Tag, Calendar, Eye, EyeOff, Link as LinkIcon, Upload, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { newsAPI } from "../../services/api";

export default function AdminMedia() {
  const [posts, setPosts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [editorLanguageTab, setEditorLanguageTab] = useState("vi");
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Expanded form state to support both VI and EN fields
  const [form, setForm] = useState({ 
    title: "", 
    title_en: "",
    tag: "Kinh tế", 
    tag_en: "Economy",
    time: "Just now", 
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
      time: "Just now", 
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
      time: p.time || "Just now", 
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
      alert(editorLanguageTab === "vi" ? "Vui lòng nhập tiêu đề trước khi tự động tạo bài viết!" : "Please enter a title first!");
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
        alert(res.message || "Failed to generate article content.");
      }
    } catch (e) {
      console.error("AI Generation error:", e);
      alert(e.response?.data?.message || "An error occurred during AI article generation.");
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
      alert(error.response?.data?.message || "Unable to save article. Please try again.");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this article?")) return;
    try {
      const res = await newsAPI.deletePost(id);
      if (res.success) {
        fetchPosts();
      }
    } catch (error) {
      console.error("Failed to delete post:", error);
      alert(error.response?.data?.message || "Unable to delete article. Please try again.");
    }
  };

  const toggleActive = async (id) => {
    try {
      const res = await newsAPI.toggleActive(id);
      if (res.success) {
        fetchPosts();
      }
    } catch (error) {
      console.error("Failed to toggle active status:", error);
      alert(error.response?.data?.message || "Unable to toggle article visibility. Please try again.");
    }
  };

  return (
    <div style={{ maxWidth: 1000 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 800, marginBottom: 2 }}>Article Management</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 13 }}>{posts.length} financial news articles active</p>
        </div>
        <button onClick={openAdd} style={{ display: "flex", alignItems: "center", gap: 6, background: "linear-gradient(135deg,#2563eb,#1d4ed8)", color: "white", border: "none", borderRadius: 8, padding: "9px 16px", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
          <Plus size={14} /> New Article
        </button>
      </div>

      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "80px 1.5fr 130px 110px 100px 90px", padding: "12px 18px", borderBottom: "1px solid var(--border)", background: "var(--bg-dark)", alignItems: "center" }}>
          {["Cover Image", "Article Title", "Category", "Timestamp", "Visibility", ""].map(h => (
            <span key={h} style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>{h}</span>
          ))}
        </div>

        {posts.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>No articles found</div>
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
                    <LinkIcon size={8} /> Redirect: {p.link}
                  </span>
                )}
              </div>
              <span style={{ fontSize: 11, background: "rgba(37,99,235,0.12)", color: "#2563eb", padding: "3px 8px", borderRadius: 6, fontWeight: 600, display: "inline-block", width: "fit-content" }}>
                {p.tag}
              </span>
              <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{p.time}</span>
              <button onClick={() => toggleActive(p.id)} style={{
                fontSize: 11, padding: "3px 8px", borderRadius: 6, fontWeight: 600, cursor: "pointer", border: "none", width: "fit-content",
                background: p.active ? "rgba(34,197,94,0.12)" : "rgba(100,116,139,0.12)",
                color: p.active ? "#22c55e" : "#94a3b8"
              }}>
                {p.active ? "Visible" : "Hidden"}
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
                  {editItem ? "Edit Article" : "Write New Article"}
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
                        {editorLanguageTab === "vi" ? "Tiêu đề bài viết (VI)" : "Article Title (EN)"}
                      </label>
                      <button type="button" onClick={handleAiGenerate} disabled={isGenerating} style={{
                        background: "linear-gradient(135deg, #a855f7, #6366f1)",
                        color: "white", border: "none", borderRadius: 6, padding: "4px 10px",
                        fontSize: 11, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
                        boxShadow: "0 2px 8px rgba(139, 92, 246, 0.3)", opacity: isGenerating ? 0.7 : 1, transition: "all 0.2s"
                      }}>
                        {isGenerating ? "Writing... ⏳" : "✨ AI Auto-Generate"}
                      </button>
                    </div>
                    {editorLanguageTab === "vi" ? (
                      <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Nhập tiêu đề bài viết..."
                        style={{ width: "100%", background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 12px", color: "var(--text-primary)", fontSize: 13, outline: "none" }} />
                    ) : (
                      <input value={form.title_en} onChange={e => setForm(p => ({ ...p, title_en: e.target.value }))} placeholder="Enter English title..."
                        style={{ width: "100%", background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 12px", color: "var(--text-primary)", fontSize: 13, outline: "none" }} />
                    )}
                  </div>

                  {/* Category & Timestamp */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                      <label style={{ fontSize: 12, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>
                        {editorLanguageTab === "vi" ? "Danh mục" : "Category"}
                      </label>
                      {editorLanguageTab === "vi" ? (
                        <select value={form.tag} onChange={e => setForm(p => ({ ...p, tag: e.target.value }))}
                          style={{ width: "100%", background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 12px", color: "var(--text-primary)", fontSize: 13, outline: "none" }}>
                          {["Kinh tế", "Fintech", "Công nghệ", "Đầu tư", "Thị trường"].map(tag => (
                            <option key={tag} value={tag}>{tag}</option>
                          ))}
                        </select>
                      ) : (
                        <select value={form.tag_en} onChange={e => setForm(p => ({ ...p, tag_en: e.target.value }))}
                          style={{ width: "100%", background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 12px", color: "var(--text-primary)", fontSize: 13, outline: "none" }}>
                          {["Economy", "Fintech", "Technology", "Investment", "Markets"].map(tag => (
                            <option key={tag} value={tag}>{tag}</option>
                          ))}
                        </select>
                      )}
                    </div>
                    <div>
                      <label style={{ fontSize: 12, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>
                        {editorLanguageTab === "vi" ? "Thời gian hiển thị" : "Display Timestamp"}
                      </label>
                      <input value={form.time} onChange={e => setForm(p => ({ ...p, time: e.target.value }))} placeholder="e.g. Just now"
                        style={{ width: "100%", background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 12px", color: "var(--text-primary)", fontSize: 13, outline: "none" }} />
                    </div>
                  </div>

                  {/* Image */}
                  <div>
                    <label style={{ fontSize: 12, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>Article Image</label>
                    <div style={{ display: "flex", gap: 10 }}>
                      <input value={form.image} onChange={e => setForm(p => ({ ...p, image: e.target.value }))} placeholder="Image URL (picsum, unsplash...)"
                        style={{ flex: 1, background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 12px", color: "var(--text-primary)", fontSize: 13, outline: "none" }} />
                      <label style={{ background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 14px", color: "var(--text-secondary)", cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
                        <Upload size={14} /> Upload
                        <input type="file" accept="image/*" style={{ display: "none" }} onChange={handleImageUpload} />
                      </label>
                    </div>
                  </div>

                  {/* Redirect Link */}
                  <div>
                    <label style={{ fontSize: 12, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>Redirect Link (Optional)</label>
                    <input value={form.link} onChange={e => setForm(p => ({ ...p, link: e.target.value }))} placeholder="e.g. https://example.com/... (clicking the card will open this link)"
                      style={{ width: "100%", background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 12px", color: "var(--text-primary)", fontSize: 13, outline: "none" }} />
                  </div>

                  {/* Content Body */}
                  <div>
                    <label style={{ fontSize: 12, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>
                      {editorLanguageTab === "vi" ? "Nội dung bài viết (VI)" : "Article Body (EN)"}
                    </label>
                    {editorLanguageTab === "vi" ? (
                      <textarea value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} placeholder="Viết nội dung bài viết chi tiết tại đây..." rows={4}
                        style={{ width: "100%", background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 12px", color: "var(--text-primary)", fontSize: 13, outline: "none", resize: "none", lineHeight: 1.5 }} />
                    ) : (
                      <textarea value={form.content_en} onChange={e => setForm(p => ({ ...p, content_en: e.target.value }))} placeholder="Write the full English article body here..." rows={4}
                        style={{ width: "100%", background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 12px", color: "var(--text-primary)", fontSize: 13, outline: "none", resize: "none", lineHeight: 1.5 }} />
                    )}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
                  <button onClick={() => setShowModal(false)} style={{ flex: 1, background: "var(--bg-card2)", border: "1px solid var(--border)", color: "var(--text-secondary)", borderRadius: 8, padding: "11px", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>Cancel</button>
                  <button onClick={handleSave} style={{ flex: 2, background: "linear-gradient(135deg,#2563eb,#1d4ed8)", color: "white", border: "none", borderRadius: 8, padding: "11px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                    {editItem ? "Update" : "Publish Article"}
                  </button>
                </div>
              </div>

              {/* Right Column: Real-time Live Preview */}
              <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 18 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 8px #22c55e" }} />
                    <h3 style={{ fontSize: 13, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>ARTICLE PREVIEW ({editorLanguageTab.toUpperCase()})</h3>
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
                          {(editorLanguageTab === "vi" ? form.title : form.title_en) || "Sample article title will appear here"}
                        </h4>
                        <ChevronRight size={16} style={{ color: "var(--text-muted)", flexShrink: 0, marginTop: 2 }} />
                      </div>
                      <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}>{form.time}</p>
                      
                      {/* Short simulated body copy */}
                      <p style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 10, lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                        {(editorLanguageTab === "vi" ? form.content : form.content_en) || "The full article body written by the admin will automatically appear in the user's detail view when they tap the article card..."}
                      </p>
                    </div>
                  </div>
                </div>

                <div style={{ background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.08)", borderRadius: 10, padding: 14 }}>
                  <p style={{ fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                    📝 <strong style={{ color: "var(--text-secondary)" }}>Tip:</strong> Double-check the title and content displayed above. For articles with a redirect link, clicking the news card will open a new page instead of showing the article body.
                  </p>
                </div>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
