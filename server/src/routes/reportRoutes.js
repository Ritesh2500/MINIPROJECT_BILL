const express = require('express');
const router = express.Router();
const reportsController = require('../controllers/reportsController');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

router.get('/data', reportsController.getReportData);
router.get('/csv', reportsController.exportCsv);
router.get('/excel', reportsController.exportExcel);
router.get('/pdf', reportsController.exportPdf);

module.exports = router;
