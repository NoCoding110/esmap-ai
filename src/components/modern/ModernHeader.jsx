/**
 * Modern Header Component
 * Inspired by Linear, Notion, and Stripe Dashboard
 * 
 * Features:
 * - Clean, minimal design
 * - Smart navigation with active states
 * - User profile integration
 * - Search functionality
 * - Responsive design
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  Search, 
  Bell, 
  Settings, 
  User, 
  ChevronDown, 
  Menu,
  X,
  Zap,
  BarChart3,
  Globe,
  Database,
  Brain,
  TestTube
} from 'lucide-react';

const ModernHeader = ({ 
  activeTab, 
  setActiveTab, 
  user,
  onUserProfileClick,
  onNotificationClick,
  onSettingsClick 
}) => {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  
  const userMenuRef = useRef(null);
  const searchRef = useRef(null);

  // Navigation items with icons and descriptions
  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: BarChart3,
      description: 'Energy insights & analytics'
    },
    {
      id: 'countries',
      label: 'Countries',
      icon: Globe,
      description: 'Country profiles & data'
    },
    {
      id: 'data',
      label: 'Data',
      icon: Database,
      description: 'Data management suite'
    },
    {
      id: 'ai',
      label: 'AI Chat',
      icon: Brain,
      description: 'AI-powered analysis'
    },
    {
      id: 'search',
      label: 'Search',
      icon: Search,
      description: 'Semantic document search'
    },
    {
      id: 'api',
      label: 'API',
      icon: TestTube,
      description: 'API testing interface'
    }
  ];

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Mock search functionality
  const handleSearch = (query) => {
    setSearchQuery(query);
    if (query.length > 2) {
      // Mock search results
      setSearchResults([
        { id: 1, title: 'Global Renewable Energy Outlook 2024', type: 'Report' },
        { id: 2, title: 'Energy Access in Sub-Saharan Africa', type: 'Analysis' },
        { id: 3, title: 'Solar PV Cost Trends', type: 'Data' }
      ]);
    } else {
      setSearchResults([]);
    }
  };

  return (
    <>
      <header className="nav-header">
        <div className="container">
          <div className="flex items-center justify-between">
            {/* Brand */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-green-500 rounded-lg flex items-center justify-center">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <span className="nav-brand">ESMAP AI</span>
              </div>
              
              {/* Desktop Navigation */}
              <nav className="hidden lg:flex items-center gap-1 ml-8">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={`nav-link flex items-center gap-2 group relative ${
                        activeTab === item.id ? 'active' : ''
                      }`}
                      title={item.description}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                      
                      {/* Tooltip */}
                      <div className="absolute top-full mt-2 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                        {item.description}
                      </div>
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Search Bar */}
            <div className="hidden md:flex relative flex-1 max-w-md mx-8">
              <div className="relative w-full" ref={searchRef}>
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-800" />
                <input
                  type="text"
                  placeholder="Search energy data, reports, countries..."
                  className="input pl-10 pr-4"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                />
                
                {/* Search Results Dropdown */}
                {isSearchFocused && searchResults.length > 0 && (
                  <div className="absolute top-full mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                    {searchResults.map((result) => (
                      <div
                        key={result.id}
                        className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                        onClick={() => {
                          setSearchQuery(result.title);
                          setSearchResults([]);
                          setIsSearchFocused(false);
                        }}
                      >
                        <div className="font-medium text-sm text-gray-900">{result.title}</div>
                        <div className="text-xs text-gray-800 mt-1">{result.type}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right Side Actions */}
            <div className="flex items-center gap-3">
              {/* Notifications */}
              <button
                onClick={onNotificationClick}
                className="btn-ghost p-2 relative"
                title="Notifications"
              >
                <Bell className="w-5 h-5" />
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
              </button>

              {/* Settings */}
              <button
                onClick={onSettingsClick}
                className="btn-ghost p-2 hidden sm:flex"
                title="Settings"
              >
                <Settings className="w-5 h-5" />
              </button>

              {/* User Menu */}
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <div className="hidden sm:block text-left">
                    <div className="text-sm font-medium text-gray-900">
                      {user?.name || 'Demo User'}
                    </div>
                    <div className="text-xs text-gray-800">
                      {user?.role || 'Analyst'}
                    </div>
                  </div>
                  <ChevronDown className="w-4 h-4 text-gray-800" />
                </button>

                {/* User Dropdown Menu */}
                {isUserMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                    <div className="p-4 border-b border-gray-100">
                      <div className="font-medium text-gray-900">{user?.name || 'Demo User'}</div>
                      <div className="text-sm text-gray-800">{user?.email || 'demo@esmap.org'}</div>
                      <div className="mt-2">
                        <span className="badge badge-primary">{user?.role || 'Analyst'}</span>
                      </div>
                    </div>
                    
                    <div className="p-2">
                      <button
                        onClick={() => {
                          onUserProfileClick && onUserProfileClick();
                          setIsUserMenuOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md"
                      >
                        <User className="w-4 h-4 inline mr-2" />
                        Profile Settings
                      </button>
                      <button
                        onClick={() => {
                          onSettingsClick && onSettingsClick();
                          setIsUserMenuOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md"
                      >
                        <Settings className="w-4 h-4 inline mr-2" />
                        Preferences
                      </button>
                      <hr className="my-2 border-gray-200" />
                      <button
                        onClick={() => {
                          // Handle logout
                          setIsUserMenuOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md"
                      >
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Mobile Menu Toggle */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="btn-ghost p-2 lg:hidden"
              >
                {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden bg-white border-b border-gray-200">
          <div className="container py-4">
            {/* Mobile Search */}
            <div className="mb-4 md:hidden">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-800" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="input pl-10 pr-4"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                />
              </div>
            </div>

            {/* Mobile Navigation */}
            <nav className="flex flex-col gap-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`nav-link flex items-center gap-3 p-3 rounded-lg ${
                      activeTab === item.id ? 'active' : ''
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <div className="text-left">
                      <div className="font-medium">{item.label}</div>
                      <div className="text-xs text-gray-800">{item.description}</div>
                    </div>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      )}
    </>
  );
};

export default ModernHeader;