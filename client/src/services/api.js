import {
  supabaseAuthService,
  supabaseBillsService,
  supabasePaymentsService,
  supabaseRecurringService,
  supabaseCategoriesService,
  supabaseAnalyticsService,
  supabaseReportsService,
  supabaseRemindersService,
  supabaseSettingsService,
  supabaseAiService
} from './supabaseService';

// Standard response wrapper to maintain contract compatibility with existing UI components
const wrap = (fn) => async (...args) => {
  const result = await fn(...args);
  return { data: result };
};

export const authService = {
  login: wrap(supabaseAuthService.login),
  register: wrap(supabaseAuthService.register),
  getMe: wrap(supabaseAuthService.getMe),
  logout: wrap(supabaseAuthService.logout),
  resetPassword: wrap(supabaseAuthService.resetPassword)
};

export const billsService = {
  getSummary: wrap(supabaseBillsService.getSummary.bind(supabaseBillsService)),
  getBills: wrap(supabaseBillsService.getBills.bind(supabaseBillsService)),
  getBill: wrap(supabaseBillsService.getBill.bind(supabaseBillsService)),
  createBill: wrap(supabaseBillsService.createBill.bind(supabaseBillsService)),
  updateBill: wrap(supabaseBillsService.updateBill.bind(supabaseBillsService)),
  deleteBill: wrap(supabaseBillsService.deleteBill.bind(supabaseBillsService))
};

export const paymentsService = {
  getPayments: wrap(supabasePaymentsService.getPayments.bind(supabasePaymentsService)),
  createPayment: wrap(supabasePaymentsService.createPayment.bind(supabasePaymentsService)),
  deletePayment: wrap(supabasePaymentsService.deletePayment.bind(supabasePaymentsService))
};

export const recurringService = {
  getRecurringBills: wrap(supabaseRecurringService.getRecurringBills.bind(supabaseRecurringService)),
  toggleRecurring: wrap(supabaseRecurringService.toggleRecurring.bind(supabaseRecurringService))
};

export const categoriesService = {
  getCategories: wrap(supabaseCategoriesService.getCategories.bind(supabaseCategoriesService)),
  createCategory: wrap(supabaseCategoriesService.createCategory.bind(supabaseCategoriesService))
};

export const analyticsService = {
  getOverview: wrap(supabaseAnalyticsService.getOverview.bind(supabaseAnalyticsService)),
  getMonthly: wrap(supabaseAnalyticsService.getMonthly.bind(supabaseAnalyticsService)),
  getCategories: wrap(supabaseAnalyticsService.getCategories.bind(supabaseAnalyticsService))
};

export const remindersService = {
  getReminders: wrap(supabaseRemindersService.getReminders.bind(supabaseRemindersService)),
  dismissReminder: wrap(supabaseRemindersService.dismissReminder.bind(supabaseRemindersService)),
  triggerScheduler: wrap(supabaseRemindersService.triggerScheduler.bind(supabaseRemindersService)),
  getNotifications: wrap(supabaseRemindersService.getNotifications.bind(supabaseRemindersService)),
  markRead: wrap(supabaseRemindersService.markRead.bind(supabaseRemindersService)),
  deleteNotification: wrap(supabaseRemindersService.deleteNotification.bind(supabaseRemindersService))
};

export const reportsService = {
  getReportData: wrap(supabaseReportsService.getReportData.bind(supabaseReportsService)),
  downloadCsv: supabaseReportsService.downloadCsv.bind(supabaseReportsService),
  downloadExcel: supabaseReportsService.downloadExcel.bind(supabaseReportsService),
  downloadPdf: supabaseReportsService.downloadPdf.bind(supabaseReportsService),
  // Direct trigger URLs
  downloadCsvUrl: (params = {}) => {
    supabaseReportsService.downloadCsv(params);
    return '#';
  },
  downloadExcelUrl: (params = {}) => {
    supabaseReportsService.downloadExcel(params);
    return '#';
  },
  downloadPdfUrl: (params = {}) => {
    supabaseReportsService.downloadPdf(params);
    return '#';
  }
};

export const settingsService = {
  getSettings: wrap(supabaseSettingsService.getSettings.bind(supabaseSettingsService)),
  updateSettings: wrap(supabaseSettingsService.updateSettings.bind(supabaseSettingsService)),
  updateProfile: wrap(supabaseSettingsService.updateProfile.bind(supabaseSettingsService)),
  changePassword: wrap(supabaseSettingsService.changePassword.bind(supabaseSettingsService)),
  exportUserData: wrap(supabaseSettingsService.exportUserData.bind(supabaseSettingsService))
};

export const aiService = {
  ask: wrap(supabaseAiService.ask.bind(supabaseAiService)),
  getInsights: wrap(supabaseAiService.getInsights.bind(supabaseAiService)),
  getPredictions: wrap(supabaseAiService.getPredictions.bind(supabaseAiService))
};

export default {
  authService,
  billsService,
  paymentsService,
  recurringService,
  categoriesService,
  analyticsService,
  remindersService,
  reportsService,
  settingsService,
  aiService
};
