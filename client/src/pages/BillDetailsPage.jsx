import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Receipt,
  ArrowLeft,
  Calendar,
  CreditCard,
  Repeat,
  Bell,
  Trash2,
  Edit3,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  Plus
} from 'lucide-react';
import { billsService, paymentsService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { formatCurrency, formatDate, getStatusBadgeClass, getFrequencyLabel } from '../utils/formatters';
import { getCategoryIcon } from '../utils/categoryIcons';
import PaymentModal from '../components/PaymentModal';

export default function BillDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currencySymbol } = useAuth();
  const { showToast } = useNotifications();

  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchBillDetails = async () => {
    try {
      setLoading(true);
      const res = await billsService.getBill(id);
      if (res.data?.success) {
        setBill(res.data.bill);
      } else {
        showToast('Bill not found', 'error');
        navigate('/bills');
      }
    } catch (err) {
      console.error(err);
      showToast('Error loading bill', 'error');
      navigate('/bills');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBillDetails();
  }, [id]);

  const handleDeleteBill = async () => {
    try {
      setDeleteLoading(true);
      const res = await billsService.deleteBill(id);
      if (res.data?.success) {
        showToast('Bill deleted successfully.', 'info');
        navigate('/bills');
      }
    } catch (err) {
      console.error(err);
      showToast('Error deleting bill', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleDeletePayment = async (paymentId) => {
    if (!confirm('Are you sure you want to delete this payment record? The bill status will be updated accordingly.')) return;
    try {
      const res = await paymentsService.deletePayment(paymentId);
      if (res.data?.success) {
        showToast('Payment record deleted.', 'info');
        fetchBillDetails();
      }
    } catch (err) {
      console.error(err);
      showToast('Error deleting payment', 'error');
    }
  };

  if (loading || !bill) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-pulse">
        <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded-xl w-48" />
        <div className="h-44 bg-slate-200 dark:bg-slate-800 rounded-3xl" />
        <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-3xl" />
      </div>
    );
  }

  const billAmt = Number(bill.amount);
  const totalPaid = Number(bill.total_paid) || 0;
  const remaining = Math.max(0, billAmt - totalPaid);
  const progressPct = Math.min(100, Math.round((totalPaid / billAmt) * 100));

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in">
      {/* Back button & Action controls */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/bills')}
          className="flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
        >
          <ArrowLeft className="w-4 h-4" /> Back to All Bills
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowDeleteModal(true)}
            className="p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors"
            title="Delete Bill"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowPaymentModal(true)}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 flex items-center gap-1.5 active:scale-95 transition-all"
          >
            <CreditCard className="w-3.5 h-3.5" /> Record Payment
          </button>
        </div>
      </div>

      {/* Main Details Card */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-md"
              style={{ backgroundColor: bill.category_color || '#3B82F6' }}
            >
              {getCategoryIcon(bill.category_icon, 'w-6 h-6')}
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                {bill.category_name}
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100">
                {bill.name}
              </h1>
            </div>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border self-start sm:self-auto ${getStatusBadgeClass(bill.payment_status)}`}>
            {bill.payment_status}
          </span>
        </div>

        {/* Amounts & Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
          <div>
            <span className="text-xs text-slate-400 block">Total Billed</span>
            <span className="text-xl font-black text-slate-900 dark:text-slate-100">
              {formatCurrency(billAmt, currencySymbol)}
            </span>
          </div>
          <div>
            <span className="text-xs text-slate-400 block">Total Paid</span>
            <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">
              {formatCurrency(totalPaid, currencySymbol)}
            </span>
          </div>
          <div>
            <span className="text-xs text-slate-400 block">Remaining Due</span>
            <span className="text-xl font-black text-blue-600 dark:text-blue-400">
              {formatCurrency(remaining, currencySymbol)}
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-semibold text-slate-500">
            <span>Payment Fulfillment: {progressPct}%</span>
            <span>{bill.payment_status === 'paid' ? 'Paid in Full' : `Due: ${formatDate(bill.due_date)}`}</span>
          </div>
          <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${bill.payment_status === 'paid' ? 'bg-emerald-500' : 'bg-blue-600'}`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Schedule & Information Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div>
            <span className="text-slate-400 block mb-1">Due Date</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-blue-500" /> {formatDate(bill.due_date)}
            </span>
          </div>

          <div>
            <span className="text-slate-400 block mb-1">Billing Frequency</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {getFrequencyLabel(bill.billing_frequency)}
            </span>
          </div>

          <div>
            <span className="text-slate-400 block mb-1">Recurring Status</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Repeat className="w-3.5 h-3.5 text-purple-500" />
              {bill.is_recurring ? 'Auto-recurring' : 'One-time'}
            </span>
          </div>

          <div>
            <span className="text-slate-400 block mb-1">Reminder Lead Time</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Bell className="w-3.5 h-3.5 text-amber-500" />
              {bill.reminder_days_before} day(s) before
            </span>
          </div>
        </div>

        {bill.description && (
          <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Account Notes & Info</span>
            <p className="text-xs text-slate-500 dark:text-slate-400 whitespace-pre-wrap">{bill.description}</p>
          </div>
        )}
      </div>

      {/* Payment History Table for this Bill */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Payment Transaction History
            </h2>
            <p className="text-xs text-slate-400">All recorded payments logged against this bill</p>
          </div>
          <button
            onClick={() => setShowPaymentModal(true)}
            className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100 flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> Add Payment
          </button>
        </div>

        {(!bill.payments || bill.payments.length === 0) ? (
          <div className="py-8 text-center text-xs text-slate-400">
            No payments recorded yet for this bill. Click "Record Payment" to log your first transaction.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Amount</th>
                  <th className="py-3 px-3">Method</th>
                  <th className="py-3 px-3">Transaction ID</th>
                  <th className="py-3 px-3">Notes</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {bill.payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="py-3 px-3 font-semibold text-slate-800 dark:text-slate-200">
                      {formatDate(p.payment_date)}
                    </td>
                    <td className="py-3 px-3 font-bold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(p.amount_paid, currencySymbol)}
                    </td>
                    <td className="py-3 px-3 text-slate-600 dark:text-slate-300">
                      {p.payment_method}
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px] text-slate-500">
                      {p.transaction_id || '-'}
                    </td>
                    <td className="py-3 px-3 text-slate-500 max-w-xs truncate">
                      {p.notes || '-'}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => handleDeletePayment(p.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded-lg"
                        title="Delete transaction"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <PaymentModal
          bill={bill}
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={() => {
            setShowPaymentModal(false);
            fetchBillDetails();
          }}
        />
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Delete This Bill?</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              Are you sure you want to delete "{bill.name}"? This action cannot be undone.
            </p>
            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteLoading}
                onClick={handleDeleteBill}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl"
              >
                {deleteLoading ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
