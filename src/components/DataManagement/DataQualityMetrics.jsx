/**
 * Data Quality Metrics Visualization
 * Comprehensive data quality monitoring with trend analysis
 */

import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  PieChart, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Target,
  Zap,
  Filter
} from 'lucide-react';

const DataQualityMetrics = () => {
  const [qualityData, setQualityData] = useState({
    overall: { accuracy: 0, completeness: 0, timeliness: 0, consistency: 0, reliability: 0 },
    bySource: [],
    trends: [],
    issues: []
  });
  const [selectedTimeframe, setSelectedTimeframe] = useState('7d');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchQualityMetrics = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/v1/resilience/reliability?timeframe=${selectedTimeframe}`);
        const data = await response.json();

        if (data.success) {
          // Transform the data for visualization
          const processedData = processQualityData(data.data);
          setQualityData(processedData);
        }
      } catch (error) {
        console.error('Failed to fetch quality metrics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchQualityMetrics();
  }, [selectedTimeframe]);

  const processQualityData = (rawData) => {
    // Mock data processing - in real implementation, process actual API data
    const mockData = {
      overall: {
        accuracy: 0.94,
        completeness: 0.89,
        timeliness: 0.92,
        consistency: 0.87,
        reliability: 0.91
      },
      bySource: [
        { 
          id: 'world-bank-api', 
          name: 'World Bank API',
          accuracy: 0.96, 
          completeness: 0.92, 
          timeliness: 0.88, 
          consistency: 0.94,
          reliability: 0.95,
          trend: 'up',
          issues: 1
        },
        { 
          id: 'nasa-power-api', 
          name: 'NASA POWER API',
          accuracy: 0.93, 
          completeness: 0.87, 
          timeliness: 0.96, 
          consistency: 0.81,
          reliability: 0.89,
          trend: 'stable',
          issues: 3
        },
        { 
          id: 'iea-data', 
          name: 'IEA Energy Data',
          accuracy: 0.91, 
          completeness: 0.88, 
          timeliness: 0.85, 
          consistency: 0.86,
          reliability: 0.87,
          trend: 'down',
          issues: 5
        }
      ],
      trends: generateTrendData(),
      issues: [
        { 
          id: 1, 
          source: 'NASA POWER API', 
          type: 'completeness', 
          severity: 'medium',
          description: 'Missing temperature data for 12% of records',
          affectedRecords: 1250,
          detectedAt: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
        },
        { 
          id: 2, 
          source: 'IEA Energy Data', 
          type: 'timeliness', 
          severity: 'high',
          description: 'Data delay of 48 hours for latest energy statistics',
          affectedRecords: 890,
          detectedAt: new Date(Date.now() - 6 * 60 * 60 * 1000) // 6 hours ago
        },
        { 
          id: 3, 
          source: 'World Bank API', 
          type: 'consistency', 
          severity: 'low',
          description: 'Minor formatting inconsistencies in country codes',
          affectedRecords: 45,
          detectedAt: new Date(Date.now() - 1 * 60 * 60 * 1000) // 1 hour ago
        }
      ]
    };

    return mockData;
  };

  const generateTrendData = () => {
    const days = selectedTimeframe === '7d' ? 7 : selectedTimeframe === '30d' ? 30 : 90;
    const data = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      data.push({
        date: date.toISOString().split('T')[0],
        accuracy: 0.85 + Math.random() * 0.15,
        completeness: 0.80 + Math.random() * 0.20,
        timeliness: 0.85 + Math.random() * 0.15,
        consistency: 0.75 + Math.random() * 0.25,
        reliability: 0.85 + Math.random() * 0.15
      });
    }
    
    return data;
  };

  const getQualityColor = (score) => {
    if (score >= 0.9) return 'text-green-600 bg-green-100';
    if (score >= 0.7) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getQualityLabel = (score) => {
    if (score >= 0.9) return 'Excellent';
    if (score >= 0.8) return 'Good';
    if (score >= 0.7) return 'Fair';
    return 'Poor';
  };

  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down': return <TrendingDown className="h-4 w-4 text-red-500" />;
      default: return <div className="h-4 w-4 bg-gray-300 rounded-full" />;
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high': return 'text-red-600 bg-red-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <BarChart3 className="h-8 w-8 animate-pulse text-blue-500" />
        <span className="ml-2 text-gray-600">Loading quality metrics...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-medium text-gray-900">Data Quality Metrics</h2>
          <p className="text-sm text-gray-500">Monitor and analyze data quality across all sources</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <select
            value={selectedTimeframe}
            onChange={(e) => setSelectedTimeframe(e.target.value)}
            className="block w-32 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
        </div>
      </div>

      {/* Overall Quality Score Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {Object.entries(qualityData.overall).map(([metric, score]) => (
          <div key={metric} className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  {metric === 'accuracy' && <Target className="h-6 w-6 text-blue-500" />}
                  {metric === 'completeness' && <CheckCircle className="h-6 w-6 text-green-500" />}
                  {metric === 'timeliness' && <Clock className="h-6 w-6 text-purple-500" />}
                  {metric === 'consistency' && <Filter className="h-6 w-6 text-yellow-500" />}
                  {metric === 'reliability' && <Zap className="h-6 w-6 text-red-500" />}
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate capitalize">
                      {metric}
                    </dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-gray-900">
                        {(score * 100).toFixed(0)}%
                      </div>
                      <div className={`ml-2 flex items-baseline text-sm font-semibold px-2 py-1 rounded-full ${getQualityColor(score)}`}>
                        {getQualityLabel(score)}
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quality by Source */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Quality by Data Source</h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Detailed quality breakdown for each configured data source
          </p>
        </div>
        
        <div className="px-4 py-5 sm:p-6">
          <div className="space-y-4">
            {qualityData.bySource.map((source) => (
              <div key={source.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <h4 className="text-lg font-medium text-gray-900">{source.name}</h4>
                    {getTrendIcon(source.trend)}
                    {source.issues > 0 && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        {source.issues} issue{source.issues > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold text-gray-900">
                      {(source.reliability * 100).toFixed(0)}%
                    </div>
                    <div className="text-sm text-gray-500">Overall</div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {['accuracy', 'completeness', 'timeliness', 'consistency'].map((metric) => (
                    <div key={metric} className="text-center">
                      <div className="text-sm font-medium text-gray-500 capitalize mb-1">
                        {metric}
                      </div>
                      <div className="relative pt-1">
                        <div className="flex mb-2 items-center justify-between">
                          <div className="text-xs font-semibold inline-block text-gray-600">
                            {(source[metric] * 100).toFixed(0)}%
                          </div>
                        </div>
                        <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-gray-200">
                          <div
                            style={{ width: `${source[metric] * 100}%` }}
                            className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${
                              source[metric] >= 0.9 ? 'bg-green-500' :
                              source[metric] >= 0.7 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quality Issues */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg leading-6 font-medium text-gray-900">Quality Issues</h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                Active data quality issues requiring attention
              </p>
            </div>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
              {qualityData.issues.length} active issues
            </span>
          </div>
        </div>
        
        <ul className="divide-y divide-gray-200">
          {qualityData.issues.map((issue) => (
            <li key={issue.id} className="px-4 py-4 sm:px-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center min-w-0 flex-1">
                  <div className="flex-shrink-0">
                    <AlertTriangle className={`h-5 w-5 ${
                      issue.severity === 'high' ? 'text-red-500' :
                      issue.severity === 'medium' ? 'text-yellow-500' : 'text-blue-500'
                    }`} />
                  </div>
                  <div className="ml-4 min-w-0 flex-1">
                    <div className="flex items-center space-x-3">
                      <p className="text-sm font-medium text-gray-900">
                        {issue.source}
                      </p>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSeverityColor(issue.severity)}`}>
                        {issue.severity}
                      </span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 capitalize">
                        {issue.type}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-600">
                      {issue.description}
                    </p>
                    <div className="mt-1 flex items-center space-x-4 text-xs text-gray-500">
                      <span>{issue.affectedRecords.toLocaleString()} records affected</span>
                      <span>Detected {issue.detectedAt.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50">
                    Investigate
                  </button>
                  <button className="inline-flex items-center px-3 py-1 border border-transparent shadow-sm text-xs font-medium rounded text-white bg-blue-600 hover:bg-blue-700">
                    Resolve
                  </button>
                </div>
              </div>
            </li>
          ))}
          
          {qualityData.issues.length === 0 && (
            <li className="px-4 py-12 text-center">
              <CheckCircle className="mx-auto h-12 w-12 text-green-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No quality issues detected</h3>
              <p className="mt-1 text-sm text-gray-500">
                All data sources are meeting quality standards.
              </p>
            </li>
          )}
        </ul>
      </div>

      {/* Trend Chart Placeholder */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Quality Trends</h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Historical quality metrics over time
          </p>
        </div>
        
        <div className="px-4 py-5 sm:p-6">
          <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg">
            <div className="text-center">
              <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Quality Trend Chart</h3>
              <p className="mt-1 text-sm text-gray-500">
                Chart visualization would be implemented here using a charting library like Chart.js or D3
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataQualityMetrics;