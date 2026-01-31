/**
 * Onboarding Tour Component
 * Guided walkthrough for new users
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  X, ChevronRight, ChevronLeft, Upload, BarChart3, Calculator,
  Gauge, Wallet, Users, Sparkles, Check, ArrowRight
} from 'lucide-react';

// Tour steps definition
const tourSteps = [
  {
    id: 'welcome',
    title: 'Willkommen zum Workforce Tracker',
    description: 'Diese kurze Tour zeigt Ihnen die wichtigsten Funktionen der Anwendung. Sie können die Tour jederzeit überspringen.',
    icon: Sparkles,
    path: '/',
    position: 'center'
  },
  {
    id: 'import',
    title: 'Daten importieren',
    description: 'Beginnen Sie mit dem Import Ihrer HR-Daten. Unterstützt werden Excel- und CSV-Dateien mit bis zu 110.000+ Datensätzen.',
    icon: Upload,
    path: '/',
    highlight: '[data-tour="import-button"]',
    position: 'center'
  },
  {
    id: 'analytics',
    title: 'Analytics Dashboard',
    description: 'Analysieren Sie Ihre Belegschaft nach Abteilungen, Standorten und Kostenstellen mit interaktiven Visualisierungen.',
    icon: BarChart3,
    path: '/analytics',
    position: 'center'
  },
  {
    id: 'simulation',
    title: 'Szenario-Simulation',
    description: 'Erstellen Sie What-if-Szenarien für Workforce-Reduktionen und vergleichen Sie verschiedene Strategien.',
    icon: Calculator,
    path: '/simulation',
    position: 'center'
  },
  {
    id: 'capacity',
    title: 'Kapazitätsplanung',
    description: 'Vergleichen Sie FTE-Bedarf mit der tatsächlichen Besetzung und identifizieren Sie Über- oder Unterbesetzungen.',
    icon: Gauge,
    path: '/capacity',
    position: 'center'
  },
  {
    id: 'budget',
    title: 'Budget-Prognose',
    description: 'Planen Sie zukünftige Personalkosten und berechnen Sie potenzielle Einsparungen durch Reduktionsprogramme.',
    icon: Wallet,
    path: '/budget',
    position: 'center'
  },
  {
    id: 'complete',
    title: 'Tour abgeschlossen!',
    description: 'Sie kennen jetzt die wichtigsten Funktionen. Drücken Sie ? für Tastenkürzel oder nutzen Sie Cmd+K für die Schnellsuche.',
    icon: Check,
    path: '/',
    position: 'center'
  }
];

// Local storage key
const TOUR_COMPLETED_KEY = 'workforce_tracker_tour_completed';
const TOUR_DISMISSED_KEY = 'workforce_tracker_tour_dismissed';

const OnboardingTour = ({ forceShow = false, onComplete }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  // Check if tour should be shown
  useEffect(() => {
    if (forceShow) {
      setIsActive(true);
      setCurrentStep(0);
      return;
    }

    const completed = localStorage.getItem(TOUR_COMPLETED_KEY);
    const dismissed = localStorage.getItem(TOUR_DISMISSED_KEY);

    if (!completed && !dismissed) {
      // Small delay before showing tour
      const timer = setTimeout(() => {
        setIsActive(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [forceShow]);

  // Navigate to step's path
  useEffect(() => {
    if (isActive && tourSteps[currentStep]?.path && location.pathname !== tourSteps[currentStep].path) {
      navigate(tourSteps[currentStep].path);
    }
  }, [currentStep, isActive, navigate, location.pathname]);

  const nextStep = useCallback(() => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      completeTour();
    }
  }, [currentStep]);

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  const completeTour = useCallback(() => {
    localStorage.setItem(TOUR_COMPLETED_KEY, 'true');
    setIsActive(false);
    onComplete?.();
  }, [onComplete]);

  const dismissTour = useCallback(() => {
    localStorage.setItem(TOUR_DISMISSED_KEY, 'true');
    setIsActive(false);
    navigate('/');
  }, [navigate]);

  // Keyboard navigation
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight' || e.key === 'Enter') {
        nextStep();
      } else if (e.key === 'ArrowLeft') {
        prevStep();
      } else if (e.key === 'Escape') {
        dismissTour();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isActive, nextStep, prevStep, dismissTour]);

  if (!isActive) return null;

  const step = tourSteps[currentStep];
  const Icon = step.icon;
  const progress = ((currentStep + 1) / tourSteps.length) * 100;
  const isLastStep = currentStep === tourSteps.length - 1;
  const isFirstStep = currentStep === 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Tour Card */}
      <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-md mx-4 overflow-hidden animate-scale-in">
        {/* Progress Bar */}
        <div className="h-1 bg-gray-100 dark:bg-gray-800">
          <div
            className="h-full bg-p3-electric transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Close Button */}
        <button
          onClick={dismissTour}
          className="absolute top-4 right-4 p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors z-10"
        >
          <X className="w-5 h-5 text-gray-400" />
        </button>

        {/* Content */}
        <div className="p-8">
          {/* Icon */}
          <div className="w-16 h-16 mx-auto mb-6 bg-p3-electric/10 rounded-2xl flex items-center justify-center">
            <Icon className="w-8 h-8 text-p3-electric" />
          </div>

          {/* Step Counter */}
          <p className="text-center text-xs text-gray-400 dark:text-gray-500 mb-2">
            Schritt {currentStep + 1} von {tourSteps.length}
          </p>

          {/* Title */}
          <h2 className="text-xl font-semibold text-p3-midnight dark:text-white text-center mb-3">
            {step.title}
          </h2>

          {/* Description */}
          <p className="text-sm text-gray-600 dark:text-gray-400 text-center leading-relaxed">
            {step.description}
          </p>
        </div>

        {/* Navigation */}
        <div className="px-8 pb-8 flex items-center justify-between gap-4">
          {!isFirstStep ? (
            <button
              onClick={prevStep}
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-p3-midnight dark:hover:text-white transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Zurück
            </button>
          ) : (
            <button
              onClick={dismissTour}
              className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              Überspringen
            </button>
          )}

          <button
            onClick={nextStep}
            className="flex items-center gap-2 px-6 py-2.5 bg-p3-electric hover:bg-primary-600 text-white rounded-lg text-sm font-medium transition-colors"
          >
            {isLastStep ? (
              <>
                <Check className="w-4 h-4" />
                Fertig
              </>
            ) : (
              <>
                Weiter
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>

        {/* Step Indicators */}
        <div className="px-8 pb-6 flex items-center justify-center gap-1.5">
          {tourSteps.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentStep(idx)}
              className={`
                w-2 h-2 rounded-full transition-all
                ${idx === currentStep
                  ? 'w-6 bg-p3-electric'
                  : idx < currentStep
                    ? 'bg-p3-electric/50'
                    : 'bg-gray-200 dark:bg-gray-700'
                }
              `}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

// Hook to control tour
export const useTour = () => {
  const [showTour, setShowTour] = useState(false);

  const startTour = useCallback(() => {
    // Clear previous state
    localStorage.removeItem(TOUR_COMPLETED_KEY);
    localStorage.removeItem(TOUR_DISMISSED_KEY);
    setShowTour(true);
  }, []);

  const TourComponent = useCallback(({ onComplete }) => (
    showTour ? (
      <OnboardingTour
        forceShow={true}
        onComplete={() => {
          setShowTour(false);
          onComplete?.();
        }}
      />
    ) : (
      <OnboardingTour onComplete={onComplete} />
    )
  ), [showTour]);

  return { startTour, TourComponent };
};

export default OnboardingTour;
