/**
 * Data Ingestion Monitoring Interface
 * Real-time monitoring of data ingestion processes with progress indicators
 */

import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Download, 
  Upload, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  BarChart3,
  Pause,
  Play,
  Square,
  RefreshCw,
  Filter,
  FileText,
  Database,
  Zap
} from 'lucide-react';

const DataIngestionMonitor = () => {
  const [ingestionJobs, setIngestionJobs] = useState([]);
  const [statistics, setStatistics] = useState({
    totalJobs: 0,
    activeJobs: 0,
    completedJobs: 0,
    failedJobs: 0,
    totalRecordsProcessed: 0,
    averageProcessingTime: 0
  });
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchIngestionData = async () => {
      try {
        setLoading(true);
        
        // Fetch ingestion jobs and feed status
        const [feedResponse, resilienceResponse] = await Promise.all([
          fetch('/api/v1/resilience/feeds'),
          fetch('/api/v1/resilience/status')
        ]);

        const feedData = await feedResponse.json();
        const resilienceData = await resilienceResponse.json();

        if (feedData.success && resilienceData.success) {
          const processedJobs = processIngestionData(feedData.data, resilienceData.data);
          setIngestionJobs(processedJobs);
          
          const stats = calculateStatistics(processedJobs);
          setStatistics(stats);
        }
      } catch (error) {
        console.error('Failed to fetch ingestion data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchIngestionData();
    const interval = setInterval(fetchIngestionData, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, []);

  const processIngestionData = (feedData, resilienceData) => {
    // Mock ingestion jobs data - in real implementation, process actual API data
    const mockJobs = [
      {
        id: 'job-1',
        name: 'World Bank Energy Indicators',
        source: 'world-bank-api',
        type: 'api_pull',
        status: 'running',
        progress: 78,
        recordsProcessed: 15680,
        totalRecords: 20000,
        startTime: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
        estimatedCompletion: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes from now
        dataSize: '2.4 MB',
        processingRate: 1250, // records per minute
        errors: 12,
        warnings: 45,
        lastUpdate: new Date()
      },
      {
        id: 'job-2',
        name: 'NASA Climate Data Sync',
        source: 'nasa-power-api',
        type: 'scheduled_sync',
        status: 'completed',
        progress: 100,
        recordsProcessed: 8945,
        totalRecords: 8945,
        startTime: new Date(Date.now() - 45 * 60 * 1000), // 45 minutes ago
        completionTime: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
        dataSize: '1.8 MB',
        processingRate: 1988,
        errors: 0,
        warnings: 3,
        lastUpdate: new Date(Date.now() - 5 * 60 * 1000)
      },
      {
        id: 'job-3',
        name: 'IEA Energy Statistics',
        source: 'iea-data',
        type: 'manual_upload',
        status: 'failed',
        progress: 34,
        recordsProcessed: 3400,
        totalRecords: 10000,
        startTime: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        failureTime: new Date(Date.now() - 20 * 60 * 1000), // 20 minutes ago
        dataSize: '5.2 MB',
        processingRate: 680,
        errors: 156,
        warnings: 23,
        errorMessage: 'Data validation failed: Invalid country codes in 156 records',
        lastUpdate: new Date(Date.now() - 20 * 60 * 1000)
      },
      {
        id: 'job-4',
        name: 'OpenStreetMap Energy Infrastructure',
        source: 'openstreetmap',
        type: 'real_time_feed',
        status: 'paused',
        progress: 55,
        recordsProcessed: 5500,
        totalRecords: 10000,
        startTime: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
        pausedTime: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago
        dataSize: '3.1 MB',
        processingRate: 915,
        errors: 8,
        warnings: 12,
        pauseReason: 'User requested pause for maintenance',
        lastUpdate: new Date(Date.now() - 10 * 60 * 1000)
      },
      {
        id: 'job-5',
        name: 'Community Energy Monitoring',
        source: 'community-energy-monitoring',
        type: 'stream_processing',
        status: 'queued',
        progress: 0,
        recordsProcessed: 0,
        totalRecords: 15000,
        queuedTime: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
        dataSize: '4.7 MB',
        estimatedDuration: 25, // minutes
        priority: 'high',
        lastUpdate: new Date(Date.now() - 5 * 60 * 1000)
      }
    ];

    return mockJobs;
  };

  const calculateStatistics = (jobs) => {
    const totalJobs = jobs.length;
    const activeJobs = jobs.filter(job => ['running', 'queued', 'paused'].includes(job.status)).length;
    const completedJobs = jobs.filter(job => job.status === 'completed').length;
    const failedJobs = jobs.filter(job => job.status === 'failed').length;
    const totalRecordsProcessed = jobs.reduce((sum, job) => sum + job.recordsProcessed, 0);
    
    const completedJobsWithTime = jobs.filter(job => job.completionTime);
    const averageProcessingTime = completedJobsWithTime.length > 0 
      ? completedJobsWithTime.reduce((sum, job) => 
          sum + (new Date(job.completionTime) - new Date(job.startTime)), 0
        ) / completedJobsWithTime.length / 60000 // Convert to minutes
      : 0;

    return {
      totalJobs,
      activeJobs,
      completedJobs,
      failedJobs,
      totalRecordsProcessed,
      averageProcessingTime
    };
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'running':
        return <Activity className="h-5 w-5 text-blue-500 animate-pulse" />;
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'paused':
        return <Pause className="h-5 w-5 text-yellow-500" />;
      case 'queued':
        return <Clock className="h-5 w-5 text-gray-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'running':
        return 'text-blue-600 bg-blue-100';
      case 'completed':
        return 'text-green-600 bg-green-100';
      case 'failed':
        return 'text-red-600 bg-red-100';
      case 'paused':
        return 'text-yellow-600 bg-yellow-100';
      case 'queued':
        return 'text-gray-600 bg-gray-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'api_pull':
        return <Download className="h-4 w-4" />;
      case 'manual_upload':
        return <Upload className="h-4 w-4" />;
      case 'scheduled_sync':
        return <RefreshCw className="h-4 w-4" />;
      case 'real_time_feed':
        return <Zap className="h-4 w-4" />;
      case 'stream_processing':
        return <Activity className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const formatDuration = (startTime, endTime = new Date()) => {
    const duration = Math.floor((endTime - startTime) / 60000); // minutes
    if (duration < 60) return `${duration}m`;
    const hours = Math.floor(duration / 60);
    const minutes = duration % 60;
    return `${hours}h ${minutes}m`;
  };

  const formatRate = (rate) => {
    if (rate > 1000) return `${(rate / 1000).toFixed(1)}k/min`;
    return `${rate}/min`;
  };

  const filteredJobs = selectedStatus === 'all' 
    ? ingestionJobs 
    : ingestionJobs.filter(job => job.status === selectedStatus);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Activity className="h-8 w-8 animate-spin text-blue-500" />
        <span className="ml-2 text-gray-600">Loading ingestion data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-medium text-gray-900">Data Ingestion Monitor</h2>
          <p className="text-sm text-gray-500">Real-time monitoring of data ingestion processes</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="block w-40 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
          >
            <option value="all">All Jobs</option>
            <option value="running">Running</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
            <option value="paused">Paused</option>
            <option value="queued">Queued</option>
          </select>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Database className="h-6 w-6 text-gray-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Jobs</dt>
                  <dd className="text-lg font-medium text-gray-900">{statistics.totalJobs}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Activity className="h-6 w-6 text-blue-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Active</dt>
                  <dd className="text-lg font-medium text-gray-900">{statistics.activeJobs}</dd>
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
                  <dt className="text-sm font-medium text-gray-500 truncate">Completed</dt>
                  <dd className="text-lg font-medium text-gray-900">{statistics.completedJobs}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <AlertCircle className="h-6 w-6 text-red-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Failed</dt>
                  <dd className="text-lg font-medium text-gray-900">{statistics.failedJobs}</dd>
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
                  <dt className="text-sm font-medium text-gray-500 truncate">Records Processed</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {statistics.totalRecordsProcessed.toLocaleString()}
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
                <Clock className="h-6 w-6 text-orange-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Avg Time</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {statistics.averageProcessingTime.toFixed(0)}m
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Ingestion Jobs List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Ingestion Jobs</h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Monitor progress and status of data ingestion processes
          </p>
        </div>
        
        <ul className="divide-y divide-gray-200">
          {filteredJobs.map((job) => (
            <li key={job.id} className="px-4 py-6 sm:px-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center min-w-0 flex-1">
                  <div className="flex-shrink-0">
                    {getStatusIcon(job.status)}
                  </div>
                  
                  <div className="ml-4 min-w-0 flex-1">
                    <div className="flex items-center space-x-3">
                      <p className="text-lg font-medium text-gray-900 truncate">
                        {job.name}
                      </p>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(job.status)}`}>
                        {job.status}
                      </span>
                      <div className="flex items-center text-sm text-gray-500">
                        {getTypeIcon(job.type)}
                        <span className="ml-1 capitalize">{job.type.replace('_', ' ')}</span>
                      </div>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                        <span>
                          {job.recordsProcessed.toLocaleString()} / {job.totalRecords.toLocaleString()} records
                        </span>
                        <span>{job.progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-500 ${
                            job.status === 'failed' ? 'bg-red-500' :
                            job.status === 'completed' ? 'bg-green-500' :
                            job.status === 'paused' ? 'bg-yellow-500' : 'bg-blue-500'
                          }`}
                          style={{ width: `${job.progress}%` }}
                        />
                      </div>
                    </div>
                    
                    {/* Job Details */}
                    <div className="mt-3 flex items-center space-x-6 text-sm text-gray-500">
                      <span>Data Size: {job.dataSize}</span>
                      <span>Rate: {formatRate(job.processingRate)}</span>
                      <span>Duration: {formatDuration(job.startTime, job.completionTime || new Date())}</span>
                      {job.errors > 0 && (
                        <span className="text-red-600">
                          {job.errors} errors
                        </span>
                      )}
                      {job.warnings > 0 && (
                        <span className="text-yellow-600">
                          {job.warnings} warnings
                        </span>
                      )}
                    </div>

                    {/* Error Message */}
                    {job.status === 'failed' && job.errorMessage && (
                      <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md">
                        <p className="text-sm text-red-700">{job.errorMessage}</p>
                      </div>
                    )}

                    {/* Pause Reason */}
                    {job.status === 'paused' && job.pauseReason && (
                      <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                        <p className="text-sm text-yellow-700">{job.pauseReason}</p>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="flex items-center space-x-2">
                  {job.status === 'running' && (
                    <button className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                      <Pause className="h-4 w-4 mr-2" />
                      Pause
                    </button>
                  )}
                  
                  {job.status === 'paused' && (
                    <button className="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
                      <Play className="h-4 w-4 mr-2" />
                      Resume
                    </button>
                  )}
                  
                  {job.status === 'failed' && (
                    <button className="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Retry
                    </button>
                  )}
                  
                  {['completed', 'failed', 'paused'].includes(job.status) && (
                    <button className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                      <FileText className="h-4 w-4 mr-2" />
                      Logs
                    </button>
                  )}
                </div>
              </div>
            </li>
          ))}
          
          {filteredJobs.length === 0 && (
            <li className="px-4 py-12 text-center">
              <Activity className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                No {selectedStatus === 'all' ? '' : selectedStatus} jobs found
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {selectedStatus === 'all' 
                  ? 'No ingestion jobs have been configured yet.' 
                  : `No jobs with status "${selectedStatus}" at this time.`
                }
              </p>
            </li>
          )}
        </ul>
      </div>
    </div>
  );
};

export default DataIngestionMonitor;