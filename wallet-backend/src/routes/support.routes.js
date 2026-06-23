const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth.middleware');
const adminMiddleware = require('../middlewares/admin.middleware');
const supportController = require('../controllers/support.controller');

// ─── USER routes ──────────────────────────────────────────────────────────────
// POST   /api/support/messages         — user gửi tin nhắn
router.post('/messages', authMiddleware, supportController.sendMessage);

// GET    /api/support/messages         — user lấy lịch sử chat của mình
router.get('/messages', authMiddleware, supportController.getMyMessages);

// GET    /api/support/unread           — user lấy số tin chưa đọc từ admin
router.get('/unread', authMiddleware, supportController.getMyUnreadCount);

// ─── ADMIN routes ─────────────────────────────────────────────────────────────
// GET    /api/support/admin/conversations          — list tất cả cuộc trò chuyện
router.get('/admin/conversations', authMiddleware, adminMiddleware, supportController.listConversations);

// GET    /api/support/admin/conversations/:userId  — lấy chat của 1 user
router.get('/admin/conversations/:userId', authMiddleware, adminMiddleware, supportController.getConversation);

// POST   /api/support/admin/reply/:userId          — admin trả lời user
router.post('/admin/reply/:userId', authMiddleware, adminMiddleware, supportController.adminReply);

// GET    /api/support/admin/unread                — tổng số tin chưa đọc từ users
router.get('/admin/unread', authMiddleware, adminMiddleware, supportController.adminUnreadCount);

module.exports = router;
