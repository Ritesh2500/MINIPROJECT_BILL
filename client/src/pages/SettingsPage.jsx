import React, { useState, useEffect } from 'react';
import {
  Settings,
  Globe,
  Bell,
  Moon,
  Sun,
  Clock,
  Save,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { settingsService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNotifications } from '../context/NotificationContext';

export default function SettingsPage() {
  const { user, updateUser } = useAuth();
  const { theme, toggleTheme, setTheme } = useTheme();
  const { showToast } = useNotifications();

  const [currency, setCurrency] = useState('USD');
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [inAppNotifications, setInAppNotifications] = useState(true);
  const [reminderDaysDefault, setReminderDaysDefault] = useState(3);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      try {
        setLoading(true);
        const res = await settingsService.getSettings();
        if (res.data?.success) {
          const s = res.data.settings;
          setCurrency(s.currency || 'USD');
          setEmailNotifications(Boolean(s.email_notifications));
          setInAppNotifications(Boolean(s.in_app_notifications));
          setReminderDaysDefault(s.reminder_days_default || 3);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await settingsService.updateSettings({
        currency,
        email_notifications: emailNotifications,
        in_app_notifications: inAppNotifications,
        dark_mode: theme === 'dark',
        reminder_days_default: parseInt(reminderDaysDefault, 10)
      });

      if (res.data?.success) {
        updateUser({
          currency,
          settings: res.data.settings
        });
        showToast('Settings saved successfully!', 'success');
      }
    } catch (err) {
      console.error(err);
      showToast('Error saving settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const currencies = [
    { code: 'USD', label: 'USD ($) - United States Dollar' },
    { code: 'EUR', label: 'EUR (€) - Euro' },
    { code: 'GBP', label: 'GBP (£) - British Pound' },
    { code: 'INR', label: 'INR (₹) - Indian Rupee' },
    { code: 'CAD', label: 'CAD (C$) - Canadian Dollar' },
    { code: 'AUD', label: 'AUD (A$) - Australian Dollar' },
    { code: 'JPY', label: 'JPY (¥) - Japanese Yen' }
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">Settings & Preferences</h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          Customize your currency format, notifications, appearance, and reminder defaults.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Localization & Currency */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100 dark:border-slate-800">
            <Globe className="w-5 h-5 text-blue-500" />
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">Currency & Regional</h2>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Primary Currency
            </label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full sm:w-80 px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            >
              {currencies.map(c => (
                <option key={c.code} value={c.code}>{c.label}</option>
              ))}
            </select>
            <p className="text-[11px] text-slate-400 mt-1">
              All financial dashboards and reports will render using this symbol.
            </p>
          </div>
        </div>

        {/* Theme & Display */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100 dark:border-slate-800">
            {theme === 'dark' ? <Moon className="w-5 h-5 text-indigo-500" /> : <Sun className="w-5 h-5 text-amber-500" />}
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">Appearance & Theme</h2>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">Dark Mode</span>
              <p className="text-[11px] text-slate-400">Reduce eye strain with BillMate’s modern dark theme</p>
            </div>
            <button
              type="button"
              onClick={toggleTheme}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl border transition-colors ${
                theme === 'dark'
                  ? 'bg-indigo-600 text-white border-indigo-500'
                  : 'bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              {theme === 'dark' ? 'Dark Mode Active' : 'Light Mode Active'}
            </button>
          </div>
        </div>

        {/* Reminders & Lead Times */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100 dark:border-slate-800">
            <Bell className="w-5 h-5 text-amber-500" />
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">Reminder Lead Times</h2>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Default Bill Advance Notice
            </label>
            <select
              value={reminderDaysDefault}
              onChange={(e) => setReminderDaysDefault(e.target.value)}
              className="w-full sm:w-80 px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="1">1 day before due date</option>
              <option value="2">2 days before due date</option>
              <option value="3">3 days before due date (Recommended)</option>
              <option value="5">5 days before due date</option>
              <option value="7">7 days before due date</option>
            </select>
          </div>

          <div className="pt-2 space-y-3">
            <label className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={inAppNotifications}
                onChange={(e) => setInAppNotifications(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500"
              />
              <span>In-app Notification Center alerts</span>
            </label>

            <label className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={emailNotifications}
                onChange={(e) => setEmailNotifications(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500"
              />
              <span>Email reminder summaries (when SMTP is configured)</span>
            </label>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/25 flex items-center gap-2 active:scale-95 transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save All Preferences'}
          </button>
        </div>
      </form>
    </div>
  );
}
