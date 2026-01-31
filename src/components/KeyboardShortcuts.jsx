/**
 * Keyboard Shortcuts System
 * Global keyboard shortcuts for quick navigation and actions
 */

import React, { useEffect, useState, createContext, useContext, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Command, Keyboard } from 'lucide-react';

// Shortcuts context
const ShortcutsContext = createContext(null);

// Hook to use shortcuts
export const useShortcuts = () => {
  const context = useContext(ShortcutsContext);
  if (!context) {
    throw new Error('useShortcuts must be used within ShortcutsProvider');
  }
  return context;
};

// Define all shortcuts
const shortcuts = [
  // Navigation
  { key: 'g d', label: 'Dashboard', action: 'navigate', path: '/', category: 'Navigation' },
  { key: 'g e', label: 'Mitarbeiter', action: 'navigate', path: '/employees', category: 'Navigation' },
  { key: 'g a', label: 'Analytics', action: 'navigate', path: '/analytics', category: 'Navigation' },
  { key: 'g s', label: 'Simulation', action: 'navigate', path: '/simulation', category: 'Navigation' },
  { key: 'g c', label: 'Kapazität', action: 'navigate', path: '/capacity', category: 'Navigation' },
  { key: 'g b', label: 'Budget', action: 'navigate', path: '/budget', category: 'Navigation' },
  { key: 'g v', label: 'Vergleich', action: 'navigate', path: '/data-comparison', category: 'Navigation' },
  { key: 'g r', label: 'Reports', action: 'navigate', path: '/reports', category: 'Navigation' },
  { key: 'g i', label: 'AI Assistant', action: 'navigate', path: '/chat', category: 'Navigation' },

  // Actions
  { key: 'i', label: 'Daten importieren', action: 'import', category: 'Aktionen' },
  { key: '/', label: 'Suche öffnen', action: 'search', category: 'Aktionen' },
  { key: '?', label: 'Shortcuts anzeigen', action: 'help', category: 'Aktionen' },
  { key: 't', label: 'Theme wechseln', action: 'theme', category: 'Aktionen' },
];

// Shortcuts Provider Component
export const ShortcutsProvider = ({ children, onImport, onSearch, onToggleTheme }) => {
  const navigate = useNavigate();
  const [showHelp, setShowHelp] = useState(false);
  const [pendingKey, setPendingKey] = useState(null);
  const [pendingTimeout, setPendingTimeout] = useState(null);

  // Handle shortcut execution
  const executeShortcut = useCallback((shortcut) => {
    switch (shortcut.action) {
      case 'navigate':
        navigate(shortcut.path);
        break;
      case 'import':
        onImport?.();
        break;
      case 'search':
        onSearch?.();
        break;
      case 'help':
        setShowHelp(prev => !prev);
        break;
      case 'theme':
        onToggleTheme?.();
        break;
      default:
        break;
    }
  }, [navigate, onImport, onSearch, onToggleTheme]);

  // Handle key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if typing in input/textarea
      if (
        e.target.tagName === 'INPUT' ||
        e.target.tagName === 'TEXTAREA' ||
        e.target.isContentEditable
      ) {
        return;
      }

      // Ignore if modifier keys are pressed (except for Cmd+K which is handled elsewhere)
      if (e.metaKey || e.ctrlKey || e.altKey) {
        return;
      }

      const key = e.key.toLowerCase();

      // Handle two-key shortcuts (g + x)
      if (pendingKey === 'g') {
        const combo = `g ${key}`;
        const shortcut = shortcuts.find(s => s.key === combo);
        if (shortcut) {
          e.preventDefault();
          executeShortcut(shortcut);
        }
        setPendingKey(null);
        if (pendingTimeout) clearTimeout(pendingTimeout);
        setPendingTimeout(null);
        return;
      }

      // Start two-key combo
      if (key === 'g') {
        e.preventDefault();
        setPendingKey('g');
        // Clear pending key after 1 second
        const timeout = setTimeout(() => {
          setPendingKey(null);
        }, 1000);
        setPendingTimeout(timeout);
        return;
      }

      // Handle single-key shortcuts
      const shortcut = shortcuts.find(s => s.key === key && !s.key.includes(' '));
      if (shortcut) {
        e.preventDefault();
        executeShortcut(shortcut);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (pendingTimeout) clearTimeout(pendingTimeout);
    };
  }, [pendingKey, pendingTimeout, executeShortcut]);

  // Close help on escape
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && showHelp) {
        setShowHelp(false);
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [showHelp]);

  return (
    <ShortcutsContext.Provider value={{ shortcuts, showHelp, setShowHelp }}>
      {children}

      {/* Pending Key Indicator */}
      {pendingKey && (
        <div className="fixed bottom-4 right-4 z-50 bg-p3-midnight text-white px-3 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-fade-in">
          <kbd className="px-2 py-1 bg-white/20 rounded text-sm font-mono">{pendingKey}</kbd>
          <span className="text-sm text-gray-300">+ ...</span>
        </div>
      )}

      {/* Help Modal */}
      {showHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowHelp(false)} />
          <div className="relative bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-lg max-h-[80vh] overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-p3-electric/10 rounded-lg">
                  <Keyboard className="w-5 h-5 text-p3-electric" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-p3-midnight dark:text-white">
                    Tastenkürzel
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Schnelle Navigation mit der Tastatur
                  </p>
                </div>
              </div>
              <kbd className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 text-gray-500 rounded">
                ESC
              </kbd>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {/* Group shortcuts by category */}
              {['Navigation', 'Aktionen'].map(category => (
                <div key={category} className="mb-6 last:mb-0">
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                    {category}
                  </h3>
                  <div className="space-y-2">
                    {shortcuts
                      .filter(s => s.category === category)
                      .map(shortcut => (
                        <div
                          key={shortcut.key}
                          className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50"
                        >
                          <span className="text-sm text-p3-midnight dark:text-white">
                            {shortcut.label}
                          </span>
                          <div className="flex items-center gap-1">
                            {shortcut.key.split(' ').map((k, idx) => (
                              <React.Fragment key={idx}>
                                {idx > 0 && <span className="text-gray-400 text-xs">dann</span>}
                                <kbd className="px-2 py-1 text-xs font-mono bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded border border-gray-200 dark:border-gray-700">
                                  {k.toUpperCase()}
                                </kbd>
                              </React.Fragment>
                            ))}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              ))}

              {/* Special shortcuts */}
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-800">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  System
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <span className="text-sm text-p3-midnight dark:text-white">
                      Suche öffnen
                    </span>
                    <div className="flex items-center gap-1">
                      <kbd className="px-2 py-1 text-xs font-mono bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded border border-gray-200 dark:border-gray-700">
                        <Command className="w-3 h-3 inline" />
                      </kbd>
                      <kbd className="px-2 py-1 text-xs font-mono bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded border border-gray-200 dark:border-gray-700">
                        K
                      </kbd>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                Drücken Sie <kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-[10px]">?</kbd> um dieses Fenster zu öffnen
              </p>
            </div>
          </div>
        </div>
      )}
    </ShortcutsContext.Provider>
  );
};

// Small help button component for header
export const ShortcutsHelpButton = () => {
  const { setShowHelp } = useShortcuts();

  return (
    <button
      onClick={() => setShowHelp(true)}
      className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors"
      title="Tastenkürzel (?)"
    >
      <Keyboard className="w-5 h-5" />
    </button>
  );
};

export default ShortcutsProvider;
