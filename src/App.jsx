/**
 * Main App Component
 * Application shell with navigation and routing
 */

import React, { useState } from 'react';
import { Moon, Sun, LayoutDashboard, Users, Briefcase, Upload } from 'lucide-react';
import { Toaster } from 'react-hot-toast';
import { AppProvider, useApp } from './contexts/AppContext';
import { ImportProvider } from './contexts/ImportContext';
import Dashboard from './components/Dashboard';
import EmployeeList from './components/EmployeeList';
import ImportWizard from './components/import/ImportWizard';

const AppContent = () => {
  const { darkMode, toggleDarkMode, currentView, setCurrentView } = useApp();
  const [showImportWizard, setShowImportWizard] = useState(false);

  const navigation = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'employees', label: 'Employees', icon: Users },
    { id: 'projects', label: 'Projects', icon: Briefcase },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <Toaster position="top-right" />

      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  Workforce Tracker
                </h1>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  High-Performance HR Management
                </p>
              </div>
            </div>

            {/* Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {navigation.map(item => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => setCurrentView(item.id)}
                    className={`
                      flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors
                      ${currentView === item.id
                        ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }
                    `}
                  >
                    <Icon className="w-5 h-5" />
                    {item.label}
                  </button>
                );
              })}
            </nav>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowImportWizard(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium text-sm transition-colors"
              >
                <Upload className="w-4 h-4" />
                <span className="hidden sm:inline">Import</span>
              </button>

              <button
                onClick={toggleDarkMode}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title={darkMode ? 'Light Mode' : 'Dark Mode'}
              >
                {darkMode ? (
                  <Sun className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                ) : (
                  <Moon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-around">
            {navigation.map(item => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentView(item.id)}
                  className={`
                    flex flex-col items-center gap-1 py-3 px-4 text-xs font-medium transition-colors flex-1
                    ${currentView === item.id
                      ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30'
                      : 'text-gray-600 dark:text-gray-400'
                    }
                  `}
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentView === 'dashboard' && (
          <Dashboard onOpenImport={() => setShowImportWizard(true)} />
        )}
        {currentView === 'employees' && <EmployeeList />}
        {currentView === 'projects' && (
          <div className="text-center py-16">
            <Briefcase className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Projects View
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Project management features coming soon
            </p>
          </div>
        )}
      </main>

      {/* Import Wizard Modal */}
      {showImportWizard && (
        <ImportProvider>
          <ImportWizard onClose={() => setShowImportWizard(false)} />
        </ImportProvider>
      )}

      {/* Footer */}
      <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center text-sm text-gray-600 dark:text-gray-400">
            <p>Workforce Tracker - High-Performance HR Management System</p>
            <p className="mt-1">Handles 110,000+ employee records with ease</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
