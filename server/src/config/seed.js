const bcrypt = require('bcryptjs');
const db = require('./db');

async function seed() {
  console.log('--- Starting BillMate Database Seeding ---');
  try {
    // Check if demo user already exists
    const [existing] = await db.query('SELECT id FROM users WHERE email = ?', ['demo@billmate.app']);
    let userId;

    if (existing && existing.length > 0) {
      userId = existing[0].id;
      console.log(`Demo user already exists (ID: ${userId})`);
    } else {
      const passwordHash = await bcrypt.hash('DemoPass123#', 10);
      const [res] = await db.query(
        'INSERT INTO users (name, email, password_hash, currency, theme) VALUES (?, ?, ?, ?, ?)',
        ['Alex Morgan', 'demo@billmate.app', passwordHash, 'USD', 'dark']
      );
      userId = res.insertId;
      console.log(`✓ Created Demo User 'demo@billmate.app' with password 'DemoPass123#' (ID: ${userId})`);

      // Create user settings
      await db.query(
        'INSERT INTO user_settings (user_id, currency, currency_symbol, email_notifications, in_app_notifications, dark_mode, reminder_days_default) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [userId, 'USD', '$', 1, 1, 1, 3]
      );
    }

    // Check if demo bills exist
    const [existingBills] = await db.query('SELECT COUNT(*) as count FROM bills WHERE user_id = ?', [userId]);
    const billCount = existingBills[0]?.count || 0;

    if (billCount === 0) {
      console.log('Seeding demo bills and payments...');

      // Get categories
      const [cats] = await db.query('SELECT id, name FROM categories');
      const catMap = {};
      cats.forEach(c => { catMap[c.name] = c.id; });

      const now = new Date();
      const formatDate = (daysOffset) => {
        const d = new Date(now);
        d.setDate(d.getDate() + daysOffset);
        return d.toISOString().split('T')[0];
      };

      const demoBills = [
        {
          name: 'Apartment Rent',
          categoryId: catMap['Rent'] || 5,
          amount: 1450.00,
          dueDate: formatDate(4),
          frequency: 'monthly',
          status: 'upcoming',
          desc: 'Monthly apartment rent for unit 402',
          recurring: 1,
          nextDue: formatDate(34)
        },
        {
          name: 'City Power & Electric',
          categoryId: catMap['Electricity'] || 1,
          amount: 124.50,
          dueDate: formatDate(2),
          frequency: 'monthly',
          status: 'upcoming',
          desc: 'Electric utility bill for peak summer usage',
          recurring: 1,
          nextDue: formatDate(32)
        },
        {
          name: 'Fiber Gigabit Internet',
          categoryId: catMap['Internet'] || 4,
          amount: 79.99,
          dueDate: formatDate(-3),
          frequency: 'monthly',
          status: 'overdue',
          desc: 'High-speed fiber optic broadband connection',
          recurring: 1,
          nextDue: formatDate(27)
        },
        {
          name: 'Platinum Card Minimum Due',
          categoryId: catMap['Credit Card'] || 8,
          amount: 320.00,
          dueDate: formatDate(8),
          frequency: 'monthly',
          status: 'pending',
          desc: 'Monthly card statement payment',
          recurring: 1,
          nextDue: formatDate(38)
        },
        {
          name: 'Netflix 4K Ultra',
          categoryId: catMap['OTT Subscriptions'] || 10,
          amount: 22.99,
          dueDate: formatDate(-10),
          frequency: 'monthly',
          status: 'paid',
          desc: 'Family streaming plan',
          recurring: 1,
          nextDue: formatDate(20)
        },
        {
          name: 'GitHub Copilot Pro',
          categoryId: catMap['Software Subscriptions'] || 11,
          amount: 10.00,
          dueDate: formatDate(-14),
          frequency: 'monthly',
          status: 'paid',
          desc: 'AI Developer tooling subscription',
          recurring: 1,
          nextDue: formatDate(16)
        },
        {
          name: 'Auto Insurance Premium',
          categoryId: catMap['Insurance'] || 7,
          amount: 185.00,
          dueDate: formatDate(15),
          frequency: 'monthly',
          status: 'upcoming',
          desc: 'Comprehensive vehicle insurance policy #AZ992',
          recurring: 1,
          nextDue: formatDate(45)
        },
        {
          name: 'Municipal Water Bill',
          categoryId: catMap['Water'] || 2,
          amount: 48.30,
          dueDate: formatDate(1),
          frequency: 'quarterly',
          status: 'upcoming',
          desc: 'Quarterly clean water and sewage charges',
          recurring: 1,
          nextDue: formatDate(91)
        }
      ];

      for (const b of demoBills) {
        const [billRes] = await db.query(
          `INSERT INTO bills (user_id, category_id, name, amount, due_date, billing_frequency, payment_status, description, reminder_days_before, is_recurring, next_due_date)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 3, ?, ?)`,
          [userId, b.categoryId, b.name, b.amount, b.dueDate, b.frequency, b.status, b.desc, b.recurring, b.nextDue]
        );

        const newBillId = billRes.insertId;

        // If status is paid, create a payment record
        if (b.status === 'paid') {
          await db.query(
            `INSERT INTO payments (bill_id, user_id, amount_paid, payment_date, payment_method, transaction_id, notes)
             VALUES (?, ?, ?, ?, 'Credit Card', ?, 'Auto-payment processed')`,
            [newBillId, userId, b.amount, b.dueDate, `TXN-${Math.floor(100000 + Math.random() * 900000)}`]
          );
        }
      }

      // Add demo notifications
      await db.query(
        `INSERT INTO notifications (user_id, title, message, type, is_read, link)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [userId, 'Bill Overdue Alert', 'Your Fiber Gigabit Internet bill of $79.99 is 3 days overdue.', 'warning', 0, '/bills']
      );
      await db.query(
        `INSERT INTO notifications (user_id, title, message, type, is_read, link)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [userId, 'Upcoming Due Date', 'City Power & Electric bill ($124.50) is due in 2 days.', 'reminder', 0, '/bills']
      );
      await db.query(
        `INSERT INTO notifications (user_id, title, message, type, is_read, link)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [userId, 'Payment Confirmed', 'Payment of $22.99 for Netflix 4K Ultra was recorded successfully.', 'success', 1, '/payments']
      );

      console.log('✓ Seeded demo bills, payments, and notifications.');
    } else {
      console.log(`Found ${billCount} existing bills. Skipping demo bills.`);
    }

    console.log('✓ Database seeding completed successfully.');
  } catch (err) {
    console.error('Error during seeding:', err);
  }
}

if (require.main === module) {
  seed().then(() => process.exit(0));
}

module.exports = seed;
