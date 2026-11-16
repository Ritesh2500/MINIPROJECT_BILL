const express = require('express');
const router = express.Router();
const billsController = require('../controllers/billsController');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

router.get('/summary', billsController.getSummary);
router.get('/', billsController.getAllBills);
router.get('/:id', billsController.getBillById);
router.post('/', billsController.createBill);
router.put('/:id', billsController.updateBill);
router.delete('/:id', billsController.deleteBill);

module.exports = router;
