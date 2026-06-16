const express = require('express');
const router = express.Router();

const userController = require('../controllers/user.settings.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const upload = require('../middlewares/upload');
const accountMiddleware = require('../middlewares/account.middleware');


router.get('/me', authMiddleware, userController.getMe);
router.get(
  '/profile/:id',
  authMiddleware,
  accountMiddleware,
  userController.getProfile,
);
// update profile
router.patch(
  '/avatar',
  authMiddleware,
  accountMiddleware,
  upload.single('avatar'),
  userController.updateAvatar,
);
router.patch(
  '/password',
  authMiddleware,
  accountMiddleware,
  userController.changePassword,
);
router.patch(
  '/request-change-contact',
  authMiddleware,
  accountMiddleware,
  userController.requestChangeContact,
);
router.post(
  '/verify-change-contact',
  authMiddleware,
  accountMiddleware,
  userController.verifyChangeContact,
);

// disable account
router.patch('/account/disable', authMiddleware, accountMiddleware, userController.disableAccount);

//freeze wallet
router.patch(
  '/wallet/freeze',
  authMiddleware,
  accountMiddleware,
  userController.freezeWallet,
);

module.exports = router;
