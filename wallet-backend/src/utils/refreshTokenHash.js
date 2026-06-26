const crypto = require('crypto');

// Băm mật mã Refresh Token trước khi lưu vào CSDL bằng thuật toán SHA-256 và khóa bí mật
const hashRefreshToken = (token) => {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) {
    throw new Error('JWT_REFRESH_SECRET is not configured');
  }
  return crypto.createHmac('sha256', secret).update(token).digest('hex');
};

// Xác thực tính hợp lệ của token gửi lên bằng cách so sánh bản băm an toàn (timingSafeEqual)
// Điều này ngăn chặn việc tin tặc phát hiện độ dài bản băm dựa trên thời gian phản hồi (Timing attack)
const verifyRefreshTokenHash = (token, storedHash) => {
  if (!token || !storedHash) return false;
  const hash = hashRefreshToken(token);
  if (hash.length !== storedHash.length) return false;
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(storedHash));
};

module.exports = {
  hashRefreshToken,
  verifyRefreshTokenHash,
};
