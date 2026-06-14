const express = require('express');

const router = express.Router();

const normalizeEmail = require('../middlewares/normalizeEmail');

const authController = require('../controllers/auth.controller');
const registerMiddleware = require('../middlewares/register.middleware');
const loginMiddleware = require('../middlewares/login.middleware');
const authMiddleware = require('../middlewares/auth.middleware');

//auth routes
router.post('/register', normalizeEmail, registerMiddleware, authController.register);
router.post('/verify-otp', normalizeEmail, authController.verifyRegister);
router.post('/resend-otp', normalizeEmail, authController.resendOtp);
router.post('/login', normalizeEmail, loginMiddleware, authController.login);
router.post('/refresh', authController.refreshTokenHandler);
router.post('/logout', authMiddleware, authController.logout);
router.post('/forgot-password', normalizeEmail, authController.forgotPassword);
router.post('/reset-password', normalizeEmail, authController.resetPassword);
router.post('/set-pin', authMiddleware, authController.setPin);
router.get('/notifications', authMiddleware, authController.getNotifications);
router.patch('/notifications/read-all', authMiddleware, authController.markAllNotificationsRead);
router.patch('/notifications/:id/read', authMiddleware, authController.markNotificationRead);

module.exports = router;
