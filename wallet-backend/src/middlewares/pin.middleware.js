const prisma = require('../config/prisma');
const bcrypt = require('bcrypt');

const pinMiddleware = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { pin_code } = req.body;

    if (!pin_code) {
      return res.status(400).json({
        success: false,
        message: 'Transaction PIN is required',
      });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user.pin_hash) {
      return res.status(400).json({
        success: false,
        message: 'No PIN set. Please set a transaction PIN first.',
      });
    }

    if (user.pin_locked_until && new Date() < new Date(user.pin_locked_until)) {
      const remaining = Math.ceil(
        (new Date(user.pin_locked_until) - Date.now()) / 1000 / 60,
      );
      return res.status(429).json({
        success: false,
        message: `PIN locked. Please try again in ${remaining} minute(s).`,
      });
    }

    const isValid = await bcrypt.compare(String(pin_code), user.pin_hash);

    if (!isValid) {
      const attempts = (user.pin_failed_attempts || 0) + 1;
      const lockUntil = attempts >= 3 ? new Date(Date.now() + 15 * 60 * 1000) : null;

      await prisma.user.update({
        where: { id: userId },
        data: {
          pin_failed_attempts: attempts,
          ...(lockUntil && { pin_locked_until: lockUntil }),
        },
      });

      const remaining = 3 - attempts;
      const msg =
        attempts >= 3
          ? 'Too many failed PIN attempts. PIN locked for 15 minutes.'
          : `Invalid PIN. ${remaining} attempt(s) remaining.`;

      return res.status(400).json({ success: false, message: msg });
    }

    // Reset failed attempts on success
    await prisma.user.update({
      where: { id: userId },
      data: { pin_failed_attempts: 0, pin_locked_until: null },
    });

    next();
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = pinMiddleware;
