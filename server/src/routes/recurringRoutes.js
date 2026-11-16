const express = require('express');
const router = express.Router();
const recurringController = require('../controllers/recurringController');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

router.get('/', recurringController.getRecurringBills);
router.put('/:id/toggle', recurringController.toggleRecurring);

module.exports = router;
