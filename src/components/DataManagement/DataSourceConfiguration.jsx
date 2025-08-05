/**
 * Data Source Configuration Panel
 * Interface for adding, modifying, and managing data sources
 */

import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X, 
  Settings, 
  Database,
  Globe,
  Key,
  Clock,
  Shield,
  AlertTriangle,
  CheckCircle,
  Copy,
  Eye,
  EyeOff
} from 'lucide-react';

const DataSourceConfiguration = () => {
  const [dataSources, setDataSources] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingSource, setEditingSource] = useState(null);
  const [showApiKey, setShowApiKey] = useState({});
  const [loading, setLoading] = useState(true);

  // Form state for new/edited data source
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    type: 'API',
    priority: 3,
    baseUrl: '',
    apiKey: '',
    timeout: 10000,
    rateLimit: {
      requestsPerMinute: 60,
      requestsPerHour: 1000,
      requestsPerDay: 10000
    },
    retryPolicy: {
      maxAttempts: 3,
      backoffStrategy: 'exponential',
      initialDelay: 1000,
      maxDelay: 10000,
      jitter: true
    },
    healthCheck: {
      endpoint: '/health',
      interval: 300,
      timeout: 5000
    },
    compliance: {
      respectsRobotsTxt: true,
      hasTermsOfService: false,
      requiresAttribution: false,
      dataUsageRestrictions: [],
      privacyPolicyUrl: '',
      complianceNotes: ''
    },
    metadata: {
      description: '',
      dataFormat: 'json',
      updateFrequency: 'Unknown',
      coverage: {
        geographic: [],
        temporal: {},
        topics: []
      },
      quality: {
        accuracy: 0.8,
        completeness: 0.8,
        timeliness: 0.8,
        reliability: 0.8,
        overall: 0.8
      },
      maintainer: {
        name: '',
        contact: '',
        organization: ''
      }
    }
  });

  useEffect(() => {
    fetchDataSources();
  }, []);

  const fetchDataSources = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/v1/resilience/sources');
      const data = await response.json();
      
      if (data.success) {
        setDataSources(data.data.sources);
      }
    } catch (error) {
      console.error('Failed to fetch data sources:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNew = () => {
    setEditingSource(null);
    setFormData({
      id: '',
      name: '',
      type: 'API',
      priority: 3,
      baseUrl: '',
      apiKey: '',
      timeout: 10000,
      rateLimit: {
        requestsPerMinute: 60,
        requestsPerHour: 1000,
        requestsPerDay: 10000
      },
      retryPolicy: {
        maxAttempts: 3,
        backoffStrategy: 'exponential',
        initialDelay: 1000,
        maxDelay: 10000,
        jitter: true
      },
      healthCheck: {
        endpoint: '/health',
        interval: 300,
        timeout: 5000
      },
      compliance: {
        respectsRobotsTxt: true,
        hasTermsOfService: false,
        requiresAttribution: false,
        dataUsageRestrictions: [],
        privacyPolicyUrl: '',
        complianceNotes: ''
      },
      metadata: {
        description: '',
        dataFormat: 'json',
        updateFrequency: 'Unknown',
        coverage: {
          geographic: [],
          temporal: {},
          topics: []
        },
        quality: {
          accuracy: 0.8,
          completeness: 0.8,
          timeliness: 0.8,
          reliability: 0.8,
          overall: 0.8
        },
        maintainer: {
          name: '',
          contact: '',
          organization: ''
        }
      }
    });
    setIsEditing(true);
  };

  const handleEdit = (source) => {
    setEditingSource(source.id);
    setFormData({ ...source });
    setIsEditing(true);
  };

  const handleSave = async () => {
    try {
      const url = editingSource 
        ? `/api/v1/resilience/sources/${editingSource}`
        : '/api/v1/resilience/sources';
      
      const method = editingSource ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      
      if (data.success) {
        await fetchDataSources();
        setIsEditing(false);
        setEditingSource(null);
      } else {
        alert(`Failed to save data source: ${data.error}`);
      }
    } catch (error) {
      console.error('Failed to save data source:', error);
      alert('Failed to save data source. Please try again.');
    }
  };

  const handleDelete = async (sourceId) => {
    if (!confirm('Are you sure you want to delete this data source?')) {
      return;
    }

    try {
      const response = await fetch(`/api/v1/resilience/sources/${sourceId}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      
      if (data.success) {
        await fetchDataSources();
      } else {
        alert(`Failed to delete data source: ${data.error}`);
      }
    } catch (error) {
      console.error('Failed to delete data source:', error);
      alert('Failed to delete data source. Please try again.');
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditingSource(null);
  };

  const updateFormData = (path, value) => {
    const keys = path.split('.');
    const newFormData = { ...formData };
    let current = newFormData;
    
    for (let i = 0; i < keys.length - 1; i++) {
      current[keys[i]] = { ...current[keys[i]] };
      current = current[keys[i]];
    }
    
    current[keys[keys.length - 1]] = value;
    setFormData(newFormData);
  };

  const toggleApiKeyVisibility = (sourceId) => {
    setShowApiKey(prev => ({
      ...prev,
      [sourceId]: !prev[sourceId]
    }));
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const dataSourceTypes = [
    { value: 'API', label: 'REST API' },
    { value: 'DATABASE', label: 'Database' },
    { value: 'FILE', label: 'File System' },
    { value: 'STREAM', label: 'Data Stream' },
    { value: 'WEBHOOK', label: 'Webhook' },
    { value: 'FTP', label: 'FTP/SFTP' },
    { value: 'EMAIL', label: 'Email' },
    { value: 'RSS', label: 'RSS/Atom Feed' },
    { value: 'SCRAPING', label: 'Web Scraping' },
    { value: 'GOVERNMENT', label: 'Government Portal' },
    { value: 'ACADEMIC', label: 'Academic Database' },
    { value: 'CROWDSOURCED', label: 'Crowdsourced' },
    { value: 'COMMERCIAL', label: 'Commercial' }
  ];

  const backoffStrategies = [
    { value: 'exponential', label: 'Exponential' },
    { value: 'linear', label: 'Linear' },
    { value: 'fixed', label: 'Fixed' }
  ];

  const dataFormats = [
    { value: 'json', label: 'JSON' },
    { value: 'xml', label: 'XML' },
    { value: 'csv', label: 'CSV' },
    { value: 'excel', label: 'Excel' },
    { value: 'binary', label: 'Binary' }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Settings className="h-8 w-8 animate-spin text-blue-500" />
        <span className="ml-2 text-gray-600">Loading data sources...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-medium text-gray-900">Data Source Configuration</h2>
          <p className="text-sm text-gray-500">
            Manage and configure data sources for the ESMAP AI platform
          </p>
        </div>
        
        {!isEditing && (
          <button
            onClick={handleAddNew}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Data Source
          </button>
        )}
      </div>

      {/* Configuration Form */}
      {isEditing && (
        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                {editingSource ? 'Edit Data Source' : 'Add New Data Source'}
              </h3>
              <div className="flex space-x-3">
                <button
                  onClick={handleCancel}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </button>
              </div>
            </div>

            <div className="space-y-8">
              {/* Basic Information */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-4">Basic Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Source ID</label>
                    <input
                      type="text"
                      value={formData.id}
                      onChange={(e) => updateFormData('id', e.target.value)}
                      placeholder="unique-source-id"
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Name</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => updateFormData('name', e.target.value)}
                      placeholder="Data Source Name"
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Type</label>
                    <select
                      value={formData.type}
                      onChange={(e) => updateFormData('type', e.target.value)}
                      className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                    >
                      {dataSourceTypes.map(type => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Priority (1-5)</label>
                    <input
                      type="number"
                      min="1"
                      max="5"
                      value={formData.priority}
                      onChange={(e) => updateFormData('priority', parseInt(e.target.value))}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Base URL</label>
                    <input
                      type="url"
                      value={formData.baseUrl}
                      onChange={(e) => updateFormData('baseUrl', e.target.value)}
                      placeholder="https://api.example.com"
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">API Key (Optional)</label>
                    <div className="mt-1 relative">
                      <input
                        type={showApiKey['form'] ? 'text' : 'password'}
                        value={formData.apiKey}
                        onChange={(e) => updateFormData('apiKey', e.target.value)}
                        placeholder="Enter API key if required"
                        className="block w-full pr-20 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center space-x-2 pr-3">
                        <button
                          type="button"
                          onClick={() => toggleApiKeyVisibility('form')}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          {showApiKey['form'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Timeout (ms)</label>
                    <input
                      type="number"
                      value={formData.timeout}
                      onChange={(e) => updateFormData('timeout', parseInt(e.target.value))}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Data Format</label>
                    <select
                      value={formData.metadata.dataFormat}
                      onChange={(e) => updateFormData('metadata.dataFormat', e.target.value)}
                      className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                    >
                      {dataFormats.map(format => (
                        <option key={format.value} value={format.value}>{format.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    value={formData.metadata.description}
                    onChange={(e) => updateFormData('metadata.description', e.target.value)}
                    rows={3}
                    placeholder="Describe the data source and its purpose"
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
              </div>

              {/* Rate Limiting */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-4">Rate Limiting</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Requests per Minute</label>
                    <input
                      type="number"
                      value={formData.rateLimit.requestsPerMinute}
                      onChange={(e) => updateFormData('rateLimit.requestsPerMinute', parseInt(e.target.value))}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Requests per Hour</label>
                    <input
                      type="number"
                      value={formData.rateLimit.requestsPerHour}
                      onChange={(e) => updateFormData('rateLimit.requestsPerHour', parseInt(e.target.value))}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Requests per Day</label>
                    <input
                      type="number"
                      value={formData.rateLimit.requestsPerDay}
                      onChange={(e) => updateFormData('rateLimit.requestsPerDay', parseInt(e.target.value))}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Retry Policy */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-4">Retry Policy</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Max Attempts</label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={formData.retryPolicy.maxAttempts}
                      onChange={(e) => updateFormData('retryPolicy.maxAttempts', parseInt(e.target.value))}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Backoff Strategy</label>
                    <select
                      value={formData.retryPolicy.backoffStrategy}
                      onChange={(e) => updateFormData('retryPolicy.backoffStrategy', e.target.value)}
                      className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                    >
                      {backoffStrategies.map(strategy => (
                        <option key={strategy.value} value={strategy.value}>{strategy.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Initial Delay (ms)</label>
                    <input
                      type="number"
                      value={formData.retryPolicy.initialDelay}
                      onChange={(e) => updateFormData('retryPolicy.initialDelay', parseInt(e.target.value))}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Max Delay (ms)</label>
                    <input
                      type="number"
                      value={formData.retryPolicy.maxDelay}
                      onChange={(e) => updateFormData('retryPolicy.maxDelay', parseInt(e.target.value))}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.retryPolicy.jitter}
                      onChange={(e) => updateFormData('retryPolicy.jitter', e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Enable jitter</span>
                  </label>
                </div>
              </div>

              {/* Health Check */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-4">Health Check</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Endpoint</label>
                    <input
                      type="text"
                      value={formData.healthCheck.endpoint}
                      onChange={(e) => updateFormData('healthCheck.endpoint', e.target.value)}
                      placeholder="/health"
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Interval (seconds)</label>
                    <input
                      type="number"
                      value={formData.healthCheck.interval}
                      onChange={(e) => updateFormData('healthCheck.interval', parseInt(e.target.value))}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Timeout (ms)</label>
                    <input
                      type="number"
                      value={formData.healthCheck.timeout}
                      onChange={(e) => updateFormData('healthCheck.timeout', parseInt(e.target.value))}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Compliance Settings */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-4">Compliance Settings</h4>
                <div className="space-y-4">
                  <div className="flex items-center space-x-6">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.compliance.respectsRobotsTxt}
                        onChange={(e) => updateFormData('compliance.respectsRobotsTxt', e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Respects robots.txt</span>
                    </label>

                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.compliance.hasTermsOfService}
                        onChange={(e) => updateFormData('compliance.hasTermsOfService', e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Has terms of service</span>
                    </label>

                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.compliance.requiresAttribution}
                        onChange={(e) => updateFormData('compliance.requiresAttribution', e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Requires attribution</span>
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Privacy Policy URL</label>
                    <input
                      type="url"
                      value={formData.compliance.privacyPolicyUrl}
                      onChange={(e) => updateFormData('compliance.privacyPolicyUrl', e.target.value)}
                      placeholder="https://example.com/privacy"
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Compliance Notes</label>
                    <textarea
                      value={formData.compliance.complianceNotes}
                      onChange={(e) => updateFormData('compliance.complianceNotes', e.target.value)}
                      rows={2}
                      placeholder="Additional compliance information or restrictions"
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Maintainer Information */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-4">Maintainer Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Name</label>
                    <input
                      type="text"
                      value={formData.metadata.maintainer.name}
                      onChange={(e) => updateFormData('metadata.maintainer.name', e.target.value)}
                      placeholder="Maintainer name"
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Contact</label>
                    <input
                      type="email"
                      value={formData.metadata.maintainer.contact}
                      onChange={(e) => updateFormData('metadata.maintainer.contact', e.target.value)}
                      placeholder="contact@example.com"
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Organization</label>
                    <input
                      type="text"
                      value={formData.metadata.maintainer.organization}
                      onChange={(e) => updateFormData('metadata.maintainer.organization', e.target.value)}
                      placeholder="Organization name"
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Data Sources List */}
      {!isEditing && (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Configured Data Sources</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              {dataSources.length} data sources configured
            </p>
          </div>
          
          <ul className="divide-y divide-gray-200">
            {dataSources.map((source) => (
              <li key={source.id} className="px-4 py-6 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center min-w-0 flex-1">
                    <div className="flex-shrink-0">
                      <Database className="h-6 w-6 text-blue-500" />
                    </div>
                    
                    <div className="ml-4 min-w-0 flex-1">
                      <div className="flex items-center space-x-3">
                        <p className="text-lg font-medium text-gray-900">
                          {source.name}
                        </p>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {source.type}
                        </span>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          Priority {source.priority}
                        </span>
                      </div>
                      
                      <div className="mt-2 flex items-center space-x-6 text-sm text-gray-500">
                        <span className="flex items-center">
                          <Globe className="h-4 w-4 mr-1" />
                          {source.baseUrl}
                        </span>
                        {source.apiKey && (
                          <span className="flex items-center">
                            <Key className="h-4 w-4 mr-1" />
                            API Key configured
                          </span>
                        )}
                        <span className="flex items-center">
                          <Clock className="h-4 w-4 mr-1" />
                          {source.timeout}ms timeout
                        </span>
                      </div>
                      
                      <div className="mt-2 text-sm text-gray-600">
                        {source.metadata.description}
                      </div>
                      
                      <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
                        <span>Rate: {source.rateLimit.requestsPerMinute}/min</span>
                        <span>Retries: {source.retryPolicy.maxAttempts}</span>
                        <span>Health check: every {source.healthCheck.interval}s</span>
                        {source.compliance.respectsRobotsTxt && (
                          <span className="flex items-center text-green-600">
                            <Shield className="h-3 w-3 mr-1" />
                            Compliant
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleEdit(source)}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </button>
                    
                    <button
                      onClick={() => handleDelete(source.id)}
                      className="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </button>
                  </div>
                </div>
              </li>
            ))}
            
            {dataSources.length === 0 && (
              <li className="px-4 py-12 text-center">
                <Database className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No data sources configured</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Get started by adding your first data source.
                </p>
                <div className="mt-6">
                  <button
                    onClick={handleAddNew}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Data Source
                  </button>
                </div>
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default DataSourceConfiguration;