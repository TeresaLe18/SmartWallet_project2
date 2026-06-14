const express = require('express');
const router = express.Router();

const c = require('../controllers/category.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const adminMiddleware = require('../middlewares/admin.middleware');

const guard = [authMiddleware, adminMiddleware];

router.get('/', ...guard, c.listCategories);
router.post('/', ...guard, c.createCategory);
router.get('/:id', ...guard, c.getCategory);
router.patch('/:id', ...guard, c.updateCategory);
router.delete('/:id', ...guard, c.deleteCategory);

module.exports = router;
