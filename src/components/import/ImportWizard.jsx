/**
 * Import Wizard Container
 * Multi-step wizard for importing HR data
 */

import React from 'react';
import { X, Check } from 'lucide-react';
import { useImport } from '../../contexts/ImportContext';
import Step1FileUpload from './Step1FileUpload';
import Step2ColumnMapping from './Step2ColumnMapping';
import Step3Validation from './Step3Validation';
import Step4ImportExecution from './Step4ImportExecution';

const ImportWizard = ({ onClose }) => {
  const { currentStep, resetImport } = useImport();

  const steps = [
    { number: 1, label: 'Upload File', component: Step1FileUpload },
    { number: 2, label: 'Map Columns', component: Step2ColumnMapping },
    { number: 3, label: 'Validate Data', component: Step3Validation },
    { number: 4, label: 'Import', component: Step4ImportExecution },
  ];

  const CurrentStepComponent = steps[currentStep - 1].component;

  const handleClose = () => {
    if (window.confirm('Are you sure you want to close the import wizard? Any unsaved progress will be lost.')) {
      resetImport();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center overflow-y-auto py-8">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-7xl mx-4 min-h-[600px]">
        {/* Header */}
        <div className="border-b border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              HR Data Import Wizard
            </h1>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Close"
            >
              <X className="w-6 h-6 text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          {/* Step Indicator */}
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <React.Fragment key={step.number}>
                <div className="flex items-center">
                  <div
                    className={`
                      flex items-center justify-center w-10 h-10 rounded-full font-semibold text-sm
                      ${currentStep > step.number
                        ? 'bg-green-600 text-white'
                        : currentStep === step.number
                          ? 'bg-primary-600 text-white'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                      }
                    `}
                  >
                    {currentStep > step.number ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      step.number
                    )}
                  </div>
                  <span
                    className={`
                      ml-3 text-sm font-medium
                      ${currentStep >= step.number
                        ? 'text-gray-900 dark:text-white'
                        : 'text-gray-500 dark:text-gray-400'
                      }
                    `}
                  >
                    {step.label}
                  </span>
                </div>

                {index < steps.length - 1 && (
                  <div
                    className={`
                      flex-1 h-1 mx-4
                      ${currentStep > step.number
                        ? 'bg-green-600'
                        : 'bg-gray-200 dark:bg-gray-700'
                      }
                    `}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-8">
          <CurrentStepComponent />
        </div>
      </div>
    </div>
  );
};

export default ImportWizard;
