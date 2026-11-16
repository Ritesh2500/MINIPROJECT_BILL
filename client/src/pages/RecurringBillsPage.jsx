import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Repeat,
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  Plus,
  Power,
  ChevronRight,
  TrendingUp
} from 'lucide-react';
import { recurringService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { formatCurrency, formatDate, getFrequencyLabel } from '../utils/formatters';
import { getCategoryIcon } from '../utils/categoryIcons';

export default function RecurringBillsPage() {
  const { currencySymbol } = useAuth();
  const { showToast } = useNotifications();

  const [recurringData, setRecurringData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [frequencyFilter, setFrequencyFilter] = useState('all');

  const fetchRecurring = async () => {
    try {
      setLoading(true);
      const res = await recurringService.getRecurringBills();
      if (res.data?.success) {
        setRecurringData(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecurring();
  }, []);

  const handleToggle = async (billId, currentStatus) => {
    try {
      const res = await recurringService.toggleRecurring(billId, !currentStatus);
      if (res.data?.success) {
        showToast(res.data.message, 'info');
        fetchRecurring();
      }
    } catch (err) {
      console.error(err);
      showToast('Error updating recurring status', 'error');
    }
  };

  const bills = (recurringData?.bills || []).filter(b => {
    if (frequencyFilter === 'all') return true;
    return b.billing_frequency === frequencyFilter;
  });

  const summary = recurringData?.summary || {};

  const freqTabs = [
    { label: 'All Recurring', value: 'all' },
    { label: 'Monthly', value: 'monthly' },
    { label: 'Quarterly', value: 'quarterly' },
    { label: 'Yearly', value: 'yearly' },
    { label: 'Weekly', value: 'weekly' }
  ];

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">Recurring Bills & Subscriptions</h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Track and automate recurring cycles, subscription burn rate, and renewal schedules.
          </p>
        </div>
        <Link
          to="/bills/new"
          className="px-4 py-2 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/25 flex items-center gap-1.5 self-start sm:self-auto active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" /> Add Recurring Bill
        </Link>
      </div>

      {/* Burn Rate Calculator Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold">Active Subscriptions</span>
            <Repeat className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-slate-100">
            {summary.totalRecurringBills || 0}
          </div>
          <span className="text-[11px] text-slate-400">Scheduled auto-rolling items</span>
        </div>

        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold">Monthly Fixed Burn Rate</span>
            <TrendingUp className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black text-blue-600 dark:text-blue-400">
            {formatCurrency(summary.estimatedMonthlyCost, currencySymbol)}
          </div>
          <span className="text-[11px] text-slate-400">Normalized 30-day fixed cost</span>
        </div>

        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold">Projected Annual Commitment</span>
            <DollarSign className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {formatCurrency(summary.estimatedAnnualCost, currencySymbol)}
          </div>
          <span className="text-[11px] text-slate-400">12-month projected total</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {freqTabs.map(tab => (
          <button
            key={tab.value}
            onClick={() => setFrequencyFilter(tab.value)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              frequencyFilter === tab.value
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/25'
                : 'text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-40 bg-slate-200 dark:bg-slate-800 rounded-3xl animate-pulse" />
          ))}
        </div>
      ) : bills.length === 0 ? (
        <div className="py-16 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8">
          <Repeat className="w-10 h-10 text-slate-400 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">No recurring bills in this category</h3>
          <p className="text-xs text-slate-400 mt-1">Add recurring bills to automate tracking of subscriptions.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {bills.map(b => (
            <div
              key={b.id}
              className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-sm"
                      style={{ backgroundColor: b.category_color || '#3B82F6' }}
                    >
                      {getCategoryIcon(b.category_icon, 'w-5 h-5')}
                    </div>
                    <div>
                      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                        {b.category_name}
                      </span>
                      <Link
                        to={`/bills/${b.id}`}
                        className="text-sm font-bold text-slate-800 dark:text-slate-100 hover:text-blue-600 truncate block"
                      >
                        {b.name}
                      </Link>
                    </div>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-500/10 text-purple-600 border border-purple-500/20">
                    {getFrequencyLabel(b.billing_frequency)}
                  </span>
                </div>

                <div className="my-3 flex items-baseline justify-between">
                  <div className="text-2xl font-black text-slate-900 dark:text-slate-100">
                    {formatCurrency(b.amount, currencySymbol)}
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] text-slate-400 block">Current Due</span>
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {formatDate(b.due_date)}
                    </span>
                  </div>
                </div>

                {b.next_due_date && (
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs mb-3">
                    <span className="text-slate-400">Next Cycle:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{formatDate(b.next_due_date)}</span>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  {b.payment_cycles_completed || 0} cycles logged
                </span>
                <button
                  onClick={() => handleToggle(b.id, b.is_recurring)}
                  className={`px-3 py-1 text-xs font-semibold rounded-xl flex items-center gap-1 transition-colors ${
                    b.is_recurring
                      ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 hover:bg-rose-100'
                      : 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 hover:bg-blue-100'
                  }`}
                >
                  <Power className="w-3.5 h-3.5" />
                  {b.is_recurring ? 'Pause' : 'Resume'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
