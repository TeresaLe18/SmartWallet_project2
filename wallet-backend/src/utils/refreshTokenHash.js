const crypto = require('crypto');

const hashRefreshToken = (token) => {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) {
    throw new Error('JWT_REFRESH_SECRET is not configured');
  }
  return crypto.createHmac('sha256', secret).update(token).digest('hex');
};

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
