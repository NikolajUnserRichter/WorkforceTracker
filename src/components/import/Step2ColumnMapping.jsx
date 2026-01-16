/**
 * Import Wizard - Step 2: Column Mapping
 * Intuitive interface for mapping source columns to target fields
 */

import React, { useState, useEffect, useMemo } from 'react';
import { ArrowRight, Check, X, Save, Upload as UploadIcon } from 'lucide-react';
import { useImport } from '../../contexts/ImportContext';

// Target field definitions with descriptions
const TARGET_FIELDS = [
  // Required fields - only employeeId is required
  { key: 'employeeId', label: 'Employee ID (Person Number)', required: true, type: 'text', category: 'Basic' },

  // Basic Information
  { key: 'name', label: 'Full Name', required: false, type: 'text', category: 'Basic' },
  { key: 'firstName', label: 'First Name', required: false, type: 'text', category: 'Basic' },
  { key: 'lastName', label: 'Last Name', required: false, type: 'text', category: 'Basic' },
  { key: 'email', label: 'Email', required: false, type: 'text', category: 'Basic' },
  { key: 'birthdate', label: 'Birth Date', required: false, type: 'date', category: 'Basic' },
  { key: 'age', label: 'Age', required: false, type: 'number', category: 'Basic' },
  { key: 'gender', label: 'Gender', required: false, type: 'text', category: 'Basic' },
  { key: 'nationality', label: 'Nationality', required: false, type: 'text', category: 'Basic' },

  // Employment Information
  { key: 'role', label: 'Job Name/Role', required: false, type: 'text', category: 'Employment' },
  { key: 'jobTitle', label: 'Title', required: false, type: 'text', category: 'Employment' },
  { key: 'status', label: 'Person Type/Status', required: false, type: 'text', category: 'Employment' },
  { key: 'employmentType', label: 'Worker Category', required: false, type: 'text', category: 'Employment' },
  { key: 'regularTemporary', label: 'Regular/Temporary', required: false, type: 'text', category: 'Employment' },
  { key: 'startDate', label: 'Seniority Date', required: false, type: 'date', category: 'Employment' },
  { key: 'endDate', label: 'Termination Date', required: false, type: 'date', category: 'Employment' },
  { key: 'exitDate', label: 'Exit Date', required: false, type: 'date', category: 'Employment' },
  { key: 'contractEndDate', label: 'Contract End Date', required: false, type: 'date', category: 'Employment' },
  { key: 'fte', label: 'Full-Time Equivalent', required: false, type: 'number', category: 'Employment' },
  { key: 'headCount', label: 'Head Count', required: false, type: 'number', category: 'Employment' },

  // Organizational
  { key: 'department', label: 'Department Name', required: false, type: 'text', category: 'Organizational' },
  { key: 'departmentId', label: 'Department ID', required: false, type: 'text', category: 'Organizational' },
  { key: 'division', label: 'Segment/Division', required: false, type: 'text', category: 'Organizational' },
  { key: 'company', label: 'Legal Employer Name', required: false, type: 'text', category: 'Organizational' },
  { key: 'country', label: 'Legislation/Country', required: false, type: 'text', category: 'Organizational' },
  { key: 'plant', label: 'Plant/Location', required: false, type: 'text', category: 'Organizational' },
  { key: 'city', label: 'City', required: false, type: 'text', category: 'Organizational' },
  { key: 'costCenter', label: 'Cost Center', required: false, type: 'text', category: 'Organizational' },
  { key: 'managementLevel', label: 'Assignment Category', required: false, type: 'text', category: 'Organizational' },
  { key: 'positionCode', label: 'Position Code', required: false, type: 'text', category: 'Organizational' },

  // Compensation
  { key: 'hourlyRate', label: 'Hourly Rate', required: false, type: 'number', category: 'Compensation' },
  { key: 'baseSalary', label: 'Base Salary', required: false, type: 'number', category: 'Compensation' },
  { key: 'payScale', label: 'Grade Name/Pay Scale', required: false, type: 'text', category: 'Compensation' },
];

// Common column name patterns for auto-detection
const COLUMN_PATTERNS = {
  employeeId: [
    'person number', 'personnumber', 'employee id', 'employeeid', 'emp id', 'empid',
    'personnel number', 'personnel no', 'pernr', 'mitarbeiter id', 'mitarbeiternummer'
  ],
  name: [
    'name', 'full name', 'fullname', 'employee name', 'emp name',
    'mitarbeiter name', 'nombre', 'nome'
  ],
  firstName: ['first name', 'firstname', 'given name', 'forename', 'vorname', 'prenom'],
  lastName: ['last name', 'lastname', 'surname', 'family name', 'nachname', 'nom'],
  email: ['email', 'e-mail', 'email address', 'mail', 'e-mail-adresse'],
  role: ['job name', 'jobname', 'job title', 'title', 'position', 'role', 'job', 'stelle', 'funktion', 'cargo', 'puesto'],
  jobTitle: ['title', 'jobtitle'],
  department: ['department name', 'departmentname', 'department', 'dept', 'abteilung', 'departamento', 'departement'],
  status: ['system person type', 'status', 'employment status', 'emp status', 'state', 'staat', 'estado'],
  employmentType: ['worker category', 'workercategory', 'regular/temporary', 'employment type'],
  startDate: ['seniority date', 'start date', 'hire date', 'join date', 'eintrittsdatum', 'fecha inicio'],
  endDate: ['termination date', 'exit date', 'end date', 'contract end date'],
  fte: ['full-time equivalent', 'full time equivalent', 'fte', 'working time', 'arbeitszeit', 'tiempo trabajo'],
  company: ['legal employer name', 'company', 'firma', 'unternehmen'],
  plant: ['plant 2 (description)', 'plant 1 (description)', 'plant', 'location', 'standort'],
  city: ['city', 'stadt', 'ciudad'],
  costCenter: ['cost center', 'costcenter', 'kostenstelle'],
  division: ['segment', 'division', 'bereich'],
  birthdate: ['person date of birth', 'date of birth', 'birthdate', 'geburtsdatum'],
  payScale: ['grade name', 'gradename', 'pay scale', 'pay grade', 'gehaltsstufe'],
  managementLevel: ['assignment category', 'management level', 'führungsebene'],
};

const Step2ColumnMapping = () => {
  const { headers, sampleData, columnMapping, setColumnMapping, goToStep } = useImport();
  const [localMapping, setLocalMapping] = useState({});
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Auto-detect mappings on mount
  useEffect(() => {
    if (Object.keys(localMapping).length === 0 && headers.length > 0) {
      autoMapColumns();
    }
  }, [headers]);

  const autoMapColumns = () => {
    const mapping = {};
    const usedHeaders = new Set();

    // First pass: exact matches (highest priority)
    headers.forEach(header => {
      const normalizedHeader = header.toLowerCase().trim();

      for (const [targetKey, patterns] of Object.entries(COLUMN_PATTERNS)) {
        if (mapping[targetKey]) continue; // Already mapped

        // Check for exact match first
        if (patterns.some(pattern => normalizedHeader === pattern)) {
          mapping[targetKey] = header;
          usedHeaders.add(header);
          break;
        }
      }
    });

    // Second pass: contains matches (lower priority), skip already used headers
    headers.forEach(header => {
      if (usedHeaders.has(header)) return;

      const normalizedHeader = header.toLowerCase().trim();

      for (const [targetKey, patterns] of Object.entries(COLUMN_PATTERNS)) {
        if (mapping[targetKey]) continue; // Already mapped

        // Check for contains match, but prioritize longer patterns
        const sortedPatterns = [...patterns].sort((a, b) => b.length - a.length);
        if (sortedPatterns.some(pattern => normalizedHeader.includes(pattern))) {
          mapping[targetKey] = header;
          usedHeaders.add(header);
          break;
        }
      }
    });

    setLocalMapping(mapping);
  };

  const handleMappingChange = (targetField, sourceColumn) => {
    setLocalMapping(prev => ({
      ...prev,
      [targetField]: sourceColumn,
    }));
  };

  const clearMapping = (targetField) => {
    setLocalMapping(prev => {
      const newMapping = { ...prev };
      delete newMapping[targetField];
      return newMapping;
    });
  };

  const handleContinue = () => {
    setColumnMapping(localMapping);
    goToStep(3);
  };

  // Get mapped and unmapped counts
  const mappingStats = useMemo(() => {
    const requiredFields = TARGET_FIELDS.filter(f => f.required);
    const mappedRequired = requiredFields.filter(f => localMapping[f.key]).length;
    const totalMapped = Object.keys(localMapping).length;

    return {
      requiredMapped: mappedRequired,
      requiredTotal: requiredFields.length,
      totalMapped,
      totalFields: TARGET_FIELDS.length,
    };
  }, [localMapping]);

  // Filter fields by category and search
  const filteredFields = useMemo(() => {
    let fields = TARGET_FIELDS;

    if (selectedCategory !== 'all') {
      fields = fields.filter(f => f.category === selectedCategory);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      fields = fields.filter(f =>
        f.label.toLowerCase().includes(query) ||
        f.key.toLowerCase().includes(query)
      );
    }

    return fields;
  }, [selectedCategory, searchQuery]);

  const categories = ['all', ...new Set(TARGET_FIELDS.map(f => f.category))];

  const canContinue = mappingStats.requiredMapped === mappingStats.requiredTotal;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Map Columns
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Map your source columns to the target fields. Required fields must be mapped to continue.
        </p>
      </div>

      {/* Mapping Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Required Fields</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {mappingStats.requiredMapped} / {mappingStats.requiredTotal}
          </div>
          {mappingStats.requiredMapped === mappingStats.requiredTotal ? (
            <div className="flex items-center gap-1 text-green-600 dark:text-green-400 text-sm mt-1">
              <Check className="w-4 h-4" />
              <span>Complete</span>
            </div>
          ) : (
            <div className="text-orange-600 dark:text-orange-400 text-sm mt-1">
              Incomplete
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Mapped</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {mappingStats.totalMapped} / {mappingStats.totalFields}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Source Columns</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {headers.length}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search fields..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto">
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`
                  px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-colors
                  ${selectedCategory === category
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }
                `}
              >
                {category === 'all' ? 'All Fields' : category}
              </button>
            ))}
          </div>

          <button
            onClick={autoMapColumns}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium text-sm whitespace-nowrap"
          >
            Auto-Map
          </button>
        </div>
      </div>

      {/* Mapping Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                  Target Field
                </th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900 dark:text-white w-12">

                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                  Source Column
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                  Sample Data
                </th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900 dark:text-white w-20">

                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredFields.map(field => (
                <tr key={field.key} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {field.label}
                      </span>
                      {field.required && (
                        <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs font-medium rounded">
                          Required
                        </span>
                      )}
                      <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded">
                        {field.type}
                      </span>
                    </div>
                  </td>

                  <td className="px-4 py-3 text-center">
                    <ArrowRight className="w-4 h-4 text-gray-400 mx-auto" />
                  </td>

                  <td className="px-4 py-3">
                    <select
                      value={localMapping[field.key] || ''}
                      onChange={(e) => handleMappingChange(field.key, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm"
                    >
                      <option value="">-- Not Mapped --</option>
                      {headers.map(header => (
                        <option key={header} value={header}>
                          {header}
                        </option>
                      ))}
                    </select>
                  </td>

                  <td className="px-4 py-3">
                    {localMapping[field.key] && sampleData[0] && (
                      <span className="text-sm text-gray-600 dark:text-gray-400 truncate block max-w-xs">
                        {sampleData[0][localMapping[field.key]] || '(empty)'}
                      </span>
                    )}
                  </td>

                  <td className="px-4 py-3 text-center">
                    {localMapping[field.key] && (
                      <button
                        onClick={() => clearMapping(field.key)}
                        className="text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                        title="Clear mapping"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-8 flex items-center justify-between">
        <button
          onClick={() => goToStep(1)}
          className="px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium"
        >
          Back
        </button>

        <button
          onClick={handleContinue}
          disabled={!canContinue}
          className={`
            px-6 py-3 rounded-lg font-medium transition-colors
            ${canContinue
              ? 'bg-primary-600 hover:bg-primary-700 text-white'
              : 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-500 cursor-not-allowed'
            }
          `}
        >
          Continue to Validation
        </button>
      </div>
    </div>
  );
};

export default Step2ColumnMapping;
