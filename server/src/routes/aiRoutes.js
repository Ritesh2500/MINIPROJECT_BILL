const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

router.post('/ask', aiController.askAssistant);
router.get('/insights', aiController.getSmartInsights);
router.get('/predictions', aiController.getPredictions);

module.exports = router;
