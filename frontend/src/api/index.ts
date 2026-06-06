import axios from 'axios';
import type {
  LoginRequest, LoginResponse, Employee, UserAccount, QrTokenResponse,
  ScanResult, Redemption, DashboardData, PageResponse,
  CreateEmployeeRequest, CreateUserRequest
} from '../types';

const API_BASE = import.meta.env.VITE_API_URL || '';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      const currentPath = window.location.pathname;
      if (currentPath !== '/login') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ==================== Auth ====================

export const authApi = {
  login: (data: LoginRequest) =>
    api.post<LoginResponse>('/api/auth/login', data),

  changePassword: (currentPassword: string, newPassword: string) =>
    api.post('/api/auth/change-password', { currentPassword, newPassword }),

  getMe: () => api.get('/api/auth/me'),
};

// ==================== QR ====================

export const qrApi = {
  generate: () => api.get<QrTokenResponse>('/api/qr/generate'),
};

// ==================== Redemptions ====================

export const redemptionApi = {
  scan: (qrToken: string, session: string) =>
    api.post<ScanResult>('/api/redemptions/scan', { qrToken, session }),

  confirm: (employeeId: number, session: string) =>
    api.post<Redemption>('/api/redemptions/confirm', { employeeId, session }),

  manual: (employeeCode: string, pin: string, session: string) =>
    api.post<Redemption>('/api/redemptions/manual', { employeeCode, pin, session }),

  myHistory: () =>
    api.get<Redemption[]>('/api/redemptions/my-history'),

  history: (params: {
    startDate?: string;
    endDate?: string;
    session?: string;
    employeeId?: number;
    page?: number;
    size?: number;
  }) => api.get<PageResponse<Redemption>>('/api/redemptions/history', { params }),
};

// ==================== Employees ====================

export const employeeApi = {
  list: (params: { search?: string; page?: number; size?: number }) =>
    api.get<PageResponse<Employee>>('/api/employees', { params }),

  get: (id: number) =>
    api.get<Employee>(`/api/employees/${id}`),

  create: (data: CreateEmployeeRequest) =>
    api.post<Employee>('/api/employees', data),

  update: (id: number, data: Partial<Employee>) =>
    api.put<Employee>(`/api/employees/${id}`, data),

  delete: (id: number) =>
    api.delete(`/api/employees/${id}`),

  search: (query: string) =>
    api.get<Employee[]>('/api/employees/search', { params: { query } }),

  uploadPhoto: (id: number, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<Employee>(`/api/employees/${id}/photo`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// ==================== Users ====================

export const userApi = {
  list: () => api.get<UserAccount[]>('/api/users'),

  get: (id: number) => api.get<UserAccount>(`/api/users/${id}`),

  create: (data: CreateUserRequest) =>
    api.post<UserAccount>('/api/users', data),

  resetPassword: (id: number, password: string) =>
    api.post(`/api/users/${id}/reset-password`, { password }),

  resetPin: (id: number, pin: string) =>
    api.post(`/api/users/${id}/reset-pin`, { pin }),

  toggleActive: (id: number) =>
    api.post(`/api/users/${id}/toggle-active`),

  delete: (id: number) =>
    api.delete(`/api/users/${id}`),
};

// ==================== Dashboard ====================

export const dashboardApi = {
  today: () => api.get<DashboardData>('/api/dashboard/today'),

  employeeSummary: (id: number) =>
    api.get<{ history: Redemption[]; monthlyCount: number }>(`/api/dashboard/employee/${id}`),
};

export default api;
