/**
 * Modern Loading Component
 * Elegant loading states for the ESMAP AI Platform
 * 
 * Features:
 * - Multiple loading states
 * - Smooth animations
 * - Context-aware messaging
 * - Accessibility-friendly
 */

import React from 'react';
import { Zap, Database, Brain, Globe } from 'lucide-react';

const ModernLoading = ({ 
  type = 'default', 
  message = 'Loading...', 
  size = 'medium',
  overlay = false 
}) => {
  const loadingIcons = {
    data: Database,
    ai: Brain,
    energy: Zap,
    global: Globe,
    default: Zap
  };

  const Icon = loadingIcons[type] || loadingIcons.default;

  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-8 h-8',
    large: 'w-12 h-12'
  };

  const containerClasses = overlay 
    ? 'fixed inset-0 bg-white bg-opacity-90 backdrop-blur-sm z-50'
    : '';

  const LoadingSpinner = () => (
    <div className="relative">
      {/* Main spinning ring */}
      <div className={`${sizeClasses[size]} border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin`}></div>
      
      {/* Center icon */}
      <div className="absolute inset-0 flex items-center justify-center">
        <Icon className={`${
          size === 'small' ? 'w-2 h-2' : 
          size === 'medium' ? 'w-3 h-3' : 'w-4 h-4'
        } text-blue-600`} />
      </div>
    </div>
  );

  const LoadingPulse = () => (
    <div className="flex items-center gap-2">
      <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
      <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
      <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
    </div>
  );

  const SkeletonCard = () => (
    <div className="card animate-pulse">
      <div className="card-body">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
          <div className="flex-1">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          <div className="h-4 bg-gray-200 rounded w-4/6"></div>
        </div>
      </div>
    </div>
  );

  if (type === 'skeleton') {
    return (
      <div className={`flex items-center justify-center p-8 ${containerClasses}`}>
        <div className="w-full max-w-md">
          <SkeletonCard />
        </div>
      </div>
    );
  }

  if (type === 'inline') {
    return (
      <div className="flex items-center gap-2">
        <LoadingPulse />
        <span className="text-sm text-gray-600">{message}</span>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center justify-center p-8 ${containerClasses}`}>
      <LoadingSpinner />
      
      {message && (
        <div className="mt-4 text-center">
          <p className="text-gray-700 font-medium">{message}</p>
          <div className="mt-2 flex items-center justify-center gap-1">
            <div className="w-1 h-1 bg-blue-600 rounded-full animate-bounce"></div>
            <div className="w-1 h-1 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-1 h-1 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
        </div>
      )}
    </div>
  );
};

// Page loading component
export const PageLoading = ({ title = "Loading ESMAP AI Platform" }) => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="text-center">
      <div className="relative mb-6">
        <div className="w-16 h-16 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <Zap className="w-6 h-6 text-blue-600" />
        </div>
      </div>
      
      <h2 className="heading-3 text-gray-900 mb-2">{title}</h2>
      <p className="text-muted">Preparing your energy intelligence dashboard...</p>
      
      <div className="mt-6 flex justify-center gap-1">
        <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
        <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
        <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
      </div>
    </div>
  </div>
);

// Button loading state
export const ButtonLoading = ({ children, loading = false, ...props }) => (
  <button
    {...props}
    disabled={loading || props.disabled}
    className={`${props.className} relative`}
  >
    {loading && (
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
      </div>
    )}
    <span className={loading ? 'invisible' : ''}>
      {children}
    </span>
  </button>
);

export default ModernLoading;