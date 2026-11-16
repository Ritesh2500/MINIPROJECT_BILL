const bcrypt = require('bcryptjs');
const db = require('../config/db');

// GET /api/settings
exports.getSettings = async (req, res) => {
  try {
    const userId = req.user.id;

    const [settings] = await db.query('SELECT * FROM user_settings WHERE user_id = ?', [userId]);
    const userSettings = settings && settings.length > 0 ? settings[0] : {
      user_id: userId,
      currency: 'USD',
      currency_symbol: '$',
      email_notifications: 1,
      in_app_notifications: 1,
      dark_mode: 1,
      reminder_days_default: 3
    };

    return res.json({
      success: true,
      settings: userSettings
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return res.status(500).json({ success: false, message: 'Server error retrieving settings.' });
  }
};

// PUT /api/settings
exports.updateSettings = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      currency = 'USD',
      email_notifications = true,
      in_app_notifications = true,
      dark_mode = true,
      reminder_days_default = 3
    } = req.body;

    const symbolMap = { USD: '$', EUR: '€', GBP: '£', INR: '₹', CAD: 'C$', AUD: 'A$', JPY: '¥' };
    const currency_symbol = symbolMap[currency] || '$';

    await db.query(`
      INSERT INTO user_settings (user_id, currency, currency_symbol, email_notifications, in_app_notifications, dark_mode, reminder_days_default)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        currency = excluded.currency,
        currency_symbol = excluded.currency_symbol,
        email_notifications = excluded.email_notifications,
        in_app_notifications = excluded.in_app_notifications,
        dark_mode = excluded.dark_mode,
        reminder_days_default = excluded.reminder_days_default,
        updated_at = CURRENT_TIMESTAMP
    `, [
      userId,
      currency,
      currency_symbol,
      email_notifications ? 1 : 0,
      in_app_notifications ? 1 : 0,
      dark_mode ? 1 : 0,
      parseInt(reminder_days_default, 10)
    ]);

    // Also update users table currency and theme
    await db.query('UPDATE users SET currency = ?, theme = ? WHERE id = ?', [
      currency,
      dark_mode ? 'dark' : 'light',
      userId
    ]);

    return res.json({
      success: true,
      message: 'Settings updated successfully!',
      settings: {
        currency,
        currency_symbol,
        email_notifications: Boolean(email_notifications),
        in_app_notifications: Boolean(in_app_notifications),
        dark_mode: Boolean(dark_mode),
        reminder_days_default: parseInt(reminder_days_default, 10)
      }
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    return res.status(500).json({ success: false, message: 'Server error updating settings.' });
  }
};

// PUT /api/settings/profile
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, email } = req.body;

    if (!name || !email) {
      return res.status(400).json({ success: false, message: 'Name and email are required.' });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const [existing] = await db.query('SELECT id FROM users WHERE email = ? AND id != ?', [trimmedEmail, userId]);
    if (existing && existing.length > 0) {
      return res.status(409).json({ success: false, message: 'This email is already in use by another account.' });
    }

    await db.query('UPDATE users SET name = ?, email = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [name.trim(), trimmedEmail, userId]);

    return res.json({
      success: true,
      message: 'Profile updated successfully!',
      user: {
        id: userId,
        name: name.trim(),
        email: trimmedEmail
      }
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    return res.status(500).json({ success: false, message: 'Server error updating profile.' });
  }
};

// PUT /api/settings/password
exports.changePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json({ success: false, message: 'Both current password and new password are required.' });
    }

    if (new_password.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters long.' });
    }

    const [users] = await db.query('SELECT password_hash FROM users WHERE id = ?', [userId]);
    if (!users || users.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const isMatch = await bcrypt.compare(current_password, users[0].password_hash);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Current password does not match.' });
    }

    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(new_password, salt);

    await db.query('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [newHash, userId]);

    return res.json({
      success: true,
      message: 'Password changed successfully!'
    });
  } catch (error) {
    console.error('Error changing password:', error);
    return res.status(500).json({ success: false, message: 'Server error changing password.' });
  }
};

// GET /api/settings/export-all
exports.exportUserData = async (req, res) => {
  try {
    const userId = req.user.id;

    const [user] = await db.query('SELECT id, name, email, currency, theme, created_at FROM users WHERE id = ?', [userId]);
    const [bills] = await db.query('SELECT * FROM bills WHERE user_id = ?', [userId]);
    const [payments] = await db.query('SELECT * FROM payments WHERE user_id = ?', [userId]);
    const [categories] = await db.query('SELECT * FROM categories WHERE user_id = ? OR is_default = 1', [userId]);

    return res.json({
      success: true,
      userData: {
        profile: user[0],
        bills,
        payments,
        categories
      }
    });
  } catch (error) {
    console.error('Error exporting user data:', error);
    return res.status(500).json({ success: false, message: 'Server error exporting user data.' });
  }
};
