const express = require('express');
const router = express.Router();

const c = require('../controllers/statistics.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const accountMiddleware = require('../middlewares/account.middleware');

// Thống kê chi tiêu của user theo tuần/tháng/năm.
router.get('/spending', authMiddleware, accountMiddleware, c.getSpending);

module.exports = router;
