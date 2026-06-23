import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// ─── Request interceptor — attach JWT ────────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    const userToken = localStorage.getItem("bw_token");
    const adminToken = localStorage.getItem("bw_admin_token");
    const token = userToken || adminToken;
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error),
);

// ─── Response interceptor — auto refresh on 401 ──────────────────────────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem("bw_refresh_token");
        if (!refreshToken) throw new Error("No refresh token");

        const res = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });

        const { accessToken, refreshToken: newRefreshToken } = res.data.data;

        localStorage.setItem("bw_token", accessToken);
        if (newRefreshToken) localStorage.setItem("bw_refresh_token", newRefreshToken);

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (_) {
        localStorage.removeItem("bw_token");
        localStorage.removeItem("bw_refresh_token");
        localStorage.removeItem("bw_user");
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  },
);

// ─── Utilities ────────────────────────────────────────────────────────────────
export const formatVND = (num) => Number(num).toLocaleString("vi-VN") + " ₫";

// Convert a bare filename returned by the backend into a full image URL.
// If the value is already a full URL or a base64 data-URL, it is returned unchanged.
export const getUploadUrl = (filenameOrUrl) => {
  if (!filenameOrUrl) return null;
  if (filenameOrUrl.startsWith("http") || filenameOrUrl.startsWith("data:")) return filenameOrUrl;
  return `${API_BASE_URL}/uploads/${filenameOrUrl}`;
};

// Convert base64 data-URL to Blob (used for KYC image upload)
export const base64ToBlob = (dataUrl, defaultMime = "image/jpeg") => {
  const [header, base64] = dataUrl.split(",");
  const mime = header.match(/:(.*?);/)?.[1] || defaultMime;
  const binary = atob(base64);
  const arr = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
  return new Blob([arr], { type: mime });
};

// ─── Auth API ─────────────────────────────────────────────────────────────────
export const authAPI = {
  login: async (email, password) => {
    const res = await api.post("/auth/login", { email, password });
    return res.data;
  },
  register: async (email, password, phone) => {
    const res = await api.post("/auth/register", { email, password, ...(phone ? { phone } : {}) });
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
  // Returns { success, user: {...}, data: {...} } — both shapes supported
  getProfile: async () => {
    const res = await api.get("/users/me");
    if (res.data.success) {
      return { success: true, user: res.data.data, data: res.data.data };
    }
    return res.data;
  },
  updateAvatar: async (file) => {
    const formData = new FormData();
    formData.append("avatar", file);
    const res = await api.patch("/users/avatar", formData, {
      headers: { "Content-Type": "multipart/form-data" },
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
  markNotificationRead: async (id) => {
    const res = await api.patch(`/auth/notifications/${id}/read`);
    return res.data;
  },
  markAllNotificationsRead: async () => {
    const res = await api.patch("/auth/notifications/read-all");
    return res.data;
  },
  setPin: async (pin) => {
    const res = await api.post("/auth/set-pin", { pin });
    return res.data;
  },
  logout: async () => {
    try {
      await api.post("/auth/logout");
    } catch (_) { /* always clear local state */ }
    localStorage.removeItem("bw_token");
    localStorage.removeItem("bw_refresh_token");
    localStorage.removeItem("bw_user");
  },
  disableAccount: async () => {
    const res = await api.patch("/users/account/disable");
    return res.data;
  },
};

// ─── KYC API ──────────────────────────────────────────────────────────────────
export const kycAPI = {
  // kycData: { national_id, full_name, date_of_birth, front_image (b64), back_image (b64), selfie_image (b64) }
  submit: async (kycData) => {
    const formData = new FormData();
    formData.append("national_id", kycData.national_id);
    formData.append("full_name", kycData.full_name);
    formData.append("date_of_birth", kycData.date_of_birth);
    if (kycData.gender) formData.append("gender", kycData.gender);
    if (kycData.address) formData.append("address", kycData.address);

    if (kycData.front_image) {
      formData.append("front_image", base64ToBlob(kycData.front_image), "front.jpg");
    }
    if (kycData.back_image) {
      formData.append("back_image", base64ToBlob(kycData.back_image), "back.jpg");
    }
    if (kycData.selfie_image) {
      formData.append("selfie_image", base64ToBlob(kycData.selfie_image), "selfie.jpg");
    }

    const res = await api.post("/kyc/", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },
  update: async (kycData) => {
    const formData = new FormData();
    if (kycData.national_id) formData.append("national_id", kycData.national_id);
    if (kycData.full_name) formData.append("full_name", kycData.full_name);
    if (kycData.date_of_birth) formData.append("date_of_birth", kycData.date_of_birth);
    if (kycData.gender) formData.append("gender", kycData.gender);
    if (kycData.address !== undefined) formData.append("address", kycData.address);

    if (kycData.front_image) {
      formData.append("front_image", base64ToBlob(kycData.front_image), "front.jpg");
    }
    if (kycData.back_image) {
      formData.append("back_image", base64ToBlob(kycData.back_image), "back.jpg");
    }
    if (kycData.selfie_image) {
      formData.append("selfie_image", base64ToBlob(kycData.selfie_image), "selfie.jpg");
    }

    const res = await api.put("/kyc/", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },
  getMyKyc: async () => {
    const res = await api.get("/kyc/me");
    return res.data;
  },
};

// ─── Wallet API ───────────────────────────────────────────────────────────────
export const walletAPI = {
  deposit: async (bankAccountId, amount, note) => {
    const res = await api.post("/wallet/deposit", { bankAccountId, amount, note });
    return res.data;
  },
  withdraw: async (withdrawData) => {
    const res = await api.post("/wallet/withdraw", withdrawData);
    return res.data;
  },
  transfer: async (dest_email, amount, note, pin_code, category_id, voucherCode) => {
    const res = await api.post("/wallet/transfer", {
      dest_email,
      amount,
      note,
      pin_code,
      ...(category_id ? { category_id } : {}),
      ...(voucherCode ? { voucherCode } : {}),
    });
    return res.data;
  },
  payment: async ({ amount, bank_code, account_number, account_name, note, pin_code, category_id }) => {
    const res = await api.post("/wallet/payment", {
      amount,
      bank_code,
      account_number,
      account_name,
      note,
      pin_code,
      ...(category_id ? { category_id } : {}),
    });
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
  freezeWallet: async () => {
    const res = await api.patch("/users/wallet/freeze");
    return res.data;
  },
};

// ─── Bank API ─────────────────────────────────────────────────────────────────
export const bankAPI = {
  getMyBanks: async () => {
    const res = await api.get("/banks/me");
    return res.data;
  },
  linkBank: async ({ bank_code, account_number, account_name }) => {
    const res = await api.post("/banks/link", { bank_code, account_number, account_name });
    return res.data;
  },
  unlinkBank: async (id) => {
    const res = await api.delete(`/banks/${id}`);
    return res.data;
  },
};

// ─── PayOS API ────────────────────────────────────────────────────────────────
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

// ─── Admin API ────────────────────────────────────────────────────────────────
export const adminAPI = {
  // Users
  getUsers: async () => {
    const res = await api.get("/admin/users");
    // Backend returns { success, users: [...] }
    return res.data;
  },
  listUsers: async () => {
    const res = await api.get("/admin/users");
    return res.data;
  },
  getUserDetail: async (id) => {
    const res = await api.get(`/admin/users/${id}`);
    return res.data;
  },
  // status: 'LOCKED' | 'ACTIVE'
  updateUserStatus: async (id, status) => {
    let route;
    if (status === "LOCKED") route = `/admin/users/${id}/lock`;
    else route = `/admin/users/${id}/unlock`;
    const res = await api.patch(route);
    return res.data;
  },
  lockUser: async (id) => {
    const res = await api.patch(`/admin/users/${id}/lock`);
    return res.data;
  },
  unlockUser: async (id) => {
    const res = await api.patch(`/admin/users/${id}/unlock`);
    return res.data;
  },
  reactivateAccount: async (id) => {
    const res = await api.patch(`/admin/users/${id}/reactivate`);
    return res.data;
  },
  // walletStatus: 'FROZEN' | 'ACTIVE'
  updateWalletStatus: async (id, walletStatus) => {
    const route =
      walletStatus === "FROZEN"
        ? `/admin/users/${id}/wallet/freeze`
        : `/admin/users/${id}/wallet/unfreeze`;
    const res = await api.patch(route);
    return res.data;
  },
  freezeWallet: async (userId) => {
    const res = await api.patch(`/admin/users/${userId}/wallet/freeze`);
    return res.data;
  },
  unfreezeWallet: async (userId) => {
    const res = await api.patch(`/admin/users/${userId}/wallet/unfreeze`);
    return res.data;
  },

  // KYC
  getKycSubmissions: async () => {
    const res = await api.get("/admin/kyc/submissions");
    return res.data;
  },
  // id = user id (not kyc record id)
  reviewKyc: async (id, status, reason) => {
    const res = await api.post(`/admin/kyc/${id}/review`, { status, reason });
    return res.data;
  },

  // Transactions
  getTransactions: async () => {
    const res = await api.get("/admin/transactions");
    return res.data;
  },
  reviewTransaction: async (id, status, reason) => {
    const res = await api.post(`/admin/transactions/${id}/review`, { status, reason });
    return res.data;
  },

  // Fraud logs
  getFraudLogs: async () => {
    const res = await api.get("/admin/fraud-logs");
    return res.data;
  },
  resolveFraudLog: async (id) => {
    const res = await api.post(`/admin/fraud-logs/${id}/resolve`);
    return res.data;
  },
};

// ─── Support Chat API ─────────────────────────────────────────────────────────
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
    const res = await api.post(`/support/admin/reply/${user_id}`, { message, image_url });
    return res.data;
  },
};

// ─── News API ─────────────────────────────────────────────────────────────────
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

// ─── Investment / Savings API ─────────────────────────────────────────────────
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

// ─── Statistics API (thống kê chi tiêu theo tuần/tháng/năm) ────────────────────
export const statisticsAPI = {
  spending: async (period) => (await api.get(`/statistics/spending?period=${period}`)).data,
};

// ─── Fee API (admin: quản lý phí dịch vụ theo loại giao dịch) ──────────────────
export const feeAPI = {
  getAll: async () => {
    const res = await api.get("/admin/fees");
    return res.data;
  },
  create: async (transactionType, feeValue) => {
    const res = await api.post("/admin/fees", { transactionType, feeValue });
    return res.data;
  },
  update: async (id, data) => {
    const res = await api.patch(`/admin/fees/${id}`, data);
    return res.data;
  },
  remove: async (id) => {
    const res = await api.delete(`/admin/fees/${id}`);
    return res.data;
  },
};

// ─── Category API (danh mục chi tiêu) ─────────────────────────────────────────
export const categoryAPI = {
  list:      async () => (await api.get("/categories")).data,            // user: dropdown
  adminList: async () => (await api.get("/admin/categories")).data,      // admin
  create:    async (name) => (await api.post("/admin/categories", { name })).data,
  update:    async (id, name) => (await api.patch(`/admin/categories/${id}`, { name })).data,
  remove:    async (id) => (await api.delete(`/admin/categories/${id}`)).data,
};

// ─── Voucher API ──────────────────────────────────────────────────────────────
export const voucherAPI = {
  publicList: async () => (await api.get("/vouchers")).data,                 // user: Offers + dropdown
  check:      async (code, amount) => (await api.post("/vouchers/check", { code, amount })).data,
  adminList:  async () => (await api.get("/admin/vouchers")).data,
  create:     async (data) => (await api.post("/admin/vouchers", data)).data,
  update:     async (id, data) => (await api.patch(`/admin/vouchers/${id}`, data)).data,
  remove:     async (id) => (await api.delete(`/admin/vouchers/${id}`)).data,
};

export default api;
