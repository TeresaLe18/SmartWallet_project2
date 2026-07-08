const express = require('express');
const router = express.Router();

const chatController = require('../controllers/chat.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const accountMiddleware = require('../middlewares/account.middleware');

// Route for getting AI advisor advice
router.post('/advisor', authMiddleware, accountMiddleware, chatController.getFinancialAdvisorResponse);

module.exports = router;
