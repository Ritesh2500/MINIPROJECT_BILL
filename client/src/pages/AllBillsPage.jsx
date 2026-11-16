import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Receipt,
  Plus,
  Search,
  Filter,
  ArrowUpDown,
  CreditCard,
  Edit,
  Trash2,
  Calendar,
  AlertCircle,
  Eye,
  CheckCircle2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { billsService, categoriesService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { formatCurrency, formatDate, getStatusBadgeClass, getFrequencyLabel } from '../utils/formatters';
import { getCategoryIcon } from '../utils/categoryIcons';
import PaymentModal from '../components/PaymentModal';

export default function AllBillsPage() {
  const { currencySymbol } = useAuth();
  const { showToast } = useNotifications();

  const [bills, setBills] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0, totalPages: 1 });

  // Filters & Search
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('due_date');
  const [sortOrder, setSortOrder] = useState('ASC');

  // Modals & Action states
  const [selectedBillForPayment, setSelectedBillForPayment] = useState(null);
  const [billToDelete, setBillToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Fetch categories
  useEffect(() => {
    async function loadCategories() {
      try {
        const res = await categoriesService.getCategories();
        if (res.data?.success) setCategories(res.data.categories || []);
      } catch (err) {
        console.error(err);
      }
    }
    loadCategories();
  }, []);

  // Fetch bills
  const fetchBills = async (page = 1) => {
    try {
      setLoading(true);
      const params = {
        search: search.trim(),
        category: categoryFilter,
        status: statusFilter,
        sortBy,
        sortOrder,
        page,
        limit: pagination.limit
      };

      const res = await billsService.getBills(params);
      if (res.data?.success) {
        setBills(res.data.bills || []);
        if (res.data.pagination) {
          setPagination(res.data.pagination);
        }
      }
    } catch (err) {
      console.error('Error fetching bills:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBills(1);
  }, [search, categoryFilter, statusFilter, sortBy, sortOrder]);

  const handleDelete = async () => {
    if (!billToDelete) return;
    try {
      setDeleteLoading(true);
      const res = await billsService.deleteBill(billToDelete.id);
      if (res.data?.success) {
        showToast(`Bill "${billToDelete.name}" deleted.`, 'info');
        setBillToDelete(null);
        fetchBills(pagination.page);
      }
    } catch (err) {
      console.error(err);
      showToast('Error deleting bill', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  const statusTabs = [
    { label: 'All Bills', value: 'all' },
    { label: 'Upcoming', value: 'upcoming' },
    { label: 'Pending', value: 'pending' },
    { label: 'Paid', value: 'paid' },
    { label: 'Overdue', value: 'overdue' }
  ];

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">All Bills</h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Manage, filter, search, and record payments for all your active and settled bills.
          </p>
        </div>
        <Link
          to="/bills/new"
          className="px-4 py-2 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/25 flex items-center gap-1.5 self-start sm:self-auto active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" />
          Add Bill
        </Link>
      </div>

      {/* Filter Tabs & Search Controls Bar */}
      <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {statusTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                statusFilter === tab.value
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/25'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search & Select Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by bill name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Category Dropdown */}
          <div className="relative">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Sort By */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="due_date">Sort by Due Date</option>
              <option value="amount">Sort by Amount</option>
              <option value="name">Sort by Bill Name</option>
              <option value="status">Sort by Status</option>
            </select>
          </div>

          {/* Sort Order */}
          <div>
            <button
              onClick={() => setSortOrder(prev => prev === 'ASC' ? 'DESC' : 'ASC')}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/60 border border-slate-200 dark:border-slate-700 rounded-xl font-medium flex items-center justify-center gap-1.5 transition-colors"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span>{sortOrder === 'ASC' ? 'Ascending Order' : 'Descending Order'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bills Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-44 bg-slate-200 dark:bg-slate-800 rounded-3xl animate-pulse" />
          ))}
        </div>
      ) : bills.length === 0 ? (
        <div className="py-16 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <Receipt className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No bills found</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {search || categoryFilter !== 'all' || statusFilter !== 'all'
              ? 'No bills match your current filters. Try resetting the search or filters.'
              : 'You haven\'t added any bills yet. Click "Add Bill" to create your first obligation!'}
          </p>
          <Link
            to="/bills/new"
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-blue-600 text-white shadow-sm hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Bill Now
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {bills.map((bill) => {
            const totalPaid = Number(bill.total_paid) || 0;
            const billAmt = Number(bill.amount);
            const remaining = Math.max(0, billAmt - totalPaid);
            const progressPct = Math.min(100, Math.round((totalPaid / billAmt) * 100));

            return (
              <div
                key={bill.id}
                className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  {/* Top: Category Icon & Status Badge */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-sm"
                        style={{ backgroundColor: bill.category_color || '#3B82F6' }}
                      >
                        {getCategoryIcon(bill.category_icon, 'w-5 h-5')}
                      </div>
                      <div>
                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                          {bill.category_name}
                        </span>
                        <Link
                          to={`/bills/${bill.id}`}
                          className="text-sm font-bold text-slate-800 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 line-clamp-1"
                        >
                          {bill.name}
                        </Link>
                      </div>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border shrink-0 ${getStatusBadgeClass(bill.payment_status)}`}>
                      {bill.payment_status}
                    </span>
                  </div>

                  {/* Amount & Frequency */}
                  <div className="my-3 flex items-baseline justify-between">
                    <div>
                      <div className="text-xl font-black text-slate-900 dark:text-slate-100">
                        {formatCurrency(bill.amount, currencySymbol)}
                      </div>
                      <span className="text-[11px] text-slate-400">
                        {getFrequencyLabel(bill.billing_frequency)}
                        {bill.is_recurring ? ' • Recurring' : ''}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] text-slate-400 block">Due Date</span>
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {formatDate(bill.due_date)}
                      </span>
                    </div>
                  </div>

                  {/* Payment Progress Bar */}
                  <div className="space-y-1 mb-4">
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>Paid: {formatCurrency(totalPaid, currencySymbol)}</span>
                      <span>Balance: {formatCurrency(remaining, currencySymbol)}</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          bill.payment_status === 'paid' ? 'bg-emerald-500' : 'bg-blue-600'
                        }`}
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <Link
                      to={`/bills/${bill.id}`}
                      title="View Details"
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                    </Link>
                    <button
                      onClick={() => setBillToDelete(bill)}
                      title="Delete Bill"
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {bill.payment_status !== 'paid' ? (
                    <button
                      onClick={() => setSelectedBillForPayment(bill)}
                      className="px-3.5 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm active:scale-95 transition-all flex items-center gap-1.5"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      Record Pay
                    </button>
                  ) : (
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Settled
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between pt-4">
          <p className="text-xs text-slate-400">
            Showing {(pagination.page - 1) * pagination.limit + 1} to {Math.min(pagination.total, pagination.page * pagination.limit)} of {pagination.total} bills
          </p>
          <div className="flex items-center gap-2">
            <button
              disabled={pagination.page <= 1}
              onClick={() => fetchBills(pagination.page - 1)}
              className="p-2 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => fetchBills(pagination.page + 1)}
              className="p-2 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {selectedBillForPayment && (
        <PaymentModal
          bill={selectedBillForPayment}
          isOpen={Boolean(selectedBillForPayment)}
          onClose={() => setSelectedBillForPayment(null)}
          onSuccess={() => {
            setSelectedBillForPayment(null);
            fetchBills(pagination.page);
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {billToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Delete Bill?</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              Are you sure you want to delete <span className="font-semibold text-slate-700 dark:text-slate-200">"{billToDelete.name}"</span>? All associated payment records will be permanently removed.
            </p>
            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setBillToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteLoading}
                onClick={handleDelete}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md shadow-rose-600/20 active:scale-95 transition-all"
              >
                {deleteLoading ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
