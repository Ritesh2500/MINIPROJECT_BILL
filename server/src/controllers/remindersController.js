const db = require('../config/db');

// GET /api/notifications
exports.getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;

    const [notifications] = await db.query(`
      SELECT * FROM notifications
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 100
    `, [userId]);

    const unreadCount = notifications.filter(n => !n.is_read).length;

    return res.json({
      success: true,
      notifications,
      unreadCount
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return res.status(500).json({ success: false, message: 'Server error retrieving notifications.' });
  }
};

// PUT /api/notifications/:id/read
exports.markAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const notifId = req.params.id;

    if (notifId === 'all') {
      await db.query('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [userId]);
      return res.json({ success: true, message: 'All notifications marked as read.' });
    }

    await db.query('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?', [notifId, userId]);
    return res.json({ success: true, message: 'Notification marked as read.' });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return res.status(500).json({ success: false, message: 'Server error updating notification.' });
  }
};

// DELETE /api/notifications/:id
exports.deleteNotification = async (req, res) => {
  try {
    const userId = req.user.id;
    const notifId = req.params.id;

    if (notifId === 'all') {
      await db.query('DELETE FROM notifications WHERE user_id = ?', [userId]);
      return res.json({ success: true, message: 'All notifications cleared.' });
    }

    await db.query('DELETE FROM notifications WHERE id = ? AND user_id = ?', [notifId, userId]);
    return res.json({ success: true, message: 'Notification deleted.' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    return res.status(500).json({ success: false, message: 'Server error deleting notification.' });
  }
};

// GET /api/reminders
exports.getReminders = async (req, res) => {
  try {
    const userId = req.user.id;

    const [reminders] = await db.query(`
      SELECT r.*, b.name AS bill_name, b.amount AS bill_amount, b.due_date, b.payment_status,
             c.name AS category_name, c.color AS category_color, c.icon AS category_icon
      FROM reminders r
      JOIN bills b ON r.bill_id = b.id
      LEFT JOIN categories c ON b.category_id = c.id
      WHERE r.user_id = ? AND r.status != 'dismissed'
      ORDER BY r.reminder_date ASC
    `, [userId]);

    return res.json({
      success: true,
      reminders
    });
  } catch (error) {
    console.error('Error fetching reminders:', error);
    return res.status(500).json({ success: false, message: 'Server error retrieving reminders.' });
  }
};

// PUT /api/reminders/:id/dismiss
exports.dismissReminder = async (req, res) => {
  try {
    const userId = req.user.id;
    const reminderId = req.params.id;

    await db.query('UPDATE reminders SET status = ? WHERE id = ? AND user_id = ?', ['dismissed', reminderId, userId]);

    return res.json({ success: true, message: 'Reminder dismissed.' });
  } catch (error) {
    console.error('Error dismissing reminder:', error);
    return res.status(500).json({ success: false, message: 'Server error dismissing reminder.' });
  }
};
