const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

router.get('/', settingsController.getSettings);
router.put('/', settingsController.updateSettings);
router.put('/profile', settingsController.updateProfile);
router.put('/password', settingsController.changePassword);
router.get('/export-all', settingsController.exportUserData);

module.exports = router;
