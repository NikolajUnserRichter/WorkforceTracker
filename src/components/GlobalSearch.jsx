/**
 * Global Search Component
 * Quick navigation and search across the application
 * GDPR-compliant: Searches aggregated data and navigation items
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, X, Users, Building2, MapPin, BarChart3, Calculator,
  Gauge, Wallet, FileText, TrendingDown, MessageSquare, Settings,
  Upload, LayoutDashboard, ArrowRight, Command, GitCompare
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';

// Navigation items for quick access
const navigationItems = [
  { id: 'dashboard', label: 'Dashboard', path: '/', icon: LayoutDashboard, keywords: ['home', 'übersicht', 'start'] },
  { id: 'employees', label: 'Mitarbeiter', path: '/employees', icon: Users, keywords: ['personal', 'staff', 'liste'] },
  { id: 'analytics', label: 'Analytics', path: '/analytics', icon: BarChart3, keywords: ['analyse', 'statistik', 'auswertung', 'abteilung'] },
  { id: 'simulation', label: 'Simulation', path: '/simulation', icon: Calculator, keywords: ['szenario', 'what-if', 'planung'] },
  { id: 'capacity', label: 'Kapazitätsplanung', path: '/capacity', icon: Gauge, keywords: ['fte', 'bedarf', 'auslastung'] },
  { id: 'budget', label: 'Budget-Prognose', path: '/budget', icon: Wallet, keywords: ['kosten', 'gehalt', 'forecast'] },
  { id: 'comparison', label: 'Datenvergleich', path: '/data-comparison', icon: GitCompare, keywords: ['snapshot', 'historie', 'änderung'] },
  { id: 'cost-tracking', label: 'Cost Tracking', path: '/comparison', icon: TrendingDown, keywords: ['reduktion', 'einsparung'] },
  { id: 'reports', label: 'Reports', path: '/reports', icon: FileText, keywords: ['bericht', 'export', 'pdf'] },
  { id: 'chat', label: 'AI Assistant', path: '/chat', icon: MessageSquare, keywords: ['ki', 'hilfe', 'frage'] },
];

// Action items
const actionItems = [
  { id: 'import', label: 'Daten importieren', action: 'import', icon: Upload, keywords: ['upload', 'excel', 'csv'] },
];

const GlobalSearch = ({ onImport }) => {
  const navigate = useNavigate();
  const { getDashboardMetrics } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [metrics, setMetrics] = useState(null);
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  // Load metrics for department/location search
  useEffect(() => {
    const loadMetrics = async () => {
      try {
        const data = await getDashboardMetrics();
        setMetrics(data);
      } catch (error) {
        console.error('Error loading metrics:', error);
      }
    };
    if (isOpen && !metrics) {
      loadMetrics();
    }
  }, [isOpen, getDashboardMetrics, metrics]);

  // Keyboard shortcut to open search (Cmd/Ctrl + K)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Search results
  const results = useMemo(() => {
    const searchQuery = query.toLowerCase().trim();
    if (!searchQuery) {
      // Show recent/popular items when no query
      return {
        navigation: navigationItems.slice(0, 6),
        actions: actionItems,
        departments: [],
        locations: []
      };
    }

    // Filter navigation items
    const navResults = navigationItems.filter(item =>
      item.label.toLowerCase().includes(searchQuery) ||
      item.keywords.some(kw => kw.includes(searchQuery))
    );

    // Filter action items
    const actionResults = actionItems.filter(item =>
      item.label.toLowerCase().includes(searchQuery) ||
      item.keywords.some(kw => kw.includes(searchQuery))
    );

    // Search departments
    const deptResults = [];
    if (metrics?.departmentDetails) {
      Object.entries(metrics.departmentDetails).forEach(([name, data]) => {
        if (name.toLowerCase().includes(searchQuery)) {
          deptResults.push({
            id: `dept-${name}`,
            label: name,
            sublabel: `${data.count} Mitarbeiter`,
            icon: Building2,
            path: '/analytics',
            type: 'department'
          });
        }
      });
    }

    // Search locations
    const locResults = [];
    if (metrics?.locationCounts) {
      Object.entries(metrics.locationCounts).forEach(([name, count]) => {
        if (name.toLowerCase().includes(searchQuery)) {
          locResults.push({
            id: `loc-${name}`,
            label: name,
            sublabel: `${count} Mitarbeiter`,
            icon: MapPin,
            path: '/analytics',
            type: 'location'
          });
        }
      });
    }

    return {
      navigation: navResults,
      actions: actionResults,
      departments: deptResults.slice(0, 5),
      locations: locResults.slice(0, 5)
    };
  }, [query, metrics]);

  // Flatten results for keyboard navigation
  const flatResults = useMemo(() => {
    return [
      ...results.navigation,
      ...results.actions,
      ...results.departments,
      ...results.locations
    ];
  }, [results]);

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, flatResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && flatResults[selectedIndex]) {
      e.preventDefault();
      handleSelect(flatResults[selectedIndex]);
    }
  };

  // Handle selection
  const handleSelect = useCallback((item) => {
    if (item.action === 'import') {
      onImport?.();
    } else if (item.path) {
      navigate(item.path);
    }
    setIsOpen(false);
    setQuery('');
  }, [navigate, onImport]);

  const close = () => {
    setIsOpen(false);
    setQuery('');
  };

  return (
    <>
      {/* Search Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors"
      >
        <Search className="w-4 h-4 text-gray-500 dark:text-gray-400" />
        <span className="text-sm text-gray-500 dark:text-gray-400 hidden sm:inline">Suchen...</span>
        <kbd className="hidden md:inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded">
          <Command className="w-3 h-3" />K
        </kbd>
      </button>

      {/* Search Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={close} />

          {/* Search Container */}
          <div
            ref={containerRef}
            className="relative w-full max-w-xl mx-4 bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
          >
            {/* Search Input */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-800">
              <Search className="w-5 h-5 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Suchen oder Navigation..."
                className="flex-1 bg-transparent text-p3-midnight dark:text-white placeholder-gray-400 outline-none text-sm"
              />
              {query && (
                <button onClick={() => setQuery('')} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              )}
              <kbd className="px-1.5 py-0.5 text-[10px] font-medium bg-gray-100 dark:bg-gray-800 text-gray-400 rounded">
                ESC
              </kbd>
            </div>

            {/* Results */}
            <div className="max-h-[400px] overflow-y-auto">
              {/* Navigation */}
              {results.navigation.length > 0 && (
                <div className="p-2">
                  <p className="px-2 py-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                    Navigation
                  </p>
                  {results.navigation.map((item, idx) => {
                    const globalIdx = idx;
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleSelect(item)}
                        className={`
                          w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors
                          ${selectedIndex === globalIdx
                            ? 'bg-p3-electric/10 text-p3-electric'
                            : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-p3-midnight dark:text-white'
                          }
                        `}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="text-sm font-medium">{item.label}</span>
                        <ArrowRight className="w-3 h-3 ml-auto opacity-50" />
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Actions */}
              {results.actions.length > 0 && (
                <div className="p-2 border-t border-gray-100 dark:border-gray-800">
                  <p className="px-2 py-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                    Aktionen
                  </p>
                  {results.actions.map((item, idx) => {
                    const globalIdx = results.navigation.length + idx;
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleSelect(item)}
                        className={`
                          w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors
                          ${selectedIndex === globalIdx
                            ? 'bg-p3-electric/10 text-p3-electric'
                            : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-p3-midnight dark:text-white'
                          }
                        `}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="text-sm font-medium">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Departments */}
              {results.departments.length > 0 && (
                <div className="p-2 border-t border-gray-100 dark:border-gray-800">
                  <p className="px-2 py-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                    Abteilungen
                  </p>
                  {results.departments.map((item, idx) => {
                    const globalIdx = results.navigation.length + results.actions.length + idx;
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleSelect(item)}
                        className={`
                          w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors
                          ${selectedIndex === globalIdx
                            ? 'bg-p3-electric/10 text-p3-electric'
                            : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-p3-midnight dark:text-white'
                          }
                        `}
                      >
                        <Icon className="w-4 h-4 text-blue-500" />
                        <div>
                          <span className="text-sm font-medium">{item.label}</span>
                          <span className="text-xs text-gray-400 ml-2">{item.sublabel}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Locations */}
              {results.locations.length > 0 && (
                <div className="p-2 border-t border-gray-100 dark:border-gray-800">
                  <p className="px-2 py-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                    Standorte
                  </p>
                  {results.locations.map((item, idx) => {
                    const globalIdx = results.navigation.length + results.actions.length + results.departments.length + idx;
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleSelect(item)}
                        className={`
                          w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors
                          ${selectedIndex === globalIdx
                            ? 'bg-p3-electric/10 text-p3-electric'
                            : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-p3-midnight dark:text-white'
                          }
                        `}
                      >
                        <Icon className="w-4 h-4 text-green-500" />
                        <div>
                          <span className="text-sm font-medium">{item.label}</span>
                          <span className="text-xs text-gray-400 ml-2">{item.sublabel}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* No Results */}
              {query && flatResults.length === 0 && (
                <div className="p-8 text-center">
                  <Search className="w-8 h-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Keine Ergebnisse für "{query}"
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
              <div className="flex items-center justify-between text-[10px] text-gray-400">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">↑</kbd>
                    <kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">↓</kbd>
                    Navigation
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">↵</kbd>
                    Auswählen
                  </span>
                </div>
                <span className="flex items-center gap-1">
                  <kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">ESC</kbd>
                  Schließen
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default GlobalSearch;
