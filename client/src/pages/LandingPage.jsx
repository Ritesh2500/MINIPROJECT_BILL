import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Receipt,
  ShieldCheck,
  Zap,
  TrendingUp,
  Calendar,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Clock,
  Download,
  CreditCard,
  ChevronDown
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

export default function LandingPage() {
  const { isDark, toggleTheme } = useTheme();
  const { isAuthenticated } = useAuth();
  const [openFaq, setOpenFaq] = useState(null);

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const faqs = [
    {
      q: 'How does BillMate keep track of recurring payments?',
      a: 'BillMate supports daily, weekly, monthly, quarterly, and yearly recurring schedules. When you record a payment on a recurring bill, BillMate automatically schedules the next occurrence with zero manual effort and zero duplicate entries.'
    },
    {
      q: 'Does BillMate support multiple currencies?',
      a: 'Yes! BillMate supports USD ($), EUR (€), GBP (£), INR (₹), CAD (C$), AUD (A$), and JPY (¥). You can easily set your preferred currency in user settings.'
    },
    {
      q: 'Can I export reports for tax or accounting purposes?',
      a: 'Absolutely. BillMate includes a full reports module where you can filter by date ranges and categories, and export cleanly formatted PDF, Excel (XLSX), or CSV files with a single click.'
    },
    {
      q: 'How does the AI Assistant help me manage expenses?',
      a: 'The BillMate AI Assistant answers natural language questions like "How much did I spend on electricity?", predicts next month’s bills, and highlights your highest expenditure categories. If an AI key is configured, it leverages Google Gemini; otherwise, it runs a transparent rule-based financial analysis engine!'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      {/* Navigation */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Receipt className="w-5 h-5" />
            </div>
            <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-blue-600 to-indigo-500 bg-clip-text text-transparent">
              BillMate
            </span>
          </Link>

          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                className="px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-500/25 transition-all"
              >
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400"
                >
                  Log In
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-500/25 transition-all"
                >
                  Get Started Free
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-16 pb-20 sm:pt-24 sm:pb-32 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-semibold mb-6 animate-pulse">
            <Sparkles className="w-3.5 h-3.5" />
            Next-Gen Personal Bill & Payment Management System
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight max-w-4xl mx-auto leading-tight">
            Take Full Control of Your{' '}
            <span className="bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600 bg-clip-text text-transparent">
              Bills, Subscriptions & Payments
            </span>
          </h1>

          <p className="mt-6 text-base sm:text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Never miss a payment again. Track upcoming and overdue bills, record payment transactions, automate recurring schedules, and gain AI-powered spending insights—all in one place.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/register"
              className="w-full sm:w-auto px-7 py-3 text-sm font-semibold rounded-2xl bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95"
            >
              Start Managing Free <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/login"
              className="w-full sm:w-auto px-7 py-3 text-sm font-semibold rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center transition-all"
            >
              Sign In with Demo Account
            </Link>
          </div>

          {/* Social Proof Stats */}
          <div className="mt-14 pt-10 border-t border-slate-200 dark:border-slate-800 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
            <div>
              <div className="text-2xl sm:text-3xl font-extrabold text-blue-600 dark:text-blue-400">100%</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Data Privacy & Isolation</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-extrabold text-indigo-600 dark:text-indigo-400">6+</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Payment Methods Tracked</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">0</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Missed Due Dates</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-extrabold text-purple-600 dark:text-purple-400">PDF/Excel</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">One-Click Exports</div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="py-20 bg-slate-100/60 dark:bg-slate-900/40 border-y border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Engineered for Complete Financial Clarity
            </h2>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
              Everything you need to eliminate payment chaos, late penalties, and blind spots in your monthly budget.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center mb-5">
                <Receipt className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Full Bill Lifecycle Tracking</h3>
              <p className="mt-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                Track status across Upcoming, Pending, Paid, and Overdue states. Automatic overdue calculations ensure you never miss a deadline.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-5">
                <CreditCard className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Real Payment Ledger</h3>
              <p className="mt-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                Record partial or full payments using UPI, Cards, Net Banking, or Cash with transaction IDs and permanent payment history records.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-600 flex items-center justify-center mb-5">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Automated Recurring Cycles</h3>
              <p className="mt-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                Set daily, weekly, monthly, quarterly, or yearly frequencies. BillMate automatically generates the next cycle without duplicates.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center mb-5">
                <Calendar className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Interactive Calendar View</h3>
              <p className="mt-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                Visualize all upcoming obligations on a monthly calendar grid. Click any bill date to inspect amounts or record payments.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center mb-5">
                <TrendingUp className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Rich Recharts Analytics</h3>
              <p className="mt-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                Explore month-over-month spending charts, category distribution donuts, and 30-day projection curves powered by real data.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center mb-5">
                <Download className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Instant Reports & Export</h3>
              <p className="mt-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                Generate professional PDF financial statements, export formatted Excel (.xlsx) workbooks, or download clean CSV data anytime.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">How BillMate Works in 3 Steps</h2>
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
              Simple setup. Zero learning curve. Total financial control.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="w-14 h-14 rounded-full bg-blue-600 text-white font-extrabold text-lg flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/30">
                1
              </div>
              <h3 className="text-base font-bold">Add Your Bills</h3>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                Enter your utilities, rent, credit cards, and subscriptions with due dates and recurrence settings.
              </p>
            </div>

            <div className="text-center p-6">
              <div className="w-14 h-14 rounded-full bg-indigo-600 text-white font-extrabold text-lg flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-500/30">
                2
              </div>
              <h3 className="text-base font-bold">Receive Reminders</h3>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                In-app notification center alerts you ahead of due dates and flags overdue items automatically.
              </p>
            </div>

            <div className="text-center p-6">
              <div className="w-14 h-14 rounded-full bg-emerald-600 text-white font-extrabold text-lg flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/30">
                3
              </div>
              <h3 className="text-base font-bold">Record & Analyse</h3>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                Log payments with your payment method and generate instant financial reports and AI expense insights.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-slate-100/60 dark:bg-slate-900/40 border-t border-slate-200 dark:border-slate-800">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-center tracking-tight mb-10">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm"
              >
                <button
                  onClick={() => toggleFaq(idx)}
                  className="w-full px-6 py-4 text-left font-semibold text-sm flex items-center justify-between text-slate-800 dark:text-slate-200"
                >
                  <span>{faq.q}</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${openFaq === idx ? 'rotate-180 text-blue-600' : 'text-slate-400'}`} />
                </button>
                {openFaq === idx && (
                  <div className="px-6 pb-4 text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-800/60 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 py-10 bg-white dark:bg-slate-950 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center">
              <Receipt className="w-3.5 h-3.5" />
            </div>
            <span className="font-bold text-slate-700 dark:text-slate-300">BillMate</span>
            <span>&copy; {new Date().getFullYear()} All rights reserved. Personal Bill & Payment Management System.</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/login" className="hover:text-blue-500">Sign In</Link>
            <Link to="/register" className="hover:text-blue-500">Register</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
