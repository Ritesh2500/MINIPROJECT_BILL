const express = require('express');
const router = express.Router();
const categoriesController = require('../controllers/categoriesController');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

router.get('/', categoriesController.getCategories);
router.post('/', categoriesController.createCategory);

module.exports = router;
