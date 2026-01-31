import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AppProvider } from './contexts/AppContext';
import MainLayout from './layouts/MainLayout';

// Eagerly loaded components (critical path)
import Dashboard from './components/Dashboard';
import Login from './components/Login';

// Lazy loaded components (code-split)
const EmployeeList = lazy(() => import('./components/EmployeeList'));
const Projects = lazy(() => import('./components/Projects'));
const Reports = lazy(() => import('./components/Reports'));
const UserManagement = lazy(() => import('./components/UserManagement'));
const WorkforceComparison = lazy(() => import('./components/WorkforceComparison'));
const AdminSettings = lazy(() => import('./components/AdminSettings'));
const UploadManagement = lazy(() => import('./components/UploadManagement'));
const ChatAgent = lazy(() => import('./components/ChatAgent'));
const DepartmentAnalytics = lazy(() => import('./components/DepartmentAnalytics'));
const ScenarioSimulation = lazy(() => import('./components/ScenarioSimulation'));
const CapacityPlanning = lazy(() => import('./components/CapacityPlanning'));
const BudgetForecast = lazy(() => import('./components/BudgetForecast'));
const DataComparison = lazy(() => import('./components/DataComparison'));

/**
 * Loading Spinner for Suspense fallback
 */
function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-p3-electric border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

/**
 * Private Route Wrapper
 * Redirects unauthenticated users to login
 */
function PrivateRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

/**
 * Admin Route Wrapper
 * Restricts access to admin users only
 */
function AdminRoute({ children }) {
  const { user, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return isAdmin() ? children : <Navigate to="/" replace />;
}

/**
 * Public Route Wrapper
 * Redirects authenticated users away from login
 */
function PublicRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return !isAuthenticated ? children : <Navigate to="/" replace />;
}

/**
 * App Routes Component
 * Must be inside AuthProvider to use useAuth hook
 */
function AppRoutes() {
  const { user, logout, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        {/* Public route - Login */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />

        {/* Protected routes - wrapped in MainLayout */}
        <Route
          element={
            <PrivateRoute>
              <MainLayout currentUser={user} onLogout={logout} />
            </PrivateRoute>
          }
        >
          <Route path="/" element={<Dashboard />} />
          <Route path="/employees" element={<EmployeeList />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/comparison" element={<WorkforceComparison />} />
          <Route path="/analytics" element={<DepartmentAnalytics />} />
          <Route path="/simulation" element={<ScenarioSimulation />} />
          <Route path="/capacity" element={<CapacityPlanning />} />
          <Route path="/budget" element={<BudgetForecast />} />
          <Route path="/data-comparison" element={<DataComparison />} />
          <Route path="/chat" element={<ChatAgent />} />

          {/* Admin-only routes */}
          <Route
            path="/users"
            element={
              <AdminRoute>
                <UserManagement />
              </AdminRoute>
            }
          />
          <Route
            path="/uploads"
            element={
              <AdminRoute>
                <UploadManagement />
              </AdminRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <AdminRoute>
                <AdminSettings />
              </AdminRoute>
            }
          />
        </Route>

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

/**
 * Main App Component
 */
function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppProvider>
          <Toaster position="top-right" />
          <AppRoutes />
        </AppProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
