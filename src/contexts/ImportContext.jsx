/**
 * Import Context
 * Manages state for the multi-step import wizard
 */

import React, { createContext, useContext, useState, useRef, useCallback } from 'react';
import { importHistoryDB, employeeDB } from '../services/db';

const ImportContext = createContext();

export const useImport = () => {
  const context = useContext(ImportContext);
  if (!context) {
    throw new Error('useImport must be used within ImportProvider');
  }
  return context;
};

export const ImportProvider = ({ children }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [fileInfo, setFileInfo] = useState(null);
  const [headers, setHeaders] = useState([]);
  const [sampleData, setSampleData] = useState([]);
  const [allData, setAllData] = useState([]);
  const [columnMapping, setColumnMapping] = useState({});
  const [validationResults, setValidationResults] = useState(null);
  const [importProgress, setImportProgress] = useState({
    phase: '',
    progress: 0,
    message: '',
    processedCount: 0,
    totalCount: 0,
    speed: 0,
  });
  const [importResults, setImportResults] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const workerRef = useRef(null);
  const startTimeRef = useRef(null);
  const fileInfoRef = useRef(null);

  // Initialize Web Worker
  const initWorker = useCallback(() => {
    if (workerRef.current) return workerRef.current;

    const worker = new Worker('/import-worker.js');

    worker.onmessage = (event) => {
      const { type, ...payload } = event.data;

      switch (type) {
        case 'READY':
          console.log('Worker ready');
          break;

        case 'PROGRESS':
          setImportProgress({
            phase: payload.phase,
            progress: payload.progress,
            message: payload.message,
            processedCount: payload.processedCount || 0,
            totalCount: payload.totalCount || 0,
            speed: payload.speed || 0,
          });
          break;

        case 'PARSE_COMPLETE':
          setHeaders(payload.headers);
          setSampleData(payload.sampleData);
          setAllData(payload.allData);
          setIsProcessing(false);
          setCurrentStep(2); // Move to column mapping
          break;

        case 'VALIDATION_COMPLETE':
          setValidationResults(payload.results);
          setIsProcessing(false);
          break;

        case 'IMPORT_COMPLETE':
          handleImportComplete(payload.results);
          break;

        case 'ERROR':
          console.error('Worker error:', payload.error);
          setIsProcessing(false);
          alert(`Import error: ${payload.error}`);
          break;

        default:
          console.warn('Unknown worker message type:', type);
      }
    };

    worker.onerror = (error) => {
      console.error('Worker error:', error);
      setIsProcessing(false);
      alert('Worker error occurred. Please try again.');
    };

    workerRef.current = worker;
    return worker;
  }, []);

  // Parse uploaded file
  const parseFile = useCallback((file) => {
    setIsProcessing(true);
    const info = {
      name: file.name,
      size: file.size,
      type: file.type,
    };
    setFileInfo(info);
    fileInfoRef.current = info; // Store in ref for callback access

    const worker = initWorker();
    const reader = new FileReader();

    reader.onload = (e) => {
      const fileData = e.target.result;
      const fileType = file.name.endsWith('.csv') ? 'csv' : 'excel';

      worker.postMessage({
        type: 'PARSE_FILE',
        data: {
          fileData: fileType === 'csv' ? fileData : new Uint8Array(fileData),
          fileName: file.name,
          fileType,
        },
      });
    };

    if (file.name.endsWith('.csv')) {
      reader.readAsText(file);
    } else {
      reader.readAsArrayBuffer(file);
    }
  }, [initWorker]);

  // Validate data - only employeeId is required
  const validateData = useCallback((mapping, requiredFields = ['employeeId']) => {
    setIsProcessing(true);
    const worker = initWorker();

    worker.postMessage({
      type: 'VALIDATE_DATA',
      data: {
        rows: allData,
        columnMapping: mapping || columnMapping,
        requiredFields,
      },
    });
  }, [allData, columnMapping, initWorker]);

  // Start import process
  const startImport = useCallback((skipInvalidRows = false) => {
    setIsProcessing(true);
    startTimeRef.current = Date.now();

    const worker = initWorker();

    worker.postMessage({
      type: 'PROCESS_IMPORT',
      data: {
        rows: allData,
        columnMapping,
        transformRules: {},
        skipInvalidRows,
      },
    });
  }, [allData, columnMapping, initWorker]);

  // Handle import completion
  const handleImportComplete = useCallback(async (results) => {
    const endTime = Date.now();
    const duration = endTime - startTimeRef.current;

    setImportProgress({
      phase: 'finalizing',
      progress: 95,
      message: 'Saving to database...',
      processedCount: results.processedRows,
      totalCount: results.totalRows,
      speed: Math.floor(results.processedRows / (duration / 1000)),
    });

    try {
      // Save employees to IndexedDB
      await employeeDB.bulkAdd(results.employees, (processed, total) => {
        const progress = 95 + Math.floor((processed / total) * 5);
        setImportProgress(prev => ({
          ...prev,
          progress,
          message: `Saving ${processed} of ${total} employees...`,
        }));
      });

      // Calculate cost and department breakdown for comparison tracking
      const departmentBreakdown = {};
      let totalSalary = 0;

      results.employees.forEach(emp => {
        const dept = emp.department || 'Unknown';
        const salary = emp.baseSalary || emp.hourlyRate * 2080 || 0; // Estimate annual salary

        if (!departmentBreakdown[dept]) {
          departmentBreakdown[dept] = {
            count: 0,
            totalSalary: 0,
          };
        }

        departmentBreakdown[dept].count += 1;
        departmentBreakdown[dept].totalSalary += salary;
        totalSalary += salary;
      });

      // Save import history with cost tracking - use ref for reliable access
      const currentFileInfo = fileInfoRef.current || fileInfo;
      await importHistoryDB.add({
        fileName: currentFileInfo?.name || 'Unknown',
        fileSize: currentFileInfo?.size || 0,
        totalRecords: results.totalRows,
        recordsProcessed: results.processedRows,
        recordsSuccessful: results.successfulRows,
        recordsFailed: results.failedRows,
        recordsSkipped: results.skippedRows,
        processingTime: duration,
        timestamp: new Date().toISOString(),
        errorLog: results.errors,
        totalSalary: Math.round(totalSalary),
        departmentBreakdown,
      });

      setImportResults({
        ...results,
        duration,
      });

      setImportProgress({
        phase: 'complete',
        progress: 100,
        message: 'Import complete!',
        processedCount: results.processedRows,
        totalCount: results.totalRows,
        speed: Math.floor(results.processedRows / (duration / 1000)),
      });

      setIsProcessing(false);
      setCurrentStep(4); // Move to completion screen
    } catch (error) {
      console.error('Error saving import:', error);
      alert('Error saving import results: ' + error.message);
      setIsProcessing(false);
    }
  }, [fileInfo]); // fileInfo in deps for re-render, but we use fileInfoRef.current for reliable access

  // Reset import wizard
  const resetImport = useCallback(() => {
    setCurrentStep(1);
    setFileInfo(null);
    setHeaders([]);
    setSampleData([]);
    setAllData([]);
    setColumnMapping({});
    setValidationResults(null);
    setImportProgress({
      phase: '',
      progress: 0,
      message: '',
      processedCount: 0,
      totalCount: 0,
      speed: 0,
    });
    setImportResults(null);
    setIsProcessing(false);

    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
  }, []);

  // Go to specific step
  const goToStep = useCallback((step) => {
    if (step >= 1 && step <= 4) {
      setCurrentStep(step);
    }
  }, []);

  const value = {
    // State
    currentStep,
    fileInfo,
    headers,
    sampleData,
    allData,
    columnMapping,
    validationResults,
    importProgress,
    importResults,
    isProcessing,

    // Actions
    parseFile,
    validateData,
    startImport,
    resetImport,
    goToStep,
    setColumnMapping,
  };

  return (
    <ImportContext.Provider value={value}>
      {children}
    </ImportContext.Provider>
  );
};
