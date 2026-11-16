const cron = require('node-cron');
const db = require('../config/db');

async function processRemindersAndStatus() {
  console.log('[Scheduler] Running reminder check & status updates...');
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    // 1. Find all unpaid bills
    const [unpaidBills] = await db.query(`
      SELECT b.*, u.name AS user_name
      FROM bills b
      JOIN users u ON b.user_id = u.id
      WHERE b.payment_status != 'paid'
    `);

    for (const bill of unpaidBills) {
      const billDue = new Date(bill.due_date);
      billDue.setHours(0, 0, 0, 0);
      const diffDays = Math.ceil((billDue.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      // Overdue check
      if (diffDays < 0) {
        if (bill.payment_status !== 'overdue') {
          await db.query(`UPDATE bills SET payment_status = 'overdue', updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [bill.id]);
        }

        // Check if overdue notification exists in past 3 days
        const [existing] = await db.query(`
          SELECT id FROM notifications
          WHERE user_id = ? AND type = 'warning' AND message LIKE ? AND created_at >= date('now', '-3 days')
        `, [bill.user_id, `%${bill.name}%`]);

        if (!existing || existing.length === 0) {
          await db.query(`
            INSERT INTO notifications (user_id, title, message, type, is_read, link)
            VALUES (?, 'Bill Overdue Alert', ?, 'warning', 0, ?)
          `, [bill.user_id, `Your bill "${bill.name}" of $${Number(bill.amount).toFixed(2)} is overdue by ${Math.abs(diffDays)} day(s).`, `/bills/${bill.id}`]);
        }
      } else if (diffDays === 0) {
        // Due today
        const [existing] = await db.query(`
          SELECT id FROM notifications
          WHERE user_id = ? AND message LIKE ? AND created_at >= date('now', '-1 day')
        `, [bill.user_id, `%${bill.name}%due today%`]);

        if (!existing || existing.length === 0) {
          await db.query(`
            INSERT INTO notifications (user_id, title, message, type, is_read, link)
            VALUES (?, 'Bill Due Today ⚠️', ?, 'reminder', 0, ?)
          `, [bill.user_id, `Your bill "${bill.name}" ($${Number(bill.amount).toFixed(2)}) is due today!`, `/bills/${bill.id}`]);
        }
      } else if (diffDays === 1) {
        // Due tomorrow (one-day-before)
        const [existing] = await db.query(`
          SELECT id FROM notifications
          WHERE user_id = ? AND message LIKE ? AND created_at >= date('now', '-1 day')
        `, [bill.user_id, `%${bill.name}%due tomorrow%`]);

        if (!existing || existing.length === 0) {
          await db.query(`
            INSERT INTO notifications (user_id, title, message, type, is_read, link)
            VALUES (?, 'Upcoming Bill Reminder', ?, 'reminder', 0, ?)
          `, [bill.user_id, `Bill "${bill.name}" ($${Number(bill.amount).toFixed(2)}) is due tomorrow.`, `/bills/${bill.id}`]);
        }
      } else if (diffDays === bill.reminder_days_before) {
        // Several days before reminder
        const [existing] = await db.query(`
          SELECT id FROM notifications
          WHERE user_id = ? AND message LIKE ? AND created_at >= date('now', '-2 days')
        `, [bill.user_id, `%${bill.name}%due in ${diffDays} days%`]);

        if (!existing || existing.length === 0) {
          await db.query(`
            INSERT INTO notifications (user_id, title, message, type, is_read, link)
            VALUES (?, 'Upcoming Bill Notice', ?, 'info', 0, ?)
          `, [bill.user_id, `Notice: "${bill.name}" ($${Number(bill.amount).toFixed(2)}) is due in ${diffDays} days.`, `/bills/${bill.id}`]);
        }
      }
    }

    console.log(`[Scheduler] Checked ${unpaidBills.length} unpaid bills. Statuses & notifications updated.`);
  } catch (error) {
    console.error('[Scheduler Error]:', error);
  }
}

function initScheduler() {
  // Run on startup
  setTimeout(processRemindersAndStatus, 3000);

  // Run every hour
  cron.schedule('0 * * * *', () => {
    processRemindersAndStatus();
  });

  console.log('✓ BillMate background scheduler initialized (Hourly cadence + initial boot run).');
}

module.exports = {
  initScheduler,
  processRemindersAndStatus
};
