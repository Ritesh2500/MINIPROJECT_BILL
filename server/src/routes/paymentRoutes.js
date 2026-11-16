const express = require('express');
const router = express.Router();
const paymentsController = require('../controllers/paymentsController');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

router.get('/', paymentsController.getAllPayments);
router.post('/', paymentsController.createPayment);
router.delete('/:id', paymentsController.deletePayment);

module.exports = router;
