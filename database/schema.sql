-- ========================================================
-- BillMate – Personal Bill & Payment Management System
-- Production MySQL Database Schema
-- ========================================================

CREATE DATABASE IF NOT EXISTS billmate_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE billmate_db;

-- --------------------------------------------------------
-- 1. Users Table
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(191) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  currency VARCHAR(10) DEFAULT 'USD',
  theme VARCHAR(20) DEFAULT 'dark',
  avatar_url VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 2. Categories Table
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  icon VARCHAR(50) DEFAULT 'Tag',
  color VARCHAR(50) DEFAULT '#3B82F6',
  is_default BOOLEAN DEFAULT TRUE,
  user_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_categories_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 3. Bills Table
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS bills (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  category_id INT NOT NULL,
  name VARCHAR(150) NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  due_date DATE NOT NULL,
  billing_frequency ENUM('one-time', 'daily', 'weekly', 'monthly', 'quarterly', 'half-yearly', 'yearly') DEFAULT 'one-time',
  payment_status ENUM('upcoming', 'pending', 'paid', 'overdue') DEFAULT 'upcoming',
  description TEXT NULL,
  reminder_days_before INT DEFAULT 3,
  is_recurring BOOLEAN DEFAULT FALSE,
  auto_generate_next BOOLEAN DEFAULT TRUE,
  next_due_date DATE NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT,
  INDEX idx_bills_user_due (user_id, due_date),
  INDEX idx_bills_status (user_id, payment_status),
  INDEX idx_bills_recurring (is_recurring, payment_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 4. Payments Table
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  bill_id INT NOT NULL,
  user_id INT NOT NULL,
  amount_paid DECIMAL(12, 2) NOT NULL,
  payment_date DATE NOT NULL,
  payment_method ENUM('UPI', 'Debit Card', 'Credit Card', 'Net Banking', 'Cash', 'Other') DEFAULT 'UPI',
  transaction_id VARCHAR(100) NULL,
  notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_payments_user_date (user_id, payment_date),
  INDEX idx_payments_bill (bill_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 5. Reminders Table
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS reminders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  bill_id INT NOT NULL,
  user_id INT NOT NULL,
  reminder_date DATE NOT NULL,
  reminder_type ENUM('several-days-before', 'one-day-before', 'due-date', 'overdue') DEFAULT 'due-date',
  status ENUM('pending', 'sent', 'dismissed') DEFAULT 'pending',
  message VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_reminders_date (reminder_date, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 6. Notifications Table
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(150) NOT NULL,
  message TEXT NOT NULL,
  type ENUM('info', 'reminder', 'warning', 'success') DEFAULT 'info',
  is_read BOOLEAN DEFAULT FALSE,
  link VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_notif_user_read (user_id, is_read)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 7. User Settings Table
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_settings (
  user_id INT PRIMARY KEY,
  currency VARCHAR(10) DEFAULT 'USD',
  currency_symbol VARCHAR(5) DEFAULT '$',
  email_notifications BOOLEAN DEFAULT TRUE,
  in_app_notifications BOOLEAN DEFAULT TRUE,
  dark_mode BOOLEAN DEFAULT TRUE,
  reminder_days_default INT DEFAULT 3,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

