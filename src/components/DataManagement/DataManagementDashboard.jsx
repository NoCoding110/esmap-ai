/**
 * Data Management Dashboard - Main Interface
 * Real-time data source monitoring and management interface
 */

import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Database, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Settings,
  Upload,
  TrendingUp,
  Shield,
  GitBranch
} from 'lucide-react';

import DataSourceStatusDashboard from './DataSourceStatusDashboard';
import DataQualityMetrics from './DataQualityMetrics';
import DataIngestionMonitor from './DataIngestionMonitor';
import ManualDataUpload from './ManualDataUpload';
import DataSourceConfiguration from './DataSourceConfiguration';
import DataValidationResults from './DataValidationResults';
import BackupFailoverStatus from './BackupFailoverStatus';
import DataLineageVisualization from './DataLineageVisualization';
import DataRetentionAdmin from './DataRetentionAdmin';

const DataManagementDashboard = () => {
  const [activeTab, setActiveTab] = useState('status');
  const [systemOverview, setSystemOverview] = useState({
    totalSources: 0,
    healthySources: 0,
    criticalIssues: 0,
    dataQualityScore: 0,
    ingestionRate: 0,
    storageUsage: 0
  });

  // Fetch system overview data
  useEffect(() => {
    const fetchSystemOverview = async () => {
      try {
        const response = await fetch('/api/v1/resilience/status');
        const data = await response.json();
        
        if (data.success) {
          setSystemOverview({
            totalSources: data.data.totalSources,
            healthySources: data.data.healthySources,
            criticalIssues: data.data.complianceIssues + data.data.circuitBreakersOpen,
            dataQualityScore: data.data.overallHealthScore,
            ingestionRate: data.data.realTimeStreams,
            storageUsage: 75 // Placeholder
          });
        }
      } catch (error) {
        console.error('Failed to fetch system overview:', error);
      }
    };

    fetchSystemOverview();
    const interval = setInterval(fetchSystemOverview, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, []);

  const tabs = [
    { id: 'status', label: 'Data Sources', icon: Database, component: DataSourceStatusDashboard },
    { id: 'quality', label: 'Quality Metrics', icon: TrendingUp, component: DataQualityMetrics },
    { id: 'ingestion', label: 'Ingestion Monitor', icon: Activity, component: DataIngestionMonitor },
    { id: 'upload', label: 'Manual Upload', icon: Upload, component: ManualDataUpload },
    { id: 'config', label: 'Configuration', icon: Settings, component: DataSourceConfiguration },
    { id: 'validation', label: 'Validation Results', icon: CheckCircle, component: DataValidationResults },
    { id: 'backup', label: 'Backup & Failover', icon: Shield, component: BackupFailoverStatus },
    { id: 'lineage', label: 'Data Lineage', icon: GitBranch, component: DataLineageVisualization },
    { id: 'admin', label: 'Retention Admin', icon: AlertTriangle, component: DataRetentionAdmin }
  ];

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component || DataSourceStatusDashboard;

  const getHealthStatusColor = (healthy, total) => {
    const ratio = healthy / total;
    if (ratio >= 0.9) return 'text-green-600';
    if (ratio >= 0.7) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getQualityScoreColor = (score) => {
    if (score >= 0.9) return 'text-green-600';
    if (score >= 0.7) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Data Management</h1>
              <p className="text-sm text-gray-500">Monitor and manage ESMAP AI data sources</p>
            </div>
            
            {/* System Overview Cards */}
            <div className="flex space-x-4">
              <div className="bg-gray-50 rounded-lg p-3 min-w-[120px]">
                <div className="flex items-center space-x-2">
                  <Database className="h-4 w-4 text-blue-500" />
                  <div>
                    <div className="text-xs text-gray-500">Data Sources</div>
                    <div className={`text-lg font-semibold ${getHealthStatusColor(systemOverview.healthySources, systemOverview.totalSources)}`}>
                      {systemOverview.healthySources}/{systemOverview.totalSources}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-3 min-w-[120px]">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <div>
                    <div className="text-xs text-gray-500">Quality Score</div>
                    <div className={`text-lg font-semibold ${getQualityScoreColor(systemOverview.dataQualityScore)}`}>
                      {(systemOverview.dataQualityScore * 100).toFixed(0)}%
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-3 min-w-[120px]">
                <div className="flex items-center space-x-2">
                  <Activity className="h-4 w-4 text-purple-500" />
                  <div>
                    <div className="text-xs text-gray-500">Active Streams</div>
                    <div className="text-lg font-semibold text-gray-900">
                      {systemOverview.ingestionRate}
                    </div>
                  </div>
                </div>
              </div>

              {systemOverview.criticalIssues > 0 && (
                <div className="bg-red-50 rounded-lg p-3 min-w-[120px]">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    <div>
                      <div className="text-xs text-red-500">Critical Issues</div>
                      <div className="text-lg font-semibold text-red-600">
                        {systemOverview.criticalIssues}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8" aria-label="Tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ActiveComponent />
      </div>
    </div>
  );
};

export default DataManagementDashboard;