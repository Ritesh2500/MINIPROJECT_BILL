const db = require('../config/db');

// GET /api/categories
exports.getCategories = async (req, res) => {
  try {
    const userId = req.user.id;

    // Fetch system default categories + user custom categories
    const [categories] = await db.query(`
      SELECT * FROM categories
      WHERE is_default = 1 OR user_id = ?
      ORDER BY is_default DESC, name ASC
    `, [userId]);

    return res.json({
      success: true,
      categories
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return res.status(500).json({ success: false, message: 'Server error retrieving categories.' });
  }
};

// POST /api/categories
exports.createCategory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, icon = 'Tag', color = '#3B82F6' } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ success: false, message: 'Category name is required.' });
    }

    const trimmedName = name.trim();

    // Check if category name already exists for this user or in defaults
    const [existing] = await db.query(`
      SELECT id FROM categories WHERE LOWER(name) = LOWER(?) AND (is_default = 1 OR user_id = ?)
    `, [trimmedName, userId]);

    if (existing && existing.length > 0) {
      return res.status(409).json({ success: false, message: 'A category with this name already exists.' });
    }

    const [resInsert] = await db.query(`
      INSERT INTO categories (name, icon, color, is_default, user_id)
      VALUES (?, ?, ?, 0, ?)
    `, [trimmedName, icon, color, userId]);

    return res.status(201).json({
      success: true,
      message: 'Category created successfully!',
      category: {
        id: resInsert.insertId,
        name: trimmedName,
        icon,
        color,
        is_default: 0,
        user_id: userId
      }
    });
  } catch (error) {
    console.error('Error creating category:', error);
    return res.status(500).json({ success: false, message: 'Server error creating category.' });
  }
};
