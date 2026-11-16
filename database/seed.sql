-- ========================================================
-- BillMate – Seed Categories & Sample Demo Data
-- ========================================================

USE billmate_db;

-- 1. Insert Default System Categories
INSERT INTO categories (id, name, icon, color, is_default, user_id) VALUES
(1, 'Electricity', 'Zap', '#F59E0B', TRUE, NULL),
(2, 'Water', 'Droplets', '#06B6D4', TRUE, NULL),
(3, 'Mobile', 'Smartphone', '#10B981', TRUE, NULL),
(4, 'Internet', 'Wifi', '#3B82F6', TRUE, NULL),
(5, 'Rent', 'Home', '#8B5CF6', TRUE, NULL),
(6, 'College/School Fees', 'GraduationCap', '#EC4899', TRUE, NULL),
(7, 'Insurance', 'ShieldCheck', '#14B8A6', TRUE, NULL),
(8, 'Credit Card', 'CreditCard', '#EF4444', TRUE, NULL),
(9, 'Loan', 'Landmark', '#6366F1', TRUE, NULL),
(10, 'OTT Subscriptions', 'Tv', '#F97316', TRUE, NULL),
(11, 'Software Subscriptions', 'Code2', '#84CC16', TRUE, NULL),
(12, 'Transportation', 'Car', '#A855F7', TRUE, NULL),
(13, 'Healthcare', 'HeartPulse', '#E11D48', TRUE, NULL),
(14, 'Shopping', 'ShoppingBag', '#D97706', TRUE, NULL),
(15, 'Other', 'Tag', '#64748B', TRUE, NULL)
ON DUPLICATE KEY UPDATE name=VALUES(name), icon=VALUES(icon), color=VALUES(color);

-- 2. Demo User (Password is 'DemoPass123#' -> bcrypt hashed)
-- Hash generated with salt rounds 10: $2a$10$w8T0qG9/37q9Z2ZqI4fCSe8tI1mG8o7yB1D1Gg7QYwXkL3eN7iN/q (or seeded programmatically)
INSERT INTO users (id, name, email, password_hash, currency, theme) VALUES
(1, 'Alex Morgan', 'demo@billmate.app', '$2a$10$64K8wzP6w1P4nJk7r7/B3eKzI8YV6jVpUjUqgA/1gM.X1mP4nJk7r', 'USD', 'dark')
ON DUPLICATE KEY UPDATE name=VALUES(name);

INSERT INTO user_settings (user_id, currency, currency_symbol, email_notifications, in_app_notifications, dark_mode, reminder_days_default) VALUES
(1, 'USD', '$', TRUE, TRUE, TRUE, 3)
ON DUPLICATE KEY UPDATE currency=VALUES(currency);

-- 3. Demo Bills
INSERT INTO bills (id, user_id, category_id, name, amount, due_date, billing_frequency, payment_status, description, reminder_days_before, is_recurring, next_due_date) VALUES
(1, 1, 5, 'Apartment Rent', 1450.00, DATE_ADD(CURRENT_DATE, INTERVAL 4 DAY), 'monthly', 'upcoming', 'Monthly apartment rent for unit 402', 5, TRUE, DATE_ADD(CURRENT_DATE, INTERVAL 34 DAY)),
(2, 1, 1, 'City Power & Electric', 124.50, DATE_ADD(CURRENT_DATE, INTERVAL 2 DAY), 'monthly', 'upcoming', 'Electric utility bill for peak summer usage', 3, TRUE, DATE_ADD(CURRENT_DATE, INTERVAL 32 DAY)),
(3, 1, 4, 'Fiber Gigabit Internet', 79.99, DATE_SUB(CURRENT_DATE, INTERVAL 3 DAY), 'monthly', 'overdue', 'High-speed fiber optic home broadband', 2, TRUE, DATE_ADD(CURRENT_DATE, INTERVAL 27 DAY)),
(4, 1, 8, 'Platinum Card Minimum Due', 320.00, DATE_ADD(CURRENT_DATE, INTERVAL 8 DAY), 'monthly', 'pending', 'Monthly card statement payment', 4, TRUE, DATE_ADD(CURRENT_DATE, INTERVAL 38 DAY)),
(5, 1, 10, 'Netflix 4K Ultra', 22.99, DATE_SUB(CURRENT_DATE, INTERVAL 10 DAY), 'monthly', 'paid', 'Family streaming plan', 1, TRUE, DATE_ADD(CURRENT_DATE, INTERVAL 20 DAY)),
(6, 1, 11, 'GitHub Copilot Pro', 10.00, DATE_SUB(CURRENT_DATE, INTERVAL 14 DAY), 'monthly', 'paid', 'AI Developer tooling subscription', 2, TRUE, DATE_ADD(CURRENT_DATE, INTERVAL 16 DAY)),
(7, 1, 7, 'Auto Insurance Premium', 185.00, DATE_ADD(CURRENT_DATE, INTERVAL 15 DAY), 'monthly', 'upcoming', 'Comprehensive coverage policy #AZ992', 5, TRUE, DATE_ADD(CURRENT_DATE, INTERVAL 45 DAY)),
(8, 1, 2, 'Municipal Water Bill', 48.30, DATE_ADD(CURRENT_DATE, INTERVAL 1 DAY), 'quarterly', 'upcoming', 'Quarterly water and sewage charges', 3, TRUE, DATE_ADD(CURRENT_DATE, INTERVAL 91 DAY))
ON DUPLICATE KEY UPDATE amount=VALUES(amount);

-- 4. Demo Payments for Paid Bills
INSERT INTO payments (id, bill_id, user_id, amount_paid, payment_date, payment_method, transaction_id, notes) VALUES
(1, 5, 1, 22.99, DATE_SUB(CURRENT_DATE, INTERVAL 10 DAY), 'Credit Card', 'TXN-NFLX-99812', 'Auto-debited from Visa ending in 4021'),
(2, 6, 1, 10.00, DATE_SUB(CURRENT_DATE, INTERVAL 14 DAY), 'Debit Card', 'TXN-GH-77123', 'Monthly billing for GitHub developer suite')
ON DUPLICATE KEY UPDATE amount_paid=VALUES(amount_paid);

-- 5. Demo Notifications
INSERT INTO notifications (user_id, title, message, type, is_read, link) VALUES
(1, 'Bill Overdue Alert', 'Your Fiber Gigabit Internet bill of $79.99 is 3 days overdue.', 'warning', FALSE, '/bills/3'),
(2, 'Upcoming Due Date', 'City Power & Electric bill ($124.50) is due in 2 days.', 'reminder', FALSE, '/bills/2'),
(3, 'Payment Confirmed', 'Payment of $22.99 for Netflix 4K Ultra was recorded successfully.', 'success', TRUE, '/payments');

