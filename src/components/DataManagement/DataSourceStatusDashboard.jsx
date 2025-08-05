/**
 * Data Source Status Dashboard
 * Real-time monitoring of data source availability and health
 */

import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  AlertCircle, 
  CheckCircle, 
  XCircle, 
  Clock,
  Zap,
  Database,
  Wifi,
  WifiOff,
  RefreshCw,
  TrendingUp,
  TrendingDown
} from 'lucide-react';

const DataSourceStatusDashboard = () => {
  const [dataSources, setDataSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch data sources status
  useEffect(() => {
    const fetchDataSourcesStatus = async () => {
      try {
        setLoading(true);
        const [sourcesResponse, reliabilityResponse, circuitResponse] = await Promise.all([
          fetch('/api/v1/resilience/sources'),
          fetch('/api/v1/resilience/reliability'),
          fetch('/api/v1/resilience/circuit-breakers')
        ]);

        const sourcesData = await sourcesResponse.json();
        const reliabilityData = await reliabilityResponse.json();
        const circuitData = await circuitResponse.json();

        if (sourcesData.success && reliabilityData.success && circuitData.success) {
          const sources = sourcesData.data.sources.map(source => {
            const reliability = reliabilityData.data.metrics[source.id] || {};
            const circuitState = circuitData.data.states.find(s => s.sourceId === source.id);
            
            return {
              ...source,
              reliability: reliability.metrics || {},
              circuitState: circuitState?.state || 'closed',
              lastHealthCheck: reliability.lastHealthCheck,
              responseTime: reliability.metrics?.responseTime || 0,
              uptime: reliability.metrics?.uptime || 0,
              errorRate: reliability.metrics?.errorRate || 0
            };
          });

          setDataSources(sources);
          setLastUpdated(new Date());
        }
      } catch (error) {
        console.error('Failed to fetch data sources status:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDataSourcesStatus();
    
    let interval;
    if (autoRefresh) {
      interval = setInterval(fetchDataSourcesStatus, 15000); // Update every 15 seconds
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const getStatusIcon = (source) => {
    if (source.circuitState === 'open') {
      return <XCircle className="h-5 w-5 text-red-500" />;
    }
    if (source.circuitState === 'half_open') {
      return <AlertCircle className="h-5 w-5 text-yellow-500" />;
    }
    if (source.uptime >= 95) {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    }
    return <AlertCircle className="h-5 w-5 text-yellow-500" />;
  };

  const getStatusText = (source) => {
    if (source.circuitState === 'open') return 'Offline';
    if (source.circuitState === 'half_open') return 'Recovery';
    if (source.uptime >= 95) return 'Online';
    return 'Degraded';
  };

  const getStatusColor = (source) => {
    if (source.circuitState === 'open') return 'text-red-600 bg-red-50';
    if (source.circuitState === 'half_open') return 'text-yellow-600 bg-yellow-50';
    if (source.uptime >= 95) return 'text-green-600 bg-green-50';
    return 'text-yellow-600 bg-yellow-50';
  };

  const getPriorityBadge = (priority) => {
    const colors = {
      1: 'bg-red-100 text-red-800',
      2: 'bg-yellow-100 text-yellow-800',
      3: 'bg-blue-100 text-blue-800',
      4: 'bg-gray-100 text-gray-800',
      5: 'bg-gray-100 text-gray-800'
    };
    
    const labels = {
      1: 'Critical',
      2: 'High',
      3: 'Medium',
      4: 'Low',
      5: 'Lowest'
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[priority] || colors[5]}`}>
        {labels[priority] || 'Unknown'}
      </span>
    );
  };

  const formatResponseTime = (ms) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatUptime = (uptime) => {
    return `${uptime.toFixed(1)}%`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
        <span className="ml-2 text-gray-600">Loading data sources...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-medium text-gray-900">Data Source Status</h2>
          <p className="text-sm text-gray-500">
            Real-time monitoring of {dataSources.length} data sources
            {lastUpdated && (
              <span className="ml-2">
                • Last updated: {lastUpdated.toLocaleTimeString()}
              </span>
            )}
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">Auto-refresh</span>
          </label>
          
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Status Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Database className="h-6 w-6 text-blue-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Sources</dt>
                  <dd className="text-lg font-medium text-gray-900">{dataSources.length}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircle className="h-6 w-6 text-green-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Online</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {dataSources.filter(s => s.circuitState === 'closed' && s.uptime >= 95).length}
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
                <AlertCircle className="h-6 w-6 text-yellow-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Degraded</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {dataSources.filter(s => s.circuitState === 'half_open' || (s.uptime < 95 && s.uptime > 0)).length}
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
                  <dt className="text-sm font-medium text-gray-500 truncate">Offline</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {dataSources.filter(s => s.circuitState === 'open').length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Data Sources Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Data Sources</h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Detailed status and performance metrics for each data source
          </p>
        </div>
        
        <ul className="divide-y divide-gray-200">
          {dataSources.map((source) => (
            <li key={source.id} className="px-4 py-5 sm:px-6 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center min-w-0 flex-1">
                  <div className="flex-shrink-0">
                    {getStatusIcon(source)}
                  </div>
                  
                  <div className="ml-4 min-w-0 flex-1">
                    <div className="flex items-center space-x-3">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {source.name}
                      </p>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(source)}`}>
                        {getStatusText(source)}
                      </span>
                      {getPriorityBadge(source.priority)}
                    </div>
                    
                    <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                      <span className="flex items-center">
                        <Database className="h-4 w-4 mr-1" />
                        {source.type}
                      </span>
                      <span className="flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        {formatResponseTime(source.responseTime)}
                      </span>
                      <span className="flex items-center">
                        <Activity className="h-4 w-4 mr-1" />
                        {formatUptime(source.uptime)} uptime
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  {/* Quality Score */}
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">
                      {source.metadata?.quality?.overall ? 
                        `${(source.metadata.quality.overall * 100).toFixed(0)}%` : 
                        'N/A'
                      }
                    </div>
                    <div className="text-xs text-gray-500">Quality</div>
                  </div>
                  
                  {/* Error Rate */}
                  <div className="text-right">
                    <div className={`text-sm font-medium ${source.errorRate > 5 ? 'text-red-600' : 'text-gray-900'}`}>
                      {source.errorRate ? `${source.errorRate.toFixed(1)}%` : '0%'}
                    </div>
                    <div className="text-xs text-gray-500">Error Rate</div>
                  </div>
                  
                  {/* Connection Status */}
                  <div className="flex items-center">
                    {source.circuitState === 'open' ? (
                      <WifiOff className="h-5 w-5 text-red-500" />
                    ) : (
                      <Wifi className="h-5 w-5 text-green-500" />
                    )}
                  </div>
                </div>
              </div>
              
              {/* Additional Details */}
              {source.lastHealthCheck && (
                <div className="mt-3 px-8">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>
                      Last health check: {new Date(source.lastHealthCheck).toLocaleString()}
                    </span>
                    <span>
                      Base URL: {source.baseUrl}
                    </span>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
        
        {dataSources.length === 0 && (
          <div className="text-center py-12">
            <Database className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No data sources found</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by configuring your first data source.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DataSourceStatusDashboard;