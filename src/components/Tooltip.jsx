/**
 * Tooltip Component
 * Provides contextual help and information
 */

import React, { useState, useRef, useEffect } from 'react';
import { HelpCircle, Info, AlertCircle, CheckCircle } from 'lucide-react';

// Tooltip positions
const positions = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
  left: 'right-full top-1/2 -translate-y-1/2 mr-2',
  right: 'left-full top-1/2 -translate-y-1/2 ml-2'
};

// Arrow positions
const arrows = {
  top: 'top-full left-1/2 -translate-x-1/2 border-t-gray-900 dark:border-t-gray-700 border-x-transparent border-b-transparent',
  bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-gray-900 dark:border-b-gray-700 border-x-transparent border-t-transparent',
  left: 'left-full top-1/2 -translate-y-1/2 border-l-gray-900 dark:border-l-gray-700 border-y-transparent border-r-transparent',
  right: 'right-full top-1/2 -translate-y-1/2 border-r-gray-900 dark:border-r-gray-700 border-y-transparent border-l-transparent'
};

/**
 * Basic Tooltip Component
 */
export const Tooltip = ({
  children,
  content,
  position = 'top',
  delay = 200,
  className = ''
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef(null);

  const showTooltip = () => {
    timeoutRef.current = setTimeout(() => setIsVisible(true), delay);
  };

  const hideTooltip = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsVisible(false);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  if (!content) return children;

  return (
    <div
      className={`relative inline-flex ${className}`}
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip}
    >
      {children}
      {isVisible && (
        <div
          className={`
            absolute z-50 ${positions[position]}
            px-2 py-1 text-xs text-white bg-gray-900 dark:bg-gray-700
            rounded shadow-lg whitespace-nowrap pointer-events-none
            animate-fade-in
          `}
        >
          {content}
          <div className={`absolute w-0 h-0 border-4 ${arrows[position]}`} />
        </div>
      )}
    </div>
  );
};

/**
 * Help Icon with Tooltip
 */
export const HelpTooltip = ({
  content,
  position = 'top',
  size = 'sm',
  variant = 'default'
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  const variantConfig = {
    default: { icon: HelpCircle, color: 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300' },
    info: { icon: Info, color: 'text-blue-400 hover:text-blue-600' },
    warning: { icon: AlertCircle, color: 'text-amber-400 hover:text-amber-600' },
    success: { icon: CheckCircle, color: 'text-green-400 hover:text-green-600' }
  };

  const { icon: Icon, color } = variantConfig[variant];

  return (
    <Tooltip content={content} position={position}>
      <button
        type="button"
        className={`${color} ${sizeClasses[size]} transition-colors cursor-help`}
        tabIndex={-1}
      >
        <Icon className="w-full h-full" />
      </button>
    </Tooltip>
  );
};

/**
 * Info Card Component
 * For more detailed help content
 */
export const InfoCard = ({
  title,
  children,
  variant = 'info',
  dismissible = false,
  onDismiss,
  className = ''
}) => {
  const [isDismissed, setIsDismissed] = useState(false);

  const variantStyles = {
    info: {
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      border: 'border-blue-200 dark:border-blue-800',
      icon: Info,
      iconColor: 'text-blue-500',
      titleColor: 'text-blue-800 dark:text-blue-200',
      textColor: 'text-blue-700 dark:text-blue-300'
    },
    tip: {
      bg: 'bg-purple-50 dark:bg-purple-900/20',
      border: 'border-purple-200 dark:border-purple-800',
      icon: HelpCircle,
      iconColor: 'text-purple-500',
      titleColor: 'text-purple-800 dark:text-purple-200',
      textColor: 'text-purple-700 dark:text-purple-300'
    },
    warning: {
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      border: 'border-amber-200 dark:border-amber-800',
      icon: AlertCircle,
      iconColor: 'text-amber-500',
      titleColor: 'text-amber-800 dark:text-amber-200',
      textColor: 'text-amber-700 dark:text-amber-300'
    },
    success: {
      bg: 'bg-green-50 dark:bg-green-900/20',
      border: 'border-green-200 dark:border-green-800',
      icon: CheckCircle,
      iconColor: 'text-green-500',
      titleColor: 'text-green-800 dark:text-green-200',
      textColor: 'text-green-700 dark:text-green-300'
    }
  };

  const style = variantStyles[variant];
  const Icon = style.icon;

  if (isDismissed) return null;

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
  };

  return (
    <div className={`${style.bg} ${style.border} border rounded-lg p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <Icon className={`w-5 h-5 ${style.iconColor} flex-shrink-0 mt-0.5`} />
        <div className="flex-1 min-w-0">
          {title && (
            <h4 className={`text-sm font-medium ${style.titleColor} mb-1`}>
              {title}
            </h4>
          )}
          <div className={`text-sm ${style.textColor}`}>
            {children}
          </div>
        </div>
        {dismissible && (
          <button
            onClick={handleDismiss}
            className="p-1 hover:bg-white/50 dark:hover:bg-black/20 rounded transition-colors"
          >
            <span className="sr-only">Schließen</span>
            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};

/**
 * Feature Highlight Component
 * For highlighting new features
 */
export const FeatureHighlight = ({
  children,
  label = 'Neu',
  show = true
}) => {
  if (!show) return children;

  return (
    <div className="relative inline-block">
      {children}
      <span className="absolute -top-1 -right-1 px-1.5 py-0.5 text-[10px] font-medium bg-p3-electric text-white rounded-full animate-pulse">
        {label}
      </span>
    </div>
  );
};

/**
 * Contextual Help definitions
 */
export const helpContent = {
  dashboard: {
    totalHeadcount: 'Gesamtzahl der Mitarbeiter in der Datenbank',
    totalFTE: 'Full-Time Equivalent - Die Summe aller Arbeitszeiten umgerechnet auf Vollzeitstellen',
    utilizationRate: 'Verhältnis von zugewiesener zu verfügbarer Kapazität',
    costReduction: 'Potenzielle Einsparungen durch aktive Reduktionsprogramme'
  },
  analytics: {
    departmentBreakdown: 'Verteilung der Mitarbeiter nach Organisationseinheiten',
    costCenterAnalysis: 'Analyse der Personalkosten nach Kostenstellen',
    trendChart: 'Entwicklung der wichtigsten Kennzahlen über Zeit'
  },
  simulation: {
    scenario: 'Ein Szenario definiert geplante Änderungen für die What-if-Analyse',
    reductionSlider: 'Prozentualer Anteil der Belegschaft, der reduziert werden soll',
    savingsCalculation: 'Berechnete Einsparungen basierend auf Durchschnittsgehältern'
  },
  capacity: {
    targetHeadcount: 'Die geplante Soll-Besetzung für diese Abteilung',
    gap: 'Differenz zwischen Ist- und Soll-Besetzung (positiv = überbesetzt)',
    effectiveFTE: 'FTE nach Berücksichtigung von Reduktionsprogrammen'
  },
  budget: {
    projection: 'Prognose basierend auf aktuellen Kosten und angenommener Wachstumsrate',
    reductionTarget: 'Monatliches Reduktionsziel in Prozent der Personalkosten',
    cumulativeSavings: 'Aufsummierte Einsparungen über den Prognosezeitraum'
  }
};

export default Tooltip;
