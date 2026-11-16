import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Receipt,
  CreditCard,
  AlertTriangle,
  Clock,
  TrendingUp,
  DollarSign,
  Plus,
  ArrowUpRight,
  Sparkles,
  ChevronRight,
  CheckCircle2,
  Calendar
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar
} from 'recharts';
import { billsService, analyticsService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatDate, getStatusBadgeClass } from '../utils/formatters';
import { getCategoryIcon } from '../utils/categoryIcons';
import PaymentModal from '../components/PaymentModal';

export default function DashboardPage() {
  const { user, currencySymbol } = useAuth();
  const [loading, setLoading] = useState(true);
  const [summaryData, setSummaryData] = useState(null);
  const [monthlyData, setMonthlyData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [selectedBillForPayment, setSelectedBillForPayment] = useState(null);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const [sumRes, monthRes, catRes] = await Promise.all([
        billsService.getSummary(),
        analyticsService.getMonthly(new Date().getFullYear()),
        analyticsService.getCategories({})
      ]);

      if (sumRes.data?.success) {
        setSummaryData(sumRes.data);
      }
      if (monthRes.data?.success) {
        setMonthlyData(monthRes.data.monthly || []);
      }
      if (catRes.data?.success) {
        setCategoryData(catRes.data.categories || []);
      }
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#64748B'];

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded-xl w-64" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-28 bg-slate-200 dark:bg-slate-800 rounded-3xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-80 bg-slate-200 dark:bg-slate-800 rounded-3xl" />
          <div className="h-80 bg-slate-200 dark:bg-slate-800 rounded-3xl" />
        </div>
      </div>
    );
  }

  const s = summaryData?.summary || {};

  return (
    <div className="space-y-8 animate-in fade-in">
      {/* Top Banner / Welcome & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
            Financial Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time overview of your personal bills, upcoming obligations and payment flows.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Link
            to="/ai-assistant"
            className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 flex items-center gap-1.5 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            AI Insights
          </Link>
          <Link
            to="/bills/new"
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/25 flex items-center gap-1.5 active:scale-95 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            Add New Bill
          </Link>
        </div>
      </div>

      {/* 6 Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Total Bills */}
        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold">Total Bills</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100">
            {s.totalBills || 0}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Tracked active bills</p>
        </div>

        {/* Total Amount Due */}
        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold">Amount Due</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400">
            {formatCurrency(s.totalAmountDue, currencySymbol)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Pending & overdue</p>
        </div>

        {/* Total Amount Paid */}
        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold">Total Paid</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {formatCurrency(s.totalAmountPaid, currencySymbol)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">All-time settled</p>
        </div>

        {/* Upcoming Bills */}
        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold">Upcoming</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-blue-600 dark:text-blue-400">
            {s.upcomingBills?.count || 0}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {formatCurrency(s.upcomingBills?.amount, currencySymbol)} due soon
          </p>
        </div>

        {/* Overdue Bills */}
        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold">Overdue</span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-xl sm:text-2xl font-black ${(s.overdueBills?.count || 0) > 0 ? 'text-rose-600 animate-pulse' : 'text-slate-900 dark:text-slate-100'}`}>
            {s.overdueBills?.count || 0}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {formatCurrency(s.overdueBills?.amount, currencySymbol)} overdue
          </p>
        </div>

        {/* Current Month Expenses */}
        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold">This Month</span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-purple-600 dark:text-purple-400">
            {formatCurrency(s.currentMonthExpenses, currencySymbol)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Paid in current month</p>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Spending Trend Chart */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                Monthly Spending Flow ({new Date().getFullYear()})
              </h2>
              <p className="text-xs text-slate-400">Actual payment transactions aggregated by calendar month</p>
            </div>
            <Link to="/analytics" className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
              Full Analytics <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="h-64 sm:h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="spendingGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" stroke="#94A3B8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} tickFormatter={(val) => `${currencySymbol}${val}`} />
                <Tooltip
                  formatter={(value) => [formatCurrency(value, currencySymbol), 'Spent']}
                  contentStyle={{ backgroundColor: '#1E293B', borderColor: '#334155', borderRadius: '1rem', color: '#F8FAFC', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="total" stroke="#3B82F6" strokeWidth={2.5} fillOpacity={1} fill="url(#spendingGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Expense Distribution Donut */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                Category Spending
              </h2>
              <span className="text-[11px] text-slate-400">By payments</span>
            </div>
            <p className="text-xs text-slate-400 mb-4">Breakdown across expense types</p>

            <div className="h-48 w-full flex items-center justify-center">
              {categoryData.length === 0 ? (
                <div className="text-center text-xs text-slate-400">
                  No payment data recorded yet.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      dataKey="amount"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={3}
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => [formatCurrency(value, currencySymbol), 'Paid']}
                      contentStyle={{ backgroundColor: '#1E293B', borderColor: '#334155', borderRadius: '1rem', color: '#F8FAFC', fontSize: '12px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Mini Legend */}
          <div className="space-y-1.5 mt-2">
            {categoryData.slice(0, 4).map((c, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color || COLORS[idx] }} />
                  <span className="text-slate-600 dark:text-slate-300 font-medium truncate max-w-[120px]">{c.name}</span>
                </div>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{formatCurrency(c.amount, currencySymbol)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Lists Row: Upcoming Payments & Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Payments List */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                Upcoming Due Payments
              </h2>
              <p className="text-xs text-slate-400">Bills requiring attention soon</p>
            </div>
            <Link to="/bills" className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5">
              View All <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {(summaryData?.upcomingPayments || []).length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                🎉 No upcoming bills due right now!
              </div>
            ) : (
              (summaryData.upcomingPayments || []).map((b) => (
                <div key={b.id} className="py-3.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 text-white"
                      style={{ backgroundColor: b.category_color || '#3B82F6' }}
                    >
                      {getCategoryIcon(b.category_icon, 'w-5 h-5')}
                    </div>
                    <div className="min-w-0">
                      <Link to={`/bills/${b.id}`} className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 truncate block">
                        {b.name}
                      </Link>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] text-slate-400">Due {formatDate(b.due_date)}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getStatusBadgeClass(b.payment_status)}`}>
                          {b.payment_status}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
                    <div className="text-right">
                      <div className="text-xs sm:text-sm font-black text-slate-900 dark:text-slate-100">
                        {formatCurrency(b.amount, currencySymbol)}
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedBillForPayment(b)}
                      className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-sm active:scale-95"
                    >
                      Pay
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Transactions List */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                Recent Payment Transactions
              </h2>
              <p className="text-xs text-slate-400">Latest settled records & receipts</p>
            </div>
            <Link to="/payments" className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5">
              Ledger <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {(summaryData?.recentTransactions || []).length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No recorded payments yet.
              </div>
            ) : (
              (summaryData.recentTransactions || []).map((t) => (
                <div key={t.id} className="py-3.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 truncate">
                        {t.bill_name}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {formatDate(t.payment_date)} • {t.payment_method}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-xs sm:text-sm font-black text-emerald-600 dark:text-emerald-400">
                      +{formatCurrency(t.amount_paid, currencySymbol)}
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {t.transaction_id || 'Direct'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {selectedBillForPayment && (
        <PaymentModal
          bill={selectedBillForPayment}
          isOpen={Boolean(selectedBillForPayment)}
          onClose={() => setSelectedBillForPayment(null)}
          onSuccess={() => {
            setSelectedBillForPayment(null);
            fetchDashboard();
          }}
        />
      )}
    </div>
  );
}
