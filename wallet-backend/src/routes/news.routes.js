const express = require('express');
const router = express.Router();

const newsController = require('../controllers/news.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const adminMiddleware = require('../middlewares/admin.middleware');

const guard = [authMiddleware, adminMiddleware];

// ─── Public ───────────────────────────────────────────────────────────────────
// Danh sách bài viết đang hiển thị (cho dashboard người dùng).
router.get('/', newsController.getNews);

// ─── Admin (chỉ ADMIN) ────────────────────────────────────────────────────────
router.get('/admin', ...guard, newsController.getAdminNews);
router.post('/admin', ...guard, newsController.createPost);
router.post('/admin/generate-ai', ...guard, newsController.generateAiPost);
router.put('/admin/:id', ...guard, newsController.updatePost);
router.delete('/admin/:id', ...guard, newsController.deletePost);
router.post('/admin/:id/toggle', ...guard, newsController.toggleActive);

module.exports = router;
