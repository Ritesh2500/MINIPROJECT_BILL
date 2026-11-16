const db = require('../config/db');
const { calculateBillStatus, calculateNextDueDate } = require('../utils/statusCalculator');

// GET /api/bills
exports.getAllBills = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      search,
      category,
      status,
      startDate,
      endDate,
      minAmount,
      maxAmount,
      sortBy = 'due_date',
      sortOrder = 'ASC',
      page = 1,
      limit = 50
    } = req.query;

    let query = `
      SELECT b.*, c.name AS category_name, c.icon AS category_icon, c.color AS category_color,
             COALESCE((SELECT SUM(amount_paid) FROM payments WHERE bill_id = b.id), 0) AS total_paid
      FROM bills b
      LEFT JOIN categories c ON b.category_id = c.id
      WHERE b.user_id = ?
    `;
    const params = [userId];

    if (search && search.trim() !== '') {
      query += ` AND (b.name LIKE ? OR b.description LIKE ?)`;
      params.push(`%${search.trim()}%`, `%${search.trim()}%`);
    }

    if (category && category !== 'all') {
      query += ` AND b.category_id = ?`;
      params.push(category);
    }

    if (status && status !== 'all') {
      query += ` AND b.payment_status = ?`;
      params.push(status);
    }

    if (startDate) {
      query += ` AND b.due_date >= ?`;
      params.push(startDate);
    }

    if (endDate) {
      query += ` AND b.due_date <= ?`;
      params.push(endDate);
    }

    if (minAmount) {
      query += ` AND b.amount >= ?`;
      params.push(Number(minAmount));
    }

    if (maxAmount) {
      query += ` AND b.amount <= ?`;
      params.push(Number(maxAmount));
    }

    // Allowed sort columns
    const allowedSortColumns = {
      due_date: 'b.due_date',
      amount: 'b.amount',
      name: 'b.name',
      status: 'b.payment_status',
      created_at: 'b.created_at'
    };
    const sortCol = allowedSortColumns[sortBy] || 'b.due_date';
    const direction = sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
    query += ` ORDER BY ${sortCol} ${direction}`;

    // Pagination
    const pageNum = Math.max(1, parseInt(page, 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const offset = (pageNum - 1) * pageSize;

    query += ` LIMIT ? OFFSET ?`;
    params.push(pageSize, offset);

    const [bills] = await db.query(query, params);

    // Dynamic status check (e.g. check if overdue)
    const todayStr = new Date().toISOString().split('T')[0];
    const updatedBills = bills.map(bill => {
      if (bill.payment_status !== 'paid' && bill.due_date < todayStr && bill.payment_status !== 'overdue') {
        bill.payment_status = 'overdue';
      }
      return bill;
    });

    // Total count for pagination
    let countQuery = `SELECT COUNT(*) AS total FROM bills WHERE user_id = ?`;
    const countParams = [userId];
    if (search && search.trim() !== '') {
      countQuery += ` AND (name LIKE ? OR description LIKE ?)`;
      countParams.push(`%${search.trim()}%`, `%${search.trim()}%`);
    }
    if (category && category !== 'all') {
      countQuery += ` AND category_id = ?`;
      countParams.push(category);
    }
    if (status && status !== 'all') {
      countQuery += ` AND payment_status = ?`;
      countParams.push(status);
    }

    const [countResult] = await db.query(countQuery, countParams);
    const total = countResult[0]?.total || 0;

    return res.json({
      success: true,
      bills: updatedBills,
      pagination: {
        total,
        page: pageNum,
        limit: pageSize,
        totalPages: Math.ceil(total / pageSize)
      }
    });
  } catch (error) {
    console.error('Error fetching bills:', error);
    return res.status(500).json({ success: false, message: 'Server error retrieving bills.' });
  }
};

// GET /api/bills/:id
exports.getBillById = async (req, res) => {
  try {
    const userId = req.user.id;
    const billId = req.params.id;

    const [bills] = await db.query(`
      SELECT b.*, c.name AS category_name, c.icon AS category_icon, c.color AS category_color
      FROM bills b
      LEFT JOIN categories c ON b.category_id = c.id
      WHERE b.id = ? AND b.user_id = ?
    `, [billId, userId]);

    if (!bills || bills.length === 0) {
      return res.status(404).json({ success: false, message: 'Bill not found.' });
    }

    const bill = bills[0];

    // Fetch payments for this bill
    const [payments] = await db.query(`
      SELECT * FROM payments WHERE bill_id = ? AND user_id = ? ORDER BY payment_date DESC, created_at DESC
    `, [billId, userId]);

    bill.payments = payments;
    bill.total_paid = payments.reduce((sum, p) => sum + Number(p.amount_paid), 0);
    bill.remaining_amount = Math.max(0, Number(bill.amount) - bill.total_paid);

    return res.json({
      success: true,
      bill
    });
  } catch (error) {
    console.error('Error fetching bill details:', error);
    return res.status(500).json({ success: false, message: 'Server error retrieving bill details.' });
  }
};

// POST /api/bills
exports.createBill = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      name,
      category_id,
      amount,
      due_date,
      billing_frequency = 'one-time',
      payment_status,
      description = '',
      reminder_days_before = 3,
      is_recurring = false,
      auto_generate_next = true
    } = req.body;

    if (!name || !amount || !due_date || !category_id) {
      return res.status(400).json({ success: false, message: 'Please provide bill name, category, amount, and due date.' });
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Please provide a valid bill amount greater than 0.' });
    }

    // Determine initial status if not explicitly 'paid'
    let status = payment_status;
    if (!status || status !== 'paid') {
      status = calculateBillStatus(due_date, false);
    }

    const recurringInt = is_recurring ? 1 : 0;
    const autoGenInt = auto_generate_next ? 1 : 0;
    const nextDue = recurringInt ? calculateNextDueDate(due_date, billing_frequency) : null;

    const [result] = await db.query(`
      INSERT INTO bills (user_id, category_id, name, amount, due_date, billing_frequency, payment_status, description, reminder_days_before, is_recurring, auto_generate_next, next_due_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [userId, category_id, name.trim(), parsedAmount, due_date, billing_frequency, status, description, reminder_days_before, recurringInt, autoGenInt, nextDue]);

    const newBillId = result.insertId;

    // Create reminder record
    const reminderDate = new Date(due_date);
    reminderDate.setDate(reminderDate.getDate() - parseInt(reminder_days_before, 10));
    const reminderDateStr = reminderDate.toISOString().split('T')[0];

    await db.query(`
      INSERT INTO reminders (bill_id, user_id, reminder_date, reminder_type, status, message)
      VALUES (?, ?, ?, 'several-days-before', 'pending', ?)
    `, [newBillId, userId, reminderDateStr, `Reminder: Bill "${name}" ($${parsedAmount}) is due on ${due_date}.`]);

    return res.status(201).json({
      success: true,
      message: 'Bill created successfully!',
      billId: newBillId
    });
  } catch (error) {
    console.error('Error creating bill:', error);
    return res.status(500).json({ success: false, message: 'Server error creating bill.' });
  }
};

// PUT /api/bills/:id
exports.updateBill = async (req, res) => {
  try {
    const userId = req.user.id;
    const billId = req.params.id;
    const {
      name,
      category_id,
      amount,
      due_date,
      billing_frequency,
      payment_status,
      description,
      reminder_days_before,
      is_recurring,
      auto_generate_next
    } = req.body;

    const [existing] = await db.query('SELECT * FROM bills WHERE id = ? AND user_id = ?', [billId, userId]);
    if (!existing || existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Bill not found.' });
    }

    const currentBill = existing[0];
    const newName = name !== undefined ? name.trim() : currentBill.name;
    const newCat = category_id !== undefined ? category_id : currentBill.category_id;
    const newAmount = amount !== undefined ? parseFloat(amount) : currentBill.amount;
    const newDueDate = due_date !== undefined ? due_date : currentBill.due_date;
    const newFreq = billing_frequency !== undefined ? billing_frequency : currentBill.billing_frequency;
    const newDesc = description !== undefined ? description : currentBill.description;
    const newRemDays = reminder_days_before !== undefined ? reminder_days_before : currentBill.reminder_days_before;
    const newRecurring = is_recurring !== undefined ? (is_recurring ? 1 : 0) : currentBill.is_recurring;
    const newAutoGen = auto_generate_next !== undefined ? (auto_generate_next ? 1 : 0) : currentBill.auto_generate_next;

    let newStatus = payment_status !== undefined ? payment_status : currentBill.payment_status;
    if (newStatus !== 'paid') {
      newStatus = calculateBillStatus(newDueDate, false);
    }

    const nextDue = newRecurring ? calculateNextDueDate(newDueDate, newFreq) : null;

    await db.query(`
      UPDATE bills
      SET name = ?, category_id = ?, amount = ?, due_date = ?, billing_frequency = ?,
          payment_status = ?, description = ?, reminder_days_before = ?, is_recurring = ?,
          auto_generate_next = ?, next_due_date = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `, [newName, newCat, newAmount, newDueDate, newFreq, newStatus, newDesc, newRemDays, newRecurring, newAutoGen, nextDue, billId, userId]);

    return res.json({
      success: true,
      message: 'Bill updated successfully!'
    });
  } catch (error) {
    console.error('Error updating bill:', error);
    return res.status(500).json({ success: false, message: 'Server error updating bill.' });
  }
};

// DELETE /api/bills/:id
exports.deleteBill = async (req, res) => {
  try {
    const userId = req.user.id;
    const billId = req.params.id;

    const [existing] = await db.query('SELECT id, name FROM bills WHERE id = ? AND user_id = ?', [billId, userId]);
    if (!existing || existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Bill not found.' });
    }

    // Delete bill (foreign keys ON DELETE CASCADE will handle payments and reminders)
    await db.query('DELETE FROM payments WHERE bill_id = ?', [billId]);
    await db.query('DELETE FROM reminders WHERE bill_id = ?', [billId]);
    await db.query('DELETE FROM bills WHERE id = ? AND user_id = ?', [billId, userId]);

    return res.json({
      success: true,
      message: `Bill "${existing[0].name}" deleted successfully.`
    });
  } catch (error) {
    console.error('Error deleting bill:', error);
    return res.status(500).json({ success: false, message: 'Server error deleting bill.' });
  }
};

// GET /api/bills/summary
exports.getSummary = async (req, res) => {
  try {
    const userId = req.user.id;
    const todayStr = new Date().toISOString().split('T')[0];

    // Total bills
    const [totalBillsRes] = await db.query('SELECT COUNT(*) AS total FROM bills WHERE user_id = ?', [userId]);
    const totalBills = totalBillsRes[0]?.total || 0;

    // Total paid all-time
    const [totalPaidRes] = await db.query('SELECT COALESCE(SUM(amount_paid), 0) AS total_paid FROM payments WHERE user_id = ?', [userId]);
    const totalAmountPaid = parseFloat(totalPaidRes[0]?.total_paid || 0);

    // Total amount due (unpaid or partially paid bills)
    const [unpaidBills] = await db.query(`
      SELECT b.id, b.amount,
             COALESCE((SELECT SUM(amount_paid) FROM payments WHERE bill_id = b.id), 0) AS paid
      FROM bills b
      WHERE b.user_id = ? AND b.payment_status != 'paid'
    `, [userId]);

    let totalAmountDue = 0;
    unpaidBills.forEach(b => {
      totalAmountDue += Math.max(0, Number(b.amount) - Number(b.paid));
    });

    // Upcoming bills (due today or in future and unpaid)
    const [upcomingRes] = await db.query(`
      SELECT COUNT(*) AS count, COALESCE(SUM(amount), 0) AS amount
      FROM bills
      WHERE user_id = ? AND payment_status != 'paid' AND due_date >= ?
    `, [userId, todayStr]);
    const upcomingCount = upcomingRes[0]?.count || 0;
    const upcomingAmount = parseFloat(upcomingRes[0]?.amount || 0);

    // Overdue bills (due date < today and unpaid)
    const [overdueRes] = await db.query(`
      SELECT COUNT(*) AS count, COALESCE(SUM(amount), 0) AS amount
      FROM bills
      WHERE user_id = ? AND payment_status != 'paid' AND due_date < ?
    `, [userId, todayStr]);
    const overdueCount = overdueRes[0]?.count || 0;
    const overdueAmount = parseFloat(overdueRes[0]?.amount || 0);

    // Current month expenses (all payments made in the current month)
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
    const startOfMonth = `${currentYear}-${currentMonth}-01`;
    const nextMonthYear = now.getMonth() === 11 ? currentYear + 1 : currentYear;
    const nextMonthMonth = String((now.getMonth() + 1) % 12 + 1).padStart(2, '0');
    const endOfMonth = `${nextMonthYear}-${nextMonthMonth}-01`;

    const [monthExpensesRes] = await db.query(`
      SELECT COALESCE(SUM(amount_paid), 0) AS month_total
      FROM payments
      WHERE user_id = ? AND payment_date >= ? AND payment_date < ?
    `, [userId, startOfMonth, endOfMonth]);
    const currentMonthExpenses = parseFloat(monthExpensesRes[0]?.month_total || 0);

    // Upcoming payments (next 5 upcoming bills)
    const [upcomingBills] = await db.query(`
      SELECT b.*, c.name AS category_name, c.icon AS category_icon, c.color AS category_color
      FROM bills b
      LEFT JOIN categories c ON b.category_id = c.id
      WHERE b.user_id = ? AND b.payment_status != 'paid'
      ORDER BY b.due_date ASC
      LIMIT 5
    `, [userId]);

    // Recently paid bills (last 5)
    const [recentlyPaid] = await db.query(`
      SELECT b.*, c.name AS category_name, c.icon AS category_icon, c.color AS category_color,
             p.payment_date, p.payment_method, p.amount_paid
      FROM payments p
      JOIN bills b ON p.bill_id = b.id
      LEFT JOIN categories c ON b.category_id = c.id
      WHERE p.user_id = ?
      ORDER BY p.payment_date DESC, p.created_at DESC
      LIMIT 5
    `, [userId]);

    // Recent transactions (last 6 payments)
    const [recentTransactions] = await db.query(`
      SELECT p.*, b.name AS bill_name, c.name AS category_name, c.color AS category_color, c.icon AS category_icon
      FROM payments p
      JOIN bills b ON p.bill_id = b.id
      LEFT JOIN categories c ON b.category_id = c.id
      WHERE p.user_id = ?
      ORDER BY p.payment_date DESC, p.created_at DESC
      LIMIT 6
    `, [userId]);

    // Category breakdown
    const [categorySpending] = await db.query(`
      SELECT c.name, c.color, c.icon, COALESCE(SUM(p.amount_paid), 0) AS total_amount
      FROM payments p
      JOIN bills b ON p.bill_id = b.id
      JOIN categories c ON b.category_id = c.id
      WHERE p.user_id = ?
      GROUP BY c.id, c.name, c.color, c.icon
      ORDER BY total_amount DESC
    `, [userId]);

    return res.json({
      success: true,
      summary: {
        totalBills,
        totalAmountDue,
        totalAmountPaid,
        upcomingBills: { count: upcomingCount, amount: upcomingAmount },
        overdueBills: { count: overdueCount, amount: overdueAmount },
        currentMonthExpenses
      },
      upcomingPayments: upcomingBills,
      recentlyPaid,
      recentTransactions,
      categorySpending
    });
  } catch (error) {
    console.error('Error fetching dashboard summary:', error);
    return res.status(500).json({ success: false, message: 'Server error retrieving summary data.' });
  }
};
