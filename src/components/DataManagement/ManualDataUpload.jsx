/**
 * Manual Data Upload Interface
 * Emergency and supplementary data upload functionality
 */

import React, { useState, useCallback } from 'react';
import { 
  Upload, 
  File, 
  FileText, 
  Database, 
  AlertTriangle, 
  CheckCircle, 
  X,
  Download,
  Eye,
  Settings,
  Calendar,
  MapPin,
  Tag,
  Users
} from 'lucide-react';

const ManualDataUpload = () => {
  const [uploadState, setUploadState] = useState({
    files: [],
    dragActive: false,
    uploading: false,
    currentStep: 1,
    uploadProgress: 0
  });
  
  const [uploadConfig, setUploadConfig] = useState({
    dataType: 'energy_statistics',
    source: 'manual_upload',
    geographicScope: '',
    temporalScope: '',
    priority: 'normal',
    validationLevel: 'standard',
    overwriteExisting: false,
    tags: [],
    description: '',
    contactInfo: ''
  });

  const [validationResults, setValidationResults] = useState(null);
  const [uploadHistory, setUploadHistory] = useState([
    {
      id: 1,
      filename: 'energy_access_data_2024.csv',
      uploadedBy: 'admin@esmap.org',
      uploadedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      status: 'completed',
      recordsProcessed: 15680,
      dataType: 'energy_access',
      size: '2.4 MB',
      validationPassed: true
    },
    {
      id: 2,
      filename: 'renewable_capacity_emergency.xlsx',
      uploadedBy: 'researcher@worldbank.org',
      uploadedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      status: 'completed',
      recordsProcessed: 8945,
      dataType: 'renewable_energy',
      size: '1.8 MB',
      validationPassed: true
    },
    {
      id: 3,
      filename: 'country_data_supplement.json',
      uploadedBy: 'analyst@esmap.org',
      uploadedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      status: 'failed',
      recordsProcessed: 0,
      errorMessage: 'Invalid JSON format detected',
      dataType: 'country_statistics',
      size: '5.2 MB',
      validationPassed: false
    }
  ]);

  // Drag and drop handlers
  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setUploadState(prev => ({ ...prev, dragActive: true }));
    } else if (e.type === 'dragleave') {
      setUploadState(prev => ({ ...prev, dragActive: false }));
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setUploadState(prev => ({ ...prev, dragActive: false }));
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  }, []);

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFiles(Array.from(e.target.files));
    }
  };

  const handleFiles = (files) => {
    const validFiles = files.filter(file => {
      const validTypes = [
        'text/csv',
        'application/json',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ];
      return validTypes.includes(file.type) && file.size <= 100 * 1024 * 1024; // 100MB limit
    });

    const processedFiles = validFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      name: file.name,
      size: file.size,
      type: file.type,
      preview: null,
      validation: null
    }));

    setUploadState(prev => ({
      ...prev,
      files: [...prev.files, ...processedFiles]
    }));
  };

  const removeFile = (fileId) => {
    setUploadState(prev => ({
      ...prev,
      files: prev.files.filter(f => f.id !== fileId)
    }));
  };

  const validateFiles = async () => {
    setUploadState(prev => ({ ...prev, currentStep: 2 }));
    
    // Mock validation process
    const mockValidation = {
      isValid: true,
      totalRecords: 12450,
      validRecords: 12380,
      invalidRecords: 70,
      warnings: [
        'Missing values in 45 records for "renewable_capacity" field',
        'Date format inconsistencies in 25 records'
      ],
      errors: [
        'Invalid country codes in 3 records: "XYZ", "ABC", "DEF"'
      ],
      suggestions: [
        'Consider using ISO country codes for better data consistency',
        'Add data dictionary for renewable energy capacity units'
      ]
    };

    setTimeout(() => {
      setValidationResults(mockValidation);
    }, 2000);
  };

  const performUpload = async () => {
    setUploadState(prev => ({ ...prev, uploading: true, currentStep: 3 }));
    
    // Mock upload process
    for (let i = 0; i <= 100; i += 10) {
      await new Promise(resolve => setTimeout(resolve, 500));
      setUploadState(prev => ({ ...prev, uploadProgress: i }));
    }
    
    // Add to upload history
    const newUpload = {
      id: uploadHistory.length + 1,
      filename: uploadState.files[0]?.name || 'unknown_file',
      uploadedBy: 'current_user@esmap.org',
      uploadedAt: new Date(),
      status: 'completed',
      recordsProcessed: validationResults?.validRecords || 0,
      dataType: uploadConfig.dataType,
      size: formatFileSize(uploadState.files[0]?.size || 0),
      validationPassed: validationResults?.isValid || false
    };
    
    setUploadHistory(prev => [newUpload, ...prev]);
    
    // Reset form
    setUploadState({
      files: [],
      dragActive: false,
      uploading: false,
      currentStep: 1,
      uploadProgress: 0
    });
    setValidationResults(null);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (type) => {
    if (type.includes('csv')) return <FileText className="h-8 w-8 text-green-500" />;
    if (type.includes('json')) return <Database className="h-8 w-8 text-blue-500" />;
    if (type.includes('excel') || type.includes('sheet')) return <File className="h-8 w-8 text-green-600" />;
    return <File className="h-8 w-8 text-gray-500" />;
  };

  const dataTypeOptions = [
    { value: 'energy_statistics', label: 'Energy Statistics' },
    { value: 'energy_access', label: 'Energy Access Data' },
    { value: 'renewable_energy', label: 'Renewable Energy Data' },
    { value: 'country_statistics', label: 'Country Statistics' },
    { value: 'infrastructure_data', label: 'Infrastructure Data' },
    { value: 'emissions_data', label: 'Emissions Data' },
    { value: 'economic_indicators', label: 'Economic Indicators' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-medium text-gray-900">Manual Data Upload</h2>
        <p className="text-sm text-gray-500">
          Upload emergency or supplementary data files for immediate processing
        </p>
      </div>

      {/* Upload Steps */}
      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          {/* Step Indicator */}
          <div className="mb-8">
            <nav aria-label="Progress">
              <ol className="flex items-center">
                {[
                  { id: 1, name: 'Upload Files', status: uploadState.currentStep > 1 ? 'complete' : uploadState.currentStep === 1 ? 'current' : 'upcoming' },
                  { id: 2, name: 'Validation', status: uploadState.currentStep > 2 ? 'complete' : uploadState.currentStep === 2 ? 'current' : 'upcoming' },
                  { id: 3, name: 'Process', status: uploadState.currentStep === 3 ? 'current' : 'upcoming' }
                ].map((step, stepIdx) => (
                  <li key={step.name} className={`${stepIdx !== 2 ? 'pr-8 sm:pr-20' : ''} relative`}>
                    <div className="flex items-center">
                      <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                        step.status === 'complete' ? 'bg-green-600' :
                        step.status === 'current' ? 'bg-blue-600' : 'bg-gray-300'
                      }`}>
                        {step.status === 'complete' ? (
                          <CheckCircle className="w-6 h-6 text-white" />
                        ) : (
                          <span className={`text-sm font-medium ${
                            step.status === 'current' ? 'text-white' : 'text-gray-500'
                          }`}>
                            {step.id}
                          </span>
                        )}
                      </div>
                      <span className={`ml-4 text-sm font-medium ${
                        step.status === 'current' ? 'text-blue-600' : 'text-gray-500'
                      }`}>
                        {step.name}
                      </span>
                    </div>
                    {stepIdx !== 2 && (
                      <div className="absolute top-5 left-10 w-full h-0.5 bg-gray-300" />
                    )}
                  </li>
                ))}
              </ol>
            </nav>
          </div>

          {/* Step 1: File Upload */}
          {uploadState.currentStep === 1 && (
            <div className="space-y-6">
              {/* Upload Configuration */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Data Type</label>
                  <select
                    value={uploadConfig.dataType}
                    onChange={(e) => setUploadConfig(prev => ({ ...prev, dataType: e.target.value }))}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                  >
                    {dataTypeOptions.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Priority</label>
                  <select
                    value={uploadConfig.priority}
                    onChange={(e) => setUploadConfig(prev => ({ ...prev, priority: e.target.value }))}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="emergency">Emergency</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Geographic Scope</label>
                  <input
                    type="text"
                    value={uploadConfig.geographicScope}
                    onChange={(e) => setUploadConfig(prev => ({ ...prev, geographicScope: e.target.value }))}
                    placeholder="e.g., Global, Sub-Saharan Africa, Country codes"
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Temporal Scope</label>
                  <input
                    type="text"
                    value={uploadConfig.temporalScope}
                    onChange={(e) => setUploadConfig(prev => ({ ...prev, temporalScope: e.target.value }))}
                    placeholder="e.g., 2024, 2020-2024, Monthly 2024"
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  value={uploadConfig.description}
                  onChange={(e) => setUploadConfig(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  placeholder="Describe the data source, methodology, and any important context"
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>

              {/* File Drop Zone */}
              <div
                className={`mt-6 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md ${
                  uploadState.dragActive 
                    ? 'border-blue-400 bg-blue-50' 
                    : 'border-gray-300'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <div className="space-y-1 text-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="flex text-sm text-gray-600">
                    <label className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                      <span>Upload files</span>
                      <input
                        type="file"
                        className="sr-only"
                        multiple
                        accept=".csv,.json,.xlsx,.xls"
                        onChange={handleFileSelect}
                      />
                    </label>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-xs text-gray-500">
                    CSV, JSON, Excel files up to 100MB
                  </p>
                </div>
              </div>

              {/* Uploaded Files */}
              {uploadState.files.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-gray-900">Uploaded Files</h4>
                  {uploadState.files.map((file) => (
                    <div key={file.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                      <div className="flex items-center space-x-3">
                        {getFileIcon(file.type)}
                        <div>
                          <p className="text-sm font-medium text-gray-900">{file.name}</p>
                          <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => removeFile(file.id)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setUploadState(prev => ({ ...prev, files: [] }))}
                  disabled={uploadState.files.length === 0}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Clear All
                </button>
                <button
                  onClick={validateFiles}
                  disabled={uploadState.files.length === 0}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Validate & Continue
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Validation Results */}
          {uploadState.currentStep === 2 && (
            <div className="space-y-6">
              {!validationResults ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-4 text-sm text-gray-600">Validating uploaded data...</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Validation Summary */}
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <div className="flex items-center space-x-3 mb-4">
                      {validationResults.isValid ? (
                        <CheckCircle className="h-6 w-6 text-green-500" />
                      ) : (
                        <AlertTriangle className="h-6 w-6 text-red-500" />
                      )}
                      <h3 className="text-lg font-medium text-gray-900">
                        Validation {validationResults.isValid ? 'Passed' : 'Failed'}
                      </h3>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">
                          {validationResults.validRecords.toLocaleString()}
                        </div>
                        <div className="text-sm text-green-700">Valid Records</div>
                      </div>
                      
                      <div className="text-center p-4 bg-red-50 rounded-lg">
                        <div className="text-2xl font-bold text-red-600">
                          {validationResults.invalidRecords.toLocaleString()}
                        </div>
                        <div className="text-sm text-red-700">Invalid Records</div>
                      </div>
                      
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">
                          {validationResults.totalRecords.toLocaleString()}
                        </div>
                        <div className="text-sm text-blue-700">Total Records</div>
                      </div>
                    </div>
                  </div>

                  {/* Issues */}
                  {(validationResults.errors.length > 0 || validationResults.warnings.length > 0) && (
                    <div className="space-y-4">
                      {validationResults.errors.length > 0 && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                          <h4 className="text-sm font-medium text-red-800 mb-2">Errors ({validationResults.errors.length})</h4>
                          <ul className="text-sm text-red-700 space-y-1">
                            {validationResults.errors.map((error, index) => (
                              <li key={index}>• {error}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {validationResults.warnings.length > 0 && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                          <h4 className="text-sm font-medium text-yellow-800 mb-2">Warnings ({validationResults.warnings.length})</h4>
                          <ul className="text-sm text-yellow-700 space-y-1">
                            {validationResults.warnings.map((warning, index) => (
                              <li key={index}>• {warning}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Suggestions */}
                  {validationResults.suggestions.length > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-blue-800 mb-2">Suggestions</h4>
                      <ul className="text-sm text-blue-700 space-y-1">
                        {validationResults.suggestions.map((suggestion, index) => (
                          <li key={index}>• {suggestion}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex justify-between">
                    <button
                      onClick={() => setUploadState(prev => ({ ...prev, currentStep: 1 }))}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                    >
                      Back to Upload
                    </button>
                    
                    <div className="flex space-x-3">
                      {!validationResults.isValid && (
                        <button
                          onClick={() => setUploadState(prev => ({ ...prev, currentStep: 1 }))}
                          className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                        >
                          Fix Issues
                        </button>
                      )}
                      
                      <button
                        onClick={performUpload}
                        disabled={!validationResults.isValid}
                        className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {validationResults.isValid ? 'Process Upload' : 'Cannot Process (Errors Found)'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Upload Progress */}
          {uploadState.currentStep === 3 && (
            <div className="space-y-6">
              <div className="text-center py-12">
                {uploadState.uploading ? (
                  <>
                    <div className="w-32 h-32 mx-auto mb-6">
                      <div className="relative w-full h-full">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                          <path
                            className="text-gray-300"
                            d="M18 2.0845
                              a 15.9155 15.9155 0 0 1 0 31.831
                              a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          />
                          <path
                            className="text-blue-600"
                            d="M18 2.0845
                              a 15.9155 15.9155 0 0 1 0 31.831
                              a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeDasharray={`${uploadState.uploadProgress}, 100`}
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-2xl font-bold text-gray-900">
                            {uploadState.uploadProgress}%
                          </span>
                        </div>
                      </div>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Processing Upload</h3>
                    <p className="text-sm text-gray-600">
                      Please wait while we process your data...
                    </p>
                  </>
                ) : (
                  <>
                    <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Upload Complete!</h3>
                    <p className="text-sm text-gray-600 mb-6">
                      Your data has been successfully processed and is now available in the system.
                    </p>
                    <button
                      onClick={() => {
                        setUploadState({
                          files: [],
                          dragActive: false,
                          uploading: false,
                          currentStep: 1,
                          uploadProgress: 0
                        });
                        setValidationResults(null);
                      }}
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                    >
                      Upload More Data
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Upload History */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Recent Uploads</h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            History of manually uploaded data files
          </p>
        </div>
        
        <ul className="divide-y divide-gray-200">
          {uploadHistory.map((upload) => (
            <li key={upload.id} className="px-4 py-4 sm:px-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center min-w-0 flex-1">
                  <div className="flex-shrink-0">
                    {upload.status === 'completed' ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                    )}
                  </div>
                  
                  <div className="ml-4 min-w-0 flex-1">
                    <div className="flex items-center space-x-3">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {upload.filename}
                      </p>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        upload.status === 'completed' ? 'text-green-600 bg-green-100' : 'text-red-600 bg-red-100'
                      }`}>
                        {upload.status}
                      </span>
                    </div>
                    
                    <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                      <span>{upload.size}</span>
                      <span>{upload.recordsProcessed.toLocaleString()} records</span>
                      <span>{upload.dataType.replace('_', ' ')}</span>
                      <span>By {upload.uploadedBy}</span>
                      <span>{upload.uploadedAt.toLocaleString()}</span>
                    </div>
                    
                    {upload.errorMessage && (
                      <div className="mt-2 text-sm text-red-600">
                        {upload.errorMessage}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button className="text-gray-400 hover:text-gray-600">
                    <Eye className="h-5 w-5" />
                  </button>
                  <button className="text-gray-400 hover:text-gray-600">
                    <Download className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default ManualDataUpload;