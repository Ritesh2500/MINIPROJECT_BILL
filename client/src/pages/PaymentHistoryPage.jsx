import React, { useState, useEffect } from 'react';
import {
  History,
  Search,
  Filter,
  CreditCard,
  Trash2,
  Calendar,
  Download,
  FileText,
  DollarSign,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { paymentsService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { formatCurrency, formatDate } from '../utils/formatters';

export default function PaymentHistoryPage() {
  const { currencySymbol } = useAuth();
  const { showToast } = useNotifications();

  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });

  // Filters
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Selected receipt modal
  const [receiptPayment, setReceiptPayment] = useState(null);

  const fetchPayments = async (page = 1) => {
    try {
      setLoading(true);
      const params = {
        search: search.trim(),
        method: methodFilter,
        startDate,
        endDate,
        page,
        limit: pagination.limit
      };

      const res = await paymentsService.getPayments(params);
      if (res.data?.success) {
        setPayments(res.data.payments || []);
        if (res.data.pagination) setPagination(res.data.pagination);
      }
    } catch (err) {
      console.error('Error fetching payments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments(1);
  }, [search, methodFilter, startDate, endDate]);

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this payment record? The bill status will be updated accordingly.')) return;
    try {
      const res = await paymentsService.deletePayment(id);
      if (res.data?.success) {
        showToast('Payment record removed', 'info');
        fetchPayments(pagination.page);
      }
    } catch (err) {
      console.error(err);
      showToast('Error deleting payment', 'error');
    }
  };

  const totalPaidSum = payments.reduce((sum, p) => sum + Number(p.amount_paid), 0);
  const avgPayment = payments.length > 0 ? totalPaidSum / payments.length : 0;

  const paymentMethods = ['UPI', 'Debit Card', 'Credit Card', 'Net Banking', 'Cash', 'Other'];

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">Payment History & Ledger</h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          Complete verified audit log of all personal bill disbursements and transactions.
        </p>
      </div>

      {/* Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs text-slate-400 block font-semibold">Total Paid (This View)</span>
          <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {formatCurrency(totalPaidSum, currencySymbol)}
          </div>
        </div>
        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs text-slate-400 block font-semibold">Transactions Count</span>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
            {pagination.total}
          </div>
        </div>
        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs text-slate-400 block font-semibold">Average Payment Amount</span>
          <div className="text-xl sm:text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">
            {formatCurrency(avgPayment, currencySymbol)}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search bill or TXN ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Payment Method */}
        <div>
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Payment Methods</option>
            {paymentMethods.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>

        {/* Start Date */}
        <div>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Start Date"
          />
        </div>

        {/* End Date */}
        <div>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="End Date"
          />
        </div>
      </div>

      {/* Ledger Table */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400 animate-pulse">
            Loading payment records...
          </div>
        ) : payments.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            No payment transactions found matching your criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Bill / Payee</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3">Method</th>
                  <th className="py-3 px-3">Transaction ID</th>
                  <th className="py-3 px-3">Amount Paid</th>
                  <th className="py-3 px-3 text-right">Receipt / Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="py-3.5 px-3 font-semibold text-slate-800 dark:text-slate-200">
                      {formatDate(p.payment_date)}
                    </td>
                    <td className="py-3.5 px-3 font-bold text-slate-900 dark:text-slate-100">
                      {p.bill_name}
                    </td>
                    <td className="py-3.5 px-3 text-slate-600 dark:text-slate-300">
                      {p.category_name}
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {p.payment_method}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 font-mono text-[11px] text-slate-500">
                      {p.transaction_id || '-'}
                    </td>
                    <td className="py-3.5 px-3 font-black text-emerald-600 dark:text-emerald-400">
                      +{formatCurrency(p.amount_paid, currencySymbol)}
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setReceiptPayment(p)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors"
                          title="View Receipt"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(p.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                          title="Delete Record"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800 mt-4">
            <span className="text-xs text-slate-400">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <div className="flex gap-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => fetchPayments(pagination.page - 1)}
                className="p-1.5 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchPayments(pagination.page + 1)}
                className="p-1.5 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Payment Receipt Modal */}
      {receiptPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="text-center pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto mb-2">
                <CreditCard className="w-5 h-5" />
              </div>
              <h3 className="text-base font-black text-slate-900 dark:text-slate-100">Payment Receipt</h3>
              <p className="text-[11px] text-slate-400 font-mono mt-0.5">{receiptPayment.transaction_id || 'OFFLINE-TXN'}</p>
            </div>

            <div className="py-4 space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Bill Name:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{receiptPayment.bill_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Category:</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">{receiptPayment.category_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Payment Date:</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">{formatDate(receiptPayment.payment_date)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Payment Method:</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">{receiptPayment.payment_method}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-sm">
                <span className="font-bold text-slate-700 dark:text-slate-300">Amount Paid:</span>
                <span className="font-black text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(receiptPayment.amount_paid, currencySymbol)}
                </span>
              </div>
              {receiptPayment.notes && (
                <div className="pt-2 text-[11px] text-slate-400 italic">
                  Note: "{receiptPayment.notes}"
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setReceiptPayment(null)}
                className="w-full py-2 text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl"
              >
                Close Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
