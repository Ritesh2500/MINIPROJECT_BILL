const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'billmate_super_secret_jwt_key_2026_xyz!@#';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

exports.register = async (req, res) => {
  try {
    const { name, email, password, currency = 'USD' } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide name, email, and password.' });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
    }

    // Check email uniqueness
    const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [trimmedEmail]);
    if (existing && existing.length > 0) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Insert user
    const [result] = await db.query(
      'INSERT INTO users (name, email, password_hash, currency, theme) VALUES (?, ?, ?, ?, ?)',
      [name.trim(), trimmedEmail, passwordHash, currency, 'dark']
    );

    const newUserId = result.insertId;

    // Create user settings
    const symbolMap = { USD: '$', EUR: '€', GBP: '£', INR: '₹', CAD: 'C$', AUD: 'A$' };
    const currSymbol = symbolMap[currency] || '$';

    await db.query(
      `INSERT INTO user_settings (user_id, currency, currency_symbol, email_notifications, in_app_notifications, dark_mode, reminder_days_default)
       VALUES (?, ?, ?, 1, 1, 1, 3)`,
      [newUserId, currency, currSymbol]
    );

    // Create welcome notification
    await db.query(
      `INSERT INTO notifications (user_id, title, message, type, is_read, link)
       VALUES (?, 'Welcome to BillMate! 🎉', 'Start tracking your financial obligations by adding your first bill.', 'info', 0, '/bills/new')`,
      [newUserId]
    );

    const user = {
      id: newUserId,
      name: name.trim(),
      email: trimmedEmail,
      currency,
      theme: 'dark'
    };

    const token = generateToken(user);

    return res.status(201).json({
      success: true,
      message: 'Registration successful! Welcome to BillMate.',
      token,
      user
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ success: false, message: 'Server error during registration. Please try again.' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide both email and password.' });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const [users] = await db.query(
      'SELECT id, name, email, password_hash, currency, theme FROM users WHERE email = ?',
      [trimmedEmail]
    );

    if (!users || users.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const user = users[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const token = generateToken(user);

    delete user.password_hash;

    // Fetch user settings
    const [settings] = await db.query('SELECT * FROM user_settings WHERE user_id = ?', [user.id]);
    user.settings = settings && settings.length > 0 ? settings[0] : null;

    return res.json({
      success: true,
      message: 'Login successful.',
      token,
      user
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, message: 'Server error during login. Please try again.' });
  }
};

exports.getMe = async (req, res) => {
  try {
    const [users] = await db.query(
      'SELECT id, name, email, currency, theme, avatar_url, created_at FROM users WHERE id = ?',
      [req.user.id]
    );

    if (!users || users.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const user = users[0];
    const [settings] = await db.query('SELECT * FROM user_settings WHERE user_id = ?', [user.id]);
    user.settings = settings && settings.length > 0 ? settings[0] : null;

    return res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('GetMe error:', error);
    return res.status(500).json({ success: false, message: 'Server error retrieving user.' });
  }
};

exports.logout = async (req, res) => {
  return res.json({ success: true, message: 'Logged out successfully.' });
};
