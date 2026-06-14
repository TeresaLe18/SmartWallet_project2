const express = require('express');
const router = express.Router();

const c = require('../controllers/voucher.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const adminMiddleware = require('../middlewares/admin.middleware');

const guard = [authMiddleware, adminMiddleware];

router.get('/', ...guard, c.listVouchers);
router.post('/', ...guard, c.createVoucher);
router.get('/:id', ...guard, c.getVoucher);
router.patch('/:id', ...guard, c.updateVoucher);
router.delete('/:id', ...guard, c.deleteVoucher);

module.exports = router;
