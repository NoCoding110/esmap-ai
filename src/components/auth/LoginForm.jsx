/**
 * Login Form Component
 * Provides user authentication interface with validation
 */

import React, { useState } from 'react';

const LoginForm = ({
  onLogin,
  onNavigateToRegister,
  onNavigateToResetPassword,
  loading = { isLoading: false, error: null }
}) => {
  const [credentials, setCredentials] = useState({
    email: '',
    password: ''
  });

  const [validation, setValidation] = useState({
    email: '',
    password: ''
  });

  const validateForm = () => {
    const errors = { email: '', password: '' };
    let isValid = true;

    if (!credentials.email) {
      errors.email = 'Email is required';
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(credentials.email)) {
      errors.email = 'Please enter a valid email address';
      isValid = false;
    }

    if (!credentials.password) {
      errors.password = 'Password is required';
      isValid = false;
    } else if (credentials.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
      isValid = false;
    }

    setValidation(errors);
    return isValid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      await onLogin(credentials);
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  const handleInputChange = (field) => (e) => {
    setCredentials(prev => ({
      ...prev,
      [field]: e.target.value
    }));
    
    // Clear validation error when user starts typing
    if (validation[field]) {
      setValidation(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl mb-4 shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Welcome Back</h1>
          <p className="text-slate-600">Sign in to ESMAP AI Platform</p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
          {loading.error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-red-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-red-700 text-sm font-medium">{loading.error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={credentials.email}
                onChange={handleInputChange('email')}
                className={`w-full px-4 py-3 border rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  validation.email
                    ? 'border-red-300 bg-red-50 focus:border-red-500 focus:ring-red-500'
                    : 'border-slate-300 focus:border-blue-500'
                }`}
                placeholder="Enter your email"
                disabled={loading.isLoading}
              />
              {validation.email && (
                <p className="mt-2 text-sm text-red-600">{validation.email}</p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Password
              </label>
              <input
                type="password"
                value={credentials.password}
                onChange={handleInputChange('password')}
                className={`w-full px-4 py-3 border rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  validation.password
                    ? 'border-red-300 bg-red-50 focus:border-red-500 focus:ring-red-500'
                    : 'border-slate-300 focus:border-blue-500'
                }`}
                placeholder="Enter your password"
                disabled={loading.isLoading}
              />
              {validation.password && (
                <p className="mt-2 text-sm text-red-600">{validation.password}</p>
              )}
            </div>

            {/* Forgot Password Link */}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={onNavigateToResetPassword}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
                disabled={loading.isLoading}
              >
                Forgot your password?
              </button>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading.isLoading}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-4 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {loading.isLoading ? (
                <div className="flex items-center justify-center">
                  <svg className="animate-spin h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Signing in...
                </div>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Register Link */}
          <div className="mt-8 pt-6 border-t border-slate-200 text-center">
            <p className="text-slate-600 text-sm">
              Don't have an account?{' '}
              <button
                onClick={onNavigateToRegister}
                className="text-blue-600 hover:text-blue-800 font-semibold transition-colors"
                disabled={loading.isLoading}
              >
                Create one here
              </button>
            </p>
          </div>
        </div>

        {/* Demo Credentials */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">Demo Credentials</h3>
          <p className="text-xs text-blue-700">Email: demo@esmap.org</p>
          <p className="text-xs text-blue-700">Password: demo123</p>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;