import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Info,
  Clock,
  Trash2,
  RefreshCw,
  CheckCheck
} from 'lucide-react';
import { remindersService } from '../services/api';
import { useNotifications } from '../context/NotificationContext';
import { formatDate } from '../utils/formatters';

export default function NotificationsPage() {
  const navigate = useNavigate();
  const { notifications, unreadCount, fetchNotifications, markAsRead, deleteNotification, showToast } = useNotifications();
  const [filter, setFilter] = useState('all');
  const [triggering, setTriggering] = useState(false);

  const handleMarkAllRead = async () => {
    try {
      await remindersService.markRead('all');
      fetchNotifications();
      showToast('All notifications marked as read', 'info');
    } catch (err) {
      console.error(err);
    }
  };

  const handleClearAll = async () => {
    if (!confirm('Are you sure you want to clear all notifications?')) return;
    try {
      await remindersService.deleteNotification('all');
      fetchNotifications();
      showToast('All notifications cleared', 'info');
    } catch (err) {
      console.error(err);
    }
  };

  const handleTriggerScheduler = async () => {
    try {
      setTriggering(true);
      await remindersService.triggerScheduler();
      await fetchNotifications();
      showToast('Scheduler ran: reminders & overdue checks refreshed!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Error triggering scheduler', 'error');
    } finally {
      setTriggering(false);
    }
  };

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return !n.is_read;
    if (filter === 'warning') return n.type === 'warning';
    if (filter === 'reminder') return n.type === 'reminder';
    return true;
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
            Notification Center
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Due-date reminders, overdue alerts, and automated recurrence notices.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleTriggerScheduler}
            disabled={triggering}
            className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100 flex items-center gap-1.5 transition-colors disabled:opacity-50"
            title="Scan & generate due alerts now"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${triggering ? 'animate-spin' : ''}`} />
            Scan Due Reminders
          </button>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 flex items-center gap-1.5 transition-colors"
            >
              <CheckCheck className="w-3.5 h-3.5" /> Mark All Read
            </button>
          )}
          {notifications.length > 0 && (
            <button
              onClick={handleClearAll}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors"
              title="Clear all"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1 text-xs font-semibold rounded-xl transition-colors ${
            filter === 'all' ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800'
          }`}
        >
          All ({notifications.length})
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`px-3 py-1 text-xs font-semibold rounded-xl transition-colors ${
            filter === 'unread' ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800'
          }`}
        >
          Unread ({unreadCount})
        </button>
        <button
          onClick={() => setFilter('warning')}
          className={`px-3 py-1 text-xs font-semibold rounded-xl transition-colors ${
            filter === 'warning' ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800'
          }`}
        >
          Overdue Warnings
        </button>
      </div>

      {/* Notification List */}
      <div className="p-4 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        {filteredNotifications.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-400">
            <Bell className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
            No notifications found in this view.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredNotifications.map((n) => (
              <div
                key={n.id}
                className={`py-4 px-3 rounded-2xl flex items-start justify-between gap-4 transition-colors ${
                  n.is_read ? 'opacity-70 hover:bg-slate-50 dark:hover:bg-slate-800/40' : 'bg-blue-50/40 dark:bg-blue-950/20'
                }`}
              >
                <div
                  className="flex items-start gap-3 cursor-pointer flex-1"
                  onClick={() => {
                    if (!n.is_read) markAsRead(n.id);
                    if (n.link) navigate(n.link);
                  }}
                >
                  <div className="mt-0.5 shrink-0">
                    {n.type === 'warning' ? (
                      <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600">
                        <AlertTriangle className="w-5 h-5" />
                      </div>
                    ) : n.type === 'success' ? (
                      <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                    ) : (
                      <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600">
                        <Clock className="w-5 h-5" />
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                        {n.title}
                      </h3>
                      {!n.is_read && (
                        <span className="w-2 h-2 rounded-full bg-blue-600" />
                      )}
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                      {n.message}
                    </p>
                    <span className="text-[10px] text-slate-400 block mt-1.5">
                      {formatDate(n.created_at)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {!n.is_read && (
                    <button
                      onClick={() => markAsRead(n.id)}
                      className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg text-xs"
                      title="Mark as read"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => deleteNotification(n.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg text-xs"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
