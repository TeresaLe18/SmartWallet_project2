const express = require('express');
const router = express.Router();

const savingsVaultController = require('../controllers/savings-vault.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const accountMiddleware = require('../middlewares/account.middleware');
const walletMiddleware = require('../middlewares/wallet.middleware');

router.get(
  '/',
  authMiddleware,
  accountMiddleware,
  savingsVaultController.getAllVaults
);

router.post(
  '/',
  authMiddleware,
  accountMiddleware,
  savingsVaultController.createVault
);

router.post(
  '/:id/deposit',
  authMiddleware,
  accountMiddleware,
  walletMiddleware,
  savingsVaultController.depositToVault
);

router.post(
  '/:id/withdraw',
  authMiddleware,
  accountMiddleware,
  walletMiddleware,
  savingsVaultController.withdrawFromVault
);

module.exports = router;
