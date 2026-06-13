const prisma = require('../config/prisma');

const walletMiddleware = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    const wallet = await prisma.wallet.findUnique({
      where: { user_id: userId },
    });

    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: 'Wallet not found',
      });
    }

    if (wallet.status === 'FROZEN') {
      return res.status(403).json({
        success: false,
        message:
          'Your wallet has been frozen. Please contact support for assistance.',
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

module.exports = walletMiddleware;
