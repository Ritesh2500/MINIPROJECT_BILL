const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

router.get('/overview', analyticsController.getAnalyticsOverview);
router.get('/monthly', analyticsController.getMonthlySpending);
router.get('/categories', analyticsController.getCategorySpending);

module.exports = router;
