/**
 * Import Wizard Container
 * Multi-step wizard for importing HR data
 * P3 Enterprise Design System
 */

import React from 'react';
import { X, Check, Upload, Columns, CheckCircle, Database } from 'lucide-react';
import { useImport } from '../../contexts/ImportContext';
import Step1FileUpload from './Step1FileUpload';
import Step2ColumnMapping from './Step2ColumnMapping';
import Step3Validation from './Step3Validation';
import Step4ImportExecution from './Step4ImportExecution';

const ImportWizard = ({ onClose }) => {
  const { currentStep, resetImport } = useImport();

  const steps = [
    { number: 1, label: 'Upload', description: 'Select file', icon: Upload, component: Step1FileUpload },
    { number: 2, label: 'Map', description: 'Column mapping', icon: Columns, component: Step2ColumnMapping },
    { number: 3, label: 'Validate', description: 'Check data', icon: CheckCircle, component: Step3Validation },
    { number: 4, label: 'Import', description: 'Execute', icon: Database, component: Step4ImportExecution },
  ];

  const CurrentStepComponent = steps[currentStep - 1].component;

  const handleClose = () => {
    if (window.confirm('Are you sure you want to close? Any unsaved progress will be lost.')) {
      resetImport();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-p3-midnight/60 backdrop-blur-sm z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-6 lg:p-8">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-enterprise-lg w-full max-w-5xl my-auto">
        {/* Header */}
        <div className="border-b border-gray-200 dark:border-gray-800 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold text-p3-midnight dark:text-white">
                Import Data
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                Upload and process HR workforce data
              </p>
            </div>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
              title="Close"
            >
              <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>
        </div>

        {/* Step Indicator */}
        <div className="border-b border-gray-200 dark:border-gray-800 px-6 py-4">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isComplete = currentStep > step.number;
              const isCurrent = currentStep === step.number;
              const isPending = currentStep < step.number;

              return (
                <React.Fragment key={step.number}>
                  <div className="flex items-center gap-3">
                    <div
                      className={`
                        flex items-center justify-center w-10 h-10 rounded-lg transition-colors
                        ${isComplete
                          ? 'bg-success text-white'
                          : isCurrent
                            ? 'bg-p3-electric text-white'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                        }
                      `}
                    >
                      {isComplete ? (
                        <Check className="w-5 h-5" />
                      ) : (
                        <Icon className="w-5 h-5" />
                      )}
                    </div>
                    <div className="hidden sm:block">
                      <p
                        className={`
                          text-sm font-medium
                          ${isCurrent || isComplete
                            ? 'text-p3-midnight dark:text-white'
                            : 'text-gray-400 dark:text-gray-500'
                          }
                        `}
                      >
                        {step.label}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {step.description}
                      </p>
                    </div>
                  </div>

                  {index < steps.length - 1 && (
                    <div className="flex-1 mx-4 hidden sm:block">
                      <div
                        className={`
                          h-0.5 rounded-full transition-colors
                          ${isComplete
                            ? 'bg-success'
                            : 'bg-gray-200 dark:bg-gray-800'
                          }
                        `}
                      />
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* Mobile Step Indicator */}
          <div className="sm:hidden mt-4">
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
              <span>Step {currentStep} of {steps.length}</span>
              <span>{steps[currentStep - 1].label}</span>
            </div>
            <div className="h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-p3-electric rounded-full transition-all duration-300"
                style={{ width: `${(currentStep / steps.length) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 min-h-[400px]">
          <CurrentStepComponent />
        </div>
      </div>
    </div>
  );
};

export default ImportWizard;
