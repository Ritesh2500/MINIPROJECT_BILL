import { supabase } from '../lib/supabase';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

// Helper to calculate bill status dynamically
export function calculateBillStatus(dueDateStr, isPaid = false) {
  if (isPaid) return 'paid';
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = new Date(dueDateStr);
  due.setHours(0, 0, 0, 0);

  const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return 'overdue';
  if (diffDays <= 3) return 'pending';
  return 'upcoming';
}

// Helper to calculate next recurring due date
export function calculateNextDueDate(currentDueDateStr, frequency) {
  const date = new Date(currentDueDateStr);
  if (isNaN(date.getTime())) return null;

  switch (frequency) {
    case 'daily': date.setDate(date.getDate() + 1); break;
    case 'weekly': date.setDate(date.getDate() + 7); break;
    case 'monthly': date.setMonth(date.getMonth() + 1); break;
    case 'quarterly': date.setMonth(date.getMonth() + 3); break;
    case 'half-yearly': date.setMonth(date.getMonth() + 6); break;
    case 'yearly': date.setFullYear(date.getFullYear() + 1); break;
    default: return null;
  }
  return date.toISOString().split('T')[0];
}

// ========================================================
// 1. AUTH SERVICE
// ========================================================
export const supabaseAuthService = {
  async register({ name, email, password, currency = 'USD' }) {
    const trimmedEmail = email.trim().toLowerCase();
    const { data, error } = await supabase.auth.signUp({
      email: trimmedEmail,
      password,
      options: {
        data: {
          name: name.trim(),
          currency
        }
      }
    });

    if (error) throw error;

    const user = data.user;
    if (user) {
      // Ensure profile and settings exist in public tables
      const symbolMap = { USD: '$', EUR: '€', GBP: '£', INR: '₹', CAD: 'C$', AUD: 'A$', JPY: '¥' };
      const symbol = symbolMap[currency] || '$';

      await supabase.from('profiles').upsert({
        id: user.id,
        name: name.trim(),
        email: trimmedEmail,
        currency,
        theme: 'dark'
      });

      await supabase.from('user_settings').upsert({
        user_id: user.id,
        currency,
        currency_symbol: symbol,
        email_notifications: true,
        in_app_notifications: true,
        dark_mode: true,
        reminder_days_default: 3
      });
    }

    return {
      success: true,
      user,
      session: data.session
    };
  },

  async login({ email, password }) {
    const trimmedEmail = email.trim().toLowerCase();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: trimmedEmail,
      password
    });

    if (error) throw error;

    const user = data.user;
    // Fetch profile and user settings
    const [profileRes, settingsRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('user_settings').select('*').eq('user_id', user.id).single()
    ]);

    user.profile = profileRes.data || null;
    user.name = profileRes.data?.name || user.user_metadata?.name || user.email?.split('@')[0];
    user.currency = profileRes.data?.currency || 'USD';
    user.settings = settingsRes.data || null;

    return {
      success: true,
      user,
      session: data.session,
      token: data.session?.access_token
    };
  },

  async getMe() {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.user) {
      return { success: false, user: null };
    }

    const user = session.user;
    const [profileRes, settingsRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('user_settings').select('*').eq('user_id', user.id).single()
    ]);

    user.profile = profileRes.data || null;
    user.name = profileRes.data?.name || user.user_metadata?.name || user.email?.split('@')[0];
    user.currency = profileRes.data?.currency || 'USD';
    user.settings = settingsRes.data || null;

    return {
      success: true,
      user
    };
  },

  async logout() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return { success: true };
  },

  async resetPassword(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase());
    if (error) throw error;
    return { success: true };
  }
};

// ========================================================
// 2. BILLS SERVICE
// ========================================================
export const supabaseBillsService = {
  async getBills(params = {}) {
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
    } = params;

    let query = supabase
      .from('bills')
      .select(`
        *,
        categories ( id, name, icon, color ),
        payments ( id, amount_paid )
      `, { count: 'exact' });

    if (search && search.trim() !== '') {
      query = query.or(`name.ilike.%${search.trim()}%,description.ilike.%${search.trim()}%`);
    }

    if (category && category !== 'all') {
      query = query.eq('category_id', category);
    }

    if (status && status !== 'all') {
      query = query.eq('payment_status', status);
    }

    if (startDate) {
      query = query.gte('due_date', startDate);
    }

    if (endDate) {
      query = query.lte('due_date', endDate);
    }

    if (minAmount) {
      query = query.gte('amount', Number(minAmount));
    }

    if (maxAmount) {
      query = query.lte('amount', Number(maxAmount));
    }

    // Sort order
    const isAsc = sortOrder.toUpperCase() === 'ASC';
    query = query.order(sortBy, { ascending: isAsc });

    // Pagination
    const pageNum = Math.max(1, parseInt(page, 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const from = (pageNum - 1) * pageSize;
    const to = from + pageSize - 1;

    query = query.range(from, to);

    const { data, count, error } = await query;
    if (error) throw error;

    const todayStr = new Date().toISOString().split('T')[0];

    const bills = (data || []).map(b => {
      const payments = b.payments || [];
      const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount_paid || 0), 0);
      let calculatedStatus = b.payment_status;

      if (calculatedStatus !== 'paid' && b.due_date < todayStr && calculatedStatus !== 'overdue') {
        calculatedStatus = 'overdue';
      }

      return {
        ...b,
        category_name: b.categories?.name || 'General',
        category_icon: b.categories?.icon || 'Tag',
        category_color: b.categories?.color || '#3B82F6',
        total_paid: totalPaid,
        payment_status: calculatedStatus
      };
    });

    return {
      success: true,
      bills,
      pagination: {
        total: count || 0,
        page: pageNum,
        limit: pageSize,
        totalPages: Math.ceil((count || 0) / pageSize)
      }
    };
  },

  async getBill(id) {
    const { data: bill, error: billError } = await supabase
      .from('bills')
      .select(`
        *,
        categories ( id, name, icon, color )
      `)
      .eq('id', id)
      .single();

    if (billError) throw billError;

    // Fetch payments for this bill
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('*')
      .eq('bill_id', id)
      .order('payment_date', { ascending: false });

    if (paymentsError) throw paymentsError;

    const totalPaid = (payments || []).reduce((sum, p) => sum + Number(p.amount_paid || 0), 0);
    const remaining = Math.max(0, Number(bill.amount) - totalPaid);

    return {
      success: true,
      bill: {
        ...bill,
        category_name: bill.categories?.name || 'General',
        category_icon: bill.categories?.icon || 'Tag',
        category_color: bill.categories?.color || '#3B82F6',
        payments: payments || [],
        total_paid: totalPaid,
        remaining_amount: remaining
      }
    };
  },

  async createBill(billData) {
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
    } = billData;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Authentication required.');

    let status = payment_status;
    if (!status || status !== 'paid') {
      status = calculateBillStatus(due_date, false);
    }

    const nextDue = is_recurring ? calculateNextDueDate(due_date, billing_frequency) : null;

    const { data: insertedBill, error: insertError } = await supabase
      .from('bills')
      .insert({
        user_id: user.id,
        category_id,
        name: name.trim(),
        amount: parseFloat(amount),
        due_date,
        billing_frequency,
        payment_status: status,
        description: description.trim(),
        reminder_days_before: parseInt(reminder_days_before, 10),
        is_recurring: Boolean(is_recurring),
        auto_generate_next: Boolean(auto_generate_next),
        next_due_date: nextDue
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Create reminder record
    const reminderDate = new Date(due_date);
    reminderDate.setDate(reminderDate.getDate() - parseInt(reminder_days_before, 10));
    const reminderDateStr = reminderDate.toISOString().split('T')[0];

    await supabase.from('reminders').insert({
      bill_id: insertedBill.id,
      user_id: user.id,
      reminder_date: reminderDateStr,
      reminder_type: 'several-days-before',
      status: 'pending',
      message: `Reminder: Bill "${name}" ($${amount}) is due on ${due_date}.`
    });

    return {
      success: true,
      billId: insertedBill.id,
      bill: insertedBill
    };
  },

  async updateBill(id, updateData) {
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
    } = updateData;

    const updates = { updated_at: new Date().toISOString() };
    if (name !== undefined) updates.name = name.trim();
    if (category_id !== undefined) updates.category_id = category_id;
    if (amount !== undefined) updates.amount = parseFloat(amount);
    if (due_date !== undefined) updates.due_date = due_date;
    if (billing_frequency !== undefined) updates.billing_frequency = billing_frequency;
    if (payment_status !== undefined) updates.payment_status = payment_status;
    if (description !== undefined) updates.description = description;
    if (reminder_days_before !== undefined) updates.reminder_days_before = parseInt(reminder_days_before, 10);
    if (is_recurring !== undefined) {
      updates.is_recurring = Boolean(is_recurring);
      if (updates.is_recurring && due_date && billing_frequency) {
        updates.next_due_date = calculateNextDueDate(due_date, billing_frequency);
      }
    }
    if (auto_generate_next !== undefined) updates.auto_generate_next = Boolean(auto_generate_next);

    const { data, error } = await supabase
      .from('bills')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { success: true, bill: data };
  },

  async deleteBill(id) {
    const { error } = await supabase.from('bills').delete().eq('id', id);
    if (error) throw error;
    return { success: true };
  },

  async getSummary() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Authentication required.');

    const todayStr = new Date().toISOString().split('T')[0];

    // Fetch all user bills with categories
    const { data: bills, error: billsError } = await supabase
      .from('bills')
      .select(`
        *,
        categories ( id, name, icon, color )
      `)
      .order('due_date', { ascending: true });

    if (billsError) throw billsError;

    // Fetch all user payments with joined bills and categories
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select(`
        *,
        bills ( id, name ),
        categories:bills ( categories ( name, color, icon ) )
      `)
      .order('payment_date', { ascending: false });

    if (paymentsError) throw paymentsError;

    const totalBills = bills.length;
    const totalAmountPaid = (payments || []).reduce((sum, p) => sum + Number(p.amount_paid || 0), 0);

    // Build paid map per bill
    const paidByBill = {};
    (payments || []).forEach(p => {
      paidByBill[p.bill_id] = (paidByBill[p.bill_id] || 0) + Number(p.amount_paid);
    });

    let totalAmountDue = 0;
    let upcomingCount = 0;
    let upcomingAmount = 0;
    let overdueCount = 0;
    let overdueAmount = 0;

    bills.forEach(b => {
      const paid = paidByBill[b.id] || 0;
      const rem = Math.max(0, Number(b.amount) - paid);

      if (b.payment_status !== 'paid' && rem > 0) {
        totalAmountDue += rem;
        if (b.due_date < todayStr) {
          overdueCount++;
          overdueAmount += rem;
        } else {
          upcomingCount++;
          upcomingAmount += rem;
        }
      }
    });

    // Current Month Payments
    const now = new Date();
    const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const currentMonthExpenses = (payments || [])
      .filter(p => p.payment_date.startsWith(currentMonthPrefix))
      .reduce((sum, p) => sum + Number(p.amount_paid || 0), 0);

    // Upcoming payments (next 5)
    const upcomingPayments = bills
      .filter(b => b.payment_status !== 'paid' && (paidByBill[b.id] || 0) < Number(b.amount))
      .slice(0, 5)
      .map(b => ({
        ...b,
        category_name: b.categories?.name,
        category_icon: b.categories?.icon,
        category_color: b.categories?.color,
        total_paid: paidByBill[b.id] || 0
      }));

    // Recently paid (last 5)
    const recentlyPaid = bills
      .filter(b => b.payment_status === 'paid' || (paidByBill[b.id] || 0) >= Number(b.amount))
      .slice(0, 5)
      .map(b => ({
        ...b,
        category_name: b.categories?.name,
        category_icon: b.categories?.icon,
        category_color: b.categories?.color,
        total_paid: paidByBill[b.id] || 0
      }));

    // Recent Transactions (last 6)
    const recentTransactions = (payments || []).slice(0, 6).map(p => ({
      ...p,
      bill_name: p.bills?.name || 'Bill Payment',
      category_name: p.categories?.categories?.name || 'General',
      category_color: p.categories?.categories?.color || '#3B82F6',
      category_icon: p.categories?.categories?.icon || 'Tag'
    }));

    // Category Spending Breakdown
    const catMap = {};
    (payments || []).forEach(p => {
      const catName = p.categories?.categories?.name || 'General';
      const catColor = p.categories?.categories?.color || '#3B82F6';
      const catIcon = p.categories?.categories?.icon || 'Tag';
      if (!catMap[catName]) {
        catMap[catName] = { name: catName, color: catColor, icon: catIcon, total_amount: 0 };
      }
      catMap[catName].total_amount += Number(p.amount_paid);
    });

    const categorySpending = Object.values(catMap).sort((a, b) => b.total_amount - a.total_amount);

    return {
      success: true,
      summary: {
        totalBills,
        totalAmountDue: Math.round(totalAmountDue * 100) / 100,
        totalAmountPaid: Math.round(totalAmountPaid * 100) / 100,
        upcomingBills: { count: upcomingCount, amount: Math.round(upcomingAmount * 100) / 100 },
        overdueBills: { count: overdueCount, amount: Math.round(overdueAmount * 100) / 100 },
        currentMonthExpenses: Math.round(currentMonthExpenses * 100) / 100
      },
      upcomingPayments,
      recentlyPaid,
      recentTransactions,
      categorySpending
    };
  }
};

// ========================================================
// 3. PAYMENTS SERVICE
// ========================================================
export const supabasePaymentsService = {
  async getPayments(params = {}) {
    const { search, method, startDate, endDate, billId, page = 1, limit = 50 } = params;

    let query = supabase
      .from('payments')
      .select(`
        *,
        bills ( id, name, amount, due_date, categories ( name, icon, color ) )
      `, { count: 'exact' });

    if (billId) {
      query = query.eq('bill_id', billId);
    }

    if (method && method !== 'all') {
      query = query.eq('payment_method', method);
    }

    if (startDate) {
      query = query.gte('payment_date', startDate);
    }

    if (endDate) {
      query = query.lte('payment_date', endDate);
    }

    query = query.order('payment_date', { ascending: false });

    // Pagination
    const pageNum = Math.max(1, parseInt(page, 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const from = (pageNum - 1) * pageSize;
    const to = from + pageSize - 1;

    query = query.range(from, to);

    const { data, count, error } = await query;
    if (error) throw error;

    let payments = (data || []).map(p => ({
      ...p,
      bill_name: p.bills?.name || 'Bill Payment',
      bill_total_amount: p.bills?.amount,
      bill_due_date: p.bills?.due_date,
      category_name: p.bills?.categories?.name || 'General',
      category_icon: p.bills?.categories?.icon || 'Tag',
      category_color: p.bills?.categories?.color || '#3B82F6'
    }));

    if (search && search.trim() !== '') {
      const q = search.trim().toLowerCase();
      payments = payments.filter(p =>
        (p.bill_name && p.bill_name.toLowerCase().includes(q)) ||
        (p.transaction_id && p.transaction_id.toLowerCase().includes(q)) ||
        (p.notes && p.notes.toLowerCase().includes(q))
      );
    }

    return {
      success: true,
      payments,
      pagination: {
        total: count || payments.length,
        page: pageNum,
        limit: pageSize,
        totalPages: Math.ceil((count || payments.length) / pageSize)
      }
    };
  },

  async createPayment(paymentData) {
    const {
      bill_id,
      amount_paid,
      payment_date,
      payment_method = 'UPI',
      transaction_id = '',
      notes = ''
    } = paymentData;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Authentication required.');

    // Fetch the bill
    const { data: bill, error: billError } = await supabase
      .from('bills')
      .select('*')
      .eq('id', bill_id)
      .single();

    if (billError || !bill) throw new Error('Bill not found.');

    const txnId = transaction_id.trim() || `TXN-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

    // Insert payment
    const { data: newPayment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        bill_id,
        user_id: user.id,
        amount_paid: parseFloat(amount_paid),
        payment_date,
        payment_method,
        transaction_id: txnId,
        notes: notes.trim()
      })
      .select()
      .single();

    if (paymentError) throw paymentError;

    // Fetch all payments for this bill to check if fully paid
    const { data: allPayments } = await supabase
      .from('payments')
      .select('amount_paid')
      .eq('bill_id', bill_id);

    const totalPaid = (allPayments || []).reduce((sum, p) => sum + Number(p.amount_paid), 0);
    const isFullyPaid = totalPaid >= Number(bill.amount);

    if (isFullyPaid) {
      await supabase
        .from('bills')
        .update({ payment_status: 'paid', updated_at: new Date().toISOString() })
        .eq('id', bill_id);

      // If recurring and auto_generate_next is true, create next cycle!
      if (bill.is_recurring && bill.auto_generate_next && bill.billing_frequency !== 'one-time') {
        const nextDueDate = calculateNextDueDate(bill.due_date, bill.billing_frequency);
        if (nextDueDate) {
          // Check if already created
          const { data: existingNext } = await supabase
            .from('bills')
            .select('id')
            .eq('user_id', user.id)
            .eq('category_id', bill.category_id)
            .eq('name', bill.name)
            .eq('due_date', nextDueDate);

          if (!existingNext || existingNext.length === 0) {
            const nextSubsequent = calculateNextDueDate(nextDueDate, bill.billing_frequency);
            const { data: nextBill } = await supabase
              .from('bills')
              .insert({
                user_id: user.id,
                category_id: bill.category_id,
                name: bill.name,
                amount: bill.amount,
                due_date: nextDueDate,
                billing_frequency: bill.billing_frequency,
                payment_status: 'upcoming',
                description: bill.description,
                reminder_days_before: bill.reminder_days_before,
                is_recurring: true,
                auto_generate_next: true,
                next_due_date: nextSubsequent
              })
              .select()
              .single();

            if (nextBill) {
              await supabase.from('notifications').insert({
                user_id: user.id,
                title: 'Recurring Bill Generated',
                message: `Next cycle for "${bill.name}" has been scheduled for ${nextDueDate}.`,
                type: 'info',
                is_read: false,
                link: `/bills/${nextBill.id}`
              });
            }
          }
        }
      }
    } else {
      await supabase
        .from('bills')
        .update({ payment_status: 'pending', updated_at: new Date().toISOString() })
        .eq('id', bill_id);
    }

    // Success notification
    await supabase.from('notifications').insert({
      user_id: user.id,
      title: 'Payment Recorded',
      message: `Payment of $${parseFloat(amount_paid).toFixed(2)} recorded for "${bill.name}" via ${payment_method}.`,
      type: 'success',
      is_read: false,
      link: '/payments'
    });

    return {
      success: true,
      paymentId: newPayment.id,
      transactionId: txnId,
      totalPaid,
      isFullyPaid
    };
  },

  async deletePayment(id) {
    const { data: payment } = await supabase
      .from('payments')
      .select('bill_id')
      .eq('id', id)
      .single();

    const { error } = await supabase.from('payments').delete().eq('id', id);
    if (error) throw error;

    if (payment?.bill_id) {
      // Recalculate bill status
      const { data: bill } = await supabase.from('bills').select('*').eq('id', payment.bill_id).single();
      if (bill) {
        const { data: allRemaining } = await supabase.from('payments').select('amount_paid').eq('bill_id', payment.bill_id);
        const currentPaid = (allRemaining || []).reduce((sum, p) => sum + Number(p.amount_paid), 0);
        let newStatus = currentPaid >= Number(bill.amount) ? 'paid' : calculateBillStatus(bill.due_date, false);
        await supabase.from('bills').update({ payment_status: newStatus }).eq('id', payment.bill_id);
      }
    }

    return { success: true };
  }
};

// ========================================================
// 4. RECURRING SERVICE
// ========================================================
export const supabaseRecurringService = {
  async getRecurringBills() {
    const { data: bills, error } = await supabase
      .from('bills')
      .select(`
        *,
        categories ( id, name, icon, color ),
        payments ( id )
      `)
      .eq('is_recurring', true)
      .order('due_date', { ascending: true });

    if (error) throw error;

    let monthlyRunRate = 0;
    const enrichedBills = (bills || []).map(b => {
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
      return {
        ...b,
        category_name: b.categories?.name || 'General',
        category_icon: b.categories?.icon || 'Tag',
        category_color: b.categories?.color || '#3B82F6',
        payment_cycles_completed: b.payments?.length || 0
      };
    });

    return {
      success: true,
      bills: enrichedBills,
      summary: {
        totalRecurringBills: enrichedBills.length,
        estimatedMonthlyCost: Math.round(monthlyRunRate * 100) / 100,
        estimatedAnnualCost: Math.round(monthlyRunRate * 12 * 100) / 100
      }
    };
  },

  async toggleRecurring(id, is_recurring) {
    const updates = { is_recurring: Boolean(is_recurring), updated_at: new Date().toISOString() };
    const { data, error } = await supabase.from('bills').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return {
      success: true,
      message: is_recurring ? 'Bill set to recurring.' : 'Recurring billing disabled.',
      is_recurring
    };
  }
};

// ========================================================
// 5. CATEGORIES SERVICE
// ========================================================
export const supabaseCategoriesService = {
  async getCategories() {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('is_default', { ascending: false })
      .order('name', { ascending: true });

    if (error) throw error;
    return { success: true, categories: data || [] };
  },

  async createCategory({ name, icon = 'Tag', color = '#3B82F6' }) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Authentication required.');

    const { data, error } = await supabase
      .from('categories')
      .insert({
        name: name.trim(),
        icon,
        color,
        is_default: false,
        user_id: user.id
      })
      .select()
      .single();

    if (error) throw error;
    return { success: true, category: data };
  }
};

// ========================================================
// 6. ANALYTICS SERVICE
// ========================================================
export const supabaseAnalyticsService = {
  async getMonthly(year = new Date().getFullYear()) {
    const targetYear = parseInt(year, 10) || new Date().getFullYear();
    const startYear = `${targetYear}-01-01`;
    const endYear = `${targetYear}-12-31`;

    const { data: payments, error } = await supabase
      .from('payments')
      .select('payment_date, amount_paid')
      .gte('payment_date', startYear)
      .lte('payment_date', endYear);

    if (error) throw error;

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyData = monthNames.map((name, idx) => {
      const monthPrefix = `${targetYear}-${String(idx + 1).padStart(2, '0')}`;
      const total = (payments || [])
        .filter(p => p.payment_date.startsWith(monthPrefix))
        .reduce((sum, p) => sum + Number(p.amount_paid), 0);

      return {
        month: name,
        monthNumber: idx + 1,
        total: Math.round(total * 100) / 100
      };
    });

    return {
      success: true,
      year: targetYear,
      monthly: monthlyData
    };
  },

  async getCategories(params = {}) {
    const { startDate, endDate } = params;
    let query = supabase
      .from('payments')
      .select(`
        amount_paid,
        payment_date,
        bills ( categories ( id, name, color, icon ) )
      `);

    if (startDate) query = query.gte('payment_date', startDate);
    if (endDate) query = query.lte('payment_date', endDate);

    const { data: payments, error } = await query;
    if (error) throw error;

    const catMap = {};
    let totalSpending = 0;

    (payments || []).forEach(p => {
      const cat = p.bills?.categories;
      const name = cat?.name || 'General';
      const color = cat?.color || '#3B82F6';
      const icon = cat?.icon || 'Tag';
      const amt = Number(p.amount_paid);

      totalSpending += amt;
      if (!catMap[name]) {
        catMap[name] = { name, color, icon, amount: 0, count: 0 };
      }
      catMap[name].amount += amt;
      catMap[name].count += 1;
    });

    const categories = Object.values(catMap).map(c => ({
      ...c,
      amount: Math.round(c.amount * 100) / 100,
      percentage: totalSpending > 0 ? Math.round((c.amount / totalSpending) * 1000) / 10 : 0
    })).sort((a, b) => b.amount - a.amount);

    return {
      success: true,
      totalSpending: Math.round(totalSpending * 100) / 100,
      categories
    };
  },

  async getOverview() {
    const todayStr = new Date().toISOString().split('T')[0];

    // Fetch payments
    const { data: payments } = await supabase.from('payments').select('amount_paid, payment_method');
    const totalPaid = (payments || []).reduce((sum, p) => sum + Number(p.amount_paid), 0);

    // Fetch bills
    const { data: bills } = await supabase.from('bills').select('id, amount, due_date, payment_status, name, categories ( name, color )');

    let totalOverdue = 0;
    let totalUpcoming = 0;

    (bills || []).forEach(b => {
      if (b.payment_status !== 'paid') {
        const amt = Number(b.amount);
        if (b.due_date < todayStr) totalOverdue += amt;
        else totalUpcoming += amt;
      }
    });

    const paidVsUnpaid = [
      { name: 'Paid', value: Math.round(totalPaid * 100) / 100, color: '#10B981' },
      { name: 'Overdue', value: Math.round(totalOverdue * 100) / 100, color: '#EF4444' },
      { name: 'Upcoming', value: Math.round(totalUpcoming * 100) / 100, color: '#3B82F6' }
    ];

    // Next 30 days obligations
    const next30 = new Date();
    next30.setDate(next30.getDate() + 30);
    const next30Str = next30.toISOString().split('T')[0];

    const obligations = (bills || [])
      .filter(b => b.payment_status !== 'paid' && b.due_date >= todayStr && b.due_date <= next30Str)
      .map(b => ({
        ...b,
        category_name: b.categories?.name,
        category_color: b.categories?.color
      }));

    // Payment methods
    const methodMap = {};
    (payments || []).forEach(p => {
      const m = p.payment_method || 'Other';
      if (!methodMap[m]) methodMap[m] = { payment_method: m, count: 0, total_amount: 0 };
      methodMap[m].count++;
      methodMap[m].total_amount += Number(p.amount_paid);
    });

    const paymentMethods = Object.values(methodMap).sort((a, b) => b.total_amount - a.total_amount);

    return {
      success: true,
      paidVsUnpaid,
      obligations,
      paymentMethods,
      summary: {
        totalPaid: Math.round(totalPaid * 100) / 100,
        totalOverdue: Math.round(totalOverdue * 100) / 100,
        totalUpcoming: Math.round(totalUpcoming * 100) / 100,
        totalObligationsNext30: obligations.reduce((sum, o) => sum + Number(o.amount), 0)
      }
    };
  }
};

// ========================================================
// 7. REPORTS SERVICE
// ========================================================
export const supabaseReportsService = {
  async getReportData(params = {}) {
    const { category, status, startDate, endDate } = params;

    let query = supabase
      .from('bills')
      .select(`
        id,
        name,
        amount,
        due_date,
        payment_status,
        billing_frequency,
        categories ( id, name ),
        payments ( payment_date, payment_method, amount_paid, transaction_id, notes )
      `);

    if (category && category !== 'all') {
      query = query.eq('category_id', category);
    }
    if (status && status !== 'all') {
      query = query.eq('payment_status', status);
    }
    if (startDate) {
      query = query.gte('due_date', startDate);
    }
    if (endDate) {
      query = query.lte('due_date', endDate);
    }

    const { data: bills, error } = await query;
    if (error) throw error;

    const records = [];
    let totalBilled = 0;
    let totalPaid = 0;

    (bills || []).forEach(b => {
      totalBilled += Number(b.amount);
      const payments = b.payments || [];
      if (payments.length > 0) {
        payments.forEach(p => {
          totalPaid += Number(p.amount_paid);
          records.push({
            bill_id: b.id,
            bill_name: b.name,
            category_name: b.categories?.name || 'General',
            bill_amount: b.amount,
            due_date: b.due_date,
            payment_status: b.payment_status,
            billing_frequency: b.billing_frequency,
            payment_date: p.payment_date,
            payment_method: p.payment_method,
            amount_paid: p.amount_paid,
            transaction_id: p.transaction_id,
            notes: p.notes
          });
        });
      } else {
        records.push({
          bill_id: b.id,
          bill_name: b.name,
          category_name: b.categories?.name || 'General',
          bill_amount: b.amount,
          due_date: b.due_date,
          payment_status: b.payment_status,
          billing_frequency: b.billing_frequency,
          payment_date: null,
          payment_method: null,
          amount_paid: 0,
          transaction_id: null,
          notes: null
        });
      }
    });

    return {
      success: true,
      records,
      summary: {
        totalRecords: records.length,
        totalBilled: Math.round(totalBilled * 100) / 100,
        totalPaid: Math.round(totalPaid * 100) / 100
      }
    };
  },

  async downloadCsv(params = {}) {
    const res = await this.getReportData(params);
    const rows = res.records;

    const headers = ['Bill Name', 'Category', 'Billed Amount', 'Due Date', 'Status', 'Frequency', 'Paid Amount', 'Payment Date', 'Payment Method', 'Transaction ID'];
    const lines = [headers.join(',')];

    rows.forEach(r => {
      lines.push([
        `"${(r.bill_name || '').replace(/"/g, '""')}"`,
        `"${(r.category_name || '').replace(/"/g, '""')}"`,
        Number(r.bill_amount || 0).toFixed(2),
        r.due_date || '',
        r.payment_status || '',
        r.billing_frequency || '',
        r.amount_paid ? Number(r.amount_paid).toFixed(2) : '0.00',
        r.payment_date || '',
        `"${(r.payment_method || '').replace(/"/g, '""')}"`,
        `"${(r.transaction_id || '').replace(/"/g, '""')}"`
      ].join(','));
    });

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `billmate-report-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  },

  async downloadExcel(params = {}) {
    const res = await this.getReportData(params);
    const formatted = res.records.map(r => ({
      'Bill Name': r.bill_name,
      'Category': r.category_name,
      'Billed Amount ($)': Number(r.bill_amount || 0),
      'Due Date': r.due_date,
      'Status': r.payment_status,
      'Frequency': r.billing_frequency,
      'Paid Amount ($)': Number(r.amount_paid || 0),
      'Payment Date': r.payment_date || 'N/A',
      'Payment Method': r.payment_method || 'N/A',
      'Transaction ID': r.transaction_id || 'N/A'
    }));

    const worksheet = XLSX.utils.json_to_sheet(formatted);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Bills and Payments');
    XLSX.writeFile(workbook, `billmate-report-${new Date().toISOString().split('T')[0]}.xlsx`);
  },

  async downloadPdf(params = {}) {
    const res = await this.getReportData(params);
    const rows = res.records;

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    doc.setFontSize(20);
    doc.setTextColor(30, 41, 59);
    doc.text('BillMate - Financial & Payment Report', 14, 20);

    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Generated on: ${new Date().toLocaleString()} | Direct Supabase Cloud Audit`, 14, 28);
    doc.text(`Total Records: ${res.summary.totalRecords} | Total Billed: $${res.summary.totalBilled.toFixed(2)} | Total Settled: $${res.summary.totalPaid.toFixed(2)}`, 14, 34);

    const tableRows = rows.map(r => [
      r.bill_name || '',
      r.category_name || '',
      `$${Number(r.bill_amount || 0).toFixed(2)}`,
      r.due_date || '',
      (r.payment_status || '').toUpperCase(),
      r.payment_date || '-',
      r.payment_method || '-',
      r.amount_paid ? `$${Number(r.amount_paid).toFixed(2)}` : '-'
    ]);

    doc.autoTable({
      startY: 40,
      head: [['Bill Name', 'Category', 'Amount', 'Due Date', 'Status', 'Paid Date', 'Method', 'Paid Amount']],
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246], textColor: 255, fontSize: 9, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8, textColor: [51, 65, 85] },
      alternateRowStyles: { fillColor: [248, 250, 252] }
    });

    doc.save(`billmate-report-${new Date().toISOString().split('T')[0]}.pdf`);
  }
};

// ========================================================
// 8. REMINDERS & NOTIFICATIONS SERVICE
// ========================================================
export const supabaseRemindersService = {
  async getNotifications() {
    const { data: notifications, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;
    const unreadCount = (notifications || []).filter(n => !n.is_read).length;

    return {
      success: true,
      notifications: notifications || [],
      unreadCount
    };
  },

  async markRead(id) {
    if (id === 'all') {
      const { error } = await supabase.from('notifications').update({ is_read: true }).eq('is_read', false);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id);
      if (error) throw error;
    }
    return { success: true };
  },

  async deleteNotification(id) {
    if (id === 'all') {
      const { error } = await supabase.from('notifications').delete().neq('id', 0);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('notifications').delete().eq('id', id);
      if (error) throw error;
    }
    return { success: true };
  },

  async getReminders() {
    const { data: reminders, error } = await supabase
      .from('reminders')
      .select(`
        *,
        bills ( id, name, amount, due_date, payment_status, categories ( name, icon, color ) )
      `)
      .neq('status', 'dismissed')
      .order('reminder_date', { ascending: true });

    if (error) throw error;

    const enriched = (reminders || []).map(r => ({
      ...r,
      bill_name: r.bills?.name,
      bill_amount: r.bills?.amount,
      due_date: r.bills?.due_date,
      payment_status: r.bills?.payment_status,
      category_name: r.bills?.categories?.name,
      category_color: r.bills?.categories?.color,
      category_icon: r.bills?.categories?.icon
    }));

    return { success: true, reminders: enriched };
  },

  async dismissReminder(id) {
    const { error } = await supabase.from('reminders').update({ status: 'dismissed' }).eq('id', id);
    if (error) throw error;
    return { success: true };
  },

  async triggerScheduler() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false };

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    const { data: unpaidBills } = await supabase
      .from('bills')
      .select('*')
      .neq('payment_status', 'paid');

    for (const bill of unpaidBills || []) {
      const billDue = new Date(bill.due_date);
      billDue.setHours(0, 0, 0, 0);
      const diffDays = Math.ceil((billDue.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays < 0) {
        if (bill.payment_status !== 'overdue') {
          await supabase.from('bills').update({ payment_status: 'overdue' }).eq('id', bill.id);
        }
        // Insert notification if not exists
        const { data: existing } = await supabase
          .from('notifications')
          .select('id')
          .eq('user_id', user.id)
          .eq('type', 'warning')
          .ilike('message', `%${bill.name}%`)
          .limit(1);

        if (!existing || existing.length === 0) {
          await supabase.from('notifications').insert({
            user_id: user.id,
            title: 'Bill Overdue Alert',
            message: `Your bill "${bill.name}" ($${Number(bill.amount).toFixed(2)}) is overdue by ${Math.abs(diffDays)} day(s).`,
            type: 'warning',
            is_read: false,
            link: `/bills/${bill.id}`
          });
        }
      } else if (diffDays === 0) {
        const { data: existing } = await supabase
          .from('notifications')
          .select('id')
          .eq('user_id', user.id)
          .ilike('message', `%${bill.name}%due today%`)
          .limit(1);

        if (!existing || existing.length === 0) {
          await supabase.from('notifications').insert({
            user_id: user.id,
            title: 'Bill Due Today ⚠️',
            message: `Your bill "${bill.name}" ($${Number(bill.amount).toFixed(2)}) is due today!`,
            type: 'reminder',
            is_read: false,
            link: `/bills/${bill.id}`
          });
        }
      }
    }

    return { success: true };
  }
};

// ========================================================
// 9. SETTINGS & PROFILE SERVICE
// ========================================================
export const supabaseSettingsService = {
  async getSettings() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Authentication required.');

    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    return {
      success: true,
      settings: data || {
        user_id: user.id,
        currency: 'USD',
        currency_symbol: '$',
        email_notifications: true,
        in_app_notifications: true,
        dark_mode: true,
        reminder_days_default: 3
      }
    };
  },

  async updateSettings(settingsData) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Authentication required.');

    const {
      currency = 'USD',
      email_notifications = true,
      in_app_notifications = true,
      dark_mode = true,
      reminder_days_default = 3
    } = settingsData;

    const symbolMap = { USD: '$', EUR: '€', GBP: '£', INR: '₹', CAD: 'C$', AUD: 'A$', JPY: '¥' };
    const currency_symbol = symbolMap[currency] || '$';

    const { data, error } = await supabase
      .from('user_settings')
      .upsert({
        user_id: user.id,
        currency,
        currency_symbol,
        email_notifications: Boolean(email_notifications),
        in_app_notifications: Boolean(in_app_notifications),
        dark_mode: Boolean(dark_mode),
        reminder_days_default: parseInt(reminder_days_default, 10),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    // Update profiles currency & theme as well
    await supabase.from('profiles').update({
      currency,
      theme: dark_mode ? 'dark' : 'light'
    }).eq('id', user.id);

    return {
      success: true,
      settings: data
    };
  },

  async updateProfile({ name, email }) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Authentication required.');

    const { data, error } = await supabase
      .from('profiles')
      .update({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)
      .select()
      .single();

    if (error) throw error;

    if (email && email.trim().toLowerCase() !== user.email) {
      await supabase.auth.updateUser({ email: email.trim().toLowerCase() });
    }

    return {
      success: true,
      user: data
    };
  },

  async changePassword({ new_password }) {
    const { error } = await supabase.auth.updateUser({ password: new_password });
    if (error) throw error;
    return { success: true, message: 'Password changed successfully!' };
  },

  async exportUserData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Authentication required.');

    const [profileRes, settingsRes, billsRes, paymentsRes, categoriesRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('user_settings').select('*').eq('user_id', user.id).single(),
      supabase.from('bills').select('*').eq('user_id', user.id),
      supabase.from('payments').select('*').eq('user_id', user.id),
      supabase.from('categories').select('*')
    ]);

    return {
      success: true,
      userData: {
        profile: profileRes.data,
        settings: settingsRes.data,
        bills: billsRes.data || [],
        payments: paymentsRes.data || [],
        categories: categoriesRes.data || []
      }
    };
  }
};

// ========================================================
// 10. AI ASSISTANT SERVICE (SUPABASE DRIVEN)
// ========================================================
export const supabaseAiService = {
  async ask(question) {
    const { data: bills } = await supabase.from('bills').select('*, categories ( name )');
    const { data: payments } = await supabase.from('payments').select('*, bills ( name, categories ( name ) )');

    const totalPaid = (payments || []).reduce((s, p) => s + Number(p.amount_paid), 0);
    const recurringTotal = (bills || []).filter(b => b.is_recurring).reduce((s, b) => s + Number(b.amount), 0);

    const categorySpending = {};
    (payments || []).forEach(p => {
      const cat = p.bills?.categories?.name || 'General';
      categorySpending[cat] = (categorySpending[cat] || 0) + Number(p.amount_paid);
    });

    const q = question.toLowerCase().trim();
    const geminiKey = import.meta.env.VITE_GEMINI_API_KEY;

    if (geminiKey && geminiKey.trim() !== '') {
      try {
        const prompt = `You are BillMate AI, an intelligent personal financial assistant.
User Real Financial Data:
- Total Bills: ${(bills || []).length}
- Total Paid: $${totalPaid.toFixed(2)}
- Recurring Monthly: $${recurringTotal.toFixed(2)}
- Categories: ${JSON.stringify(categorySpending)}
- Active Bills: ${JSON.stringify((bills || []).slice(0, 10).map(b => ({ name: b.name, amount: b.amount, due: b.due_date, status: b.payment_status })))}
Question: "${question}"
Answer concisely and accurately with professional SaaS financial advice.`;

        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });
        if (res.ok) {
          const json = await res.json();
          const reply = json.candidates?.[0]?.content?.parts?.[0]?.text;
          if (reply) {
            return {
              success: true,
              engine: 'Google Gemini AI',
              answer: reply
            };
          }
        }
      } catch (err) {
        console.warn('Gemini API call failed, using rule-based engine:', err);
      }
    }

    // Rule-Based Financial Intelligence Engine
    let answer = '';
    const now = new Date();
    const currentMonth = now.toISOString().slice(0, 7);

    if (q.includes('electricity') || q.includes('electric') || q.includes('power')) {
      const elecPayments = (payments || []).filter(p =>
        (p.bills?.categories?.name && p.bills.categories.name.toLowerCase().includes('electricity')) ||
        (p.bills?.name && p.bills.name.toLowerCase().includes('electric'))
      );
      const thisMonthElec = elecPayments.filter(p => p.payment_date.startsWith(currentMonth));
      const totalThisMonth = thisMonthElec.reduce((s, p) => s + Number(p.amount_paid), 0);
      const totalAll = elecPayments.reduce((s, p) => s + Number(p.amount_paid), 0);

      answer = `### ⚡ Electricity Expense Analysis\n` +
        `- **Paid This Month (${currentMonth})**: $${totalThisMonth.toFixed(2)}\n` +
        `- **Total Paid All-Time**: $${totalAll.toFixed(2)} across ${elecPayments.length} payment(s)\n` +
        `\n*Tip: Utility bills often fluctuate with seasonal temperature changes.*`;
    } else if (q.includes('highest') || q.includes('top category') || q.includes('maximum')) {
      const sorted = Object.entries(categorySpending).sort((a, b) => b[1] - a[1]);
      if (sorted.length > 0) {
        const [topCat, topAmt] = sorted[0];
        const pct = totalPaid > 0 ? ((topAmt / totalPaid) * 100).toFixed(1) : 0;
        answer = `### 📊 Highest Expense Category\n` +
          `Your highest spending category is **${topCat}** with **$${topAmt.toFixed(2)}** (${pct}% of total disbursements).\n\n` +
          sorted.slice(0, 3).map(([c, a], i) => `${i + 1}. **${c}**: $${a.toFixed(2)}`).join('\n');
      } else {
        answer = `Not enough payment records to determine highest category. Start recording payments!`;
      }
    } else if (q.includes('predict') || q.includes('next month')) {
      const projected = recurringTotal + 120;
      answer = `### 🔮 Next Month Expense Prediction\n` +
        `- **Projected Fixed Recurring Commitments**: **$${recurringTotal.toFixed(2)}**\n` +
        `- **Estimated Variable / Utility Burden**: **~$120.00**\n` +
        `- **Forecasted Total**: **~$${projected.toFixed(2)}**\n`;
    } else {
      const overdue = (bills || []).filter(b => b.payment_status === 'overdue');
      const upcoming = (bills || []).filter(b => b.payment_status === 'upcoming');
      answer = `### 💡 Financial Overview\n` +
        `- **Total Bills**: ${(bills || []).length}\n` +
        `- **Total Settled**: $${totalPaid.toFixed(2)}\n` +
        `- **Overdue Items**: ${overdue.length} requiring immediate attention\n` +
        `- **Upcoming Items**: ${upcoming.length} due soon\n` +
        `- **Recurring Fixed Load**: $${recurringTotal.toFixed(2)} / month`;
    }

    return {
      success: true,
      engine: 'Supabase Data-Driven Financial Intelligence Engine',
      answer
    };
  },

  async getInsights() {
    const { data: bills } = await supabase.from('bills').select('*');
    const { data: payments } = await supabase.from('payments').select('amount_paid');

    const totalPaid = (payments || []).reduce((s, p) => s + Number(p.amount_paid), 0);
    const overdue = (bills || []).filter(b => b.payment_status === 'overdue');
    const recurring = (bills || []).filter(b => b.is_recurring);
    const recurringTotal = recurring.reduce((s, b) => s + Number(b.amount), 0);

    const insights = [];

    if (overdue.length > 0) {
      const sum = overdue.reduce((s, b) => s + Number(b.amount), 0);
      insights.push({
        id: 'overdue',
        type: 'danger',
        title: 'Action Needed: Overdue Bills',
        description: `You have ${overdue.length} overdue bill(s) totaling $${sum.toFixed(2)}. Settle them to prevent penalties.`
      });
    }

    if (recurringTotal > 0) {
      insights.push({
        id: 'recurring',
        type: 'info',
        title: 'Recurring Fixed Expenses',
        description: `Your automated obligations total ~$${recurringTotal.toFixed(2)}/cycle. Aim to keep fixed costs within 50% of monthly income.`
      });
    }

    if (overdue.length === 0 && (bills || []).length > 0) {
      insights.push({
        id: 'clean',
        type: 'success',
        title: 'Clean Track Record!',
        description: `Zero overdue bills! All scheduled commitments are paid or in safe upcoming due windows.`
      });
    }

    return { success: true, insights };
  },

  async getPredictions() {
    const { data: bills } = await supabase.from('bills').select('amount, is_recurring');
    const recurringSum = (bills || []).filter(b => b.is_recurring).reduce((s, b) => s + Number(b.amount), 0);

    const now = new Date();
    const months = [];
    for (let i = 1; i <= 3; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const period = d.toLocaleString('default', { month: 'short', year: 'numeric' });
      const variance = 50 + (i * 15);
      months.push({
        period,
        fixedRecurring: Math.round(recurringSum * 100) / 100,
        estimatedVariable: variance,
        totalProjected: Math.round((recurringSum + variance) * 100) / 100
      });
    }

    return { success: true, predictions: months };
  }
};
