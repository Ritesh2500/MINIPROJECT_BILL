import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor to attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('billmate_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for token expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const isAuthRoute = window.location.pathname === '/login' || window.location.pathname === '/register' || window.location.pathname === '/';
      if (!isAuthRoute) {
        localStorage.removeItem('billmate_token');
        localStorage.removeItem('billmate_user');
        window.location.href = '/login?expired=1';
      }
    }
    return Promise.reject(error);
  }
);

// API Endpoints
export const authService = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  getMe: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout')
};

export const billsService = {
  getSummary: () => api.get('/bills/summary'),
  getBills: (params) => api.get('/bills', { params }),
  getBill: (id) => api.get(`/bills/${id}`),
  createBill: (data) => api.post('/bills', data),
  updateBill: (id, data) => api.put(`/bills/${id}`, data),
  deleteBill: (id) => api.delete(`/bills/${id}`)
};

export const paymentsService = {
  getPayments: (params) => api.get('/payments', { params }),
  createPayment: (data) => api.post('/payments', data),
  deletePayment: (id) => api.delete(`/payments/${id}`)
};

export const recurringService = {
  getRecurringBills: () => api.get('/recurring'),
  toggleRecurring: (id, is_recurring) => api.put(`/recurring/${id}/toggle`, { is_recurring })
};

export const categoriesService = {
  getCategories: () => api.get('/categories'),
  createCategory: (data) => api.post('/categories', data)
};

export const analyticsService = {
  getOverview: () => api.get('/analytics/overview'),
  getMonthly: (year) => api.get('/analytics/monthly', { params: { year } }),
  getCategories: (params) => api.get('/analytics/categories', { params })
};

export const remindersService = {
  getReminders: () => api.get('/reminders'),
  dismissReminder: (id) => api.put(`/reminders/${id}/dismiss`),
  triggerScheduler: () => api.post('/reminders/trigger'),
  getNotifications: () => api.get('/reminders/notifications'),
  markRead: (id) => api.put(`/reminders/notifications/${id}/read`),
  deleteNotification: (id) => api.delete(`/reminders/notifications/${id}`)
};

export const reportsService = {
  getReportData: (params) => api.get('/reports/data', { params }),
  downloadCsvUrl: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return `${API_BASE_URL}/reports/csv${query ? `?${query}` : ''}`;
  },
  downloadExcelUrl: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return `${API_BASE_URL}/reports/excel${query ? `?${query}` : ''}`;
  },
  downloadPdfUrl: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return `${API_BASE_URL}/reports/pdf${query ? `?${query}` : ''}`;
  }
};

export const settingsService = {
  getSettings: () => api.get('/settings'),
  updateSettings: (data) => api.put('/settings', data),
  updateProfile: (data) => api.put('/settings/profile', data),
  changePassword: (data) => api.put('/settings/password', data),
  exportUserData: () => api.get('/settings/export-all')
};

export const aiService = {
  ask: (question) => api.post('/ai/ask', { question }),
  getInsights: () => api.get('/ai/insights'),
  getPredictions: () => api.get('/ai/predictions')
};

export default api;
