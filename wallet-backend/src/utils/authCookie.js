const REFRESH_COOKIE = 'refreshToken';

const cookieOptions = () => ({
  httpOnly: true,
  secure: process.env.COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production',
  sameSite: process.env.COOKIE_SAMESITE || (process.env.NODE_ENV === 'production' ? 'strict' : 'lax'),
  maxAge: 7 * 24 * 60 * 60 * 1000,
  // /api so cookie is sent for all API calls (refresh interceptor, etc.)
  path: '/api',
});

const setRefreshTokenCookie = (res, token) => {
  res.cookie(REFRESH_COOKIE, token, cookieOptions());
};

const clearRefreshTokenCookie = (res) => {
  res.clearCookie(REFRESH_COOKIE, cookieOptions());
};

const getRefreshTokenFromRequest = (req) => req.cookies?.[REFRESH_COOKIE] || null;

module.exports = {
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
  getRefreshTokenFromRequest,
};
