import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  CreditCard,
  Eye,
  CheckCircle2,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { billsService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatDate, getStatusBadgeClass } from '../utils/formatters';
import PaymentModal from '../components/PaymentModal';

export default function CalendarPage() {
  const { currencySymbol } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDayBills, setSelectedDayBills] = useState(null);
  const [selectedBillForPayment, setSelectedBillForPayment] = useState(null);

  const fetchBills = async () => {
    try {
      setLoading(true);
      const res = await billsService.getBills({ limit: 200 });
      if (res.data?.success) {
        setBills(res.data.bills || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBills();
  }, []);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Calendar math
  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  // Filter bills by date prefix (YYYY-MM-DD)
  const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;
  const monthBills = bills.filter(b => b.due_date && b.due_date.startsWith(monthPrefix));
  const monthTotalDue = monthBills.reduce((sum, b) => sum + Number(b.amount), 0);

  // Group bills by day string
  const billsByDate = {};
  bills.forEach(b => {
    if (!billsByDate[b.due_date]) billsByDate[b.due_date] = [];
    billsByDate[b.due_date].push(b);
  });

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Calendar Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">Interactive Due Calendar</h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            View upcoming obligations, scheduled dates, and deadlines at a glance.
          </p>
        </div>

        {/* Month Navigation & Action Controls */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-1 shadow-sm">
            <button
              onClick={prevMonth}
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 text-xs font-bold text-slate-800 dark:text-slate-200 min-w-[130px] text-center">
              {monthName}
            </span>
            <button
              onClick={nextMonth}
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={goToToday}
            className="px-3 py-2 text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl shadow-sm text-slate-700 dark:text-slate-300"
          >
            Today
          </button>
        </div>
      </div>

      {/* Month Summary Bar */}
      <div className="p-4 rounded-3xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/40 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center">
            <CalendarDays className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-bold text-blue-900 dark:text-blue-100">
              {monthName} Schedule
            </span>
            <span className="text-[11px] text-blue-600 dark:text-blue-400 block">
              {monthBills.length} bill(s) due in this calendar month
            </span>
          </div>
        </div>
        <div className="text-right">
          <span className="text-[11px] text-blue-600 dark:text-blue-400 block">Total Due in Month</span>
          <span className="text-base font-black text-blue-900 dark:text-blue-100">
            {formatCurrency(monthTotalDue, currencySymbol)}
          </span>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="p-4 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* Days of week */}
        <div className="grid grid-cols-7 gap-1 text-center font-bold text-xs text-slate-400 uppercase tracking-wider pb-3 border-b border-slate-100 dark:border-slate-800">
          <span>Sun</span>
          <span>Mon</span>
          <span>Tue</span>
          <span>Wed</span>
          <span>Thu</span>
          <span>Fri</span>
          <span>Sat</span>
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2 pt-2">
          {/* Leading empty cells */}
          {[...Array(firstDayIndex)].map((_, i) => (
            <div key={`empty-${i}`} className="min-h-[85px] sm:min-h-[110px] p-1.5 rounded-2xl bg-slate-50/50 dark:bg-slate-950/20 opacity-30" />
          ))}

          {/* Actual days */}
          {[...Array(daysInMonth)].map((_, i) => {
            const dayNum = i + 1;
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
            const dayBills = billsByDate[dateStr] || [];
            const isToday = dateStr === todayStr;

            return (
              <div
                key={dateStr}
                onClick={() => {
                  if (dayBills.length > 0) setSelectedDayBills({ date: dateStr, bills: dayBills });
                }}
                className={`min-h-[85px] sm:min-h-[110px] p-1.5 sm:p-2 rounded-2xl border transition-all ${
                  isToday
                    ? 'border-blue-500 bg-blue-50/30 dark:bg-blue-950/20 ring-1 ring-blue-500'
                    : 'border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-900/60 hover:border-slate-300 dark:hover:border-slate-700'
                } ${dayBills.length > 0 ? 'cursor-pointer hover:shadow-md' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold ${isToday ? 'w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center' : 'text-slate-700 dark:text-slate-300'}`}>
                    {dayNum}
                  </span>
                  {dayBills.length > 0 && (
                    <span className="text-[10px] font-bold text-slate-400">
                      {dayBills.length}
                    </span>
                  )}
                </div>

                {/* Day bill pills */}
                <div className="mt-1 space-y-1 overflow-hidden">
                  {dayBills.slice(0, 2).map(b => (
                    <div
                      key={b.id}
                      className={`px-1.5 py-0.5 rounded-lg text-[10px] font-semibold truncate border ${getStatusBadgeClass(b.payment_status)}`}
                      title={`${b.name} - ${formatCurrency(b.amount, currencySymbol)}`}
                    >
                      {b.name}
                    </div>
                  ))}
                  {dayBills.length > 2 && (
                    <span className="text-[10px] text-slate-400 font-semibold block text-center">
                      +{dayBills.length - 2} more
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Day Bills Drawer / Modal */}
      {selectedDayBills && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Bills Due on {formatDate(selectedDayBills.date)}
                </h3>
                <span className="text-xs text-slate-400">
                  {selectedDayBills.bills.length} item(s) due on this day
                </span>
              </div>
              <button
                onClick={() => setSelectedDayBills(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto">
              {selectedDayBills.bills.map(b => (
                <div
                  key={b.id}
                  className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <Link
                      to={`/bills/${b.id}`}
                      className="text-xs font-bold text-slate-800 dark:text-slate-200 hover:text-blue-600 truncate block"
                    >
                      {b.name}
                    </Link>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs font-black text-slate-900 dark:text-slate-100">
                        {formatCurrency(b.amount, currencySymbol)}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadgeClass(b.payment_status)}`}>
                        {b.payment_status}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      to={`/bills/${b.id}`}
                      className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </Link>
                    {b.payment_status !== 'paid' && (
                      <button
                        onClick={() => {
                          setSelectedDayBills(null);
                          setSelectedBillForPayment(b);
                        }}
                        className="px-3 py-1 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                      >
                        Pay
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedDayBills(null)}
                className="w-full py-2 text-xs font-semibold bg-slate-100 dark:bg-slate-800 rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {selectedBillForPayment && (
        <PaymentModal
          bill={selectedBillForPayment}
          isOpen={Boolean(selectedBillForPayment)}
          onClose={() => setSelectedBillForPayment(null)}
          onSuccess={() => {
            setSelectedBillForPayment(null);
            fetchBills();
          }}
        />
      )}
    </div>
  );
}
