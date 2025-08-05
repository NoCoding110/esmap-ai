/**
 * ESMAP Country Profile Component
 * 
 * Displays comprehensive country-specific energy data including:
 * - Integrated ESMAP data from all sources
 * - Energy access metrics (electricity and clean cooking)
 * - Renewable energy capacity and potential
 * - RISE policy indicators
 * - MTF detailed tier analysis
 * - SDG7 progress tracking
 * - AI-generated policy recommendations
 */

import React, { useState, useEffect } from 'react';
import { energyDataService } from '../services/dataService';

const CountryProfile = ({ countryCode, onClose }) => {
  const [countryData, setCountryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (countryCode) {
      loadCountryData();
    }
  }, [countryCode]);

  const loadCountryData = async () => {
    try {
      setLoading(true);
      const data = await energyDataService.getEnhancedCountryProfile(countryCode, {
        includeGender: true,
        includeClimate: true,
        includeFinance: true,
        includeProjects: true
      });
      setCountryData(data);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Country profile loading error:', err);
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

  const getTierColor = (tier) => {
    const colors = {
      0: 'bg-red-500',
      1: 'bg-red-400',
      2: 'bg-yellow-500',
      3: 'bg-yellow-400',
      4: 'bg-green-400',
      5: 'bg-green-500'
    };
    return colors[Math.floor(tier)] || 'bg-gray-400';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      high: 'bg-red-100 text-red-800 border-red-200',
      medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      low: 'bg-green-100 text-green-800 border-green-200'
    };
    return colors[priority] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <span className="ml-4 text-lg text-gray-600">Loading {countryCode} Profile...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <h3 className="text-red-800 font-semibold text-lg">Error Loading Profile</h3>
            <p className="text-red-600 mt-2">{error}</p>
            <div className="mt-6 space-x-4">
              <button 
                onClick={loadCountryData}
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
              >
                Retry
              </button>
              <button 
                onClick={onClose}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const esmapData = countryData?.esmap_integrated_data?.data?.data?.[0];
  const recommendations = countryData?.policy_recommendations?.data?.data;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-green-600 text-white p-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold">{esmapData?.country?.name || countryCode} Energy Profile</h1>
              <p className="text-blue-100 mt-1">
                {esmapData?.country?.region} • {esmapData?.country?.incomeGroup}
              </p>
              <div className="mt-2 text-sm text-blue-100">
                Last updated: {countryData?.last_updated ? new Date(countryData.last_updated).toLocaleString() : 'Unknown'}
              </div>
            </div>
            <button 
              onClick={onClose}
              className="text-white hover:text-gray-200 text-2xl font-bold"
            >
              ×
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {['overview', 'access', 'renewable', 'governance', 'recommendations'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-2 border-b-2 font-medium text-sm capitalize ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab === 'access' ? 'Energy Access' :
                 tab === 'renewable' ? 'Renewable Energy' :
                 tab === 'governance' ? 'Policy & Governance' :
                 tab}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {activeTab === 'overview' && esmapData && (
            <div className="space-y-6">
              {/* Key Metrics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h3 className="font-semibold text-blue-800">Electricity Access</h3>
                  <div className="mt-2">
                    <span className="text-2xl font-bold text-blue-600">
                      {formatPercentage(esmapData.energyAccess?.electricity?.total)}
                    </span>
                    <p className="text-sm text-blue-600">
                      MTF Tier: {esmapData.energyAccess?.electricity?.mtfTier?.toFixed(1) || '0'}
                    </p>
                  </div>
                </div>

                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <h3 className="font-semibold text-green-800">Clean Cooking</h3>
                  <div className="mt-2">
                    <span className="text-2xl font-bold text-green-600">
                      {formatPercentage(esmapData.energyAccess?.cooking?.total)}
                    </span>
                    <p className="text-sm text-green-600">
                      MTF Tier: {esmapData.energyAccess?.cooking?.mtfTier?.toFixed(1) || '0'}
                    </p>
                  </div>
                </div>

                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                  <h3 className="font-semibold text-yellow-800">Renewable Share</h3>
                  <div className="mt-2">
                    <span className="text-2xl font-bold text-yellow-600">
                      {formatPercentage(esmapData.renewableEnergy?.share)}
                    </span>
                    <p className="text-sm text-yellow-600">
                      {formatNumber(esmapData.renewableEnergy?.capacity?.total)} MW capacity
                    </p>
                  </div>
                </div>

                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                  <h3 className="font-semibold text-purple-800">RISE Score</h3>
                  <div className="mt-2">
                    <span className="text-2xl font-bold text-purple-600">
                      {esmapData.governance?.riseScore?.toFixed(0) || '0'}
                    </span>
                    <p className="text-sm text-purple-600">
                      Policy framework rating
                    </p>
                  </div>
                </div>
              </div>

              {/* Demographics and Context */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-800 mb-3">Demographics</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Population:</span>
                      <span className="font-medium">{formatNumber(esmapData.demographics?.population)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Urbanization:</span>
                      <span className="font-medium">{formatPercentage(esmapData.demographics?.urbanization)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>GDP per Capita:</span>
                      <span className="font-medium">${formatNumber(esmapData.demographics?.gdpPerCapita)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Energy Poverty:</span>
                      <span className="font-medium">{formatPercentage(esmapData.demographics?.energyPoverty)}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-800 mb-3">ESMAP Projects</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Active Projects:</span>
                      <span className="font-medium">{esmapData.projects?.active || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Completed Projects:</span>
                      <span className="font-medium">{esmapData.projects?.completed || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Beneficiaries:</span>
                      <span className="font-medium">{formatNumber(esmapData.projects?.beneficiaries)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Investment:</span>
                      <span className="font-medium">${formatNumber(esmapData.projects?.investment)}M</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'access' && esmapData && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Electricity Access */}
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-800 mb-4">Electricity Access Breakdown</h3>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-2">
                        <span>Total Access</span>
                        <span className="font-bold text-blue-600">
                          {formatPercentage(esmapData.energyAccess?.electricity?.total)}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${esmapData.energyAccess?.electricity?.total || 0}%` }}
                        ></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-2">
                        <span>Urban Access</span>
                        <span className="font-medium">
                          {formatPercentage(esmapData.energyAccess?.electricity?.urban)}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-400 h-2 rounded-full" 
                          style={{ width: `${esmapData.energyAccess?.electricity?.urban || 0}%` }}
                        ></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-2">
                        <span>Rural Access</span>
                        <span className="font-medium">
                          {formatPercentage(esmapData.energyAccess?.electricity?.rural)}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-300 h-2 rounded-full" 
                          style={{ width: `${esmapData.energyAccess?.electricity?.rural || 0}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="mt-4">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium">MTF Average Tier:</span>
                        <div className={`px-2 py-1 rounded text-white text-sm ${getTierColor(esmapData.energyAccess?.electricity?.mtfTier)}`}>
                          {esmapData.energyAccess?.electricity?.mtfTier?.toFixed(1) || '0'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Clean Cooking Access */}
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-green-800 mb-4">Clean Cooking Access Breakdown</h3>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-2">
                        <span>Total Access</span>
                        <span className="font-bold text-green-600">
                          {formatPercentage(esmapData.energyAccess?.cooking?.total)}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-600 h-2 rounded-full" 
                          style={{ width: `${esmapData.energyAccess?.cooking?.total || 0}%` }}
                        ></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-2">
                        <span>Urban Access</span>
                        <span className="font-medium">
                          {formatPercentage(esmapData.energyAccess?.cooking?.urban)}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-400 h-2 rounded-full" 
                          style={{ width: `${esmapData.energyAccess?.cooking?.urban || 0}%` }}
                        ></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-2">
                        <span>Rural Access</span>
                        <span className="font-medium">
                          {formatPercentage(esmapData.energyAccess?.cooking?.rural)}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-300 h-2 rounded-full" 
                          style={{ width: `${esmapData.energyAccess?.cooking?.rural || 0}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="mt-4">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium">MTF Average Tier:</span>
                        <div className={`px-2 py-1 rounded text-white text-sm ${getTierColor(esmapData.energyAccess?.cooking?.mtfTier)}`}>
                          {esmapData.energyAccess?.cooking?.mtfTier?.toFixed(1) || '0'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Gender Indicators */}
              {esmapData.gender && (
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-pink-800 mb-4">Gender & Energy Indicators</h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-pink-600">
                        {formatPercentage(esmapData.gender.accessGap)}
                      </div>
                      <div className="text-sm text-gray-600">Access Gap</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-pink-600">
                        {formatPercentage(esmapData.gender.decisionMaking)}
                      </div>
                      <div className="text-sm text-gray-600">Women Decision Making</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-pink-600">
                        {esmapData.gender.fuelCollection?.toFixed(1) || '0'}h
                      </div>
                      <div className="text-sm text-gray-600">Fuel Collection Time</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-pink-600">
                        {formatPercentage(esmapData.gender.femaleHeadedHouseholds)}
                      </div>
                      <div className="text-sm text-gray-600">Female-Headed HH</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'renewable' && esmapData && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-yellow-800 mb-4">Renewable Energy Overview</h3>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-2">
                        <span>Current Share</span>
                        <span className="font-bold text-yellow-600">
                          {formatPercentage(esmapData.renewableEnergy?.share)}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div 
                          className="bg-yellow-600 h-3 rounded-full" 
                          style={{ width: `${(esmapData.renewableEnergy?.share / 50) * 100 || 0}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="text-sm text-gray-600">
                      <p>Total Capacity: {formatNumber(esmapData.renewableEnergy?.capacity?.total)} MW</p>
                      <p>Estimated Potential: {formatNumber(esmapData.renewableEnergy?.potential)} MW</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-yellow-800 mb-4">Capacity by Technology</h3>
                  <div className="space-y-3">
                    {['solar', 'wind', 'hydro'].map((tech) => (
                      <div key={tech} className="flex justify-between items-center">
                        <span className="capitalize">{tech}:</span>
                        <div className="flex items-center space-x-2">
                          <div className="w-20 bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${
                                tech === 'solar' ? 'bg-yellow-500' : 
                                tech === 'wind' ? 'bg-blue-500' : 'bg-green-500'
                              }`}
                              style={{ 
                                width: `${((esmapData.renewableEnergy?.capacity?.[tech] || 0) / 
                                        (esmapData.renewableEnergy?.capacity?.total || 1)) * 100}%` 
                              }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium">
                            {formatNumber(esmapData.renewableEnergy?.capacity?.[tech])} MW
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'governance' && esmapData && (
            <div className="space-y-6">
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-purple-800 mb-4">RISE Policy Indicators</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-gray-700 mb-3">Category Scores</h4>
                    <div className="space-y-3">
                      {[
                        { key: 'electricityScore', label: 'Electricity Access', color: 'blue' },
                        { key: 'cookingScore', label: 'Clean Cooking', color: 'green' },
                        { key: 'renewableScore', label: 'Renewable Energy', color: 'yellow' },
                        { key: 'efficiencyScore', label: 'Energy Efficiency', color: 'purple' }
                      ].map(({ key, label, color }) => (
                        <div key={key}>
                          <div className="flex justify-between mb-1">
                            <span className="text-sm">{label}</span>
                            <span className="text-sm font-medium">
                              {esmapData.governance?.[key]?.toFixed(0) || '0'}/100
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className={`bg-${color}-500 h-2 rounded-full`}
                              style={{ width: `${esmapData.governance?.[key] || 0}%` }}
                            ></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-700 mb-3">Overall Performance</h4>
                    <div className="text-center">
                      <div className="text-4xl font-bold text-purple-600 mb-2">
                        {esmapData.governance?.riseScore?.toFixed(0) || '0'}
                      </div>
                      <div className="text-sm text-gray-600">Overall RISE Score</div>
                      <div className="mt-4">
                        <div className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                          (esmapData.governance?.riseScore || 0) >= 75 ? 'bg-green-100 text-green-800' :
                          (esmapData.governance?.riseScore || 0) >= 50 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {(esmapData.governance?.riseScore || 0) >= 75 ? 'Strong' :
                           (esmapData.governance?.riseScore || 0) >= 50 ? 'Moderate' : 'Weak'} Policy Framework
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'recommendations' && recommendations && (
            <div className="space-y-6">
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-indigo-800 mb-4">AI-Generated Policy Recommendations</h3>
                <div className="space-y-4">
                  {recommendations.recommendations?.map((rec, index) => (
                    <div key={index} className={`border rounded-lg p-4 ${getPriorityColor(rec.priority)}`}>
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold">{rec.title}</h4>
                        <span className={`px-2 py-1 rounded text-xs font-medium capitalize ${getPriorityColor(rec.priority)}`}>
                          {rec.priority} Priority
                        </span>
                      </div>
                      <p className="text-sm mb-3">{rec.description}</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Implementation:</span>
                          <p className="text-gray-600">{rec.implementation}</p>
                        </div>
                        <div>
                          <span className="font-medium">Expected Impact:</span>
                          <p className="text-gray-600">{rec.expectedImpact}</p>
                        </div>
                        <div>
                          <span className="font-medium">Timeframe:</span>
                          <p className="text-gray-600">{rec.timeframe}</p>
                        </div>
                        <div>
                          <span className="font-medium">Cost:</span>
                          <p className="text-gray-600 capitalize">{rec.cost}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Benchmarks */}
              {recommendations.benchmarks && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-800 mb-3">Regional Benchmarks</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Avg. Electricity Access:</span>
                        <span>{formatPercentage(recommendations.benchmarks.regional?.averageElectricityAccess)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Avg. Clean Cooking:</span>
                        <span>{formatPercentage(recommendations.benchmarks.regional?.averageCookingAccess)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Avg. Renewable Share:</span>
                        <span>{formatPercentage(recommendations.benchmarks.regional?.averageRenewableShare)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-800 mb-3">Peer Countries</h3>
                    <div className="space-y-2">
                      {recommendations.benchmarks.peers?.map((peer, index) => (
                        <div key={index} className="flex justify-between text-sm">
                          <span>{peer.country}</span>
                          <span className="font-medium">{peer.score?.toFixed(0) || '0'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CountryProfile;