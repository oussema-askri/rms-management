import axios from 'axios';
import { API_URL } from '../config';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to requests automatically
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// AuthContext registers a callback here so an expired or revoked token clears
// the in-memory session too. Without it the app kept rendering as signed in
// while every request failed, which matters more now that tokens expire in days
// rather than a month.
let onUnauthorized = null;

export const setUnauthorizedHandler = (handler) => {
  onUnauthorized = handler;
};

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;

    // A 401 from the login call itself is a wrong password, not an expired
    // session, so it must not trigger a sign-out loop.
    const isLoginAttempt = error.config?.url?.includes('/auth/login');

    if (status === 401 && !isLoginAttempt) {
      localStorage.removeItem('token');
      if (onUnauthorized) onUnauthorized();
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (userData) => api.post('/auth/register', userData),
  getCurrentUser: () => api.get('/auth/me'),
  changePassword: (currentPassword, newPassword) => api.put('/auth/change-password', { currentPassword, newPassword })
};

// Planning API
export const planningAPI = {
  getAll: () => api.get('/planning'),
  getOne: (id) => api.get(`/planning/${id}`),
  create: (data) => api.post('/planning', data),
  update: (id, data) => api.put(`/planning/${id}`, data),
  delete: (id) => api.delete(`/planning/${id}`),
  getDistinctMateriels: () => api.get('/planning/materiels/distinct')
};


// Expense API
export const expenseAPI = {
  getAll: () => api.get('/expenses'),
  getOne: (id) => api.get(`/expenses/${id}`),
  create: (formData) => api.post('/expenses', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  update: (id, data) => api.put(`/expenses/${id}`, data),
  updateStatus: (id, status) => api.put(`/expenses/${id}/status`, { status }),
  delete: (id) => api.delete(`/expenses/${id}`)
};

// RH API
export const rhAPI = {
  getEmployees: () => api.get('/rh/employees'),
  getEmployee: (id) => api.get(`/rh/employees/${id}`),
  createEmployee: (formData) => {
    return api.post('/rh/employees', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  updateEmployee: (id, data) => api.put(`/rh/employees/${id}`, data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  deleteEmployee: (id) => api.delete(`/rh/employees/${id}`),
  setAvailability: (id, data) => api.put(`/rh/employees/${id}/availability`, data),
  addPrime: (id, data) => api.post(`/rh/employees/${id}/prime`, data),
  getAccessRequests: () => api.get('/rh/access-requests'),
  createAccessRequest: (data) => api.post('/rh/access-requests', data),
  updateAccessRequest: (id, data) => api.put(`/rh/access-requests/${id}`, data),
  deleteAccessRequest: (id) => api.delete(`/rh/access-requests/${id}`),
  updateAccessRequestStatus: (id, status) => api.patch(`/rh/access-requests/${id}/status`, { status }),
  getMyAccessRequests: () => api.get('/rh/my-access-requests'),
  // Congé
  createConge: (formData) => api.post('/rh/conge', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getMyConge: () => api.get('/rh/my-conge'),
  getAllConge: () => api.get('/rh/conge'),
  updateCongeStatus: (id, status, rhComment) => api.patch(`/rh/conge/${id}/status`, { status, rhComment }),
  deleteConge: (id) => api.delete(`/rh/conge/${id}`),
  getEmployeeSolde: (id) => api.get(`/rh/employees/${id}/solde`),
  getAllSoldes: () => api.get('/rh/conge/soldes'),
};


// Admin API
export const adminAPI = {
  getStats: () => api.get('/admin/stats'),
  getRecentActivity: () => api.get('/admin/recent-activity'),
  resetUserPassword: (id) => api.post(`/admin/users/${id}/reset-password`),
  getMonthlyReport: (month) => api.get('/admin/monthly-report', { params: month ? { month } : {} }),
};
// Client API
export const clientAPI = {
  getAll: () => api.get('/clients'),
  getOne: (id) => api.get(`/clients/${id}`),
  create: (formData) => api.post('/clients', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  update: (id, formData) => api.put(`/clients/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  delete: (id) => api.delete(`/clients/${id}`),
  addUnite: (id, data) => api.post(`/clients/${id}/unites`, data),
  deleteUnite: (clientId, uniteId) => api.delete(`/clients/${clientId}/unites/${uniteId}`),
  // NEW: Sous-titre methods
  addSousTitre: (clientId, uniteId, data) => api.post(`/clients/${clientId}/unites/${uniteId}/sous-titres`, data),
  deleteSousTitre: (clientId, uniteId, sousTitreId) => api.delete(`/clients/${clientId}/unites/${uniteId}/sous-titres/${sousTitreId}`)
};


// Bon de Réception API - NEW SECTION
export const bonDeReceptionAPI = {
  getAll: () => api.get('/bon-de-reception'),
  getById: (id) => api.get(`/bon-de-reception/${id}`),
  getByClient: (clientId) => api.get(`/bon-de-reception/client/${clientId}`),
  sign: (id) => api.post(`/bon-de-reception/${id}/sign`),
  download: (id) => api.get(`/bon-de-reception/${id}/download`),
  delete: (id) => api.delete(`/bon-de-reception/${id}`) // NEW
};

// Pointage API
export const pointageAPI = {
  getPlanningForDate: (date) => api.get(`/pointage/planning-for-date?date=${date}`),
  getEmployees: () => api.get('/pointage/employees'),
  save: (data) => api.post('/pointage', data),
  getMy: (date) => api.get(`/pointage/my?date=${date}`),
  getDuplicate: (date) => api.get(`/pointage/duplicate?date=${date}`),
  getAll: (params) => api.get('/pointage/all', { params }),
  getOne: (id) => api.get(`/pointage/${id}`),
  delete: (id) => api.delete(`/pointage/${id}`),
};

export const facturationAPI = {
  getAll: () => api.get('/facturation'),
  create: (data) => api.post('/facturation', data),
  download: (id) => api.get(`/facturation/${id}/download`, { responseType: 'arraybuffer' }),
  delete: (id) => api.delete(`/facturation/${id}`)
};

// Re-exported so screens can pull the client and the helpers from one place.
export { unwrap, unwrapList } from './unwrap';

export default api;