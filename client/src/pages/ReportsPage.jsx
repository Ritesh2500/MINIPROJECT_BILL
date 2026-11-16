import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Download,
  Filter,
  FileText,
  FileCode,
  Calendar,
  CheckCircle2,
  DollarSign,
  Printer
} from 'lucide-react';
import { reportsService, categoriesService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatDate } from '../utils/formatters';

export default function ReportsPage() {
  const { currencySymbol } = useAuth();

  const [categories, setCategories] = useState([]);
  const [reportData, setReportData] = useState([]);
  const [summary, setSummary] = useState({ totalRecords: 0, totalBilled: 0, totalPaid: 0 });
  const [loading, setLoading] = useState(true);

  // Filters
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

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

  const fetchReport = async () => {
    try {
      setLoading(true);
      const params = { category, status, startDate, endDate };
      const res = await reportsService.getReportData(params);
      if (res.data?.success) {
        setReportData(res.data.records || []);
        if (res.data.summary) setSummary(res.data.summary);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [category, status, startDate, endDate]);

  const handleDownloadCsv = () => {
    const url = reportsService.downloadCsvUrl({ category, status, startDate, endDate });
    window.open(url, '_blank');
  };

  const handleDownloadExcel = () => {
    const url = reportsService.downloadExcelUrl({ category, status, startDate, endDate });
    window.open(url, '_blank');
  };

  const handleDownloadPdf = () => {
    const url = reportsService.downloadPdfUrl({ category, status, startDate, endDate });
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">Financial Reports & Export</h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Generate customized statements, tax audits, and data exports in PDF, Excel, and CSV.
          </p>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadPdf}
            className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-sm flex items-center gap-1.5 transition-all"
            title="Download PDF Document"
          >
            <FileText className="w-4 h-4" /> Export PDF
          </button>
          <button
            onClick={handleDownloadExcel}
            className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm flex items-center gap-1.5 transition-all"
            title="Download Excel Spreadsheet"
          >
            <FileSpreadsheet className="w-4 h-4" /> Export Excel
          </button>
          <button
            onClick={handleDownloadCsv}
            className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm flex items-center gap-1.5 transition-all"
            title="Download CSV File"
          >
            <FileCode className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-semibold text-slate-400 block">Total Filtered Records</span>
          <div className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
            {summary.totalRecords}
          </div>
        </div>
        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-semibold text-slate-400 block">Total Amount Billed</span>
          <div className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">
            {formatCurrency(summary.totalBilled, currencySymbol)}
          </div>
        </div>
        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-semibold text-slate-400 block">Total Settled Payments</span>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {formatCurrency(summary.totalPaid, currencySymbol)}
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div>
          <label className="block text-[11px] font-semibold text-slate-400 mb-1">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Categories</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-400 mb-1">Payment Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Statuses</option>
            <option value="upcoming">Upcoming</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-400 mb-1">Start Due Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-400 mb-1">End Due Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Live Table Preview */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-4">
          Report Data Preview ({reportData.length} entries)
        </h2>

        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400 animate-pulse">
            Generating statement report...
          </div>
        ) : reportData.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            No records found for the selected filter parameters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-3">Bill Name</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3">Billed</th>
                  <th className="py-3 px-3">Due Date</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Paid Amount</th>
                  <th className="py-3 px-3">Payment Date</th>
                  <th className="py-3 px-3">Method</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {reportData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="py-3 px-3 font-bold text-slate-800 dark:text-slate-200">
                      {row.bill_name}
                    </td>
                    <td className="py-3 px-3 text-slate-600 dark:text-slate-300">
                      {row.category_name}
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-900 dark:text-slate-100">
                      {formatCurrency(row.bill_amount, currencySymbol)}
                    </td>
                    <td className="py-3 px-3 text-slate-500">
                      {formatDate(row.due_date)}
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {row.payment_status}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-bold text-emerald-600 dark:text-emerald-400">
                      {row.amount_paid ? formatCurrency(row.amount_paid, currencySymbol) : '-'}
                    </td>
                    <td className="py-3 px-3 text-slate-500">
                      {row.payment_date ? formatDate(row.payment_date) : '-'}
                    </td>
                    <td className="py-3 px-3 text-slate-600 dark:text-slate-300">
                      {row.payment_method || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
