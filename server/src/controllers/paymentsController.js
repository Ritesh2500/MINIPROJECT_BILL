const db = require('../config/db');
const { calculateNextDueDate, calculateBillStatus } = require('../utils/statusCalculator');

// GET /api/payments
exports.getAllPayments = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      search,
      method,
      startDate,
      endDate,
      billId,
      page = 1,
      limit = 50
    } = req.query;

    let query = `
      SELECT p.*, b.name AS bill_name, b.amount AS bill_total_amount, b.due_date AS bill_due_date,
             c.name AS category_name, c.icon AS category_icon, c.color AS category_color
      FROM payments p
      JOIN bills b ON p.bill_id = b.id
      LEFT JOIN categories c ON b.category_id = c.id
      WHERE p.user_id = ?
    `;
    const params = [userId];

    if (billId) {
      query += ` AND p.bill_id = ?`;
      params.push(billId);
    }

    if (search && search.trim() !== '') {
      query += ` AND (b.name LIKE ? OR p.transaction_id LIKE ? OR p.notes LIKE ?)`;
      params.push(`%${search.trim()}%`, `%${search.trim()}%`, `%${search.trim()}%`);
    }

    if (method && method !== 'all') {
      query += ` AND p.payment_method = ?`;
      params.push(method);
    }

    if (startDate) {
      query += ` AND p.payment_date >= ?`;
      params.push(startDate);
    }

    if (endDate) {
      query += ` AND p.payment_date <= ?`;
      params.push(endDate);
    }

    query += ` ORDER BY p.payment_date DESC, p.created_at DESC`;

    const pageNum = Math.max(1, parseInt(page, 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const offset = (pageNum - 1) * pageSize;

    query += ` LIMIT ? OFFSET ?`;
    params.push(pageSize, offset);

    const [payments] = await db.query(query, params);

    // Count
    let countQuery = `
      SELECT COUNT(*) AS total
      FROM payments p
      JOIN bills b ON p.bill_id = b.id
      WHERE p.user_id = ?
    `;
    const countParams = [userId];
    if (billId) {
      countQuery += ` AND p.bill_id = ?`;
      countParams.push(billId);
    }
    if (search && search.trim() !== '') {
      countQuery += ` AND (b.name LIKE ? OR p.transaction_id LIKE ? OR p.notes LIKE ?)`;
      countParams.push(`%${search.trim()}%`, `%${search.trim()}%`, `%${search.trim()}%`);
    }
    if (method && method !== 'all') {
      countQuery += ` AND p.payment_method = ?`;
      countParams.push(method);
    }

    const [countResult] = await db.query(countQuery, countParams);
    const total = countResult[0]?.total || 0;

    return res.json({
      success: true,
      payments,
      pagination: {
        total,
        page: pageNum,
        limit: pageSize,
        totalPages: Math.ceil(total / pageSize)
      }
    });
  } catch (error) {
    console.error('Error fetching payments:', error);
    return res.status(500).json({ success: false, message: 'Server error retrieving payments.' });
  }
};

// POST /api/payments
exports.createPayment = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      bill_id,
      amount_paid,
      payment_date,
      payment_method = 'UPI',
      transaction_id = '',
      notes = ''
    } = req.body;

    if (!bill_id || !amount_paid || !payment_date) {
      return res.status(400).json({ success: false, message: 'Please provide bill ID, amount paid, and payment date.' });
    }

    const parsedAmount = parseFloat(amount_paid);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Amount paid must be greater than 0.' });
    }

    // Verify bill ownership
    const [bills] = await db.query('SELECT * FROM bills WHERE id = ? AND user_id = ?', [bill_id, userId]);
    if (!bills || bills.length === 0) {
      return res.status(404).json({ success: false, message: 'Bill not found.' });
    }

    const bill = bills[0];

    // Generate reference ID if not provided
    const txnId = transaction_id.trim() || `TXN-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

    // Insert payment record
    const [insertResult] = await db.query(`
      INSERT INTO payments (bill_id, user_id, amount_paid, payment_date, payment_method, transaction_id, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [bill_id, userId, parsedAmount, payment_date, payment_method, txnId, notes.trim()]);

    const newPaymentId = insertResult.insertId;

    // Calculate total amount paid for this bill
    const [paidSumResult] = await db.query('SELECT COALESCE(SUM(amount_paid), 0) AS total_paid FROM payments WHERE bill_id = ?', [bill_id]);
    const totalPaid = parseFloat(paidSumResult[0]?.total_paid || 0);

    let nextBillCreated = null;

    // Check if fully paid
    if (totalPaid >= parseFloat(bill.amount)) {
      await db.query(`UPDATE bills SET payment_status = 'paid', updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [bill_id]);

      // If bill is recurring and auto_generate_next is enabled, create next occurrence!
      if (bill.is_recurring && bill.auto_generate_next && bill.billing_frequency !== 'one-time') {
        const nextDueDate = calculateNextDueDate(bill.due_date, bill.billing_frequency);
        if (nextDueDate) {
          // Check if next occurrence already exists to prevent duplication
          const [existingNext] = await db.query(`
            SELECT id FROM bills WHERE user_id = ? AND category_id = ? AND name = ? AND due_date = ?
          `, [userId, bill.category_id, bill.name, nextDueDate]);

          if (!existingNext || existingNext.length === 0) {
            const nextSubsequentDue = calculateNextDueDate(nextDueDate, bill.billing_frequency);
            const [nextBillRes] = await db.query(`
              INSERT INTO bills (user_id, category_id, name, amount, due_date, billing_frequency, payment_status, description, reminder_days_before, is_recurring, auto_generate_next, next_due_date)
              VALUES (?, ?, ?, ?, ?, ?, 'upcoming', ?, ?, 1, 1, ?)
            `, [userId, bill.category_id, bill.name, bill.amount, nextDueDate, bill.billing_frequency, bill.description, bill.reminder_days_before, nextSubsequentDue]);

            nextBillCreated = nextBillRes.insertId;

            // In-app notification for new recurring bill
            await db.query(`
              INSERT INTO notifications (user_id, title, message, type, is_read, link)
              VALUES (?, 'Recurring Bill Generated', ?, 'info', 0, ?)
            `, [userId, `Next cycle for "${bill.name}" has been scheduled for ${nextDueDate}.`, `/bills/${nextBillCreated}`]);
          }
        }
      }
    } else {
      // Partially paid
      await db.query(`UPDATE bills SET payment_status = 'pending', updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [bill_id]);
    }

    // Create success notification
    await db.query(`
      INSERT INTO notifications (user_id, title, message, type, is_read, link)
      VALUES (?, 'Payment Recorded', ?, 'success', 0, '/payments')
    `, [userId, `Payment of $${parsedAmount.toFixed(2)} recorded for "${bill.name}" via ${payment_method}.`]);

    return res.status(201).json({
      success: true,
      message: 'Payment recorded successfully!',
      paymentId: newPaymentId,
      transactionId: txnId,
      totalPaid,
      isFullyPaid: totalPaid >= parseFloat(bill.amount),
      nextBillId: nextBillCreated
    });
  } catch (error) {
    console.error('Error creating payment:', error);
    return res.status(500).json({ success: false, message: 'Server error recording payment.' });
  }
};

// DELETE /api/payments/:id
exports.deletePayment = async (req, res) => {
  try {
    const userId = req.user.id;
    const paymentId = req.params.id;

    const [payments] = await db.query('SELECT * FROM payments WHERE id = ? AND user_id = ?', [paymentId, userId]);
    if (!payments || payments.length === 0) {
      return res.status(404).json({ success: false, message: 'Payment record not found.' });
    }

    const payment = payments[0];
    const billId = payment.bill_id;

    await db.query('DELETE FROM payments WHERE id = ?', [paymentId]);

    // Recalculate bill status
    const [billRows] = await db.query('SELECT * FROM bills WHERE id = ?', [billId]);
    if (billRows && billRows.length > 0) {
      const bill = billRows[0];
      const [sumRes] = await db.query('SELECT COALESCE(SUM(amount_paid), 0) AS total FROM payments WHERE bill_id = ?', [billId]);
      const currentPaid = parseFloat(sumRes[0]?.total || 0);

      let newStatus;
      if (currentPaid >= parseFloat(bill.amount)) {
        newStatus = 'paid';
      } else {
        newStatus = calculateBillStatus(bill.due_date, false);
      }
      await db.query('UPDATE bills SET payment_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [newStatus, billId]);
    }

    return res.json({
      success: true,
      message: 'Payment record deleted successfully.'
    });
  } catch (error) {
    console.error('Error deleting payment:', error);
    return res.status(500).json({ success: false, message: 'Server error deleting payment.' });
  }
};
