import { useState, useEffect, useRef } from "react";
import { Send, Image, X, Headphones, User, Shield, Search, MessageSquare, AlertCircle } from "lucide-react";
import { supportAPI } from "../../services/api";
import { motion, AnimatePresence } from "framer-motion";

export default function AdminSupport() {
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null); // { user, messages: [] }
  const [inputText, setInputText] = useState("");
  const [selectedImage, setSelectedImage] = useState(null); // base64 string
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingChat, setLoadingChat] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Auto-scroll to bottom of chat
  const scrollToBottom = (behavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  // Load conversations list
  const loadConversations = async (isFirst = false) => {
    try {
      const res = await supportAPI.getAdminConversations();
      if (res.success) {
        setConversations(res.data);
      }
    } catch (error) {
      console.error("Failed to load admin conversations:", error);
    } finally {
      if (isFirst) setLoadingConversations(false);
    }
  };

  // Load specific user's chat history
  const loadChatHistory = async (userId, isFirst = false, convData = null) => {
    if (isFirst) setLoadingChat(true);
    try {
      const res = await supportAPI.getAdminChatHistory(userId);
      if (res.success) {
        // Use passed convData or find from existing conversations list
        const conv = convData || conversations.find((c) => c.user_id === userId);
        setSelectedConversation((prev) => ({
          user: prev?.user?.id === userId ? prev.user : {
            id: userId,
            email: conv?.email || "",
            phone: conv?.phone || "",
            name: conv?.full_name || conv?.email || "",
          },
          messages: res.data,
        }));
        if (isFirst) {
          setTimeout(() => scrollToBottom("auto"), 50);
        } else {
          scrollToBottom("smooth");
        }
      }
    } catch (error) {
      console.error("Failed to load chat history:", error);
    } finally {
      if (isFirst) setLoadingChat(false);
    }
  };

  // Polling logic
  useEffect(() => {
    loadConversations(true);

    const interval = setInterval(() => {
      loadConversations(false);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  // Polling logic for selected chat
  useEffect(() => {
    if (!selectedConversation?.user?.id) return;

    const interval = setInterval(() => {
      loadChatHistory(selectedConversation.user.id, false);
    }, 4000);

    return () => clearInterval(interval);
  }, [selectedConversation?.user?.id]);

  // Handle selecting a user conversation
  const handleSelectConversation = (userId, convData) => {
    loadChatHistory(userId, true, convData);
  };

  // Handle image attachment
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("Image size must not exceed 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setSelectedImage(reader.result); // Base64
    };
    reader.readAsDataURL(file);
  };

  // Handle sending reply
  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!selectedConversation?.user?.id) return;
    if (!inputText.trim() && !selectedImage) return;

    setSending(true);
    const userId = selectedConversation.user.id;
    const textToSend = inputText;
    const imgToSend = selectedImage;

    // Clear inputs immediately for seamless UI feel
    setInputText("");
    setSelectedImage(null);

    try {
      const res = await supportAPI.sendAdminReply(userId, textToSend, imgToSend);
      if (res.success) {
        // Append message and update local state
        setSelectedConversation((prev) => ({
          ...prev,
          messages: [...prev.messages, res.data],
        }));
        setTimeout(() => scrollToBottom("smooth"), 50);
        // Refresh conversations list to show updated last message
        loadConversations(false);
      }
    } catch (error) {
      console.error("Failed to send admin reply:", error);
      alert(error.response?.data?.message || "Unable to send reply. Please try again.");
    } finally {
      setSending(false);
    }
  };

  // Filter conversations by search query
  const filteredConversations = conversations.filter(
    (c) =>
      (c.email || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.phone || "").includes(searchQuery)
  );

  return (
    <div style={{ display: "flex", height: "calc(100vh - 120px)", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden" }}>
      {/* ─── LEFT SIDEBAR: CONVERSATIONS LIST ─── */}
      <div style={{ width: 320, borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column", background: "rgba(255,255,255,0.01)" }}>
        {/* Search Bar */}
        <div style={{ padding: "16px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
            <Search size={16} style={{ position: "absolute", left: 12, color: "var(--text-muted)" }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by email or phone number..."
              style={{
                width: "100%", height: 38, padding: "0 12px 0 36px",
                borderRadius: 10, border: "1px solid var(--border)",
                background: "var(--bg-card2)", color: "var(--text-primary)", fontSize: 13
              }}
            />
          </div>
        </div>

        {/* Conversations List Container */}
        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
          {loadingConversations ? (
            <div style={{ padding: 40, display: "flex", justifyContent: "center" }}>
              <div style={{ width: 24, height: 24, borderRadius: "50%", border: "2px solid #2563eb", borderTopColor: "transparent", animation: "spin 1s linear infinite" }} />
            </div>
          ) : filteredConversations.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "var(--text-secondary)" }}>
              <MessageSquare size={36} style={{ color: "var(--text-muted)", opacity: 0.3, marginBottom: 12 }} />
              <p style={{ fontSize: 13 }}>No support conversations found.</p>
            </div>
          ) : (
            filteredConversations.map((c) => {
              const active = selectedConversation?.user?.id === c.user_id;
              return (
                <div
                  key={c.user_id}
                  onClick={() => handleSelectConversation(c.user_id, c)}
                  style={{
                    padding: "16px 20px",
                    borderBottom: "1px solid var(--border)",
                    background: active ? "rgba(37,99,235,0.08)" : "transparent",
                    borderLeft: `3px solid ${active ? "#2563eb" : "transparent"}`,
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }}
                  onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                      <div style={{ width: 24, height: 24, borderRadius: "50%", background: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <User size={12} style={{ color: "var(--text-secondary)" }} />
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.full_name || c.email}</span>
                    </div>
                    {/* Unread Badge Count */}
                    {c.unread_count > 0 && (
                      <span style={{
                        background: "#ef4444", color: "white", fontSize: 10,
                        fontWeight: 700, padding: "2px 6px", borderRadius: 10, minWidth: 16, textAlign: "center"
                      }}>
                        {c.unread_count}
                      </span>
                    )}
                  </div>
                  {/* Subtitle / Last Message */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <p style={{
                      fontSize: 11.5, color: c.unread_count > 0 ? "var(--text-primary)" : "var(--text-muted)",
                      fontWeight: c.unread_count > 0 ? 600 : 400,
                      margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, marginRight: 8
                    }}>
                      {c.last_message || (c.last_image_url ? "📎 Image" : "No messages yet")}
                    </p>
                    {c.last_message_at && (
                      <span style={{ fontSize: 10, color: "var(--text-muted)" }}>
                        {new Date(c.last_message_at).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ─── RIGHT WORKSPACE: ACTIVE CHAT PANEL ─── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "rgba(0,0,0,0.05)" }}>
        {selectedConversation ? (
          <>
            {/* Active User Header */}
            <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(255,255,255,0.02)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 38, height: 38, borderRadius: "50%", background: "rgba(37,99,235,0.1)", border: "1px solid rgba(37,99,235,0.2)", display: "flex", alignItems: "center", justifyContent: "center", color: "#2563eb" }}>
                  <User size={18} />
                </div>
                <div>
                  <h4 style={{ fontSize: 14.5, fontWeight: 700, margin: 0 }}>{selectedConversation.user.email}</h4>
                  <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "2px 0 0 0" }}>Phone: {selectedConversation.user.phone || "N/A"}</p>
                </div>
              </div>
            </div>

            {/* Chat History View */}
            <div style={{ flex: 1, overflowY: "auto", padding: "24px", display: "flex", flexDirection: "column", gap: 16 }}>
              {loadingChat ? (
                <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ width: 24, height: 24, borderRadius: "50%", border: "2px solid #2563eb", borderTopColor: "transparent", animation: "spin 1s linear infinite" }} />
                </div>
              ) : (
                selectedConversation.messages.map((msg) => {
                  const isAdmin = msg.is_admin === true;
                  return (
                    <div key={msg.id} style={{ display: "flex", flexDirection: "column", alignItems: isAdmin ? "flex-end" : "flex-start" }}>
                      <div style={{ display: "flex", gap: 10, maxWidth: "75%", alignItems: "flex-end" }}>
                        {!isAdmin && (
                          <div style={{ width: 26, height: 26, borderRadius: "50%", background: "var(--bg-card2)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginBottom: 4 }}>
                            <User size={11} style={{ color: "var(--text-secondary)" }} />
                          </div>
                        )}
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          <div style={{
                            padding: "11px 15px",
                            borderRadius: 14,
                            borderTopLeftRadius: !isAdmin ? 2 : 14,
                            borderTopRightRadius: isAdmin ? 2 : 14,
                            background: isAdmin ? "#2563eb" : "var(--bg-card)",
                            border: "1px solid var(--border)",
                            color: isAdmin ? "white" : "var(--text-primary)",
                            fontSize: 13,
                            lineHeight: 1.5
                          }}>
                            {/* Image inside chat bubbles */}
                            {msg.image_url && (
                              <div style={{ marginBottom: msg.message ? 8 : 0, borderRadius: 8, overflow: "hidden", border: "1px solid var(--border)" }}>
                                <img src={msg.image_url} alt="Attachment" style={{ maxWidth: "100%", maxHeight: 200, objectFit: "cover", display: "block" }} />
                              </div>
                            )}
                            {msg.message && <div style={{ wordBreak: "break-word", whiteSpace: "pre-wrap" }}>{msg.message}</div>}
                          </div>
                          <span style={{ fontSize: 9.5, color: "var(--text-muted)", alignSelf: isAdmin ? "flex-end" : "flex-start", paddingLeft: 4, paddingRight: 4 }}>
                            {new Date(msg.created_at || msg.createdAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Selected Image Preview Area */}
            <AnimatePresence>
              {selectedImage && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 80, opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  style={{ padding: "0 24px", background: "rgba(0,0,0,0.02)", borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 12 }}
                >
                  <div style={{ position: "relative", width: 56, height: 56, borderRadius: 8, overflow: "hidden", border: "1px solid var(--border)" }}>
                    <img src={selectedImage} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    <button
                      onClick={() => setSelectedImage(null)}
                      style={{ position: "absolute", top: 2, right: 2, width: 16, height: 16, borderRadius: "50%", background: "rgba(0,0,0,0.8)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "white" }}
                    >
                      <X size={8} />
                    </button>
                  </div>
                  <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>Image selected</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Reply Input Bar */}
            <form onSubmit={handleSendReply} style={{ padding: "16px 24px", borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 12, background: "var(--bg-card2)" }}>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{ width: 38, height: 38, borderRadius: "50%", background: "var(--bg-card)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)", cursor: "pointer", transition: "all 0.2s" }}
                onMouseEnter={(e) => e.currentTarget.style.color = "#2563eb"}
                onMouseLeave={(e) => e.currentTarget.style.color = "var(--text-secondary)"}
              >
                <Image size={18} />
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                style={{ display: "none" }}
              />

              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={`Reply to ${selectedConversation.user.name}...`}
                style={{ flex: 1, height: 38, padding: "0 16px", borderRadius: 19, border: "1px solid var(--border)", background: "var(--bg-card)", color: "var(--text-primary)", fontSize: 13 }}
              />

              <button
                type="submit"
                disabled={sending || (!inputText.trim() && !selectedImage)}
                style={{
                  width: 38, height: 38, borderRadius: "50%",
                  background: (inputText.trim() || selectedImage) ? "#2563eb" : "rgba(0,0,0,0.03)",
                  border: "none", display: "flex", alignItems: "center", justifyContent: "center",
                  color: "white", cursor: (inputText.trim() || selectedImage) ? "pointer" : "not-allowed",
                  transition: "all 0.2s"
                }}
              >
                <Send size={15} />
              </button>
            </form>
          </>
        ) : (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, color: "var(--text-secondary)" }}>
            <Headphones size={54} style={{ color: "var(--text-muted)", opacity: 0.3 }} />
            <h4 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>Customer Support Center</h4>
            <p style={{ fontSize: 13, maxWidth: 300, textAlign: "center", margin: 0 }}>Select a customer from the list on the left to view the conversation and send a reply.</p>
          </div>
        )}
      </div>
    </div>
  );
}
