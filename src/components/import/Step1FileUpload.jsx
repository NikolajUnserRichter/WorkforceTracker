/**
 * Import Wizard - Step 1: File Upload
 * Handles file selection and initial upload with progress indication
 * P3 Enterprise Design System
 */

import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileSpreadsheet, AlertCircle, Check, Info, X } from 'lucide-react';
import { useImport } from '../../contexts/ImportContext';

const Step1FileUpload = () => {
  const { parseFile, fileInfo, isProcessing, importProgress } = useImport();
  const [error, setError] = useState(null);

  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    setError(null);

    if (rejectedFiles.length > 0) {
      const rejection = rejectedFiles[0];
      if (rejection.errors[0]?.code === 'file-too-large') {
        setError('File is too large. Maximum size is 200MB.');
      } else if (rejection.errors[0]?.code === 'file-invalid-type') {
        setError('Invalid file type. Please upload .xlsx, .xls, or .csv files.');
      } else {
        setError('Error uploading file. Please try again.');
      }
      return;
    }

    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      parseFile(file);
    }
  }, [parseFile]);

  const {
    getRootProps,
    getInputProps,
    isDragActive,
  } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    },
    maxSize: 200 * 1024 * 1024,
    multiple: false,
  });

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Instructions */}
      <div className="mb-6">
        <h2 className="text-base font-semibold text-p3-midnight dark:text-white mb-1">
          Upload HR Data File
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Select an Excel or CSV file containing employee data. Files up to 200MB with 110,000+ rows are supported.
        </p>
      </div>

      {/* Dropzone */}
      {!fileInfo && !isProcessing && (
        <div
          {...getRootProps()}
          className={`
            dropzone cursor-pointer
            ${isDragActive ? 'dropzone-active' : ''}
          `}
        >
          <input {...getInputProps()} />

          <div className="flex flex-col items-center py-4">
            <div className={`
              w-14 h-14 rounded-lg flex items-center justify-center mb-4
              ${isDragActive
                ? 'bg-primary-100 dark:bg-primary-900/30'
                : 'bg-gray-100 dark:bg-gray-800'
              }
            `}>
              <Upload
                className={`w-7 h-7 ${isDragActive ? 'text-p3-electric' : 'text-gray-400'}`}
              />
            </div>

            <p className="text-sm font-medium text-p3-midnight dark:text-white mb-1">
              {isDragActive ? 'Drop file here' : 'Drag & drop your file here'}
            </p>

            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              or click to browse
            </p>

            <div className="flex items-center gap-4 text-xs text-gray-400">
              <div className="flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4" />
                <span>Excel, CSV</span>
              </div>
              <span>Max 200MB</span>
            </div>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="mt-4 p-4 bg-warning/5 border border-warning/20 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-warning">Upload Error</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">{error}</p>
          </div>
          <button
            onClick={() => setError(null)}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      )}

      {/* File Info & Progress */}
      {fileInfo && (
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-5">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 bg-primary-50 dark:bg-primary-900/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <FileSpreadsheet className="w-5 h-5 text-p3-electric" />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-p3-midnight dark:text-white truncate">
                {fileInfo.name}
              </p>

              <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                <span>{formatFileSize(fileInfo.size)}</span>
                <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
                <span className="capitalize">{fileInfo.type.split('/').pop()}</span>
              </div>

              {/* Processing Progress */}
              {isProcessing && (
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      {importProgress.message}
                    </span>
                    <span className="text-xs font-medium text-p3-electric">
                      {importProgress.progress}%
                    </span>
                  </div>

                  <div className="progress-bar">
                    <div
                      className="progress-bar-fill"
                      style={{ width: `${importProgress.progress}%` }}
                    />
                  </div>

                  <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-2">
                    Phase: {importProgress.phase}
                  </p>
                </div>
              )}

              {/* Success State */}
              {!isProcessing && importProgress.phase === 'parsing' && (
                <div className="mt-3 flex items-center gap-2 text-success">
                  <Check className="w-4 h-4" />
                  <span className="text-sm font-medium">File parsed successfully</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Info Panel */}
      <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-800">
        <div className="flex items-start gap-3">
          <Info className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-gray-500 dark:text-gray-400">
            <p className="font-medium text-gray-600 dark:text-gray-300 mb-2">Supported Formats</p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1">
              <span>Excel 2007+ (.xlsx)</span>
              <span>Excel 97-2003 (.xls)</span>
              <span>CSV files (.csv)</span>
              <span>Up to 110,000+ rows</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Step1FileUpload;
