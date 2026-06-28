// Tên của cookie lưu trữ Refresh Token bảo mật
const REFRESH_COOKIE = 'refreshToken';

// Cấu hình các tùy chọn cho Cookie bảo mật
const cookieOptions = () => ({
  httpOnly: true, // Chống mã độc XSS đọc cookie từ phía Client (javascript)
  secure: process.env.COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production', // Chỉ gửi qua HTTPS khi ở production
  sameSite: process.env.COOKIE_SAMESITE || (process.env.NODE_ENV === 'production' ? 'strict' : 'lax'), // Chống tấn công CSRF
  maxAge: 7 * 24 * 60 * 60 * 1000, // Hạn dùng cookie là 7 ngày
  // Đường dẫn /api đảm bảo cookie chỉ gửi cho các API gọi đến backend
  path: '/api',
});

// Thiết lập Refresh Token lưu vào HttpOnly Cookie của client
const setRefreshTokenCookie = (res, token) => {
  res.cookie(REFRESH_COOKIE, token, cookieOptions());
};

// Xóa Refresh Cookie (khi đăng xuất hoặc thu hồi session)
const clearRefreshTokenCookie = (res) => {
  res.clearCookie(REFRESH_COOKIE, cookieOptions());
};

// Lấy Refresh Token từ cookies của yêu cầu gửi lên
const getRefreshTokenFromRequest = (req) => req.cookies?.[REFRESH_COOKIE] || null;

module.exports = {
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
  getRefreshTokenFromRequest,
};
