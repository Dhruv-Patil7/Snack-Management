import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { ToastProvider } from './components/Toast';
import { LoginPage } from './features/auth/LoginPage';
import { EmployeePortal } from './features/employee/EmployeePortal';
import { DistributorPortal } from './features/distributor/DistributorPortal';
import { AdminPortal } from './features/admin/AdminPortal';

function AppRoutes() {
  const { user, isAuthenticated } = useAuth();

  // Redirect root to appropriate portal
  const getDefaultRoute = () => {
    if (!isAuthenticated || !user) return '/login';
    const routes: Record<string, string> = {
      ADMIN: '/admin',
      DISTRIBUTOR: '/distributor',
      EMPLOYEE: '/employee',
    };
    return routes[user.role] || '/login';
  };

  return (
    <Routes>
      <Route path="/login" element={
        isAuthenticated ? <Navigate to={getDefaultRoute()} replace /> : <LoginPage />
      } />

      <Route path="/employee" element={
        <ProtectedRoute allowedRoles={['EMPLOYEE']}>
          <EmployeePortal />
        </ProtectedRoute>
      } />

      <Route path="/distributor" element={
        <ProtectedRoute allowedRoles={['DISTRIBUTOR']}>
          <DistributorPortal />
        </ProtectedRoute>
      } />

      <Route path="/admin" element={
        <ProtectedRoute allowedRoles={['ADMIN']}>
          <AdminPortal />
        </ProtectedRoute>
      } />

      <Route path="*" element={<Navigate to={getDefaultRoute()} replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <AppRoutes />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
