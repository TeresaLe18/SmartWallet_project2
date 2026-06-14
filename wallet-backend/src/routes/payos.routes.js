const express = require('express');
const router = express.Router();

const { createPaymentLink, payosWebhook, checkPaymentStatus } = require('../controllers/payos.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// User (đã đăng nhập)
router.post('/create-payment-link', authMiddleware, createPaymentLink);
router.get('/check/:orderCode', authMiddleware, checkPaymentStatus);

// PayOS gọi vào — KHÔNG auth (xác thực bằng chữ ký webhook trong controller).
router.post('/webhook', payosWebhook);

module.exports = router;
