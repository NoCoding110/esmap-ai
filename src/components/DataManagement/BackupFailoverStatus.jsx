/**
 * Backup and Failover Status Indicators
 * Monitor backup processes and failover system status
 */

import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Database,
  HardDrive,
  Clock,
  Zap,
  Activity,
  Settings,
  Download,
  Upload,
  Server,
  Globe
} from 'lucide-react';

const BackupFailoverStatus = () => {
  const [backupStatus, setBackupStatus] = useState({});
  const [failoverStatus, setFailoverStatus] = useState({});
  const [replicationStatus, setReplicationStatus] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBackupFailoverStatus();
    const interval = setInterval(fetchBackupFailoverStatus, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchBackupFailoverStatus = async () => {
    try {
      setLoading(true);
      
      // Mock data - in real implementation, fetch from API
      const mockBackupStatus = {
        lastBackup: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
        nextScheduledBackup: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
        backupFrequency: 'Every 6 hours',
        totalBackups: 156,
        successfulBackups: 152,
        failedBackups: 4,
        backupSize: '2.8 TB',
        compressionRatio: 0.65,
        retentionPeriod: '90 days',
        storageUsed: '85.2 TB',
        storageCapacity: '120 TB',
        recentBackups: [
          {
            id: 'backup-001',
            timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
            status: 'completed',
            size: '2.8 TB',
            duration: '45m 32s',
            type: 'full',
            location: 'AWS S3 - us-east-1',
            checksum: 'verified'
          },
          {
            id: 'backup-002',
            timestamp: new Date(Date.now() - 10 * 60 * 60 * 1000),
            status: 'completed',
            size: '125 GB',
            duration: '8m 15s',
            type: 'incremental',
            location: 'AWS S3 - us-east-1',
            checksum: 'verified'
          },
          {
            id: 'backup-003',
            timestamp: new Date(Date.now() - 16 * 60 * 60 * 1000),
            status: 'failed',
            size: '0 GB',
            duration: '2m 45s',
            type: 'incremental',
            location: 'AWS S3 - us-east-1',
            error: 'Network timeout during upload'
          }
        ]
      };

      const mockFailoverStatus = {
        primaryRegion: 'us-east-1',
        secondaryRegion: 'us-west-2',
        tertiaryRegion: 'eu-west-1',
        currentActiveRegion: 'us-east-1',
        lastFailoverTest: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        nextScheduledTest: new Date(Date.now() + 23 * 24 * 60 * 60 * 1000), // 23 days from now
        failoverTestFrequency: 'Monthly',
        avgFailoverTime: '2m 15s',
        rpoTarget: '5 minutes',
        rtoTarget: '10 minutes',
        currentRpo: '2 minutes',
        currentRto: '5 minutes',
        failoverHistory: [
          {
            id: 'failover-001',
            timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            type: 'planned_test',
            fromRegion: 'us-east-1',
            toRegion: 'us-west-2',
            duration: '1m 45s',
            status: 'successful',
            dataLoss: 'none',
            downtime: '15 seconds'
          },
          {
            id: 'failover-002',
            timestamp: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
            type: 'emergency',
            fromRegion: 'us-east-1',
            toRegion: 'us-west-2',
            duration: '3m 22s',
            status: 'successful',
            dataLoss: '30 seconds',
            downtime: '2m 15s',
            trigger: 'Primary region outage'
          }
        ],
        regions: [
          {
            id: 'us-east-1',
            name: 'US East (N. Virginia)',
            status: 'active',
            health: 'healthy',
            lastHealthCheck: new Date(Date.now() - 5 * 60 * 1000),
            responseTime: 45,
            availability: 99.98,
            services: ['primary-db', 'api-gateway', 'data-processing']
          },
          {
            id: 'us-west-2',
            name: 'US West (Oregon)',
            status: 'standby',
            health: 'healthy',
            lastHealthCheck: new Date(Date.now() - 5 * 60 * 1000),
            responseTime: 52,
            availability: 99.95,
            services: ['replica-db', 'standby-api', 'backup-processing']
          },
          {
            id: 'eu-west-1',
            name: 'Europe (Ireland)',
            status: 'standby',
            health: 'healthy',
            lastHealthCheck: new Date(Date.now() - 5 * 60 * 1000),
            responseTime: 78,
            availability: 99.92,
            services: ['replica-db', 'data-archive']
          }
        ]
      };

      const mockReplicationStatus = {
        totalReplicas: 3,
        healthyReplicas: 3,
        lagTime: '1.2 seconds',
        replicationThroughput: '15.6 MB/s',
        lastSyncTime: new Date(Date.now() - 2 * 60 * 1000), // 2 minutes ago
        replicas: [
          {
            id: 'replica-west',
            region: 'us-west-2',
            status: 'synced',
            lag: '0.8s',
            lastSync: new Date(Date.now() - 1 * 60 * 1000),
            throughput: '12.3 MB/s',
            health: 'excellent'
          },
          {
            id: 'replica-eu',
            region: 'eu-west-1',
            status: 'synced',
            lag: '1.5s',
            lastSync: new Date(Date.now() - 2 * 60 * 1000),
            throughput: '8.9 MB/s',
            health: 'good'
          },
          {
            id: 'replica-asia',
            region: 'ap-southeast-1',
            status: 'syncing',
            lag: '2.3s',
            lastSync: new Date(Date.now() - 3 * 60 * 1000),
            throughput: '6.2 MB/s',
            health: 'fair'
          }
        ]
      };

      setBackupStatus(mockBackupStatus);
      setFailoverStatus(mockFailoverStatus);
      setReplicationStatus(mockReplicationStatus);
    } catch (error) {
      console.error('Failed to fetch backup/failover status:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
      case 'successful':
      case 'healthy':
      case 'active':
      case 'synced':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'failed':
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'running':
      case 'syncing':
        return <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'standby':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
      case 'successful':
      case 'healthy':
      case 'active':
      case 'synced':
        return 'text-green-600 bg-green-100';
      case 'failed':
      case 'error':
        return 'text-red-600 bg-red-100';
      case 'running':
      case 'syncing':
        return 'text-blue-600 bg-blue-100';
      case 'standby':
        return 'text-yellow-600 bg-yellow-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getHealthColor = (health) => {
    switch (health) {
      case 'excellent':
        return 'text-green-700';
      case 'good':
        return 'text-green-600';
      case 'fair':
        return 'text-yellow-600';
      case 'poor':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const formatDuration = (duration) => {
    if (typeof duration === 'string') return duration;
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    return `${minutes}m ${seconds}s`;
  };

  const formatBytes = (bytes) => {
    if (typeof bytes === 'string') return bytes;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Shield className="h-8 w-8 animate-pulse text-blue-500" />
        <span className="ml-2 text-gray-600">Loading backup and failover status...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-medium text-gray-900">Backup & Failover Status</h2>
          <p className="text-sm text-gray-500">Monitor system resilience and data protection</p>
        </div>
        
        <button
          onClick={fetchBackupFailoverStatus}
          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <HardDrive className="h-6 w-6 text-blue-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Backup Success Rate</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {((backupStatus.successfulBackups / backupStatus.totalBackups) * 100).toFixed(1)}%
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
                <Zap className="h-6 w-6 text-green-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Failover RTO</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {failoverStatus.currentRto}
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
                <Activity className="h-6 w-6 text-purple-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Replication Lag</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {replicationStatus.lagTime}
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
                <Server className="h-6 w-6 text-orange-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Active Region</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {failoverStatus.currentActiveRegion}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Backup Status */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Backup Status</h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Data backup monitoring and management
          </p>
        </div>
        
        <div className="px-4 py-5 sm:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-500">Last Backup</span>
                <span className="text-sm text-gray-900">{backupStatus.lastBackup.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-500">Next Scheduled</span>
                <span className="text-sm text-gray-900">{backupStatus.nextScheduledBackup.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-500">Frequency</span>
                <span className="text-sm text-gray-900">{backupStatus.backupFrequency}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-500">Retention Period</span>
                <span className="text-sm text-gray-900">{backupStatus.retentionPeriod}</span>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-500">Last Backup Size</span>
                <span className="text-sm text-gray-900">{backupStatus.backupSize}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-500">Compression Ratio</span>
                <span className="text-sm text-gray-900">{(backupStatus.compressionRatio * 100).toFixed(0)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-500">Storage Used</span>
                <span className="text-sm text-gray-900">
                  {backupStatus.storageUsed} / {backupStatus.storageCapacity}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-500">Success Rate</span>
                <span className="text-sm text-green-600 font-medium">
                  {((backupStatus.successfulBackups / backupStatus.totalBackups) * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>

          {/* Recent Backups */}
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-3">Recent Backups</h4>
            <div className="space-y-3">
              {backupStatus.recentBackups.map((backup) => (
                <div key={backup.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(backup.status)}
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-900">
                          {backup.type} backup
                        </span>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(backup.status)}`}>
                          {backup.status}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {backup.timestamp.toLocaleString()} • {backup.size} • {backup.duration} • {backup.location}
                      </div>
                      {backup.error && (
                        <div className="text-xs text-red-600 mt-1">
                          Error: {backup.error}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {backup.checksum && (
                    <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                      {backup.checksum}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Failover Status */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Failover Status</h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Multi-region failover configuration and status
          </p>
        </div>
        
        <div className="px-4 py-5 sm:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-500">Current RTO</span>
                <span className="text-sm font-semibold text-green-600">{failoverStatus.currentRto}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-500">Target RTO</span>
                <span className="text-sm text-gray-900">{failoverStatus.rtoTarget}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-500">Current RPO</span>
                <span className="text-sm font-semibold text-green-600">{failoverStatus.currentRpo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-500">Target RPO</span>
                <span className="text-sm text-gray-900">{failoverStatus.rpoTarget}</span>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-500">Last Test</span>
                <span className="text-sm text-gray-900">{failoverStatus.lastFailoverTest.toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-500">Next Test</span>
                <span className="text-sm text-gray-900">{failoverStatus.nextScheduledTest.toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-500">Test Frequency</span>
                <span className="text-sm text-gray-900">{failoverStatus.failoverTestFrequency}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-500">Avg Failover Time</span>
                <span className="text-sm text-gray-900">{failoverStatus.avgFailoverTime}</span>
              </div>
            </div>
          </div>

          {/* Regions */}
          <div className="mb-6">
            <h4 className="text-md font-medium text-gray-900 mb-3">Regional Status</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {failoverStatus.regions.map((region) => (
                <div key={region.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="font-medium text-gray-900">{region.name}</h5>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(region.status)}`}>
                      {region.status}
                    </span>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Health</span>
                      <span className={`font-medium ${getHealthColor(region.health)}`}>
                        {region.health}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Response Time</span>
                      <span className="text-gray-900">{region.responseTime}ms</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Availability</span>
                      <span className="text-gray-900">{region.availability}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Services</span>
                      <span className="text-gray-900">{region.services.length}</span>
                    </div>
                  </div>
                  
                  <div className="mt-2 text-xs text-gray-500">
                    Last check: {region.lastHealthCheck.toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Failover Events */}
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-3">Recent Events</h4>
            <div className="space-y-3">
              {failoverStatus.failoverHistory.map((event) => (
                <div key={event.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(event.status)}
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-900">
                          {event.type.replace('_', ' ')} failover
                        </span>
                        <span className="text-xs text-gray-500">
                          {event.fromRegion} → {event.toRegion}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {event.timestamp.toLocaleString()} • Duration: {event.duration} • Downtime: {event.downtime}
                      </div>
                      {event.trigger && (
                        <div className="text-xs text-blue-600 mt-1">
                          Trigger: {event.trigger}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Replication Status */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Data Replication</h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Cross-region data replication status and performance
          </p>
        </div>
        
        <div className="px-4 py-5 sm:p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{replicationStatus.totalReplicas}</div>
              <div className="text-sm text-gray-500">Total Replicas</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{replicationStatus.healthyReplicas}</div>
              <div className="text-sm text-gray-500">Healthy</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{replicationStatus.lagTime}</div>
              <div className="text-sm text-gray-500">Avg Lag</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{replicationStatus.replicationThroughput}</div>
              <div className="text-sm text-gray-500">Throughput</div>
            </div>
          </div>

          <div className="space-y-4">
            {replicationStatus.replicas.map((replica) => (
              <div key={replica.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  {getStatusIcon(replica.status)}
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-gray-900">{replica.region}</span>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(replica.status)}`}>
                        {replica.status}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      Last sync: {replica.lastSync.toLocaleTimeString()}
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">
                    Lag: {replica.lag}
                  </div>
                  <div className="text-sm text-gray-500">
                    {replica.throughput} • {replica.health}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BackupFailoverStatus;