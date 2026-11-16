import React, { useState, useEffect } from 'react';
import {
  PieChart as PieIcon,
  BarChart3,
  TrendingUp,
  Calendar,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Clock
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend
} from 'recharts';
import { analyticsService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/formatters';

export default function AnalyticsPage() {
  const { currencySymbol } = useAuth();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [monthlyData, setMonthlyData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [overviewData, setOverviewData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const [monthRes, catRes, overRes] = await Promise.all([
        analyticsService.getMonthly(selectedYear),
        analyticsService.getCategories({}),
        analyticsService.getOverview()
      ]);

      if (monthRes.data?.success) setMonthlyData(monthRes.data.monthly || []);
      if (catRes.data?.success) setCategoryData(catRes.data.categories || []);
      if (overRes.data?.success) setOverviewData(overRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [selectedYear]);

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16', '#64748B'];

  const summary = overviewData?.summary || {};
  const paidVsUnpaid = overviewData?.paidVsUnpaid || [];
  const obligations = overviewData?.obligations || [];
  const paymentMethods = overviewData?.paymentMethods || [];

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Title & Year Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">Financial Analytics & Insights</h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            In-depth visualization of expenditures, category concentrations, and payment schedules.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-400">Year:</span>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
            className="px-3 py-1.5 text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {[2024, 2025, 2026, 2027].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Top 4 Metrics Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-semibold text-slate-400 block">Total Settled (All-Time)</span>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {formatCurrency(summary.totalPaid, currencySymbol)}
          </div>
        </div>

        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-semibold text-slate-400 block">Overdue Exposure</span>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
            {formatCurrency(summary.totalOverdue, currencySymbol)}
          </div>
        </div>

        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-semibold text-slate-400 block">Upcoming Obligations</span>
          <div className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">
            {formatCurrency(summary.totalUpcoming, currencySymbol)}
          </div>
        </div>

        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-semibold text-slate-400 block">Next 30 Days Due</span>
          <div className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">
            {formatCurrency(summary.totalObligationsNext30, currencySymbol)}
          </div>
        </div>
      </div>

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Spending Bar Chart */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">
            Monthly Expenditure Trend ({selectedYear})
          </h2>
          <p className="text-xs text-slate-400 mb-4">Total payments recorded by calendar month</p>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="month" stroke="#94A3B8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} tickFormatter={(v) => `${currencySymbol}${v}`} />
                <Tooltip
                  formatter={(v) => [formatCurrency(v, currencySymbol), 'Spent']}
                  contentStyle={{ backgroundColor: '#1E293B', borderColor: '#334155', borderRadius: '1rem', color: '#F8FAFC', fontSize: '12px' }}
                />
                <Bar dataKey="total" fill="#3B82F6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Expense Donut Chart */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">
            Expense Allocation by Category
          </h2>
          <p className="text-xs text-slate-400 mb-4">Distribution of settled expenditures</p>
          <div className="h-64 w-full">
            {categoryData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No payment data available.
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
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v) => [formatCurrency(v, currencySymbol), 'Amount']}
                    contentStyle={{ backgroundColor: '#1E293B', borderColor: '#334155', borderRadius: '1rem', color: '#F8FAFC', fontSize: '12px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Second Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Paid vs Overdue vs Upcoming */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">
            Settlement Status Breakdown
          </h2>
          <p className="text-xs text-slate-400 mb-4">Paid versus pending and overdue balances</p>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={paidVsUnpaid}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={75}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {paidVsUnpaid.map((entry, index) => (
                    <Cell key={`status-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v) => [formatCurrency(v, currencySymbol), 'Balance']}
                  contentStyle={{ backgroundColor: '#1E293B', borderColor: '#334155', borderRadius: '1rem', color: '#F8FAFC', fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Payment Methods Distribution */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">
            Payment Methods Volume
          </h2>
          <p className="text-xs text-slate-400 mb-4">Transaction amounts by payment instrument</p>
          <div className="h-56 w-full">
            {paymentMethods.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No payment instruments recorded yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={paymentMethods} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                  <XAxis type="number" stroke="#94A3B8" fontSize={11} tickFormatter={(v) => `${currencySymbol}${v}`} />
                  <YAxis dataKey="payment_method" type="category" stroke="#94A3B8" fontSize={11} tickLine={false} />
                  <Tooltip
                    formatter={(v) => [formatCurrency(v, currencySymbol), 'Total Volume']}
                    contentStyle={{ backgroundColor: '#1E293B', borderColor: '#334155', borderRadius: '1rem', color: '#F8FAFC', fontSize: '12px' }}
                  />
                  <Bar dataKey="total_amount" fill="#10B981" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
