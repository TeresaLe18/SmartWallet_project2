const express = require('express');
const router = express.Router();

const investmentController = require('../controllers/investment.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const accountMiddleware = require('../middlewares/account.middleware');
const walletMiddleware = require('../middlewares/wallet.middleware');

router.get(
  '/',
  authMiddleware,
  accountMiddleware,
  investmentController.getAllInvestments
);

router.post(
  '/',
  authMiddleware,
  accountMiddleware,
  walletMiddleware,
  investmentController.createInvestment
);

router.post(
  '/:id/withdraw',
  authMiddleware,
  accountMiddleware,
  walletMiddleware,
  investmentController.withdrawInvestment
);

module.exports = router;
