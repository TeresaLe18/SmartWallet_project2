const express = require('express');
const router = express.Router();

const adminController = require('../controllers/admin.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const adminMiddleware = require('../middlewares/admin.middleware');

const guard = [authMiddleware, adminMiddleware];

// ─── Users ────────────────────────────────────────────────────────────────────
router.get('/users', ...guard, adminController.listUsers);
router.get('/users/:id', ...guard, adminController.userDetail);
router.patch('/users/:id/reactivate', ...guard, adminController.reactivateAccount);
router.patch('/users/:id/lock', ...guard, adminController.lockUser);
router.patch('/users/:id/unlock', ...guard, adminController.unlockUser);

// ─── Wallets ──────────────────────────────────────────────────────────────────
router.patch('/users/:id/wallet/freeze', ...guard, adminController.freezeWallet);
router.patch('/users/:id/wallet/unfreeze', ...guard, adminController.unfreezeWallet);

// ─── KYC ─────────────────────────────────────────────────────────────────────
router.get('/kyc/submissions', ...guard, adminController.getKycSubmissions);
router.post('/kyc/:id/review', ...guard, adminController.reviewKyc);

// ─── Transactions ─────────────────────────────────────────────────────────────
router.get('/transactions', ...guard, adminController.getAllTransactions);
router.post('/transactions/:id/review', ...guard, adminController.reviewTransaction);

// ─── Fraud Logs ───────────────────────────────────────────────────────────────
router.get('/fraud-logs', ...guard, adminController.getFraudLogs);
router.post('/fraud-logs/:id/resolve', ...guard, adminController.resolveFraudLog);

// ─── Statistics ───────────────────────────────────────────────────────────────
// GET    /api/admin/statistics   — thống kê tài chính theo ngày/tháng/năm
router.get('/statistics', ...guard, adminController.getStatistics);

module.exports = router;
