/**
 * Data Validation Results Display
 * Shows validation results with error details and resolution options
 */

import React, { useState, useEffect } from 'react';
import { 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Info, 
  RefreshCw,
  Download,
  Filter,
  Search,
  Calendar,
  FileText,
  Bug,
  Wrench,
  AlertCircle
} from 'lucide-react';

const DataValidationResults = () => {
  const [validationResults, setValidationResults] = useState([]);
  const [filteredResults, setFilteredResults] = useState([]);
  const [filters, setFilters] = useState({
    status: 'all',
    severity: 'all',
    source: 'all',
    dateRange: '7d'
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedResult, setSelectedResult] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchValidationResults();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [validationResults, filters, searchTerm]);

  const fetchValidationResults = async () => {
    try {
      setLoading(true);
      
      // Mock validation results data - in real implementation, fetch from API
      const mockResults = [
        {
          id: 'val-001',
          timestamp: new Date(Date.now() - 30 * 60 * 1000), // 30 min ago
          source: 'World Bank API',
          sourceId: 'world-bank-api',
          dataType: 'energy_access',
          status: 'failed',
          totalRecords: 15680,
          validRecords: 15425,
          invalidRecords: 255,
          errors: [
            {
              type: 'data_type_mismatch',
              severity: 'high',
              field: 'population',
              message: 'Expected numeric value, found string "N/A" in 45 records',
              affectedRecords: 45,
              sampleValues: ['N/A', 'not available', 'unknown'],
              suggestion: 'Convert string values to null or provide default numeric values',
              autoFixable: true
            },
            {
              type: 'missing_required_field',
              severity: 'critical',
              field: 'country_code',
              message: 'Country code is missing in 120 records',
              affectedRecords: 120,
              suggestion: 'Map country names to ISO country codes using lookup table',
              autoFixable: false
            },
            {
              type: 'range_violation',
              severity: 'medium',
              field: 'access_rate',
              message: 'Access rate values outside valid range (0-100) in 90 records',
              affectedRecords: 90,
              sampleValues: [105.2, 112.8, -5.3],
              suggestion: 'Clamp values to valid range or mark as outliers for review',
              autoFixable: true
            }
          ],
          warnings: [
            {
              type: 'potential_duplicate',
              severity: 'low',
              message: '12 potential duplicate records detected based on country and year',
              affectedRecords: 12,
              suggestion: 'Review duplicate detection rules and merge or remove duplicates'
            },
            {
              type: 'data_freshness',
              severity: 'medium',
              message: 'Data appears to be 6 months old, may need refresh',
              suggestion: 'Check for more recent data availability'
            }
          ],
          performance: {
            validationTime: 2.3,
            throughput: 6800,
            memoryUsage: 45.2
          }
        },
        {
          id: 'val-002',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
          source: 'NASA POWER API',
          sourceId: 'nasa-power-api',
          dataType: 'climate_data',
          status: 'passed',
          totalRecords: 8945,
          validRecords: 8943,
          invalidRecords: 2,
          errors: [],
          warnings: [
            {
              type: 'minor_format_issue',
              severity: 'low',
              message: 'Date format inconsistency in 2 records (using MM/DD/YYYY instead of YYYY-MM-DD)',
              affectedRecords: 2,
              suggestion: 'Standardize date format across all records'
            }
          ],
          performance: {
            validationTime: 1.8,
            throughput: 4969,
            memoryUsage: 32.1
          }
        },
        {
          id: 'val-003',
          timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
          source: 'IEA Energy Data',
          sourceId: 'iea-data',
          dataType: 'energy_statistics',
          status: 'warning',
          totalRecords: 12340,
          validRecords: 12180,
          invalidRecords: 160,
          errors: [
            {
              type: 'encoding_issue',
              severity: 'medium',
              field: 'region_name',
              message: 'Character encoding issues detected in region names',
              affectedRecords: 85,
              sampleValues: ['L�tin America', 'M�ddle East', 'Sub-Sah�ran Africa'],
              suggestion: 'Re-encode data using UTF-8 or replace special characters',
              autoFixable: true
            }
          ],
          warnings: [
            {
              type: 'completeness_issue',
              severity: 'medium',
              message: '75 records missing energy consumption data for recent years',
              affectedRecords: 75,
              suggestion: 'Flag incomplete records and attempt data backfill'
            }
          ],
          performance: {
            validationTime: 3.1,
            throughput: 3980,
            memoryUsage: 58.7
          }
        }
      ];

      setValidationResults(mockResults);
    } catch (error) {
      console.error('Failed to fetch validation results:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...validationResults];

    // Filter by status
    if (filters.status !== 'all') {
      filtered = filtered.filter(result => result.status === filters.status);
    }

    // Filter by severity (check if any errors/warnings match severity)
    if (filters.severity !== 'all') {
      filtered = filtered.filter(result => 
        result.errors.some(error => error.severity === filters.severity) ||
        result.warnings.some(warning => warning.severity === filters.severity)
      );
    }

    // Filter by source
    if (filters.source !== 'all') {
      filtered = filtered.filter(result => result.sourceId === filters.source);
    }

    // Filter by date range
    const now = new Date();
    const dateThreshold = new Date(now.getTime() - getDaysFromRange(filters.dateRange) * 24 * 60 * 60 * 1000);
    filtered = filtered.filter(result => new Date(result.timestamp) >= dateThreshold);

    // Apply search term
    if (searchTerm) {
      filtered = filtered.filter(result =>
        result.source.toLowerCase().includes(searchTerm.toLowerCase()) ||
        result.dataType.toLowerCase().includes(searchTerm.toLowerCase()) ||
        result.errors.some(error => error.message.toLowerCase().includes(searchTerm.toLowerCase())) ||
        result.warnings.some(warning => warning.message.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    setFilteredResults(filtered);
  };

  const getDaysFromRange = (range) => {
    switch (range) {
      case '1d': return 1;
      case '7d': return 7;
      case '30d': return 30;
      case '90d': return 90;
      default: return 7;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'passed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Info className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'passed':
        return 'text-green-600 bg-green-100';
      case 'warning':
        return 'text-yellow-600 bg-yellow-100';
      case 'failed':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical':
        return 'text-red-700 bg-red-100 border-red-200';
      case 'high':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const handleAutoFix = async (resultId, errorIndex) => {
    // Mock auto-fix functionality
    console.log(`Auto-fixing error ${errorIndex} in result ${resultId}`);
    alert('Auto-fix feature would be implemented here');
  };

  const handleExportResults = () => {
    const exportData = filteredResults.map(result => ({
      timestamp: result.timestamp,
      source: result.source,
      status: result.status,
      totalRecords: result.totalRecords,
      validRecords: result.validRecords,
      invalidRecords: result.invalidRecords,
      errorCount: result.errors.length,
      warningCount: result.warnings.length
    }));

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `validation-results-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
        <span className="ml-2 text-gray-600">Loading validation results...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-medium text-gray-900">Data Validation Results</h2>
          <p className="text-sm text-gray-500">
            Review validation results and resolve data quality issues
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={fetchValidationResults}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
          
          <button
            onClick={handleExportResults}
            className="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white shadow rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search results..."
                className="pl-10 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            >
              <option value="all">All Status</option>
              <option value="passed">Passed</option>
              <option value="warning">Warning</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
            <select
              value={filters.severity}
              onChange={(e) => setFilters(prev => ({ ...prev, severity: e.target.value }))}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            >
              <option value="all">All Severity</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
            <select
              value={filters.source}
              onChange={(e) => setFilters(prev => ({ ...prev, source: e.target.value }))}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            >
              <option value="all">All Sources</option>
              <option value="world-bank-api">World Bank API</option>
              <option value="nasa-power-api">NASA POWER API</option>
              <option value="iea-data">IEA Energy Data</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Time Range</label>
            <select
              value={filters.dateRange}
              onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value }))}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            >
              <option value="1d">Last 24 hours</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircle className="h-6 w-6 text-green-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Passed</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {filteredResults.filter(r => r.status === 'passed').length}
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
                <AlertTriangle className="h-6 w-6 text-yellow-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Warnings</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {filteredResults.filter(r => r.status === 'warning').length}
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
                <XCircle className="h-6 w-6 text-red-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Failed</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {filteredResults.filter(r => r.status === 'failed').length}
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
                <FileText className="h-6 w-6 text-blue-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Results</dt>
                  <dd className="text-lg font-medium text-gray-900">{filteredResults.length}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Validation Results List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {filteredResults.map((result) => (
            <li key={result.id} className="px-4 py-6 sm:px-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center min-w-0 flex-1">
                  <div className="flex-shrink-0">
                    {getStatusIcon(result.status)}
                  </div>
                  
                  <div className="ml-4 min-w-0 flex-1">
                    <div className="flex items-center space-x-3">
                      <p className="text-lg font-medium text-gray-900">
                        {result.source} - {result.dataType}
                      </p>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(result.status)}`}>
                        {result.status}
                      </span>
                    </div>
                    
                    <div className="mt-2 flex items-center space-x-6 text-sm text-gray-500">
                      <span>{result.totalRecords.toLocaleString()} total records</span>
                      <span className="text-green-600">{result.validRecords.toLocaleString()} valid</span>
                      {result.invalidRecords > 0 && (
                        <span className="text-red-600">{result.invalidRecords.toLocaleString()} invalid</span>
                      )}
                      <span>{result.errors.length} errors</span>
                      <span>{result.warnings.length} warnings</span>
                      <span>{result.timestamp.toLocaleString()}</span>
                    </div>

                    {/* Performance Metrics */}
                    <div className="mt-2 flex items-center space-x-6 text-xs text-gray-400">
                      <span>Validation: {result.performance.validationTime}s</span>
                      <span>Throughput: {result.performance.throughput.toLocaleString()} rec/s</span>
                      <span>Memory: {result.performance.memoryUsage}MB</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setSelectedResult(selectedResult === result.id ? null : result.id)}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    {selectedResult === result.id ? 'Hide Details' : 'Show Details'}
                  </button>
                </div>
              </div>

              {/* Detailed Results */}
              {selectedResult === result.id && (
                <div className="mt-6 pl-9">
                  {/* Errors */}
                  {result.errors.length > 0 && (
                    <div className="mb-6">
                      <h4 className="text-md font-medium text-gray-900 mb-3">
                        Errors ({result.errors.length})
                      </h4>
                      <div className="space-y-3">
                        {result.errors.map((error, index) => (
                          <div key={index} className={`border rounded-lg p-4 ${getSeverityColor(error.severity)}`}>
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-2">
                                  <Bug className="h-4 w-4" />
                                  <span className="font-medium capitalize">{error.type.replace('_', ' ')}</span>
                                  {error.field && (
                                    <span className="text-sm bg-gray-100 px-2 py-1 rounded">
                                      Field: {error.field}
                                    </span>
                                  )}
                                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${getSeverityColor(error.severity)}`}>
                                    {error.severity}
                                  </span>
                                </div>
                                
                                <p className="text-sm mb-2">{error.message}</p>
                                
                                {error.sampleValues && (
                                  <div className="mb-2">
                                    <span className="text-xs font-medium">Sample values: </span>
                                    <span className="text-xs font-mono bg-gray-100 px-1 rounded">
                                      {error.sampleValues.join(', ')}
                                    </span>
                                  </div>
                                )}
                                
                                <div className="text-xs text-gray-600 mb-2">
                                  Affected: {error.affectedRecords.toLocaleString()} records
                                </div>
                                
                                <div className="text-sm">
                                  <span className="font-medium">Suggestion:</span> {error.suggestion}
                                </div>
                              </div>
                              
                              {error.autoFixable && (
                                <button
                                  onClick={() => handleAutoFix(result.id, index)}
                                  className="ml-4 inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-white bg-blue-600 hover:bg-blue-700"
                                >
                                  <Wrench className="h-3 w-3 mr-1" />
                                  Auto Fix
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Warnings */}
                  {result.warnings.length > 0 && (
                    <div>
                      <h4 className="text-md font-medium text-gray-900 mb-3">
                        Warnings ({result.warnings.length})
                      </h4>
                      <div className="space-y-3">
                        {result.warnings.map((warning, index) => (
                          <div key={index} className={`border rounded-lg p-4 ${getSeverityColor(warning.severity)}`}>
                            <div className="flex items-start space-x-2">
                              <AlertCircle className="h-4 w-4 mt-0.5" />
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-2">
                                  <span className="font-medium capitalize">{warning.type.replace('_', ' ')}</span>
                                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${getSeverityColor(warning.severity)}`}>
                                    {warning.severity}
                                  </span>
                                </div>
                                
                                <p className="text-sm mb-2">{warning.message}</p>
                                
                                {warning.affectedRecords && (
                                  <div className="text-xs text-gray-600 mb-2">
                                    Affected: {warning.affectedRecords.toLocaleString()} records
                                  </div>
                                )}
                                
                                <div className="text-sm">
                                  <span className="font-medium">Suggestion:</span> {warning.suggestion}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </li>
          ))}
          
          {filteredResults.length === 0 && (
            <li className="px-4 py-12 text-center">
              <CheckCircle className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No validation results found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm || filters.status !== 'all' || filters.severity !== 'all' || filters.source !== 'all'
                  ? 'Try adjusting your filters or search terms.'
                  : 'No validation results available for the selected time range.'
                }
              </p>
            </li>
          )}
        </ul>
      </div>
    </div>
  );
};

export default DataValidationResults;