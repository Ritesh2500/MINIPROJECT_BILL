import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Receipt,
  ArrowLeft,
  Calendar,
  CreditCard,
  Repeat,
  Bell,
  FileText,
  Plus,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { billsService, categoriesService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { formatCurrency, getFrequencyLabel } from '../utils/formatters';
import { getCategoryIcon } from '../utils/categoryIcons';

export default function AddBillPage() {
  const { currencySymbol } = useAuth();
  const { showToast } = useNotifications();
  const navigate = useNavigate();

  const [categories, setCategories] = useState([]);
  const [loadingCats, setLoadingCats] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Form states
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [billingFrequency, setBillingFrequency] = useState('monthly');
  const [paymentStatus, setPaymentStatus] = useState('upcoming');
  const [description, setDescription] = useState('');
  const [reminderDaysBefore, setReminderDaysBefore] = useState(3);
  const [isRecurring, setIsRecurring] = useState(false);
  const [autoGenerateNext, setAutoGenerateNext] = useState(true);

  // New Custom Category Modal
  const [showNewCatModal, setShowNewCatModal] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('#3B82F6');
  const [newCatIcon, setNewCatIcon] = useState('Tag');

  useEffect(() => {
    async function loadCategories() {
      try {
        setLoadingCats(true);
        const res = await categoriesService.getCategories();
        if (res.data?.success) {
          const cats = res.data.categories || [];
          setCategories(cats);
          if (cats.length > 0) {
            setCategoryId(cats[0].id);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingCats(false);
      }
    }
    loadCategories();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please provide a valid bill amount greater than zero.');
      return;
    }

    if (!categoryId) {
      setError('Please select a category.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await billsService.createBill({
        name: name.trim(),
        category_id: categoryId,
        amount: parsedAmount,
        due_date: dueDate,
        billing_frequency: isRecurring ? billingFrequency : 'one-time',
        payment_status: paymentStatus,
        description: description.trim(),
        reminder_days_before: parseInt(reminderDaysBefore, 10),
        is_recurring: isRecurring,
        auto_generate_next: autoGenerateNext
      });

      if (res.data?.success) {
        showToast(`Bill "${name}" created successfully!`, 'success');
        navigate('/bills');
      } else {
        setError(res.data?.message || 'Failed to create bill.');
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Server error creating bill.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    try {
      const res = await categoriesService.createCategory({
        name: newCatName.trim(),
        color: newCatColor,
        icon: newCatIcon
      });
      if (res.data?.success) {
        setCategories(prev => [...prev, res.data.category]);
        setCategoryId(res.data.category.id);
        setShowNewCatModal(false);
        setNewCatName('');
        showToast('Custom category created!', 'success');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Error creating category');
    }
  };

  const selectedCategory = categories.find(c => String(c.id) === String(categoryId));

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in">
      {/* Back button & Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">Add New Bill</h1>
          <p className="text-xs text-slate-400">Record a new recurring or one-time financial commitment</p>
        </div>
      </div>

      {error && (
        <div className="p-3.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 rounded-2xl flex items-center gap-2.5 text-rose-600 dark:text-rose-400 text-xs font-medium">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Bill Form */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Bill Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Bill / Payee Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Electric Utility, Gym Membership, Netflix"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Category and Amount */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Category *
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowNewCatModal(true)}
                    className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5"
                  >
                    <Plus className="w-3 h-3" /> Custom
                  </button>
                </div>
                <select
                  required
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Amount ({currencySymbol}) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
                    {currencySymbol}
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full pl-8 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                  />
                </div>
              </div>
            </div>

            {/* Due Date & Initial Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Due Date *
                </label>
                <input
                  type="date"
                  required
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Initial Payment Status
                </label>
                <select
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="upcoming">Upcoming (Auto calculate)</option>
                  <option value="pending">Pending</option>
                  <option value="paid">Already Paid</option>
                </select>
              </div>
            </div>

            {/* Recurring Toggle */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Repeat className="w-3.5 h-3.5 text-blue-500" /> Recurring Schedule
                  </span>
                  <p className="text-[11px] text-slate-400">
                    Automatically roll forward this bill cycle upon completion
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isRecurring}
                    onChange={(e) => setIsRecurring(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {isRecurring && (
                <div className="mt-3 p-3 bg-blue-50/50 dark:bg-blue-950/20 rounded-2xl grid grid-cols-1 sm:grid-cols-2 gap-3 border border-blue-100 dark:border-blue-900/30">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Billing Frequency
                    </label>
                    <select
                      value={billingFrequency}
                      onChange={(e) => setBillingFrequency(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="half-yearly">Half-yearly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </div>

                  <div className="flex items-center pt-4">
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 dark:text-slate-300">
                      <input
                        type="checkbox"
                        checked={autoGenerateNext}
                        onChange={(e) => setAutoGenerateNext(e.target.checked)}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span>Auto-generate next occurrence on payment</span>
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Reminder Lead Time */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Bell className="w-3.5 h-3.5 text-amber-500" />
                Reminder Lead Time
              </label>
              <select
                value={reminderDaysBefore}
                onChange={(e) => setReminderDaysBefore(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="1">1 day before due date</option>
                <option value="2">2 days before due date</option>
                <option value="3">3 days before due date (Standard)</option>
                <option value="5">5 days before due date</option>
                <option value="7">1 week before due date</option>
                <option value="14">2 weeks before due date</option>
              </select>
            </div>

            {/* Notes / Description */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Description / Account Notes
              </label>
              <textarea
                rows="2"
                placeholder="Account number, portal login info, or special billing notes..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Submit Button */}
            <div className="pt-3 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => navigate('/bills')}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2.5 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/25 flex items-center gap-1.5 active:scale-95 transition-all disabled:opacity-50"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                {submitting ? 'Creating Bill...' : 'Save & Track Bill'}
              </button>
            </div>
          </form>
        </div>

        {/* Live Bill Card Preview */}
        <div className="space-y-4">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Live Card Preview
          </div>

          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-sm"
                  style={{ backgroundColor: selectedCategory?.color || '#3B82F6' }}
                >
                  {getCategoryIcon(selectedCategory?.icon, 'w-5 h-5')}
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                    {selectedCategory?.name || 'Category'}
                  </span>
                  <div className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    {name || 'Bill Name'}
                  </div>
                </div>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20">
                {paymentStatus}
              </span>
            </div>

            <div className="my-2 flex items-baseline justify-between">
              <div>
                <div className="text-2xl font-black text-slate-900 dark:text-slate-100">
                  {formatCurrency(amount || 0, currencySymbol)}
                </div>
                <span className="text-[11px] text-slate-400">
                  {isRecurring ? getFrequencyLabel(billingFrequency) : 'One-time'}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-slate-400 block">Due Date</span>
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {dueDate || 'YYYY-MM-DD'}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-400 italic">
              {description || 'No description provided'}
            </p>
          </div>
        </div>
      </div>

      {/* Custom Category Modal */}
      {showNewCatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-3">Create Custom Category</h3>
            <form onSubmit={handleCreateCategory} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Category Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Pet Care, Tuition"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Color</label>
                  <input
                    type="color"
                    value={newCatColor}
                    onChange={(e) => setNewCatColor(e.target.value)}
                    className="w-full h-8 bg-transparent cursor-pointer rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Icon</label>
                  <select
                    value={newCatIcon}
                    onChange={(e) => setNewCatIcon(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  >
                    <option value="Tag">Tag</option>
                    <option value="Zap">Zap (Electric)</option>
                    <option value="Home">Home</option>
                    <option value="Car">Car</option>
                    <option value="HeartPulse">Heart</option>
                    <option value="ShoppingBag">Shopping</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewCatModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-500 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-xl"
                >
                  Add Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
