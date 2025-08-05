/**
 * Authentication Manager Component
 * Handles authentication state and routing between auth forms
 */

import React, { useState, useEffect } from 'react';
import LoginForm from './LoginForm.jsx';
import RegisterForm from './RegisterForm.jsx';
import ResetPasswordForm from './ResetPasswordForm.jsx';

const AuthManager = ({ onAuthSuccess, showAuth, onClose }) => {
  const [currentView, setCurrentView] = useState('login'); // 'login', 'register', 'reset'
  const [loading, setLoading] = useState({ isLoading: false, error: null, message: null });
  const [user, setUser] = useState(null);

  // Check for existing session on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('esmap_user');
    if (savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        setUser(userData);
        if (onAuthSuccess) {
          onAuthSuccess(userData);
        }
      } catch (error) {
        console.error('Error parsing saved user data:', error);
        localStorage.removeItem('esmap_user');
      }
    }
  }, [onAuthSuccess]);

  const handleLogin = async (credentials) => {
    setLoading({ isLoading: true, error: null });

    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Mock authentication - in real app, this would be an API call
      if (credentials.email === 'demo@esmap.org' && credentials.password === 'demo123') {
        const userData = {
          id: '1',
          email: credentials.email,
          name: 'Demo User',
          role: 'analyst',
          avatar: null,
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString()
        };

        // Save to localStorage
        localStorage.setItem('esmap_user', JSON.stringify(userData));
        setUser(userData);
        
        if (onAuthSuccess) {
          onAuthSuccess(userData);
        }

        setLoading({ isLoading: false, error: null });
      } else {
        throw new Error('Invalid email or password');
      }
    } catch (error) {
      setLoading({ 
        isLoading: false, 
        error: error.message || 'Login failed. Please try again.' 
      });
    }
  };

  const handleRegister = async (registerData) => {
    setLoading({ isLoading: true, error: null });

    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Mock registration - in real app, this would be an API call
      const userData = {
        id: Date.now().toString(),
        email: registerData.email,
        name: registerData.name,
        role: 'viewer',
        avatar: null,
        organization: registerData.organization,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString()
      };

      // Save to localStorage
      localStorage.setItem('esmap_user', JSON.stringify(userData));
      setUser(userData);
      
      if (onAuthSuccess) {
        onAuthSuccess(userData);
      }

      setLoading({ isLoading: false, error: null });
    } catch (error) {
      setLoading({ 
        isLoading: false, 
        error: error.message || 'Registration failed. Please try again.' 
      });
    }
  };

  const handleResetPassword = async (resetData) => {
    setLoading({ isLoading: true, error: null });

    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Mock password reset - in real app, this would be an API call
      console.log('Password reset requested for:', resetData.email);
      
      setLoading({ 
        isLoading: false, 
        error: null,
        message: 'Password reset instructions sent to your email' 
      });
    } catch (error) {
      setLoading({ 
        isLoading: false, 
        error: error.message || 'Password reset failed. Please try again.' 
      });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('esmap_user');
    setUser(null);
    if (onClose) {
      onClose();
    }
  };

  // If user is already authenticated and we're not showing auth, don't render
  if (user && !showAuth) {
    return null;
  }

  // If not showing auth modal, don't render
  if (!showAuth) {
    return null;
  }

  const renderCurrentView = () => {
    switch (currentView) {
      case 'login':
        return (
          <LoginForm
            onLogin={handleLogin}
            onNavigateToRegister={() => setCurrentView('register')}
            onNavigateToResetPassword={() => setCurrentView('reset')}
            loading={loading}
          />
        );
      case 'register':
        return (
          <RegisterForm
            onRegister={handleRegister}
            onNavigateToLogin={() => setCurrentView('login')}
            loading={loading}
          />
        );
      case 'reset':
        return (
          <ResetPasswordForm
            onResetPassword={handleResetPassword}
            onNavigateToLogin={() => setCurrentView('login')}
            loading={loading}
          />
        );
      default:
        return null;
    }
  };

  return (
    <>
      {/* Modal Overlay */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="relative w-full max-w-md">
          {/* Close Button */}
          {onClose && (
            <button
              onClick={onClose}
              className="absolute -top-10 right-0 text-white hover:text-gray-300 transition-colors z-10"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
          
          {/* Auth Form */}
          <div className="bg-transparent">
            {renderCurrentView()}
          </div>
        </div>
      </div>
    </>
  );
};

// User Profile Component for when authenticated
export const UserProfile = ({ user, onLogout }) => {
  const [showDropdown, setShowDropdown] = useState(false);

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin': return 'bg-purple-100 text-purple-800';
      case 'analyst': return 'bg-blue-100 text-blue-800';
      case 'viewer': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center space-x-3 text-white hover:text-blue-100 transition-colors"
      >
        <div className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
          <span className="text-sm font-semibold">
            {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
          </span>
        </div>
        <div className="hidden md:block text-left">
          <div className="text-sm font-medium">{user.name}</div>
          <div className="text-xs opacity-75">{user.role}</div>
        </div>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {showDropdown && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setShowDropdown(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 z-20">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-semibold">
                    {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </span>
                </div>
                <div>
                  <div className="font-medium text-gray-900">{user.name}</div>
                  <div className="text-sm text-gray-500">{user.email}</div>
                  <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full mt-1 ${getRoleColor(user.role)}`}>
                    {user.role}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="p-2">
              <button
                onClick={() => {
                  setShowDropdown(false);
                  // Add profile editing functionality here
                }}
                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
              >
                Edit Profile
              </button>
              <button
                onClick={() => {
                  setShowDropdown(false);
                  // Add settings functionality here
                }}
                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
              >
                Settings
              </button>
              <hr className="my-1" />
              <button
                onClick={() => {
                  setShowDropdown(false);
                  onLogout();
                }}
                className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AuthManager;