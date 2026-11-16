const db = require('../config/db');
const { calculateNextDueDate } = require('../utils/statusCalculator');

// GET /api/recurring
exports.getRecurringBills = async (req, res) => {
  try {
    const userId = req.user.id;

    const [bills] = await db.query(`
      SELECT b.*, c.name AS category_name, c.icon AS category_icon, c.color AS category_color,
             (SELECT COUNT(*) FROM payments WHERE bill_id = b.id) AS payment_cycles_completed
      FROM bills b
      LEFT JOIN categories c ON b.category_id = c.id
      WHERE b.user_id = ? AND b.is_recurring = 1
      ORDER BY b.due_date ASC
    `, [userId]);

    // Calculate monthly normalized cost for recurring expenses
    let monthlyRunRate = 0;
    bills.forEach(b => {
      const amt = Number(b.amount);
      switch (b.billing_frequency) {
        case 'daily': monthlyRunRate += amt * 30; break;
        case 'weekly': monthlyRunRate += amt * 4.33; break;
        case 'monthly': monthlyRunRate += amt; break;
        case 'quarterly': monthlyRunRate += amt / 3; break;
        case 'half-yearly': monthlyRunRate += amt / 6; break;
        case 'yearly': monthlyRunRate += amt / 12; break;
        default: monthlyRunRate += amt; break;
      }
    });

    return res.json({
      success: true,
      bills,
      summary: {
        totalRecurringBills: bills.length,
        estimatedMonthlyCost: Math.round(monthlyRunRate * 100) / 100,
        estimatedAnnualCost: Math.round(monthlyRunRate * 12 * 100) / 100
      }
    });
  } catch (error) {
    console.error('Error fetching recurring bills:', error);
    return res.status(500).json({ success: false, message: 'Server error retrieving recurring bills.' });
  }
};

// PUT /api/recurring/:id/toggle
exports.toggleRecurring = async (req, res) => {
  try {
    const userId = req.user.id;
    const billId = req.params.id;
    const { is_recurring } = req.body;

    const [bills] = await db.query('SELECT * FROM bills WHERE id = ? AND user_id = ?', [billId, userId]);
    if (!bills || bills.length === 0) {
      return res.status(404).json({ success: false, message: 'Bill not found.' });
    }

    const bill = bills[0];
    const newRecurring = is_recurring !== undefined ? (is_recurring ? 1 : 0) : (bill.is_recurring ? 0 : 1);
    const nextDue = newRecurring ? calculateNextDueDate(bill.due_date, bill.billing_frequency) : null;

    await db.query(`
      UPDATE bills
      SET is_recurring = ?, next_due_date = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `, [newRecurring, nextDue, billId, userId]);

    return res.json({
      success: true,
      message: newRecurring ? 'Bill set to recurring.' : 'Recurring billing disabled for this bill.',
      is_recurring: Boolean(newRecurring)
    });
  } catch (error) {
    console.error('Error toggling recurring status:', error);
    return res.status(500).json({ success: false, message: 'Server error updating recurring status.' });
  }
};
