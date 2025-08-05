/**
 * Modern Dashboard Component
 * Inspired by Stripe Dashboard, Vercel, and Figma
 * 
 * Features:
 * - Data-first design with clear hierarchy
 * - Progressive disclosure of information
 * - Elegant metric cards with trend indicators
 * - Interactive charts with smooth animations
 * - Smart loading states and error handling
 */

import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Zap,
  Globe,
  Database,
  Users,
  Activity,
  BarChart3,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CheckCircle,
  AlertCircle,
  Plus,
  Filter,
  Download,
  RefreshCw
} from 'lucide-react';

const ModernDashboard = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('7d');
  const [refreshing, setRefreshing] = useState(false);

  // Simulate loading
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  // Mock data with more realistic values
  const metrics = [
    {
      id: 'total-energy',
      label: 'Total Energy Tracked',
      value: '2.4 TWh',
      change: '+12.3%',
      trend: 'up',
      description: 'Across 47 countries',
      icon: Zap,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50'
    },
    {
      id: 'renewable-share',
      label: 'Renewable Share',
      value: '34.7%',
      change: '+5.2%',
      trend: 'up',
      description: 'Of total generation',
      icon: Activity,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      id: 'countries-analyzed',
      label: 'Countries Analyzed',
      value: '47',
      change: '+3',
      trend: 'up',
      description: 'This month',
      icon: Globe,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      id: 'api-calls',
      label: 'API Requests',
      value: '1.2M',
      change: '-2.1%',
      trend: 'down',
      description: 'This week',
      icon: Database,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    }
  ];

  const recentActivities = [
    {
      id: 1,
      action: 'Energy data updated',
      country: 'Nigeria',
      time: '2 minutes ago',
      status: 'success',
      icon: CheckCircle
    },
    {
      id: 2,
      action: 'New country profile',
      country: 'Bangladesh',
      time: '15 minutes ago',
      status: 'success',
      icon: CheckCircle
    },
    {
      id: 3,
      action: 'API rate limit warning',
      country: 'Global',
      time: '1 hour ago',
      status: 'warning',
      icon: AlertCircle
    },
    {
      id: 4,
      action: 'Forecast model updated',
      country: 'Kenya',
      time: '3 hours ago',
      status: 'success',
      icon: CheckCircle
    }
  ];

  const topCountries = [
    { name: 'Nigeria', value: '145 GW', change: '+8.3%', flag: '🇳🇬' },
    { name: 'India', value: '142 GW', change: '+12.1%', flag: '🇮🇳' },
    { name: 'Brazil', value: '89 GW', change: '+5.7%', flag: '🇧🇷' },
    { name: 'Kenya', value: '67 GW', change: '+15.2%', flag: '🇰🇪' },
    { name: 'Bangladesh', value: '54 GW', change: '+9.8%', flag: '🇧🇩' }
  ];

  const handleRefresh = async () => {
    setRefreshing(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="container py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex-1">
          <h1 className="heading-2 mb-2">Energy Transition Dashboard</h1>
          <p className="text-muted text-large">
            Real-time insights across 47 countries with AI-powered analytics
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Period Selector */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            {['24h', '7d', '30d', '90d'].map((period) => (
              <button
                key={period}
                onClick={() => setSelectedPeriod(period)}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                  selectedPeriod === period
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                {period}
              </button>
            ))}
          </div>

          {/* Actions */}
          <button onClick={handleRefresh} className="btn-ghost" disabled={refreshing}>
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          
          <button className="btn-ghost">
            <Download className="w-4 h-4" />
          </button>
          
          <button className="btn-primary">
            <Plus className="w-4 h-4" />
            Add Country
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          const TrendIcon = metric.trend === 'up' ? TrendingUp : TrendingDown;
          
          return (
            <div key={metric.id} className="metric-card group hover:shadow-md transition-all">
              <div className="flex items-start justify-between mb-4">
                <div className={`p-2 rounded-lg ${metric.bgColor}`}>
                  <Icon className={`w-5 h-5 ${metric.color}`} />
                </div>
                <div className={`flex items-center gap-1 text-sm ${
                  metric.trend === 'up' ? 'text-green-600' : 'text-red-600'
                }`}>
                  <TrendIcon className="w-3 h-3" />
                  <span className="font-medium">{metric.change}</span>
                </div>
              </div>
              
              <div className="metric-value mb-1">{metric.value}</div>
              <div className="metric-label">{metric.label}</div>
              <div className="text-xs text-gray-800 mt-1">{metric.description}</div>
            </div>
          );
        })}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Chart Section */}
        <div className="lg:col-span-2 space-y-6">
          {/* Energy Generation Chart */}
          <div className="card">
            <div className="card-header">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="heading-4 mb-1">Energy Generation Trends</h3>
                  <p className="text-small text-muted">Renewable vs. Traditional sources</p>
                </div>
                <div className="flex items-center gap-2">
                  <button className="btn-ghost btn-sm">
                    <Filter className="w-4 h-4" />
                  </button>
                  <button className="btn-ghost btn-sm">
                    <BarChart3 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
            <div className="card-body">
              {/* Placeholder for Chart */}
              <div className="h-64 bg-gradient-to-br from-blue-50 to-green-50 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-200">
                <div className="text-center">
                  <BarChart3 className="w-8 h-8 text-gray-700 mx-auto mb-2" />
                  <p className="text-gray-800 font-medium">Interactive Chart</p>
                  <p className="text-gray-800 text-sm">Chart.js visualization would render here</p>
                </div>
              </div>
            </div>
          </div>

          {/* Regional Performance */}
          <div className="card">
            <div className="card-header">
              <h3 className="heading-4 mb-1">Regional Performance</h3>
              <p className="text-small text-muted">Energy capacity by region</p>
            </div>
            <div className="card-body">
              <div className="h-40 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-200">
                <div className="text-center">
                  <PieChart className="w-8 h-8 text-gray-700 mx-auto mb-2" />
                  <p className="text-gray-800 font-medium">Regional Chart</p>
                  <p className="text-gray-800 text-sm">Pie chart visualization</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Top Countries */}
          <div className="card">
            <div className="card-header">
              <h3 className="heading-4 mb-1">Top Countries</h3>
              <p className="text-small text-muted">By total capacity</p>
            </div>
            <div className="card-body p-0">
              <div className="divide-y divide-gray-100">
                {topCountries.map((country, index) => (
                  <div key={country.name} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{country.flag}</span>
                        <div>
                          <div className="font-medium text-gray-900">{country.name}</div>
                          <div className="text-sm text-gray-800">#{index + 1}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-gray-900">{country.value}</div>
                        <div className="flex items-center gap-1 text-sm text-green-600">
                          <ArrowUpRight className="w-3 h-3" />
                          <span>{country.change}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="card">
            <div className="card-header">
              <h3 className="heading-4 mb-1">Recent Activity</h3>
              <p className="text-small text-muted">Latest updates</p>
            </div>
            <div className="card-body p-0">
              <div className="divide-y divide-gray-100">
                {recentActivities.map((activity) => {
                  const Icon = activity.icon;
                  return (
                    <div key={activity.id} className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={`p-1 rounded-full ${
                          activity.status === 'success' ? 'bg-green-100' :
                          activity.status === 'warning' ? 'bg-yellow-100' : 'bg-gray-100'
                        }`}>
                          <Icon className={`w-3 h-3 ${
                            activity.status === 'success' ? 'text-green-600' :
                            activity.status === 'warning' ? 'text-yellow-600' : 'text-gray-600'
                          }`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">
                            {activity.action}
                          </p>
                          <p className="text-sm text-gray-800">{activity.country}</p>
                          <div className="flex items-center gap-1 mt-1 text-xs text-gray-800">
                            <Clock className="w-3 h-3" />
                            <span>{activity.time}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="card-footer">
              <button className="btn-ghost w-full text-sm">
                View All Activity
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Loading skeleton component
const DashboardSkeleton = () => {
  return (
    <div className="container py-8">
      {/* Header Skeleton */}
      <div className="mb-8">
        <div className="h-8 bg-gray-200 rounded-lg w-1/3 mb-2 animate-pulse"></div>
        <div className="h-5 bg-gray-200 rounded-lg w-2/3 animate-pulse"></div>
      </div>

      {/* Metrics Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="card animate-pulse">
            <div className="card-body">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
                <div className="w-16 h-4 bg-gray-200 rounded"></div>
              </div>
              <div className="h-8 bg-gray-200 rounded mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </div>
          </div>
        ))}
      </div>

      {/* Content Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="card animate-pulse">
            <div className="card-body">
              <div className="h-64 bg-gray-200 rounded-lg"></div>
            </div>
          </div>
        </div>
        <div>
          <div className="card animate-pulse">
            <div className="card-body">
              <div className="h-48 bg-gray-200 rounded-lg"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModernDashboard;