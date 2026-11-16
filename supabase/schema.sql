-- ========================================================
-- BillMate – Supabase PostgreSQL Schema with RLS
-- Project: BillMate Personal Bill & Payment Management
-- ========================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- --------------------------------------------------------
-- 1. Profiles Table (Extends auth.users)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  currency TEXT DEFAULT 'USD',
  theme TEXT DEFAULT 'dark',
  avatar_url TEXT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- --------------------------------------------------------
-- 2. User Settings Table
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  currency TEXT DEFAULT 'USD',
  currency_symbol TEXT DEFAULT '$',
  email_notifications BOOLEAN DEFAULT TRUE,
  in_app_notifications BOOLEAN DEFAULT TRUE,
  dark_mode BOOLEAN DEFAULT TRUE,
  reminder_days_default INT DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- --------------------------------------------------------
-- 3. Categories Table
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.categories (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT DEFAULT 'Tag',
  color TEXT DEFAULT '#3B82F6',
  is_default BOOLEAN DEFAULT TRUE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- --------------------------------------------------------
-- 4. Bills Table
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bills (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id BIGINT NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  due_date DATE NOT NULL,
  billing_frequency TEXT DEFAULT 'one-time',
  payment_status TEXT DEFAULT 'upcoming',
  description TEXT NULL,
  reminder_days_before INT DEFAULT 3,
  is_recurring BOOLEAN DEFAULT FALSE,
  auto_generate_next BOOLEAN DEFAULT TRUE,
  next_due_date DATE NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- --------------------------------------------------------
-- 5. Payments Table
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payments (
  id BIGSERIAL PRIMARY KEY,
  bill_id BIGINT NOT NULL REFERENCES public.bills(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_paid NUMERIC(12, 2) NOT NULL CHECK (amount_paid > 0),
  payment_date DATE NOT NULL,
  payment_method TEXT DEFAULT 'UPI',
  transaction_id TEXT NULL,
  notes TEXT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- --------------------------------------------------------
-- 6. Reminders Table
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reminders (
  id BIGSERIAL PRIMARY KEY,
  bill_id BIGINT NOT NULL REFERENCES public.bills(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reminder_date DATE NOT NULL,
  reminder_type TEXT DEFAULT 'due-date',
  status TEXT DEFAULT 'pending',
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- --------------------------------------------------------
-- 7. Notifications Table
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info',
  is_read BOOLEAN DEFAULT FALSE,
  link TEXT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- --------------------------------------------------------
-- Indexes for High Performance
-- --------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_bills_user_due ON public.bills (user_id, due_date);
CREATE INDEX IF NOT EXISTS idx_bills_status ON public.bills (user_id, payment_status);
CREATE INDEX IF NOT EXISTS idx_payments_user_date ON public.payments (user_id, payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_bill ON public.payments (bill_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON public.notifications (user_id, is_read);

-- --------------------------------------------------------
-- Row Level Security (RLS) Policies
-- --------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- User Settings Policies
DROP POLICY IF EXISTS "Users can view own settings" ON public.user_settings;
CREATE POLICY "Users can view own settings" ON public.user_settings FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own settings" ON public.user_settings;
CREATE POLICY "Users can insert own settings" ON public.user_settings FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own settings" ON public.user_settings;
CREATE POLICY "Users can update own settings" ON public.user_settings FOR UPDATE USING (auth.uid() = user_id);

-- Categories Policies
DROP POLICY IF EXISTS "Users can view default or own categories" ON public.categories;
CREATE POLICY "Users can view default or own categories" ON public.categories FOR SELECT USING (is_default = TRUE OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create custom categories" ON public.categories;
CREATE POLICY "Users can create custom categories" ON public.categories FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own categories" ON public.categories;
CREATE POLICY "Users can update own categories" ON public.categories FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own categories" ON public.categories;
CREATE POLICY "Users can delete own categories" ON public.categories FOR DELETE USING (auth.uid() = user_id AND is_default = FALSE);

-- Bills Policies
DROP POLICY IF EXISTS "Users can view own bills" ON public.bills;
CREATE POLICY "Users can view own bills" ON public.bills FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own bills" ON public.bills;
CREATE POLICY "Users can create own bills" ON public.bills FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own bills" ON public.bills;
CREATE POLICY "Users can update own bills" ON public.bills FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own bills" ON public.bills;
CREATE POLICY "Users can delete own bills" ON public.bills FOR DELETE USING (auth.uid() = user_id);

-- Payments Policies
DROP POLICY IF EXISTS "Users can view own payments" ON public.payments;
CREATE POLICY "Users can view own payments" ON public.payments FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can record own payments" ON public.payments;
CREATE POLICY "Users can record own payments" ON public.payments FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own payments" ON public.payments;
CREATE POLICY "Users can update own payments" ON public.payments FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own payments" ON public.payments;
CREATE POLICY "Users can delete own payments" ON public.payments FOR DELETE USING (auth.uid() = user_id);

-- Reminders Policies
DROP POLICY IF EXISTS "Users can view own reminders" ON public.reminders;
CREATE POLICY "Users can view own reminders" ON public.reminders FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own reminders" ON public.reminders;
CREATE POLICY "Users can manage own reminders" ON public.reminders FOR ALL USING (auth.uid() = user_id);

-- Notifications Policies
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own notifications" ON public.notifications;
CREATE POLICY "Users can manage own notifications" ON public.notifications FOR ALL USING (auth.uid() = user_id);

-- --------------------------------------------------------
-- Trigger: Auto-create profile and settings on signup
-- --------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_name TEXT;
  user_curr TEXT;
  curr_sym TEXT;
BEGIN
  user_name := COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1));
  user_curr := COALESCE(new.raw_user_meta_data->>'currency', 'USD');
  
  IF user_curr = 'EUR' THEN curr_sym := '€';
  ELSIF user_curr = 'GBP' THEN curr_sym := '£';
  ELSIF user_curr = 'INR' THEN curr_sym := '₹';
  ELSIF user_curr = 'CAD' THEN curr_sym := 'C$';
  ELSIF user_curr = 'AUD' THEN curr_sym := 'A$';
  ELSIF user_curr = 'JPY' THEN curr_sym := '¥';
  ELSE curr_sym := '$';
  END IF;

  INSERT INTO public.profiles (id, name, email, currency, theme)
  VALUES (new.id, user_name, new.email, user_curr, 'dark')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_settings (user_id, currency, currency_symbol, email_notifications, in_app_notifications, dark_mode, reminder_days_default)
  VALUES (new.id, user_curr, curr_sym, TRUE, TRUE, TRUE, 3)
  ON CONFLICT (user_id) DO NOTHING;

  -- Create welcome notification
  INSERT INTO public.notifications (user_id, title, message, type, is_read, link)
  VALUES (new.id, 'Welcome to BillMate! 🎉', 'Start tracking your financial obligations by adding your first bill.', 'info', FALSE, '/bills/new');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- --------------------------------------------------------
-- Seed Default Categories
-- --------------------------------------------------------
INSERT INTO public.categories (id, name, icon, color, is_default, user_id) VALUES
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
ON CONFLICT (id) DO UPDATE 
SET name = EXCLUDED.name, icon = EXCLUDED.icon, color = EXCLUDED.color, is_default = EXCLUDED.is_default;
