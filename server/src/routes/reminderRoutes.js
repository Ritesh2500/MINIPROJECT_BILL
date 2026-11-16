const express = require('express');
const router = express.Router();
const remindersController = require('../controllers/remindersController');
const { processRemindersAndStatus } = require('../services/scheduler');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

router.get('/', remindersController.getReminders);
router.put('/:id/dismiss', remindersController.dismissReminder);

// Manual trigger for testing scheduler
router.post('/trigger', async (req, res) => {
  await processRemindersAndStatus();
  res.json({ success: true, message: 'Scheduler triggered successfully.' });
});

// Notifications
router.get('/notifications', remindersController.getNotifications);
router.put('/notifications/:id/read', remindersController.markAsRead);
router.delete('/notifications/:id', remindersController.deleteNotification);

module.exports = router;
