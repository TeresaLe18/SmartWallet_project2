const express = require('express');

const router = express.Router();

const walletController = require('../controllers/wallet.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const accountMiddleware = require('../middlewares/account.middleware');
const walletMiddleware = require('../middlewares/wallet.middleware');
const pinMiddleware = require('../middlewares/pin.middleware');

router.get('/stats', authMiddleware, accountMiddleware, walletController.getStats);
router.get('/transactions', authMiddleware, accountMiddleware, walletController.getTransactions);

router.post(
  '/deposit',
  authMiddleware,
  accountMiddleware,
  walletMiddleware,
  walletController.deposit,
);

router.post(
  '/withdraw',
  authMiddleware,
  accountMiddleware,
  walletMiddleware,
  pinMiddleware,
  walletController.withdraw,
);

router.post(
  '/transfer',
  authMiddleware,
  accountMiddleware,
  walletMiddleware,
  pinMiddleware,
  walletController.transfer,
);

router.post(
  '/payment',
  authMiddleware,
  accountMiddleware,
  walletMiddleware,
  pinMiddleware,
  walletController.payment,
);

router.post(
  "/qr-deposit/create",
  authMiddleware,
  accountMiddleware,
  walletMiddleware,
  walletController.createQrDeposit,
);

router.post(
  "/qr-deposit/confirm",
  authMiddleware,
  accountMiddleware,
  walletMiddleware,
  walletController.confirmQrDeposit,
);

module.exports = router;
