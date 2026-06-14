const express = require('express');
const router = express.Router();

const c = require('../controllers/fee.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const adminMiddleware = require('../middlewares/admin.middleware');

const guard = [authMiddleware, adminMiddleware];

router.get('/', ...guard, c.listFees);
router.post('/', ...guard, c.createFee);
router.get('/:id', ...guard, c.getFee);
router.patch('/:id', ...guard, c.updateFee);
router.delete('/:id', ...guard, c.deleteFee);

module.exports = router;
