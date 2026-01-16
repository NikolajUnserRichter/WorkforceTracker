
import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AppProvider } from './contexts/AppContext';
import MainLayout from './layouts/MainLayout';
import Dashboard from './components/Dashboard';
import EmployeeList from './components/EmployeeList';
import Projects from './components/Projects';
import Reports from './components/Reports';
import Login from './components/Login';
import UserManagement from './components/UserManagement';
import WorkforceComparison from './components/WorkforceComparison';
import { authService } from './services/authService';

// Private Route Wrapper
const PrivateRoute = ({ children }) => {
  const currentUser = authService.getCurrentUser();
  return currentUser ? children : <Navigate to="/login" replace />;
};

// Admin Route Wrapper
const AdminRoute = ({ children }) => {
  const currentUser = authService.getCurrentUser();
  return currentUser && currentUser.role === 'admin' ? (
    children
  ) : (
    <Navigate to="/" replace />
  );
};

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = authService.getCurrentUser();
    setCurrentUser(user);
    setLoading(false);
  }, []);

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
  };

  const handleLogout = () => {
    authService.logout();
    setCurrentUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <AppProvider currentUser={currentUser}>
      <BrowserRouter>
        <Toaster position="top-right" />
        <Routes>
          <Route
            path="/login"
            element={
              !currentUser ? (
                <Login onLoginSuccess={handleLoginSuccess} />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />

          <Route element={
            <PrivateRoute>
              <MainLayout currentUser={currentUser} onLogout={handleLogout} />
            </PrivateRoute>
          }>
            <Route path="/" element={<Dashboard />} />
            <Route path="/employees" element={<EmployeeList />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/comparison" element={<WorkforceComparison />} />

            <Route
              path="/users"
              element={
                <AdminRoute>
                  <UserManagement />
                </AdminRoute>
              }
            />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}

export default App;
