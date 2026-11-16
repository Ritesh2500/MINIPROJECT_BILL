import React, { useState } from 'react';
import { X, CreditCard, CheckCircle2, AlertCircle } from 'lucide-react';
import { paymentsService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { formatCurrency } from '../utils/formatters';

export default function PaymentModal({ bill, isOpen, onClose, onSuccess }) {
  const { currencySymbol } = useAuth();
  const { showToast } = useNotifications();

  const remaining = bill ? Math.max(0, Number(bill.amount) - (Number(bill.total_paid) || 0)) : 0;
  const initialAmount = remaining > 0 ? remaining : Number(bill?.amount || 0);

  const [amountPaid, setAmountPaid] = useState(initialAmount);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [transactionId, setTransactionId] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !bill) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const parsed = parseFloat(amountPaid);
    if (isNaN(parsed) || parsed <= 0) {
      setError('Please enter a valid payment amount greater than zero.');
      return;
    }

    try {
      setLoading(true);
      const res = await paymentsService.createPayment({
        bill_id: bill.id,
        amount_paid: parsed,
        payment_date: paymentDate,
        payment_method: paymentMethod,
        transaction_id: transactionId,
        notes
      });

      if (res.data?.success) {
        showToast(`Payment of ${formatCurrency(parsed, currencySymbol)} recorded successfully!`, 'success');
        if (onSuccess) onSuccess(res.data);
        onClose();
      } else {
        setError(res.data?.message || 'Failed to record payment.');
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Server error recording payment.');
    } finally {
      setLoading(false);
    }
  };

  const methods = ['UPI', 'Debit Card', 'Credit Card', 'Net Banking', 'Cash', 'Other'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">Record Payment</h2>
              <p className="text-xs text-slate-400">{bill.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Bill summary badge */}
        <div className="mx-6 mt-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl flex items-center justify-between text-xs">
          <div>
            <span className="text-slate-400 block">Bill Total</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">{formatCurrency(bill.amount, currencySymbol)}</span>
          </div>
          <div>
            <span className="text-slate-400 block">Due Date</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">{bill.due_date}</span>
          </div>
          <div>
            <span className="text-slate-400 block">Balance Due</span>
            <span className="font-bold text-blue-600 dark:text-blue-400">
              {formatCurrency(remaining, currencySymbol)}
            </span>
          </div>
        </div>

        {error && (
          <div className="mx-6 mt-3 p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 rounded-xl flex items-center gap-2 text-rose-600 dark:text-rose-400 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Payment Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Amount Paid ({currencySymbol}) *
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                {currencySymbol}
              </span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
                className="w-full pl-8 pr-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
              />
            </div>
            <div className="flex gap-2 mt-2">
              <button
                type="button"
                onClick={() => setAmountPaid(bill.amount)}
                className="px-2.5 py-1 text-[11px] font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300"
              >
                Full Bill ({formatCurrency(bill.amount, currencySymbol)})
              </button>
              {remaining > 0 && remaining !== Number(bill.amount) && (
                <button
                  type="button"
                  onClick={() => setAmountPaid(remaining)}
                  className="px-2.5 py-1 text-[11px] font-medium bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-lg text-blue-600 dark:text-blue-400"
                >
                  Remaining ({formatCurrency(remaining, currencySymbol)})
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Payment Date *
              </label>
              <input
                type="date"
                required
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Payment Method *
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {methods.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Reference / Transaction ID <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. TXN-892182 or UPI Ref"
              value={transactionId}
              onChange={(e) => setTransactionId(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Notes <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <textarea
              rows="2"
              placeholder="Add payment notes or confirmation details..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md shadow-emerald-600/20 active:scale-95 transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {loading ? 'Recording...' : 'Save Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
