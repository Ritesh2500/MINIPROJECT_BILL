const db = require('../config/db');

// GET /api/analytics/monthly
exports.getMonthlySpending = async (req, res) => {
  try {
    const userId = req.user.id;
    const { year = new Date().getFullYear() } = req.query;

    const targetYear = parseInt(year, 10) || new Date().getFullYear();

    // Fetch payments grouped by month for the target year
    const [payments] = await db.query(`
      SELECT payment_date, amount_paid FROM payments
      WHERE user_id = ? AND payment_date LIKE ?
    `, [userId, `${targetYear}-%`]);

    // Build 12 months array
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyData = monthNames.map((name, idx) => {
      const monthNum = String(idx + 1).padStart(2, '0');
      const prefix = `${targetYear}-${monthNum}`;
      const total = payments
        .filter(p => p.payment_date.startsWith(prefix))
        .reduce((sum, p) => sum + Number(p.amount_paid), 0);

      return {
        month: name,
        monthNumber: idx + 1,
        total: Math.round(total * 100) / 100
      };
    });

    return res.json({
      success: true,
      year: targetYear,
      monthly: monthlyData
    });
  } catch (error) {
    console.error('Error fetching monthly analytics:', error);
    return res.status(500).json({ success: false, message: 'Server error retrieving monthly analytics.' });
  }
};

// GET /api/analytics/categories
exports.getCategorySpending = async (req, res) => {
  try {
    const userId = req.user.id;
    const { startDate, endDate } = req.query;

    let query = `
      SELECT c.name, c.color, c.icon,
             COALESCE(SUM(p.amount_paid), 0) AS total_amount,
             COUNT(p.id) AS transaction_count
      FROM payments p
      JOIN bills b ON p.bill_id = b.id
      JOIN categories c ON b.category_id = c.id
      WHERE p.user_id = ?
    `;
    const params = [userId];

    if (startDate) {
      query += ` AND p.payment_date >= ?`;
      params.push(startDate);
    }
    if (endDate) {
      query += ` AND p.payment_date <= ?`;
      params.push(endDate);
    }

    query += ` GROUP BY c.id, c.name, c.color, c.icon ORDER BY total_amount DESC`;

    const [breakdown] = await db.query(query, params);

    const totalSpending = breakdown.reduce((sum, item) => sum + Number(item.total_amount), 0);

    const enriched = breakdown.map(cat => ({
      name: cat.name,
      color: cat.color,
      icon: cat.icon,
      amount: Math.round(Number(cat.total_amount) * 100) / 100,
      count: cat.transaction_count,
      percentage: totalSpending > 0 ? Math.round((Number(cat.total_amount) / totalSpending) * 1000) / 10 : 0
    }));

    return res.json({
      success: true,
      totalSpending: Math.round(totalSpending * 100) / 100,
      categories: enriched
    });
  } catch (error) {
    console.error('Error fetching category analytics:', error);
    return res.status(500).json({ success: false, message: 'Server error retrieving category analytics.' });
  }
};

// GET /api/analytics/overview
exports.getAnalyticsOverview = async (req, res) => {
  try {
    const userId = req.user.id;
    const todayStr = new Date().toISOString().split('T')[0];

    // Total Paid
    const [paidRes] = await db.query('SELECT COALESCE(SUM(amount_paid), 0) AS total_paid FROM payments WHERE user_id = ?', [userId]);
    const totalPaid = parseFloat(paidRes[0]?.total_paid || 0);

    // Total Overdue
    const [overdueRes] = await db.query(`
      SELECT COALESCE(SUM(amount), 0) AS total_overdue
      FROM bills
      WHERE user_id = ? AND payment_status != 'paid' AND due_date < ?
    `, [userId, todayStr]);
    const totalOverdue = parseFloat(overdueRes[0]?.total_overdue || 0);

    // Total Upcoming
    const [upcomingRes] = await db.query(`
      SELECT COALESCE(SUM(amount), 0) AS total_upcoming
      FROM bills
      WHERE user_id = ? AND payment_status != 'paid' AND due_date >= ?
    `, [userId, todayStr]);
    const totalUpcoming = parseFloat(upcomingRes[0]?.total_upcoming || 0);

    // Paid vs Unpaid breakdown for Donut/Pie charts
    const paidVsUnpaid = [
      { name: 'Paid', value: Math.round(totalPaid * 100) / 100, color: '#10B981' },
      { name: 'Overdue', value: Math.round(totalOverdue * 100) / 100, color: '#EF4444' },
      { name: 'Upcoming', value: Math.round(totalUpcoming * 100) / 100, color: '#3B82F6' }
    ];

    // Upcoming obligations in next 30 days
    const next30Date = new Date();
    next30Date.setDate(next30Date.getDate() + 30);
    const next30Str = next30Date.toISOString().split('T')[0];

    const [obligations] = await db.query(`
      SELECT b.*, c.name AS category_name, c.color AS category_color
      FROM bills b
      LEFT JOIN categories c ON b.category_id = c.id
      WHERE b.user_id = ? AND b.payment_status != 'paid' AND b.due_date >= ? AND b.due_date <= ?
      ORDER BY b.due_date ASC
    `, [userId, todayStr, next30Str]);

    // Payment methods distribution
    const [methods] = await db.query(`
      SELECT payment_method, COUNT(*) AS count, COALESCE(SUM(amount_paid), 0) AS total_amount
      FROM payments
      WHERE user_id = ?
      GROUP BY payment_method
      ORDER BY total_amount DESC
    `, [userId]);

    return res.json({
      success: true,
      paidVsUnpaid,
      obligations,
      paymentMethods: methods,
      summary: {
        totalPaid,
        totalOverdue,
        totalUpcoming,
        totalObligationsNext30: obligations.reduce((sum, o) => sum + Number(o.amount), 0)
      }
    });
  } catch (error) {
    console.error('Error fetching analytics overview:', error);
    return res.status(500).json({ success: false, message: 'Server error retrieving analytics overview.' });
  }
};
