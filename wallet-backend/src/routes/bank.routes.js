const express = require('express');

const router = express.Router();

const bankController = require('../controllers/bank.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const accountMiddleware = require('../middlewares/account.middleware');
const walletMiddleware = require('../middlewares/wallet.middleware');

router.get(
  '/me',
  authMiddleware,
  accountMiddleware,
  walletMiddleware,
  bankController.getMyBanks,
);
router.post(
  '/link',
  authMiddleware,
  accountMiddleware,
  walletMiddleware,
  bankController.linkBankAccount,
);
router.delete(
  '/:id',
  authMiddleware,
  accountMiddleware,
  walletMiddleware,
  bankController.unlinkBank,
);

module.exports = router;
