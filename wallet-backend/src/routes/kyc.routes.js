const express = require('express');

const router = express.Router();

const kycController = require('../controllers/kyc.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const upload = require('../middlewares/upload');
const accountMiddleware = require('../middlewares/account.middleware');
const adminMiddleware = require('../middlewares/admin.middleware');

//user routes
router.post(
  '/',
  authMiddleware,
  accountMiddleware,
  upload.fields([
    { name: 'front_image', maxCount: 1 },
    { name: 'back_image', maxCount: 1 },
    { name: 'selfie_image', maxCount: 1 },
  ]),
  kycController.submitKyc,
);

router.get('/me', authMiddleware, accountMiddleware, kycController.getMyKyc);

router.put(
  '/',
  authMiddleware,
  accountMiddleware,
  upload.fields([
    { name: 'front_image', maxCount: 1 },
    { name: 'back_image', maxCount: 1 },
    { name: 'selfie_image', maxCount: 1 },
  ]),
  kycController.updateKyc,
);

//admin routes
router.patch(
  '/:id/verify',
  authMiddleware,
  adminMiddleware,
  kycController.verifyKyc,
);
router.patch(
  '/:id/reject',
  authMiddleware,
  adminMiddleware,
  kycController.rejectKyc,
);

module.exports = router;
