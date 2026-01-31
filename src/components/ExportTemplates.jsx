/**
 * Export Templates Component
 * Save and reuse export configurations
 */

import React, { useState, useEffect } from 'react';
import {
  Download, Save, Trash2, FileText, Table, BarChart3,
  Plus, Check, X, Edit2, Copy, ChevronDown
} from 'lucide-react';
import * as XLSX from 'xlsx';

// Local storage key for templates
const TEMPLATES_KEY = 'workforce_tracker_export_templates';

// Default export fields
const availableFields = [
  { id: 'department', label: 'Abteilung', category: 'Basis' },
  { id: 'headcount', label: 'Mitarbeiteranzahl', category: 'Basis' },
  { id: 'fte', label: 'FTE', category: 'Basis' },
  { id: 'avgSalary', label: 'Durchschnittsgehalt', category: 'Kosten' },
  { id: 'totalSalary', label: 'Gesamtgehalt', category: 'Kosten' },
  { id: 'reductionCount', label: 'In Reduktion', category: 'Reduktion' },
  { id: 'reductionPercent', label: 'Reduktionsquote %', category: 'Reduktion' },
  { id: 'costCenter', label: 'Kostenstelle', category: 'Organisation' },
  { id: 'location', label: 'Standort', category: 'Organisation' },
];

// Default templates
const defaultTemplates = [
  {
    id: 'basic',
    name: 'Basis-Übersicht',
    description: 'Abteilungen mit Headcount und FTE',
    fields: ['department', 'headcount', 'fte'],
    format: 'xlsx',
    isDefault: true
  },
  {
    id: 'cost',
    name: 'Kostenanalyse',
    description: 'Vollständige Kostenübersicht nach Abteilung',
    fields: ['department', 'headcount', 'fte', 'avgSalary', 'totalSalary'],
    format: 'xlsx',
    isDefault: true
  },
  {
    id: 'reduction',
    name: 'Reduktionsbericht',
    description: 'Übersicht über Reduktionsprogramme',
    fields: ['department', 'headcount', 'reductionCount', 'reductionPercent', 'totalSalary'],
    format: 'xlsx',
    isDefault: true
  }
];

// Hook to manage export templates
export const useExportTemplates = () => {
  const [templates, setTemplates] = useState([]);

  // Load templates from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(TEMPLATES_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setTemplates([...defaultTemplates, ...parsed]);
      } catch {
        setTemplates(defaultTemplates);
      }
    } else {
      setTemplates(defaultTemplates);
    }
  }, []);

  // Save custom templates
  const saveTemplate = (template) => {
    const customTemplates = templates.filter(t => !t.isDefault);
    const newTemplate = {
      ...template,
      id: `custom_${Date.now()}`,
      isDefault: false
    };
    const updated = [...customTemplates, newTemplate];
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(updated));
    setTemplates([...defaultTemplates, ...updated]);
    return newTemplate;
  };

  // Delete custom template
  const deleteTemplate = (id) => {
    const customTemplates = templates.filter(t => !t.isDefault && t.id !== id);
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(customTemplates));
    setTemplates([...defaultTemplates, ...customTemplates]);
  };

  // Export data using template
  const exportWithTemplate = (template, data) => {
    if (!data || !template) return;

    const exportData = data.map(item => {
      const row = {};
      template.fields.forEach(fieldId => {
        const field = availableFields.find(f => f.id === fieldId);
        if (field) {
          row[field.label] = item[fieldId] ?? '—';
        }
      });
      return row;
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);

    // Set column widths
    ws['!cols'] = template.fields.map(() => ({ wch: 18 }));

    XLSX.utils.book_append_sheet(wb, ws, 'Export');

    const filename = `${template.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, filename);
  };

  return {
    templates,
    saveTemplate,
    deleteTemplate,
    exportWithTemplate,
    availableFields
  };
};

// Export Templates Modal Component
const ExportTemplatesModal = ({ isOpen, onClose, data, onExport }) => {
  const { templates, saveTemplate, deleteTemplate, exportWithTemplate, availableFields } = useExportTemplates();
  const [activeTab, setActiveTab] = useState('templates');
  const [selectedFields, setSelectedFields] = useState(['department', 'headcount', 'fte']);
  const [templateName, setTemplateName] = useState('');
  const [templateDesc, setTemplateDesc] = useState('');
  const [showSaveForm, setShowSaveForm] = useState(false);

  if (!isOpen) return null;

  const toggleField = (fieldId) => {
    setSelectedFields(prev =>
      prev.includes(fieldId)
        ? prev.filter(f => f !== fieldId)
        : [...prev, fieldId]
    );
  };

  const handleQuickExport = () => {
    const template = {
      fields: selectedFields,
      name: 'Custom_Export',
      format: 'xlsx'
    };
    exportWithTemplate(template, data);
    onExport?.();
  };

  const handleSaveTemplate = () => {
    if (!templateName.trim()) return;

    saveTemplate({
      name: templateName,
      description: templateDesc,
      fields: selectedFields,
      format: 'xlsx'
    });

    setTemplateName('');
    setTemplateDesc('');
    setShowSaveForm(false);
  };

  const handleUseTemplate = (template) => {
    exportWithTemplate(template, data);
    onExport?.();
    onClose();
  };

  // Group fields by category
  const fieldsByCategory = availableFields.reduce((acc, field) => {
    if (!acc[field.category]) acc[field.category] = [];
    acc[field.category].push(field);
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-2xl max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-p3-midnight dark:text-white">
              Export
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Vorlage auswählen oder individuellen Export erstellen
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-6 border-b border-gray-200 dark:border-gray-800">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('templates')}
              className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'templates'
                  ? 'border-p3-electric text-p3-electric'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Vorlagen
            </button>
            <button
              onClick={() => setActiveTab('custom')}
              className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'custom'
                  ? 'border-p3-electric text-p3-electric'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Individuell
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[50vh]">
          {activeTab === 'templates' && (
            <div className="space-y-3">
              {templates.map(template => (
                <div
                  key={template.id}
                  className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-p3-electric transition-colors group"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                      <Table className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-medium text-p3-midnight dark:text-white">
                          {template.name}
                        </h3>
                        {template.isDefault && (
                          <span className="px-1.5 py-0.5 text-[10px] bg-gray-100 dark:bg-gray-800 text-gray-500 rounded">
                            Standard
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {template.description}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-1">
                        {template.fields.length} Felder
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!template.isDefault && (
                      <button
                        onClick={() => deleteTemplate(template.id)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleUseTemplate(template)}
                      className="flex items-center gap-2 px-4 py-2 bg-p3-electric hover:bg-primary-600 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      Export
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'custom' && (
            <div className="space-y-6">
              {/* Field Selection */}
              <div>
                <h3 className="text-sm font-medium text-p3-midnight dark:text-white mb-3">
                  Felder auswählen
                </h3>
                {Object.entries(fieldsByCategory).map(([category, fields]) => (
                  <div key={category} className="mb-4">
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                      {category}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {fields.map(field => (
                        <button
                          key={field.id}
                          onClick={() => toggleField(field.id)}
                          className={`
                            px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
                            ${selectedFields.includes(field.id)
                              ? 'bg-p3-electric text-white'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                            }
                          `}
                        >
                          {selectedFields.includes(field.id) && (
                            <Check className="w-3 h-3 inline mr-1" />
                          )}
                          {field.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Save as Template */}
              {!showSaveForm ? (
                <button
                  onClick={() => setShowSaveForm(true)}
                  className="flex items-center gap-2 text-sm text-p3-electric hover:text-primary-600"
                >
                  <Plus className="w-4 h-4" />
                  Als Vorlage speichern
                </button>
              ) : (
                <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg space-y-3">
                  <input
                    type="text"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="Vorlagenname"
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-p3-midnight dark:text-white"
                  />
                  <input
                    type="text"
                    value={templateDesc}
                    onChange={(e) => setTemplateDesc(e.target.value)}
                    placeholder="Beschreibung (optional)"
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-p3-midnight dark:text-white"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSaveTemplate}
                      disabled={!templateName.trim()}
                      className="flex items-center gap-2 px-4 py-2 bg-p3-electric hover:bg-primary-600 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      <Save className="w-4 h-4" />
                      Speichern
                    </button>
                    <button
                      onClick={() => setShowSaveForm(false)}
                      className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700"
                    >
                      Abbrechen
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {activeTab === 'custom' && (
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between bg-gray-50 dark:bg-gray-800/50">
            <p className="text-xs text-gray-500">
              {selectedFields.length} Felder ausgewählt
            </p>
            <button
              onClick={handleQuickExport}
              disabled={selectedFields.length === 0}
              className="flex items-center gap-2 px-6 py-2 bg-p3-electric hover:bg-primary-600 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Download className="w-4 h-4" />
              Exportieren
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExportTemplatesModal;
