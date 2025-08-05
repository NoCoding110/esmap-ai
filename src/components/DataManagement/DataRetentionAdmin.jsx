/**
 * Data Retention Administration Interface
 * Manage data retention and archival policies
 */

import React, { useState, useEffect } from 'react';
import { 
  Archive, 
  Trash2, 
  Clock, 
  Shield, 
  Database,
  AlertTriangle,
  CheckCircle,
  Calendar,
  Settings,
  Download,
  Upload,
  HardDrive,
  Activity,
  BarChart3,
  FileText,
  Edit,
  Save,
  X
} from 'lucide-react';

const DataRetentionAdmin = () => {
  const [retentionPolicies, setRetentionPolicies] = useState([]);
  const [archiveStats, setArchiveStats] = useState({});
  const [isEditing, setIsEditing] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState(null);
  const [selectedPolicy, setSelectedPolicy] = useState(null);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    id: '',
    name: '',
    description: '',
    dataTypes: [],
    retentionPeriod: 365,
    retentionUnit: 'days',
    archivalAction: 'archive',
    archivalStorage: 'cold_storage',
    compressionEnabled: true,
    encryptionEnabled: true,
    automaticExecution: true,
    notificationRecipients: [],
    complianceRequirements: [],
    customRules: []
  });

  useEffect(() => {
    fetchRetentionData();
  }, []);

  const fetchRetentionData = async () => {
    try {
      setLoading(true);
      
      // Mock data - in real implementation, fetch from API
      const mockPolicies = [
        {
          id: 'policy-001',
          name: 'Raw Energy Data Retention',
          description: 'Retention policy for raw energy access and consumption data',
          dataTypes: ['energy_access', 'energy_consumption', 'raw_sensor_data'],
          retentionPeriod: 1095, // 3 years
          retentionUnit: 'days',
          archivalAction: 'archive',
          archivalStorage: 'cold_storage',
          compressionEnabled: true,
          encryptionEnabled: true,
          automaticExecution: true,
          status: 'active',
          lastExecuted: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
          nextExecution: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000), // 6 days from now
          recordsProcessed: 2450000,
          recordsArchived: 180000,
          recordsDeleted: 25000,
          storageFreed: '2.8 TB',
          complianceRequirements: ['GDPR', 'SOX'],
          notificationRecipients: ['admin@esmap.org', 'dpo@worldbank.org'],
          customRules: [
            { field: 'data_sensitivity', operator: 'equals', value: 'high', action: 'encrypt_before_archive' },
            { field: 'country_code', operator: 'in', value: ['EU'], action: 'apply_gdpr_deletion' }
          ]
        },
        {
          id: 'policy-002',
          name: 'Analytics Cache Cleanup',
          description: 'Regular cleanup of temporary analytics cache data',
          dataTypes: ['cache_data', 'temporary_results', 'session_data'],
          retentionPeriod: 30,
          retentionUnit: 'days',
          archivalAction: 'delete',
          archivalStorage: null,
          compressionEnabled: false,
          encryptionEnabled: false,
          automaticExecution: true,
          status: 'active',
          lastExecuted: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
          nextExecution: new Date(Date.now() + 22 * 60 * 60 * 1000), // 22 hours from now
          recordsProcessed: 85000,
          recordsArchived: 0,
          recordsDeleted: 85000,
          storageFreed: '45 GB',
          complianceRequirements: [],
          notificationRecipients: ['ops@esmap.org'],
          customRules: []
        },
        {
          id: 'policy-003',
          name: 'User Activity Logs',
          description: 'Retention of user activity and audit logs for compliance',
          dataTypes: ['audit_logs', 'user_activity', 'access_logs'],
          retentionPeriod: 2555, // 7 years
          retentionUnit: 'days',
          archivalAction: 'archive',
          archivalStorage: 'glacier',
          compressionEnabled: true,
          encryptionEnabled: true,
          automaticExecution: true,
          status: 'active',
          lastExecuted: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
          nextExecution: new Date(Date.now() + 23 * 24 * 60 * 60 * 1000), // 23 days from now
          recordsProcessed: 12000000,
          recordsArchived: 950000,
          recordsDeleted: 0,
          storageFreed: '0 GB',
          complianceRequirements: ['SOX', 'PCI-DSS', 'Internal Audit'],
          notificationRecipients: ['compliance@worldbank.org', 'audit@esmap.org'],
          customRules: [
            { field: 'log_level', operator: 'equals', value: 'error', action: 'retain_indefinitely' },
            { field: 'user_role', operator: 'equals', value: 'admin', action: 'extend_retention_7_years' }
          ]
        },
        {
          id: 'policy-004',
          name: 'Research Data Archival',
          description: 'Long-term archival of research datasets and publications',
          dataTypes: ['research_data', 'publications', 'study_results'],
          retentionPeriod: 3650, // 10 years
          retentionUnit: 'days',
          archivalAction: 'archive',
          archivalStorage: 'deep_archive',
          compressionEnabled: true,
          encryptionEnabled: true,
          automaticExecution: false,
          status: 'paused',
          lastExecuted: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // 90 days ago
          nextExecution: null,
          recordsProcessed: 450000,
          recordsArchived: 420000,
          recordsDeleted: 0,
          storageFreed: '0 GB',
          complianceRequirements: ['Academic Standards', 'FAIR Principles'],
          notificationRecipients: ['research@esmap.org'],
          customRules: [
            { field: 'publication_status', operator: 'equals', value: 'published', action: 'retain_indefinitely' }
          ]
        }
      ];

      const mockArchiveStats = {
        totalPolicies: 4,
        activePolicies: 3,
        pausedPolicies: 1,
        totalRecordsManaged: 15085000,
        totalRecordsArchived: 1550000,
        totalRecordsDeleted: 110000,
        totalStorageFreed: '2.845 TB',
        storageBreakdown: {
          hotStorage: '15.2 TB',
          coldStorage: '45.8 TB',
          glacier: '128.3 TB',
          deepArchive: '89.7 TB'
        },
        monthlyTrends: {
          recordsProcessed: [2100000, 2300000, 1950000, 2450000],
          storageFreed: [1.2, 1.8, 0.9, 2.8],
          complianceScore: [92, 94, 96, 98]
        }
      };

      setRetentionPolicies(mockPolicies);
      setArchiveStats(mockArchiveStats);
    } catch (error) {
      console.error('Failed to fetch retention data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (policy) => {
    setEditingPolicy(policy.id);
    setFormData({ ...policy });
    setIsEditing(true);
  };

  const handleSave = async () => {
    try {
      // Mock save - in real implementation, make API call
      const updatedPolicies = retentionPolicies.map(policy => 
        policy.id === editingPolicy ? { ...formData } : policy
      );
      
      if (!editingPolicy) {
        // New policy
        const newPolicy = {
          ...formData,
          id: `policy-${Date.now()}`,
          status: 'active',
          lastExecuted: null,
          nextExecution: new Date(Date.now() + 24 * 60 * 60 * 1000),
          recordsProcessed: 0,
          recordsArchived: 0,
          recordsDeleted: 0,
          storageFreed: '0 GB'
        };
        updatedPolicies.push(newPolicy);
      }
      
      setRetentionPolicies(updatedPolicies);
      setIsEditing(false);
      setEditingPolicy(null);
    } catch (error) {
      console.error('Failed to save policy:', error);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditingPolicy(null);
    setFormData({
      id: '',
      name: '',
      description: '',
      dataTypes: [],
      retentionPeriod: 365,
      retentionUnit: 'days',
      archivalAction: 'archive',
      archivalStorage: 'cold_storage',
      compressionEnabled: true,
      encryptionEnabled: true,
      automaticExecution: true,
      notificationRecipients: [],
      complianceRequirements: [],
      customRules: []
    });
  };

  const handleDelete = async (policyId) => {
    if (!confirm('Are you sure you want to delete this retention policy?')) {
      return;
    }
    
    const updatedPolicies = retentionPolicies.filter(policy => policy.id !== policyId);
    setRetentionPolicies(updatedPolicies);
  };

  const togglePolicyStatus = async (policyId) => {
    const updatedPolicies = retentionPolicies.map(policy => {
      if (policy.id === policyId) {
        return {
          ...policy,
          status: policy.status === 'active' ? 'paused' : 'active'
        };
      }
      return policy;
    });
    setRetentionPolicies(updatedPolicies);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'paused':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'error':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'text-green-600 bg-green-100';
      case 'paused':
        return 'text-yellow-600 bg-yellow-100';
      case 'error':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getActionIcon = (action) => {
    switch (action) {
      case 'archive':
        return <Archive className="h-4 w-4" />;
      case 'delete':
        return <Trash2 className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const updateFormData = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const formatBytes = (bytes) => {
    if (typeof bytes === 'string') return bytes;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat().format(num);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Archive className="h-8 w-8 animate-pulse text-blue-500" />
        <span className="ml-2 text-gray-600">Loading retention policies...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-medium text-gray-900">Data Retention Administration</h2>
          <p className="text-sm text-gray-500">
            Manage data retention and archival policies for compliance and optimization
          </p>
        </div>
        
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <Settings className="h-4 w-4 mr-2" />
            New Policy
          </button>
        )}
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Shield className="h-6 w-6 text-blue-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Active Policies</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {archiveStats.activePolicies}/{archiveStats.totalPolicies}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Database className="h-6 w-6 text-green-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Records Managed</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {formatNumber(archiveStats.totalRecordsManaged)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Archive className="h-6 w-6 text-purple-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Archived</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {formatNumber(archiveStats.totalRecordsArchived)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <HardDrive className="h-6 w-6 text-orange-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Storage Freed</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {archiveStats.totalStorageFreed}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Policy Form */}
      {isEditing && (
        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                {editingPolicy ? 'Edit Retention Policy' : 'Create Retention Policy'}
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

            <div className="space-y-6">
              {/* Basic Information */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-4">Basic Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Policy Name</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => updateFormData('name', e.target.value)}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Enter policy name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Archival Action</label>
                    <select
                      value={formData.archivalAction}
                      onChange={(e) => updateFormData('archivalAction', e.target.value)}
                      className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                    >
                      <option value="archive">Archive Data</option>
                      <option value="delete">Delete Data</option>
                      <option value="anonymize">Anonymize Data</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Description</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => updateFormData('description', e.target.value)}
                      rows={3}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Describe the purpose and scope of this retention policy"
                    />
                  </div>
                </div>
              </div>

              {/* Retention Settings */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-4">Retention Settings</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Retention Period</label>
                    <input
                      type="number"
                      value={formData.retentionPeriod}
                      onChange={(e) => updateFormData('retentionPeriod', parseInt(e.target.value))}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Time Unit</label>
                    <select
                      value={formData.retentionUnit}
                      onChange={(e) => updateFormData('retentionUnit', e.target.value)}
                      className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                    >
                      <option value="days">Days</option>
                      <option value="months">Months</option>
                      <option value="years">Years</option>
                    </select>
                  </div>

                  {formData.archivalAction === 'archive' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Archive Storage</label>
                      <select
                        value={formData.archivalStorage}
                        onChange={(e) => updateFormData('archivalStorage', e.target.value)}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                      >
                        <option value="cold_storage">Cold Storage</option>
                        <option value="glacier">Glacier</option>
                        <option value="deep_archive">Deep Archive</option>
                      </select>
                    </div>
                  )}
                </div>

                <div className="mt-4 space-y-3">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.compressionEnabled}
                      onChange={(e) => updateFormData('compressionEnabled', e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Enable compression</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.encryptionEnabled}
                      onChange={(e) => updateFormData('encryptionEnabled', e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Enable encryption</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.automaticExecution}
                      onChange={(e) => updateFormData('automaticExecution', e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Automatic execution</span>
                  </label>
                </div>
              </div>

              {/* Data Types */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-4">Data Types</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    'energy_access', 'energy_consumption', 'climate_data', 'weather_data',
                    'audit_logs', 'user_activity', 'cache_data', 'research_data',
                    'raw_sensor_data', 'processed_data', 'temporary_results', 'session_data'
                  ].map(dataType => (
                    <label key={dataType} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.dataTypes.includes(dataType)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            updateFormData('dataTypes', [...formData.dataTypes, dataType]);
                          } else {
                            updateFormData('dataTypes', formData.dataTypes.filter(dt => dt !== dataType));
                          }
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">{dataType.replace('_', ' ')}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Compliance Requirements */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-4">Compliance Requirements</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {['GDPR', 'SOX', 'PCI-DSS', 'HIPAA', 'Internal Audit', 'Academic Standards', 'FAIR Principles'].map(requirement => (
                    <label key={requirement} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.complianceRequirements.includes(requirement)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            updateFormData('complianceRequirements', [...formData.complianceRequirements, requirement]);
                          } else {
                            updateFormData('complianceRequirements', formData.complianceRequirements.filter(cr => cr !== requirement));
                          }
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">{requirement}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Retention Policies List */}
      {!isEditing && (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Retention Policies</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Manage data retention and archival policies
            </p>
          </div>
          
          <ul className="divide-y divide-gray-200">
            {retentionPolicies.map((policy) => (
              <li key={policy.id} className="px-4 py-6 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center min-w-0 flex-1">
                    <div className="flex-shrink-0">
                      {getStatusIcon(policy.status)}
                    </div>
                    
                    <div className="ml-4 min-w-0 flex-1">
                      <div className="flex items-center space-x-3">
                        <p className="text-lg font-medium text-gray-900">
                          {policy.name}
                        </p>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(policy.status)}`}>
                          {policy.status}
                        </span>
                        <div className="flex items-center text-sm text-gray-500">
                          {getActionIcon(policy.archivalAction)}
                          <span className="ml-1 capitalize">{policy.archivalAction}</span>
                        </div>
                      </div>
                      
                      <div className="mt-2 text-sm text-gray-600">
                        {policy.description}
                      </div>
                      
                      <div className="mt-2 flex items-center space-x-6 text-sm text-gray-500">
                        <span>Retention: {policy.retentionPeriod} {policy.retentionUnit}</span>
                        <span>Data Types: {policy.dataTypes.length}</span>
                        {policy.recordsProcessed > 0 && (
                          <span>Processed: {formatNumber(policy.recordsProcessed)} records</span>
                        )}
                        {policy.storageFreed !== '0 GB' && (
                          <span>Freed: {policy.storageFreed}</span>
                        )}
                      </div>

                      <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
                        {policy.lastExecuted && (
                          <span>Last: {policy.lastExecuted.toLocaleDateString()}</span>
                        )}
                        {policy.nextExecution && (
                          <span>Next: {policy.nextExecution.toLocaleDateString()}</span>
                        )}
                        {policy.complianceRequirements.length > 0 && (
                          <span>Compliance: {policy.complianceRequirements.join(', ')}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => togglePolicyStatus(policy.id)}
                      className={`inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-md ${
                        policy.status === 'active' 
                          ? 'text-yellow-700 bg-yellow-100 hover:bg-yellow-200' 
                          : 'text-green-700 bg-green-100 hover:bg-green-200'
                      }`}
                    >
                      {policy.status === 'active' ? (
                        <>
                          <Clock className="h-4 w-4 mr-2" />
                          Pause
                        </>
                      ) : (
                        <>
                          <Activity className="h-4 w-4 mr-2" />
                          Activate
                        </>
                      )}
                    </button>
                    
                    <button
                      onClick={() => handleEdit(policy)}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </button>
                    
                    <button
                      onClick={() => handleDelete(policy.id)}
                      className="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </button>
                  </div>
                </div>
              </li>
            ))}
            
            {retentionPolicies.length === 0 && (
              <li className="px-4 py-12 text-center">
                <Archive className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No retention policies</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Get started by creating your first data retention policy.
                </p>
                <div className="mt-6">
                  <button
                    onClick={() => setIsEditing(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Create Policy
                  </button>
                </div>
              </li>
            )}
          </ul>
        </div>
      )}

      {/* Storage Breakdown */}
      {!isEditing && (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Storage Distribution</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Current storage usage across different tiers
            </p>
          </div>
          
          <div className="px-4 py-5 sm:p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {Object.entries(archiveStats.storageBreakdown || {}).map(([tier, size]) => (
                <div key={tier} className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <HardDrive className="h-8 w-8 text-blue-500" />
                  </div>
                  <div className="text-lg font-semibold text-gray-900">{size}</div>
                  <div className="text-sm text-gray-500 capitalize">{tier.replace('_', ' ')}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataRetentionAdmin;