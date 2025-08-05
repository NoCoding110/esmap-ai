/**
 * ESMAP Search Component
 * 
 * Advanced search interface for ESMAP data including:
 * - Full-text search across 908 datasets
 * - Country-specific filtering
 * - Category and data source filtering
 * - Real-time search results
 * - Dataset details and download links
 */

import React, { useState, useEffect, useCallback } from 'react';
import { energyDataService } from '../services/dataService';

const ESMAPSearch = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    countries: [],
    categories: [],
    sources: [],
    limit: 20
  });

  // Debounced search function
  const debounce = useCallback((func, delay) => {
    let timeoutId;
    return (...args) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    };
  }, []);

  const performSearch = async (query, searchFilters) => {
    if (!query.trim()) {
      setSearchResults(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const results = await energyDataService.searchESMAPData(query, {
        countries: searchFilters.countries.length > 0 ? searchFilters.countries : undefined,
        categories: searchFilters.categories.length > 0 ? searchFilters.categories : undefined,
        dataSources: searchFilters.sources.length > 0 ? searchFilters.sources : undefined,
        limit: searchFilters.limit
      });
      
      setSearchResults(results);
    } catch (err) {
      setError(err.message);
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  const debouncedSearch = useCallback(
    debounce((query, searchFilters) => performSearch(query, searchFilters), 500),
    []
  );

  useEffect(() => {
    debouncedSearch(searchQuery, filters);
  }, [searchQuery, filters, debouncedSearch]);

  const handleFilterChange = (filterType, value, checked) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: checked 
        ? [...prev[filterType], value]
        : prev[filterType].filter(item => item !== value)
    }));
  };

  const clearFilters = () => {
    setFilters({
      countries: [],
      categories: [],
      sources: [],
      limit: 20
    });
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div className="bg-gradient-to-r from-green-600 to-blue-600 text-white p-6 rounded-lg">
        <h1 className="text-2xl font-bold mb-2">ESMAP Data Search</h1>
        <p className="text-green-100">
          Search across 908 datasets from 193 countries
        </p>
      </div>

      {/* Search Input */}
      <div className="bg-white p-6 rounded-lg shadow-lg">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for energy datasets, indicators, or topics..."
            className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Search Filters */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Country Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Countries</label>
            <div className="space-y-1 max-h-32 overflow-y-auto border border-gray-200 rounded p-2">
              {['USA', 'CHN', 'IND', 'BRA', 'KEN', 'NGA', 'ETH', 'BGD', 'PAK', 'IDN'].map(country => (
                <label key={country} className="flex items-center text-sm">
                  <input
                    type="checkbox"
                    checked={filters.countries.includes(country)}
                    onChange={(e) => handleFilterChange('countries', country, e.target.checked)}
                    className="mr-2"
                  />
                  {country}
                </label>
              ))}
            </div>
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Categories</label>
            <div className="space-y-1 max-h-32 overflow-y-auto border border-gray-200 rounded p-2">
              {['Energy Access', 'Renewable Energy', 'Energy Efficiency', 'Clean Cooking', 'Grid Infrastructure', 'Policy & Regulation'].map(category => (
                <label key={category} className="flex items-center text-sm">
                  <input
                    type="checkbox"
                    checked={filters.categories.includes(category)}
                    onChange={(e) => handleFilterChange('categories', category, e.target.checked)}
                    className="mr-2"
                  />
                  {category}
                </label>
              ))}
            </div>
          </div>

          {/* Data Source Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Data Sources</label>
            <div className="space-y-1 max-h-32 overflow-y-auto border border-gray-200 rounded p-2">
              {['ESMAP Hub', 'MTF Surveys', 'RISE Database', 'SDG7 Tracking', 'World Bank', 'IEA'].map(source => (
                <label key={source} className="flex items-center text-sm">
                  <input
                    type="checkbox"
                    checked={filters.sources.includes(source)}
                    onChange={(e) => handleFilterChange('sources', source, e.target.checked)}
                    className="mr-2"
                  />
                  {source}
                </label>
              ))}
            </div>
          </div>

          {/* Results Limit */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Results Limit</label>
            <select
              value={filters.limit}
              onChange={(e) => setFilters(prev => ({ ...prev, limit: parseInt(e.target.value) }))}
              className="w-full border border-gray-300 rounded p-2"
            >
              <option value={10}>10 results</option>
              <option value={20}>20 results</option>
              <option value={50}>50 results</option>
              <option value={100}>100 results</option>
            </select>
            
            {(filters.countries.length > 0 || filters.categories.length > 0 || filters.sources.length > 0) && (
              <button
                onClick={clearFilters}
                className="mt-2 text-sm text-blue-600 hover:text-blue-800"
              >
                Clear all filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Searching ESMAP datasets...</span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-semibold">Search Error</h3>
          <p className="text-red-600 mt-1">{error}</p>
        </div>
      )}

      {/* Search Results */}
      {searchResults && !loading && (
        <div className="space-y-6">
          {/* Results Summary */}
          <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-500">
            <h2 className="text-lg font-semibold text-gray-800">
              Search Results for "{searchQuery}"
            </h2>
            <p className="text-gray-600 mt-1">
              Found {searchResults.data?.data?.total || 0} results • 
              {searchResults.data?.data?.datasets?.length || 0} datasets • 
              {searchResults.data?.data?.indicators?.length || 0} indicators
            </p>
            <div className="mt-2 text-sm text-gray-500">
              Search completed in {searchResults.data?.metadata?.searchTime ? 
                `${Date.now() - searchResults.data.metadata.searchTime}ms` : 'N/A'}
            </div>
          </div>

          {/* Datasets Results */}
          {searchResults.data?.data?.datasets?.length > 0 && (
            <div className="bg-white rounded-lg shadow">
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-blue-800">
                  Datasets ({searchResults.data.data.datasets.length})
                </h3>
              </div>
              <div className="divide-y divide-gray-200">
                {searchResults.data.data.datasets.map((dataset, index) => (
                  <div key={dataset.id || index} className="p-4 hover:bg-gray-50">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 mb-2">
                          {dataset.name || dataset.title}
                        </h4>
                        <p className="text-gray-600 text-sm mb-3">
                          {dataset.description || 'No description available'}
                        </p>
                        <div className="flex flex-wrap gap-2 mb-3">
                          {dataset.tags?.slice(0, 5).map((tag, tagIndex) => (
                            <span
                              key={tagIndex}
                              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span>Country: {dataset.country || 'Global'}</span>
                          <span>Category: {dataset.category || 'General'}</span>
                          <span>Updated: {dataset.lastUpdated ? formatDate(dataset.lastUpdated) : 'Unknown'}</span>
                        </div>
                      </div>
                      <div className="ml-4 flex-shrink-0">
                        <button className="inline-flex items-center px-3 py-2 border border-blue-300 rounded-md text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100">
                          View Dataset
                          <svg className="ml-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Indicators Results */}
          {searchResults.data?.data?.indicators?.length > 0 && (
            <div className="bg-white rounded-lg shadow">
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-green-800">
                  Indicators ({searchResults.data.data.indicators.length})
                </h3>
              </div>
              <div className="divide-y divide-gray-200">
                {searchResults.data.data.indicators.map((indicator, index) => (
                  <div key={indicator.id || index} className="p-4 hover:bg-gray-50">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 mb-2">
                          {indicator.name || indicator.title}
                        </h4>
                        <p className="text-gray-600 text-sm mb-3">
                          {indicator.description || 'No description available'}
                        </p>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span>Code: {indicator.code || 'N/A'}</span>
                          <span>Unit: {indicator.unit || 'N/A'}</span>
                          <span>Source: {indicator.source || 'ESMAP'}</span>
                        </div>
                      </div>
                      <div className="ml-4 flex-shrink-0">
                        <button className="inline-flex items-center px-3 py-2 border border-green-300 rounded-md text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100">
                          View Data
                          <svg className="ml-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No Results */}
          {searchResults.data?.data?.total === 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
              <svg className="mx-auto h-12 w-12 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 8V8a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2z" />
              </svg>
              <h3 className="mt-2 text-lg font-medium text-yellow-800">No results found</h3>
              <p className="mt-1 text-yellow-600">
                Try adjusting your search terms or filters, or explore our dataset categories.
              </p>
              <div className="mt-4">
                <button
                  onClick={() => setSearchQuery('')}
                  className="inline-flex items-center px-4 py-2 border border-yellow-300 rounded-md text-yellow-700 bg-yellow-50 hover:bg-yellow-100"
                >
                  Clear Search
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Search Suggestions */}
      {!searchQuery && !searchResults && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Popular Search Terms</h3>
          <div className="flex flex-wrap gap-2">
            {[
              'solar energy', 'electricity access', 'clean cooking', 'renewable capacity',
              'energy efficiency', 'grid infrastructure', 'rural electrification',
              'energy poverty', 'sustainable development', 'policy indicators'
            ].map((term) => (
              <button
                key={term}
                onClick={() => setSearchQuery(term)}
                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-full text-sm text-gray-700 bg-gray-50 hover:bg-gray-100"
              >
                {term}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ESMAPSearch;