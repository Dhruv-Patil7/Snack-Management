// API types matching backend DTOs

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  role: 'ADMIN' | 'DISTRIBUTOR' | 'EMPLOYEE';
  username: string;
  userId: number;
  employeeId: number | null;
  employeeName: string | null;
  photoUrl: string | null;
}

export interface Employee {
  id: number;
  employeeCode: string;
  name: string;
  department: string | null;
  employeeType: string;
  photoUrl: string | null;
  active: boolean;
  createdAt: string;
}

export interface UserAccount {
  id: number;
  username: string;
  role: string;
  employeeId: number | null;
  employeeName: string | null;
  active: boolean;
  createdAt: string;
  passwordRaw?: string | null;
  pinRaw?: string | null;
}

export interface QrTokenResponse {
  qrToken: string;
  expiresInSeconds: number;
}

export interface ScanResult {
  employeeId: number;
  employeeCode: string;
  employeeName: string;
  department: string | null;
  photoUrl: string | null;
  session: string;
  alreadyRedeemed: boolean;
  alreadyRedeemedAt: string | null;
}

export interface Redemption {
  id: number;
  employeeId: number;
  employeeCode: string;
  employeeName: string;
  department: string | null;
  session: string;
  redemptionMode: string;
  redeemedAt: string;
  distributorId: number;
  distributorName: string;
  snackItem: string | null;
}

export interface DailyStat {
  date: string;
  day: string;
  morning: number;
  evening: number;
}

export interface DistributorStat {
  distributorName: string;
  count: number;
}

export interface DashboardData {
  morningCount: number;
  eveningCount: number;
  monthlyTotal: number;
  totalActiveEmployees: number;
  weeklyStats: DailyStat[];
  distributorStats: DistributorStat[];
}

export interface ApiError {
  status: number;
  error: string;
  message: string;
  timestamp: string;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  first: boolean;
  last: boolean;
}

export interface CreateEmployeeRequest {
  employeeCode: string;
  name: string;
  department?: string;
  employeeType?: string;
}

export interface CreateUserRequest {
  username: string;
  password: string;
  pin?: string;
  role: string;
  employeeId?: number;
}

export type AuthUser = {
  token: string;
  role: 'ADMIN' | 'DISTRIBUTOR' | 'EMPLOYEE';
  username: string;
  userId: number;
  employeeId: number | null;
  employeeName: string | null;
  photoUrl: string | null;
};
