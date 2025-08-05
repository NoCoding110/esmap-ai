/**
 * Data Lineage Visualization
 * Visual representation of data flow from source to output with traceability
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  GitBranch, 
  Database, 
  ArrowRight, 
  Filter, 
  Search,
  Download,
  Eye,
  Settings,
  Zap,
  FileText,
  BarChart3,
  RefreshCw,
  Info,
  Clock,
  Users,
  Tag
} from 'lucide-react';

const DataLineageVisualization = () => {
  const [lineageData, setLineageData] = useState({});
  const [selectedNode, setSelectedNode] = useState(null);
  const [viewMode, setViewMode] = useState('flow'); // 'flow', 'table', 'tree'
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    dataType: 'all',
    timeRange: '7d',
    status: 'all'
  });
  const [loading, setLoading] = useState(true);
  const svgRef = useRef(null);

  useEffect(() => {
    fetchLineageData();
  }, [filters]);

  const fetchLineageData = async () => {
    try {
      setLoading(true);
      
      // Mock lineage data - in real implementation, fetch from API
      const mockLineageData = {
        nodes: [
          // Data Sources
          {
            id: 'world-bank-api',
            type: 'source',
            name: 'World Bank API',
            category: 'external_api',
            status: 'active',
            lastUpdate: new Date(Date.now() - 2 * 60 * 60 * 1000),
            recordCount: 15680,
            dataTypes: ['energy_access', 'country_statistics'],
            owner: 'World Bank Group',
            description: 'Global development indicators and energy access data',
            x: 50,
            y: 100
          },
          {
            id: 'nasa-power-api',
            type: 'source',
            name: 'NASA POWER API',
            category: 'external_api',
            status: 'active',
            lastUpdate: new Date(Date.now() - 1 * 60 * 60 * 1000),
            recordCount: 8945,
            dataTypes: ['climate_data', 'weather_data'],
            owner: 'NASA',
            description: 'Satellite-based climate and weather data',
            x: 50,
            y: 200
          },
          {
            id: 'manual-upload',
            type: 'source',
            name: 'Manual Data Upload',
            category: 'manual_input',
            status: 'active',
            lastUpdate: new Date(Date.now() - 30 * 60 * 1000),
            recordCount: 3200,
            dataTypes: ['supplementary_data'],
            owner: 'ESMAP Team',
            description: 'Emergency and supplementary data uploads',
            x: 50,
            y: 300
          },
          
          // Processing Stages
          {
            id: 'data-validation',
            type: 'process',
            name: 'Data Validation',
            category: 'quality_control',
            status: 'running',
            lastUpdate: new Date(Date.now() - 5 * 60 * 1000),
            processedRecords: 27825,
            validRecords: 27234,
            errorRate: 2.1,
            owner: 'Data Quality Team',
            description: 'Validate data integrity and format compliance',
            x: 250,
            y: 150
          },
          {
            id: 'data-cleaning',
            type: 'process',
            name: 'Data Cleaning',
            category: 'transformation',
            status: 'running',
            lastUpdate: new Date(Date.now() - 3 * 60 * 1000),
            processedRecords: 27234,
            cleanedRecords: 26890,
            transformations: ['normalize_country_codes', 'standardize_dates', 'fill_missing_values'],
            owner: 'Data Engineering Team',
            description: 'Clean and standardize data formats',
            x: 450,
            y: 150
          },
          {
            id: 'data-enrichment',
            type: 'process',
            name: 'Data Enrichment',
            category: 'enhancement',
            status: 'running',  
            lastUpdate: new Date(Date.now() - 1 * 60 * 1000),
            processedRecords: 26890,
            enrichedRecords: 26890,
            enrichmentSources: ['geo_coordinates', 'population_data', 'economic_indicators'],
            owner: 'Analytics Team',
            description: 'Enrich data with additional context and metadata',
            x: 650,
            y: 150
          },
          
          // Storage and Outputs
          {
            id: 'data-warehouse',
            type: 'storage',
            name: 'Data Warehouse',
            category: 'primary_storage',
            status: 'active',
            lastUpdate: new Date(Date.now() - 1 * 60 * 1000),
            totalRecords: 2450000,
            currentRecords: 26890,
            storageSize: '2.8 TB',
            owner: 'Data Platform Team',
            description: 'Central data warehouse for processed data',
            x: 850,
            y: 100
          },
          {
            id: 'analytics-cache',
            type: 'storage',
            name: 'Analytics Cache',
            category: 'cache_storage',
            status: 'active',
            lastUpdate: new Date(Date.now() - 30 * 1000),
            totalRecords: 85000,
            hitRate: 94.5,
            storageSize: '150 GB',
            owner: 'Analytics Team',
            description: 'High-performance cache for analytics queries',
            x: 850,
            y: 200
          },
          {
            id: 'energy-dashboard',
            type: 'output',
            name: 'Energy Access Dashboard',
            category: 'visualization',
            status: 'active',
            lastUpdate: new Date(Date.now() - 2 * 60 * 1000),
            users: 1250,
            queries: 8500,
            owner: 'Product Team',
            description: 'Interactive dashboard for energy access analytics',
            x: 1050,
            y: 50
          },
          {
            id: 'api-endpoints',
            type: 'output',
            name: 'Public API',
            category: 'api_service',
            status: 'active',
            lastUpdate: new Date(Date.now() - 1 * 60 * 1000),
            requests: 25000,
            consumers: 45,
            owner: 'API Team',
            description: 'RESTful API for external data access',
            x: 1050,
            y: 150
          },
          {
            id: 'reports',
            type: 'output',
            name: 'Automated Reports',
            category: 'reporting',
            status: 'active',
            lastUpdate: new Date(Date.now() - 4 * 60 * 60 * 1000),
            reports: 156,
            subscribers: 320,
            owner: 'Reporting Team',
            description: 'Scheduled reports and data exports',
            x: 1050,
            y: 250
          }
        ],
        edges: [
          // Source to Processing
          { id: 'e1', source: 'world-bank-api', target: 'data-validation', records: 15680, dataTypes: ['energy_access', 'country_statistics'] },
          { id: 'e2', source: 'nasa-power-api', target: 'data-validation', records: 8945, dataTypes: ['climate_data', 'weather_data'] },
          { id: 'e3', source: 'manual-upload', target: 'data-validation', records: 3200, dataTypes: ['supplementary_data'] },
          
          // Processing Chain
          { id: 'e4', source: 'data-validation', target: 'data-cleaning', records: 27234, dataTypes: ['validated_data'] },
          { id: 'e5', source: 'data-cleaning', target: 'data-enrichment', records: 26890, dataTypes: ['cleaned_data'] },
          
          // Processing to Storage
          { id: 'e6', source: 'data-enrichment', target: 'data-warehouse', records: 26890, dataTypes: ['enriched_data'] },
          { id: 'e7', source: 'data-enrichment', target: 'analytics-cache', records: 26890, dataTypes: ['enriched_data'] },
          
          // Storage to Outputs
          { id: 'e8', source: 'data-warehouse', target: 'energy-dashboard', records: 12500, dataTypes: ['dashboard_data'] },
          { id: 'e9', source: 'data-warehouse', target: 'api-endpoints', records: 18000, dataTypes: ['api_data'] },
          { id: 'e10', source: 'data-warehouse', target: 'reports', records: 8900, dataTypes: ['report_data'] },
          { id: 'e11', source: 'analytics-cache', target: 'energy-dashboard', records: 15000, dataTypes: ['cached_data'] }
        ],
        metadata: {
          totalSources: 3,
          totalProcesses: 3,
          totalOutputs: 3,
          totalRecords: 27825,
          lastRefresh: new Date()
        }
      };

      setLineageData(mockLineageData);
    } catch (error) {
      console.error('Failed to fetch lineage data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getNodeIcon = (type, category) => {
    switch (type) {
      case 'source':
        return category === 'external_api' ? <Database className="h-4 w-4" /> : <FileText className="h-4 w-4" />;
      case 'process':
        return <Zap className="h-4 w-4" />;
      case 'storage':
        return <Database className="h-4 w-4" />;
      case 'output':
        return category === 'visualization' ? <BarChart3 className="h-4 w-4" /> : <FileText className="h-4 w-4" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  const getNodeColor = (type, status) => {
    if (status !== 'active' && status !== 'running') {
      return 'border-red-300 bg-red-50 text-red-700';
    }
    
    switch (type) {
      case 'source':
        return 'border-blue-300 bg-blue-50 text-blue-700';
      case 'process':
        return 'border-yellow-300 bg-yellow-50 text-yellow-700';
      case 'storage':
        return 'border-green-300 bg-green-50 text-green-700';
      case 'output':
        return 'border-purple-300 bg-purple-50 text-purple-700';
      default:
        return 'border-gray-300 bg-gray-50 text-gray-700';
    }
  };

  const formatNumber = (num) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const filteredNodes = lineageData.nodes?.filter(node => {
    if (searchTerm && !node.name.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    if (filters.status !== 'all' && node.status !== filters.status) {
      return false;
    }
    return true;
  }) || [];

  const filteredEdges = lineageData.edges?.filter(edge => {
    const sourceNode = filteredNodes.find(n => n.id === edge.source);
    const targetNode = filteredNodes.find(n => n.id === edge.target);
    return sourceNode && targetNode;
  }) || [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <GitBranch className="h-8 w-8 animate-pulse text-blue-500" />
        <span className="ml-2 text-gray-600">Loading data lineage...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-medium text-gray-900">Data Lineage</h2>
          <p className="text-sm text-gray-500">
            Trace data flow from sources to outputs with full traceability
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value)}
            className="block w-32 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
          >
            <option value="flow">Flow View</option>
            <option value="table">Table View</option>
            <option value="tree">Tree View</option>
          </select>
          
          <button
            onClick={fetchLineageData}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white shadow rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search nodes..."
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
              <option value="active">Active</option>
              <option value="running">Running</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data Type</label>
            <select
              value={filters.dataType}
              onChange={(e) => setFilters(prev => ({ ...prev, dataType: e.target.value }))}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            >
              <option value="all">All Types</option>
              <option value="energy_access">Energy Access</option>
              <option value="climate_data">Climate Data</option>
              <option value="country_statistics">Country Statistics</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Time Range</label>
            <select
              value={filters.timeRange}
              onChange={(e) => setFilters(prev => ({ ...prev, timeRange: e.target.value }))}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            >
              <option value="1d">Last 24 hours</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Database className="h-6 w-6 text-blue-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Data Sources</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {lineageData.metadata?.totalSources || 0}
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
                <Zap className="h-6 w-6 text-yellow-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Processes</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {lineageData.metadata?.totalProcesses || 0}
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
                <BarChart3 className="h-6 w-6 text-purple-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Outputs</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {lineageData.metadata?.totalOutputs || 0}
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
                <FileText className="h-6 w-6 text-green-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Records</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {formatNumber(lineageData.metadata?.totalRecords || 0)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lineage Visualization */}
      {viewMode === 'flow' && (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Data Flow Diagram</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Visual representation of data flow from sources to outputs
            </p>
          </div>
          
          <div className="p-6">
            <div className="relative overflow-x-auto">
              <svg
                ref={svgRef}
                width="1100"
                height="350"
                className="border border-gray-200 rounded-lg bg-gray-50"
              >
                {/* Draw edges first */}
                {filteredEdges.map((edge) => {
                  const sourceNode = filteredNodes.find(n => n.id === edge.source);
                  const targetNode = filteredNodes.find(n => n.id === edge.target);
                  
                  if (!sourceNode || !targetNode) return null;
                  
                  return (
                    <g key={edge.id}>
                      <line
                        x1={sourceNode.x + 80}
                        y1={sourceNode.y + 30}
                        x2={targetNode.x}
                        y2={targetNode.y + 30}
                        stroke="#9CA3AF"
                        strokeWidth="2"
                        markerEnd="url(#arrowhead)"
                      />
                      <text
                        x={(sourceNode.x + targetNode.x) / 2 + 40}
                        y={(sourceNode.y + targetNode.y) / 2 + 25}
                        fill="#6B7280"
                        fontSize="10"
                        textAnchor="middle"
                      >
                        {formatNumber(edge.records)}
                      </text>
                    </g>
                  );
                })}
                
                {/* Arrow marker definition */}
                <defs>
                  <marker
                    id="arrowhead"
                    markerWidth="10"
                    markerHeight="7"
                    refX="9"
                    refY="3.5"
                    orient="auto"
                  >
                    <polygon
                      points="0 0, 10 3.5, 0 7"
                      fill="#9CA3AF"
                    />
                  </marker>
                </defs>
                
                {/* Draw nodes */}
                {filteredNodes.map((node) => (
                  <g key={node.id}>
                    <rect
                      x={node.x}
                      y={node.y}
                      width="160"
                      height="60"
                      rx="8"
                      className={`cursor-pointer ${getNodeColor(node.type, node.status)} border-2`}
                      onClick={() => setSelectedNode(selectedNode === node.id ? null : node.id)}
                    />
                    <text
                      x={node.x + 80}
                      y={node.y + 20}
                      fill="currentColor"
                      fontSize="12"
                      fontWeight="600"
                      textAnchor="middle"
                    >
                      {node.name.length > 18 ? `${node.name.substring(0, 15)}...` : node.name}
                    </text>
                    <text
                      x={node.x + 80}
                      y={node.y + 35}
                      fill="currentColor"
                      fontSize="10"
                      textAnchor="middle"
                    >
                      {node.type}
                    </text>
                    <text
                      x={node.x + 80}
                      y={node.y + 50}
                      fill="currentColor"
                      fontSize="9"
                      textAnchor="middle"
                    >
                      {node.recordCount ? formatNumber(node.recordCount) + ' records' : node.status}
                    </text>
                  </g>
                ))}
              </svg>
            </div>
          </div>
        </div>
      )}

      {/* Table View */}
      {viewMode === 'table' && (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Data Lineage Table</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Detailed view of all nodes in the data pipeline
            </p>
          </div>
          
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Records
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Update
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Owner
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredNodes.map((node) => (
                <tr key={node.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        {getNodeIcon(node.type, node.category)}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{node.name}</div>
                        <div className="text-sm text-gray-500">{node.category}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="capitalize text-sm text-gray-900">{node.type}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getNodeColor(node.type, node.status)}`}>
                      {node.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {node.recordCount ? formatNumber(node.recordCount) : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {node.lastUpdate.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {node.owner}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => setSelectedNode(selectedNode === node.id ? null : node.id)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Node Details Panel */}
      {selectedNode && (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Node Details</h3>
              <button
                onClick={() => setSelectedNode(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
          </div>
          
          <div className="px-4 py-5 sm:p-6">
            {(() => {
              const node = filteredNodes.find(n => n.id === selectedNode);
              if (!node) return null;
              
              return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">Basic Information</h4>
                      <dl className="mt-2 space-y-2">
                        <div className="flex justify-between">
                          <dt className="text-sm text-gray-500">Name</dt>
                          <dd className="text-sm font-medium text-gray-900">{node.name}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm text-gray-500">Type</dt>
                          <dd className="text-sm text-gray-900 capitalize">{node.type}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm text-gray-500">Category</dt>
                          <dd className="text-sm text-gray-900">{node.category}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm text-gray-500">Status</dt>
                          <dd>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getNodeColor(node.type, node.status)}`}>
                              {node.status}
                            </span>
                          </dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-sm text-gray-500">Owner</dt>
                          <dd className="text-sm text-gray-900">{node.owner}</dd>
                        </div>
                      </dl>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">Metrics</h4>
                      <dl className="mt-2 space-y-2">
                        {node.recordCount && (
                          <div className="flex justify-between">
                            <dt className="text-sm text-gray-500">Records</dt>
                            <dd className="text-sm font-medium text-gray-900">{formatNumber(node.recordCount)}</dd>
                          </div>
                        )}
                        {node.validRecords && (
                          <div className="flex justify-between">
                            <dt className="text-sm text-gray-500">Valid Records</dt>
                            <dd className="text-sm text-gray-900">{formatNumber(node.validRecords)}</dd>
                          </div>
                        )}
                        {node.errorRate && (
                          <div className="flex justify-between">
                            <dt className="text-sm text-gray-500">Error Rate</dt>
                            <dd className="text-sm text-gray-900">{node.errorRate}%</dd>
                          </div>
                        )}
                        {node.storageSize && (
                          <div className="flex justify-between">
                            <dt className="text-sm text-gray-500">Storage Size</dt>
                            <dd className="text-sm text-gray-900">{node.storageSize}</dd>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <dt className="text-sm text-gray-500">Last Update</dt>
                          <dd className="text-sm text-gray-900">{node.lastUpdate.toLocaleString()}</dd>
                        </div>
                      </dl>
                    </div>
                  </div>
                  
                  <div className="md:col-span-2">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Description</h4>
                    <p className="text-sm text-gray-600">{node.description}</p>
                    
                    {node.dataTypes && (
                      <div className="mt-4">
                        <h4 className="text-sm font-medium text-gray-900 mb-2">Data Types</h4>
                        <div className="flex flex-wrap gap-2">
                          {node.dataTypes.map((type, index) => (
                            <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {type}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {node.transformations && (
                      <div className="mt-4">
                        <h4 className="text-sm font-medium text-gray-900 mb-2">Transformations</h4>
                        <div className="flex flex-wrap gap-2">
                          {node.transformations.map((transform, index) => (
                            <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              {transform}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

export default DataLineageVisualization;