const prisma = require('../config/prisma');

const accountMiddleware = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    if (user.status === 'LOCKED') {
      return res.status(403).json({
        success: false,
        message: 'Account is locked. Please contact support for assistance.',
      });
    }

    if (user.status === 'DISABLED') {
      return res.status(403).json({
        success: false,
        message: 'Account is disabled. Please contact support for assistance.',
      });
    }

    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = accountMiddleware;
