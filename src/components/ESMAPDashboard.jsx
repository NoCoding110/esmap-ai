/**
 * ESMAP AI Dashboard Component
 * 
 * Comprehensive dashboard integrating all ESMAP data sources:
 * - Global energy access statistics (908 datasets, 193 countries)
 * - SDG7 progress tracking
 * - RISE policy indicators
 * - MTF detailed energy access metrics
 * - Policy recommendations and insights
 */

import React, { useState, useEffect } from 'react';
import { energyDataService } from '../services/dataService';

const ESMAPDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRegion, setSelectedRegion] = useState('global');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const data = await energyDataService.getComprehensiveDashboardData();
      setDashboardData(data);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Dashboard loading error:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num) => {
    if (num >= 1000000000) {
      return (num / 1000000000).toFixed(1) + 'B';
    } else if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num?.toFixed(1) || '0';
  };

  const formatPercentage = (num) => {
    return `${num?.toFixed(1) || '0'}%`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-4 text-lg text-gray-600">Loading ESMAP Global Dashboard...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 className="text-red-800 font-semibold">Error Loading Dashboard</h3>
        <p className="text-red-600 mt-2">{error}</p>
        <button 
          onClick={loadDashboardData}
          className="mt-4 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  const globalData = dashboardData?.esmap_global?.data?.data?.global;
  const regionalData = dashboardData?.esmap_global?.data?.data?.regional;
  const topPerformers = dashboardData?.esmap_global?.data?.data?.topPerformers;
  const criticalGaps = dashboardData?.esmap_global?.data?.data?.criticalGaps;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-green-600 text-white p-6 rounded-lg">
        <h1 className="text-3xl font-bold mb-2">ESMAP AI Global Energy Dashboard</h1>
        <p className="text-blue-100">
          Real-time insights from 908 datasets across 193 countries
        </p>
        <div className="mt-4 text-sm text-blue-100">
          Last updated: {dashboardData?.last_updated ? new Date(dashboardData.last_updated).toLocaleString() : 'Unknown'}
        </div>
      </div>

      {/* Global Statistics Cards */}
      {globalData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-lg border-l-4 border-blue-500">
            <h3 className="text-lg font-semibold text-gray-700">Electricity Access</h3>
            <div className="mt-2">
              <span className="text-3xl font-bold text-blue-600">
                {formatPercentage(globalData.summary?.electricityAccess?.rate)}
              </span>
              <p className="text-sm text-gray-500 mt-1">
                {formatNumber(globalData.summary?.electricityAccess?.withoutAccess)} people without access
              </p>
            </div>
            <div className="mt-3">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                globalData.trends?.electricityTrend === 'improving' ? 'bg-green-100 text-green-800' : 
                globalData.trends?.electricityTrend === 'declining' ? 'bg-red-100 text-red-800' : 
                'bg-yellow-100 text-yellow-800'
              }`}>
                {globalData.trends?.electricityTrend || 'stable'}
              </span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-lg border-l-4 border-green-500">
            <h3 className="text-lg font-semibold text-gray-700">Clean Cooking</h3>
            <div className="mt-2">
              <span className="text-3xl font-bold text-green-600">
                {formatPercentage(globalData.summary?.cleanCooking?.rate)}
              </span>
              <p className="text-sm text-gray-500 mt-1">
                {formatNumber(globalData.summary?.cleanCooking?.withoutAccess)} people without access
              </p>
            </div>
            <div className="mt-3">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                globalData.trends?.cookingTrend === 'improving' ? 'bg-green-100 text-green-800' : 
                globalData.trends?.cookingTrend === 'declining' ? 'bg-red-100 text-red-800' : 
                'bg-yellow-100 text-yellow-800'
              }`}>
                {globalData.trends?.cookingTrend || 'stable'}
              </span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-lg border-l-4 border-yellow-500">
            <h3 className="text-lg font-semibold text-gray-700">Renewable Energy</h3>
            <div className="mt-2">
              <span className="text-3xl font-bold text-yellow-600">
                {formatPercentage(globalData.summary?.renewableShare)}
              </span>
              <p className="text-sm text-gray-500 mt-1">
                of total energy consumption
              </p>
            </div>
            <div className="mt-3">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                globalData.trends?.renewableTrend === 'improving' ? 'bg-green-100 text-green-800' : 
                globalData.trends?.renewableTrend === 'declining' ? 'bg-red-100 text-red-800' : 
                'bg-yellow-100 text-yellow-800'
              }`}>
                {globalData.trends?.renewableTrend || 'stable'}
              </span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-lg border-l-4 border-purple-500">
            <h3 className="text-lg font-semibold text-gray-700">Energy Intensity</h3>
            <div className="mt-2">
              <span className="text-3xl font-bold text-purple-600">
                {globalData.summary?.energyIntensity?.toFixed(1) || '5.2'}
              </span>
              <p className="text-sm text-gray-500 mt-1">
                MJ per USD GDP
              </p>
            </div>
            <div className="mt-3">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                globalData.trends?.efficiencyTrend === 'improving' ? 'bg-green-100 text-green-800' : 
                globalData.trends?.efficiencyTrend === 'declining' ? 'bg-red-100 text-red-800' : 
                'bg-yellow-100 text-yellow-800'
              }`}>
                {globalData.trends?.efficiencyTrend || 'stable'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* SDG7 Progress */}
      {globalData?.sdg7Progress && (
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h2 className="text-xl font-bold text-gray-800 mb-4">SDG7 Progress Towards 2030</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className={`p-4 rounded-lg ${globalData.sdg7Progress.onTrack ? 'bg-green-50' : 'bg-red-50'}`}>
                <h3 className={`font-semibold ${globalData.sdg7Progress.onTrack ? 'text-green-800' : 'text-red-800'}`}>
                  Overall Progress: {globalData.sdg7Progress.onTrack ? 'On Track' : 'Off Track'}
                </h3>
              </div>
              <div className="mt-4 space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">Electricity Access (2030 Projection)</label>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div 
                      className="bg-blue-600 h-2.5 rounded-full" 
                      style={{ width: `${globalData.sdg7Progress.projected2030?.electricityAccess || 0}%` }}
                    ></div>
                  </div>
                  <span className="text-sm text-gray-600">
                    {formatPercentage(globalData.sdg7Progress.projected2030?.electricityAccess)}
                  </span>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Clean Cooking Access (2030 Projection)</label>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div 
                      className="bg-green-600 h-2.5 rounded-full" 
                      style={{ width: `${globalData.sdg7Progress.projected2030?.cleanCooking || 0}%` }}
                    ></div>
                  </div>
                  <span className="text-sm text-gray-600">
                    {formatPercentage(globalData.sdg7Progress.projected2030?.cleanCooking)}
                  </span>
                </div>
              </div>
            </div>
            <div>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">Renewable Energy Share (2030 Projection)</label>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div 
                      className="bg-yellow-600 h-2.5 rounded-full" 
                      style={{ width: `${(globalData.sdg7Progress.projected2030?.renewableShare / 50) * 100 || 0}%` }}
                    ></div>
                  </div>
                  <span className="text-sm text-gray-600">
                    {formatPercentage(globalData.sdg7Progress.projected2030?.renewableShare)}
                  </span>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Energy Efficiency Improvement</label>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div 
                      className="bg-purple-600 h-2.5 rounded-full" 
                      style={{ width: `${(globalData.sdg7Progress.projected2030?.efficiencyImprovement / 5) * 100 || 0}%` }}
                    ></div>
                  </div>
                  <span className="text-sm text-gray-600">
                    {globalData.sdg7Progress.projected2030?.efficiencyImprovement?.toFixed(1) || '0'}% annually
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top Performers */}
      {topPerformers && (
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Top Performing Countries</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <h3 className="font-semibold text-blue-600 mb-3">Electricity Access Leaders</h3>
              <div className="space-y-2">
                {topPerformers.electricity?.slice(0, 3).map((country, index) => (
                  <div key={country.country} className="flex justify-between items-center">
                    <span className="text-sm font-medium">{country.country}</span>
                    <span className="text-sm text-blue-600">{formatPercentage(country.rate)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-green-600 mb-3">Clean Cooking Leaders</h3>
              <div className="space-y-2">
                {topPerformers.cooking?.slice(0, 3).map((country, index) => (
                  <div key={country.country} className="flex justify-between items-center">
                    <span className="text-sm font-medium">{country.country}</span>
                    <span className="text-sm text-green-600">{formatPercentage(country.rate)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-yellow-600 mb-3">Renewable Leaders</h3>
              <div className="space-y-2">
                {topPerformers.renewable?.slice(0, 3).map((country, index) => (
                  <div key={country.country} className="flex justify-between items-center">
                    <span className="text-sm font-medium">{country.country}</span>
                    <span className="text-sm text-yellow-600">{formatPercentage(country.share)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-purple-600 mb-3">Policy Leaders (RISE)</h3>
              <div className="space-y-2">
                {topPerformers.governance?.slice(0, 3).map((country, index) => (
                  <div key={country.country} className="flex justify-between items-center">
                    <span className="text-sm font-medium">{country.country}</span>
                    <span className="text-sm text-purple-600">{country.score?.toFixed(0) || '0'}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Critical Gaps and Challenges */}
      {criticalGaps && (
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Critical Gaps & Investment Needs</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-red-600 mb-3">Access Deficits</h3>
              <div className="space-y-3">
                <div className="bg-red-50 p-3 rounded">
                  <span className="text-red-800 font-semibold">
                    {formatNumber(criticalGaps.electricityDeficit)} people
                  </span>
                  <p className="text-red-600 text-sm">without electricity access</p>
                </div>
                <div className="bg-red-50 p-3 rounded">
                  <span className="text-red-800 font-semibold">
                    {formatNumber(criticalGaps.cookingDeficit)} people
                  </span>
                  <p className="text-red-600 text-sm">without clean cooking access</p>
                </div>
                <div className="bg-red-50 p-3 rounded">
                  <span className="text-red-800 font-semibold">
                    ${criticalGaps.investmentGap || 350}B
                  </span>
                  <p className="text-red-600 text-sm">annual investment gap</p>
                </div>
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-orange-600 mb-3">Key Policy Gaps</h3>
              <div className="space-y-2">
                {criticalGaps.policyGaps?.map((gap, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                    <span className="text-sm text-gray-700">{gap}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Regional Overview */}
      {regionalData && Object.keys(regionalData).length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Regional Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(regionalData).map(([region, data]) => (
              <div key={region} className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-800 mb-2">{region}</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Countries:</span>
                    <span className="font-medium">{data.countries || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Electricity Rate:</span>
                    <span className="font-medium">{formatPercentage(data.electricityRate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Clean Cooking:</span>
                    <span className="font-medium">{formatPercentage(data.cookingRate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Renewable Share:</span>
                    <span className="font-medium">{formatPercentage(data.renewableShare)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>RISE Score:</span>
                    <span className="font-medium">{data.averageRiseScore?.toFixed(0) || '0'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Data Sources Footer */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="font-semibold text-gray-700 mb-2">Data Sources</h3>
        <div className="text-sm text-gray-600 space-y-1">
          <p>• ESMAP Energy Data Analytics Hub - 908 datasets covering 193 countries</p>
          <p>• Multi-Tier Framework (MTF) - Detailed energy access surveys from 25 countries</p>
          <p>• Regulatory Indicators for Sustainable Energy (RISE) - Policy indicators for 140+ countries</p>
          <p>• SDG7 Energy Progress Report - Global tracking towards Sustainable Development Goal 7</p>
        </div>
      </div>
    </div>
  );
};

export default ESMAPDashboard;