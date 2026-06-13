import axios from "axios";

// Supports env variable VITE_API_URL for production (Vercel),
// falls back to local dev backend on port 5001.
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to automatically append JWT from localStorage
api.interceptors.request.use(
  (config) => {
    const userToken = localStorage.getItem("bw_token");
    const adminToken = localStorage.getItem("bw_admin_token");
    const token = userToken || adminToken;

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem("bw_refresh_token");

        const res = await axios.post("/auth/refresh", {
          refreshToken,
        });

        const newAccessToken = res.data.accessToken;

        localStorage.setItem("bw_token", newAccessToken);

        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

        return api(originalRequest);
      } catch (err) {
        localStorage.removeItem("bw_token");
        localStorage.removeItem("bw_refresh_token");
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);
// Unified VND formatting helper
export const formatVND = (num) => {
  return Number(num).toLocaleString("vi-VN") + " ₫";
};

// ─── Auth API endpoints ──────────────────────────────────────────────────────
export const authAPI = {
  login: async (email, password) => {
    const res = await api.post("/auth/login", { email, password });
    return res.data;
  },
  register: async (email, password, phone) => {
    const res = await api.post("/auth/register", { email, password, phone });
    return res.data;
  },
  verifyOtp: async (email, otp) => {
    const res = await api.post("/auth/verify-otp", { email, otp });
    return res.data;
  },
  resendOtp: async (email) => {
    const res = await api.post("/auth/resend-otp", { email });
    return res.data;
  },
  getProfile: async () => {
    const res = await api.get("/users/profile/${id}");
    return res.data;
  },
  updateAvatar: async (file) => {
    const formData = new FormData();
    formData.append("avatar", file);

    const res = await api.patch("/users/avatar", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return res.data;
  },
  changePassword: async (data) => {
    const res = await api.patch("/users/password", data);
    return res.data;
  },
  requestChangeContact: async (data) => {
    const res = await api.patch("/users/request-change-contact", data);
    return res.data;
  },
  verifyChangeContact: async (data) => {
    const res = await api.post("/users/verify-change-contact", data);
    return res.data;
  },

  submitKyc: async (kycData) => {
    const res = await api.post("/auth/kyc/submit", kycData);
    return res.data;
  },
  // Profile update OTP (sends OTP to current registered email)
  sendProfileOtp: async (payload) => {
    const res = await api.post("/auth/send-profile-otp", payload);
    return res.data;
  },
  verifyProfileOtp: async (otp, newEmail, newPhone, newPassword, currentPassword) => {
    const res = await api.post("/auth/verify-profile-otp", {
      otp, newEmail, newPhone, newPassword, currentPassword,
    });
    return res.data;
  },
  // Password reset (forgot password) – public
  forgotPassword: async (email) => {
    const res = await api.post("/auth/forgot-password", { email });
    return res.data;
  },
  resetPasswordWithOtp: async (email, otp, newPassword) => {
    const res = await api.post("/auth/reset-password", { email, otp, newPassword });
    return res.data;
  },
  getNotifications: async () => {
    const res = await api.get("/auth/notifications");
    return res.data;
  },
  setPin: async (pin) => {
    const res = await api.post("/auth/set-pin", { pin });
    return res.data;
  },
};

// ─── Wallet API endpoints ─────────────────────────────────────────────────────
export const walletAPI = {
  deposit: async (amount, note) => {
    const res = await api.post("/wallet/deposit", { amount, note });
    return res.data;
  },
  withdraw: async (withdrawData) => {
    const res = await api.post("/wallet/withdraw", withdrawData);
    return res.data;
  },
  transfer: async (dest_email, amount, note, pin_code) => {
    const res = await api.post("/wallet/transfer", { dest_email, amount, note, pin_code });
    return res.data;
  },
  getTransactions: async () => {
    const res = await api.get("/wallet/transactions");
    return res.data;
  },
  getStats: async () => {
    const res = await api.get("/wallet/stats");
    return res.data;
  },
};

// ─── PayOS API endpoints ──────────────────────────────────────────────────────
export const payosAPI = {
  createPaymentLink: async (amount, note) => {
    const res = await api.post("/payos/create-payment-link", { amount, note });
    return res.data;
  },
  checkPaymentStatus: async (orderCode) => {
    const res = await api.get(`/payos/check/${orderCode}`);
    return res.data;
  },
};

// ─── Admin API endpoints ──────────────────────────────────────────────────────
export const adminAPI = {
  listUsers: async () => {
    const res = await api.get("/admin/users");
    return res.data;
  },
  banUser: async (id) => {
    const res = await api.patch(`/admin/users/${id}/ban`);
    return res.data;
  },

  unbanUser: async (id) => {
    const res = await api.patch(`/admin/users/${id}/unban`);
    return res.data;
  },
  freezeWallet: async (userId) => {
    const res = await api.patch(
      `/admin/users/${userId}/wallet/freeze`
    );
    return res.data;
  },

  unfreezeWallet: async (userId) => {
    const res = await api.patch(
      `/admin/users/${userId}/wallet/unfreeze`
    );
    return res.data;
  },
  getKycSubmissions: async () => {
    const res = await api.get("/admin/kyc/submissions");
    return res.data;
  },
  reviewKyc: async (id, status, reason) => {
    const res = await api.post(`/admin/kyc/${id}/review`, { status, reason });
    return res.data;
  },
  verifyKyc: async (id) => {
    const res = await api.patch(`/kyc/${id}/verify`);
    return res.data;
  },

  rejectKyc: async (id, reason) => {
    const res = await api.patch(
      `/kyc/${id}/reject`,
      { reason }
    );
    return res.data;
  },
  getFraudLogs: async () => {
    const res = await api.get("/admin/fraud-logs");
    return res.data;
  },
  resolveFraudLog: async (id) => {
    const res = await api.post(`/admin/fraud-logs/${id}/resolve`);
    return res.data;
  },
  getTransactions: async () => {
    const res = await api.get("/admin/transactions");
    return res.data;
  },
  reviewTransaction: async (id, status, reason) => {
    const res = await api.post(`/admin/transactions/${id}/review`, { status, reason });
    return res.data;
  },
};

// ─── Support Chat API endpoints ──────────────────────────────────────────────
export const supportAPI = {
  getMessages: async () => {
    const res = await api.get("/support/messages");
    return res.data;
  },
  sendMessage: async (message, image_url) => {
    const res = await api.post("/support/messages", { message, image_url });
    return res.data;
  },
  getAdminConversations: async () => {
    const res = await api.get("/support/admin/conversations");
    return res.data;
  },
  getAdminChatHistory: async (user_id) => {
    const res = await api.get(`/support/admin/conversations/${user_id}`);
    return res.data;
  },
  sendAdminReply: async (user_id, message, image_url) => {
    const res = await api.post(`/support/admin/conversations/${user_id}`, { message, image_url });
    return res.data;
  },
};

// ─── Financial News API endpoints ─────────────────────────────────────────────
export const newsAPI = {
  getNews: async () => {
    const res = await api.get("/news");
    return res.data;
  },
  getAdminNews: async () => {
    const res = await api.get("/news/admin");
    return res.data;
  },
  createPost: async (postData) => {
    const res = await api.post("/news/admin", postData);
    return res.data;
  },
  updatePost: async (id, postData) => {
    const res = await api.put(`/news/admin/${id}`, postData);
    return res.data;
  },
  deletePost: async (id) => {
    const res = await api.delete(`/news/admin/${id}`);
    return res.data;
  },
  toggleActive: async (id) => {
    const res = await api.post(`/news/admin/${id}/toggle`);
    return res.data;
  },
};

// ─── Investment / Savings API endpoints ─────────────────────────────────────
export const investmentAPI = {
  create: async (amount, term_months) => {
    const res = await api.post("/investments", { amount, term_months });
    return res.data;
  },
  getAll: async () => {
    const res = await api.get("/investments");
    return res.data;
  },
  withdraw: async (id) => {
    const res = await api.post(`/investments/${id}/withdraw`);
    return res.data;
  },
  getAdminAll: async () => {
    const res = await api.get("/investments/admin");
    return res.data;
  },
};

export default api;
